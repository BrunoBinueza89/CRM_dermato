import { api } from "../api.js";
import { toast } from "../toast.js";

function el(id) {
  return document.getElementById(id);
}

function getElements() {
  return {
    refreshButton: el("refreshButton"),
    errorBox: el("tratamentosErrorBox"),
    formError: el("tratamentosFormError"),
    sessionError: el("tratamentosSessionError"),
    searchInput: el("tratamentosSearchInput"),
    statusFilter: el("tratamentosStatusFilter"),
    patientFilter: el("tratamentosPatientFilter"),
    searchButton: el("tratamentosSearchButton"),
    clearButton: el("tratamentosClearButton"),
    list: el("tratamentosList"),
    emptyState: el("tratamentosEmptyState"),
    createForm: el("tratamentoCreateForm"),
    createButton: el("tratamentoCreateButton"),
    patientSelect: el("tratamentoPacienteSelect"),
    professionalSelect: el("tratamentoProfissionalSelect"),
    sessionForm: el("tratamentoSessaoForm"),
    sessionTreatmentSelect: el("tratamentoSessaoTratamento"),
    sessionButton: el("tratamentoSessaoButton"),
    editModal: el("tratamentosEditModal"),
    editForm: el("tratamentosEditForm"),
    editError: el("tratamentosEditFormError"),
    editSaveButton: el("tratamentosEditSaveButton"),
    editNome: el("tratamentosEditNome"),
    editDataInicio: el("tratamentosEditDataInicio"),
    editDataFim: el("tratamentosEditDataFim"),
    editStatus: el("tratamentosEditStatus"),
    editDescricao: el("tratamentosEditDescricao"),
  };
}

function setError(box, message) {
  if (!box) return;
  box.textContent = message;
  box.classList.remove("is-hidden");
}

function clearError(box) {
  if (!box) return;
  box.textContent = "";
  box.classList.add("is-hidden");
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(value));
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function progressClass(progress) {
  if (progress >= 100) return "success";
  if (progress >= 50) return "warning";
  return "info";
}

function validateTreatmentForm(payload) {
  if (!payload.nome) return "Informe o nome do tratamento.";
  if (!payload.paciente_id) return "Selecione um paciente.";
  if (!payload.profissional_id) return "Selecione um profissional.";
  if (payload.data_inicio && !/^\d{4}-\d{2}-\d{2}$/.test(payload.data_inicio)) return "Data inicial invalida.";
  if (payload.data_fim && !/^\d{4}-\d{2}-\d{2}$/.test(payload.data_fim)) return "Data final invalida.";
  if (payload.data_inicio && payload.data_fim && payload.data_fim < payload.data_inicio) {
    return "A data final nao pode ser anterior a inicial.";
  }
  return "";
}

function validateEditTreatmentForm(payload) {
  if (!payload.nome) return "Informe o nome do tratamento.";
  if (payload.data_inicio && !/^\d{4}-\d{2}-\d{2}$/.test(payload.data_inicio)) return "Data inicial invalida.";
  if (payload.data_fim && !/^\d{4}-\d{2}-\d{2}$/.test(payload.data_fim)) return "Data final invalida.";
  if (payload.data_inicio && payload.data_fim && payload.data_fim < payload.data_inicio) {
    return "A data final nao pode ser anterior a inicial.";
  }
  if (payload.status !== "ativo" && payload.status !== "concluido" && payload.status !== "cancelado") {
    return "Selecione um status valido.";
  }
  return "";
}

function validateSessionForm(payload) {
  if (!payload.tratamento_id) return "Selecione um tratamento.";
  if (!payload.data || !payload.hora) return "Informe a data e o horario da sessao.";
  return "";
}

async function populateSelect(select, rows, labelKey = "nome") {
  if (!select) return;
  const current = select.value;
  const baseOption = select.querySelector('option[value=""]')?.outerHTML || '<option value="">Todos</option>';
  const options = rows.map((row) => `<option value="${row.id}">${row[labelKey]}</option>`).join("");
  select.innerHTML = baseOption + options;
  if ([...select.options].some((option) => option.value === current)) select.value = current;
}

function getModalInstance() {
  const { editModal } = getElements();
  if (!editModal || !globalThis.bootstrap?.Modal) return null;
  return globalThis.bootstrap.Modal.getOrCreateInstance(editModal);
}

let lastRowsById = new Map();
let editingTreatmentId = null;
let isLoadingList = false;

function setListLoading(isLoading) {
  const {
    refreshButton,
    searchButton,
    clearButton,
    searchInput,
    statusFilter,
    patientFilter,
    emptyState,
    createButton,
    sessionButton,
  } = getElements();

  isLoadingList = isLoading;

  if (refreshButton) refreshButton.disabled = isLoading;
  if (searchButton) searchButton.disabled = isLoading;
  if (clearButton) clearButton.disabled = isLoading;
  if (searchInput) searchInput.disabled = isLoading;
  if (statusFilter) statusFilter.disabled = isLoading;
  if (patientFilter) patientFilter.disabled = isLoading;
  if (createButton) createButton.disabled = isLoading;
  if (sessionButton) sessionButton.disabled = isLoading;

  if (isLoading && emptyState) {
    emptyState.textContent = "Carregando tratamentos...";
    emptyState.classList.remove("is-hidden");
  } else if (emptyState) {
    emptyState.textContent = "Nenhum tratamento encontrado.";
  }
}

function renderTreatments(rows) {
  const { list, emptyState } = getElements();
  if (!list || !emptyState) return;

  if (!Array.isArray(rows) || rows.length === 0) {
    list.innerHTML = "";
    emptyState.classList.remove("is-hidden");
    return;
  }

  emptyState.classList.add("is-hidden");
  list.innerHTML = rows
    .map((row) => {
      const sessions = Array.isArray(row.sessoes) ? row.sessoes : [];
      const sessionsMarkup = sessions.length
        ? sessions
            .map(
              (session) => `
                <li class="session-item">
                  <span>${formatDateTime(session.data_hora)}</span>
                  <span class="status-badge status-badge--${session.status}">${session.status}</span>
                </li>
              `.trim()
            )
            .join("")
        : '<li class="list-empty">Nenhuma sessao cadastrada.</li>';

      return `
        <article class="treatment-card">
          <div class="treatment-card__top">
            <div>
              <h3 class="treatment-card__title">${row.nome}</h3>
              <div class="muted">${row.paciente_nome || "-"} · ${row.profissional_nome || "-"}</div>
            </div>
            <span class="status-badge status-badge--${row.status}">${row.status}</span>
          </div>
          <div class="treatment-card__meta">
            <span>Inicio: ${formatDate(row.data_inicio)}</span>
            <span>Fim: ${formatDate(row.data_fim)}</span>
          </div>
          <div class="treatment-card__actions">
            <button class="btn btn--ghost btn--small" type="button" data-edit-id="${row.id}">Editar</button>
            ${
              row.status !== "concluido"
                ? `<button class="btn btn--ghost btn--small" type="button" data-finish-id="${row.id}">Concluir</button>`
                : ""
            }
            ${
              row.status !== "cancelado"
                ? `<button class="btn btn--ghost btn--small" type="button" data-cancel-id="${row.id}">Cancelar</button>`
                : ""
            }
            <button class="btn btn--danger btn--small" type="button" data-remove-id="${row.id}">Remover</button>
          </div>
          <p class="treatment-card__description">${row.descricao || "Sem descricao informada."}</p>
          <div class="progress">
            <div class="progress__header">
              <span>Progresso</span>
              <strong>${row.progresso}%</strong>
            </div>
            <div class="progress__track">
              <div class="progress__fill progress__fill--${progressClass(row.progresso)}" style="width:${row.progresso}%"></div>
            </div>
          </div>
          <div class="sessions">
            <div class="sessions__title">Sessoes</div>
            <ul class="sessions__list">${sessionsMarkup}</ul>
          </div>
        </article>
      `.trim();
    })
    .join("");
}

async function loadReferenceData() {
  const { patientFilter, patientSelect, professionalSelect } = getElements();

  const [patients, professionals] = await Promise.all([
    api.get("/pacientes", { query: { status: "ativo" } }),
    api.get("/equipe", { query: { status: "ativo" } }),
  ]);

  const patientRows = Array.isArray(patients) ? patients : [];
  const professionalRows = Array.isArray(professionals) ? professionals : [];

  await populateSelect(patientFilter, patientRows);
  await populateSelect(patientSelect, patientRows);
  await populateSelect(professionalSelect, professionalRows);
}

function updateSessionTreatmentsSelect(rows) {
  const { sessionTreatmentSelect } = getElements();
  if (!sessionTreatmentSelect) return;

  const current = sessionTreatmentSelect.value;
  const base = '<option value="">Selecione</option>';
  const options = rows
    .map((row) => `<option value="${row.id}">${row.nome} · ${row.paciente_nome || "-"}</option>`)
    .join("");

  sessionTreatmentSelect.innerHTML = base + options;
  if ([...sessionTreatmentSelect.options].some((option) => option.value === current)) {
    sessionTreatmentSelect.value = current;
  }
}

export async function loadTratamentos() {
  const { errorBox, searchInput, statusFilter, patientFilter } = getElements();
  clearError(errorBox);
  setListLoading(true);

  try {
    const rows = await api.get("/tratamentos", {
      query: {
        search: searchInput?.value.trim() || "",
        status: statusFilter?.value || "",
        paciente_id: patientFilter?.value || "",
      },
    });

    const list = Array.isArray(rows) ? rows : [];
    lastRowsById = new Map(list.map((row) => [String(row.id), row]));
    renderTreatments(list);
    updateSessionTreatmentsSelect(list);

    const { list: listEl } = getElements();
    listEl?.querySelectorAll("[data-edit-id]").forEach((button) => {
      button.onclick = () => {
        const id = button.getAttribute("data-edit-id");
        const row = id ? lastRowsById.get(String(id)) : null;
        if (!row) return;
        openEditModal(row);
      };
    });

    listEl?.querySelectorAll("[data-finish-id]").forEach((button) => {
      button.onclick = async () => {
        const id = Number(button.getAttribute("data-finish-id"));
        const row = lastRowsById.get(String(id));
        if (!row) return;
        try {
          await api.put(`/tratamentos/${id}`, {
            paciente_id: row.paciente_id,
            profissional_id: row.profissional_id,
            nome: row.nome,
            descricao: row.descricao ?? null,
            data_inicio: row.data_inicio ?? null,
            data_fim: row.data_fim ?? null,
            status: "concluido",
          });
          await loadTratamentos();
          toast.success("Tratamento concluído.");
        } catch (error) {
          setError(errorBox, error?.message || "Erro ao concluir tratamento.");
          toast.error(error?.message || "Erro ao concluir tratamento.");
        }
      };
    });

    listEl?.querySelectorAll("[data-cancel-id]").forEach((button) => {
      button.onclick = async () => {
        const id = Number(button.getAttribute("data-cancel-id"));
        const row = lastRowsById.get(String(id));
        if (!row) return;
        const confirmed = globalThis.confirm("Cancelar este tratamento?");
        if (!confirmed) return;
        try {
          await api.put(`/tratamentos/${id}`, {
            paciente_id: row.paciente_id,
            profissional_id: row.profissional_id,
            nome: row.nome,
            descricao: row.descricao ?? null,
            data_inicio: row.data_inicio ?? null,
            data_fim: row.data_fim ?? null,
            status: "cancelado",
          });
          await loadTratamentos();
          toast.success("Tratamento cancelado.");
        } catch (error) {
          setError(errorBox, error?.message || "Erro ao cancelar tratamento.");
          toast.error(error?.message || "Erro ao cancelar tratamento.");
        }
      };
    });

    listEl?.querySelectorAll("[data-remove-id]").forEach((button) => {
      button.onclick = async () => {
        const id = Number(button.getAttribute("data-remove-id"));
        const row = lastRowsById.get(String(id));
        const confirmed = globalThis.confirm(`Remover o tratamento "${row?.nome || id}"?`);
        if (!confirmed) return;
        try {
          await api.del(`/tratamentos/${id}`);
          await loadTratamentos();
          toast.success("Tratamento removido.");
        } catch (error) {
          setError(errorBox, error?.message || "Erro ao remover tratamento.");
          toast.error(error?.message || "Erro ao remover tratamento.");
        }
      };
    });
  } catch (error) {
    renderTreatments([]);
    updateSessionTreatmentsSelect([]);
    setError(errorBox, error?.message || "Erro ao carregar tratamentos.");
  } finally {
    setListLoading(false);
  }
}

function fillEditForm(row) {
  const { editNome, editDataInicio, editDataFim, editStatus, editDescricao } = getElements();
  if (editNome) editNome.value = row?.nome || "";
  if (editDataInicio) editDataInicio.value = row?.data_inicio ? String(row.data_inicio).slice(0, 10) : "";
  if (editDataFim) editDataFim.value = row?.data_fim ? String(row.data_fim).slice(0, 10) : "";
  if (editStatus) editStatus.value = row?.status || "ativo";
  if (editDescricao) editDescricao.value = row?.descricao || "";
}

function openEditModal(row) {
  editingTreatmentId = row?.id ?? null;
  clearError(getElements().editError);
  fillEditForm(row);
  getModalInstance()?.show();
}

function readEditForm() {
  const { editNome, editDataInicio, editDataFim, editStatus, editDescricao } = getElements();
  return {
    nome: editNome?.value.trim() || "",
    data_inicio: editDataInicio?.value || "",
    data_fim: editDataFim?.value || "",
    status: editStatus?.value || "ativo",
    descricao: editDescricao?.value.trim() || "",
  };
}

async function submitEdit(event) {
  event?.preventDefault();
  const { editError, editSaveButton } = getElements();
  clearError(editError);

  if (!editingTreatmentId) return;

  const current = lastRowsById.get(String(editingTreatmentId));
  if (!current) {
    setError(editError, "Tratamento nao encontrado na lista atual.");
    return;
  }

  const payload = readEditForm();
  const validationError = validateEditTreatmentForm(payload);
  if (validationError) {
    setError(editError, validationError);
    return;
  }

  try {
    if (editSaveButton) editSaveButton.disabled = true;
    await api.put(`/tratamentos/${editingTreatmentId}`, {
      paciente_id: current.paciente_id,
      profissional_id: current.profissional_id,
      nome: payload.nome,
      descricao: payload.descricao || null,
      data_inicio: payload.data_inicio || null,
      data_fim: payload.data_fim || null,
      status: payload.status,
    });
    getModalInstance()?.hide();
    await loadTratamentos();
    toast.success("Tratamento atualizado.");
  } catch (error) {
    setError(editError, error?.message || "Erro ao salvar tratamento.");
    toast.error(error?.message || "Erro ao salvar tratamento.");
  } finally {
    if (editSaveButton) editSaveButton.disabled = false;
  }
}

async function createTreatment(event) {
  event?.preventDefault();

  const { createButton, createForm, formError } = getElements();
  clearError(formError);

  const payload = {
    paciente_id: Number(el("tratamentoPacienteSelect")?.value),
    profissional_id: Number(el("tratamentoProfissionalSelect")?.value),
    nome: el("tratamentoNome")?.value.trim() || "",
    descricao: el("tratamentoDescricao")?.value.trim() || "",
    data_inicio: el("tratamentoDataInicio")?.value || "",
    data_fim: el("tratamentoDataFim")?.value || "",
    status: el("tratamentoStatus")?.value || "ativo",
  };

  const validationError = validateTreatmentForm(payload);
  if (validationError) {
    setError(formError, validationError);
    return;
  }

  try {
    if (createButton) createButton.disabled = true;
    await api.post("/tratamentos", {
      ...payload,
      descricao: payload.descricao || null,
      data_inicio: payload.data_inicio || null,
      data_fim: payload.data_fim || null,
    });
    createForm?.reset();
    const statusField = el("tratamentoStatus");
    if (statusField) statusField.value = "ativo";
    await loadTratamentos();
  } catch (error) {
    setError(formError, error?.message || "Erro ao criar tratamento.");
  } finally {
    if (createButton) createButton.disabled = false;
  }
}

async function createSession(event) {
  event?.preventDefault();

  const { sessionButton, sessionForm, sessionError } = getElements();
  clearError(sessionError);

  const payload = {
    tratamento_id: Number(el("tratamentoSessaoTratamento")?.value),
    data: el("tratamentoSessaoData")?.value || "",
    hora: el("tratamentoSessaoHora")?.value || "",
    status: el("tratamentoSessaoStatus")?.value || "agendada",
    observacoes: el("tratamentoSessaoObservacoes")?.value.trim() || "",
  };

  const validationError = validateSessionForm(payload);
  if (validationError) {
    setError(sessionError, validationError);
    return;
  }

  try {
    if (sessionButton) sessionButton.disabled = true;
    await api.post(`/tratamentos/${payload.tratamento_id}/sessoes`, {
      data_hora: `${payload.data}T${payload.hora}`,
      status: payload.status,
      observacoes: payload.observacoes || null,
    });
    sessionForm?.reset();
    const statusField = el("tratamentoSessaoStatus");
    if (statusField) statusField.value = "agendada";
    await loadTratamentos();
  } catch (error) {
    setError(sessionError, error?.message || "Erro ao criar sessao.");
  } finally {
    if (sessionButton) sessionButton.disabled = false;
  }
}

export async function initTratamentosView() {
  const {
    refreshButton,
    searchButton,
    clearButton,
    searchInput,
    statusFilter,
    patientFilter,
    createForm,
    sessionForm,
    errorBox,
    editForm,
    editModal,
  } = getElements();

  if (refreshButton) refreshButton.onclick = () => loadTratamentos();
  if (searchButton) searchButton.onclick = () => loadTratamentos();
  if (searchInput) {
    searchInput.onkeydown = (event) => {
      if (event.key === "Enter") loadTratamentos();
    };
  }
  if (statusFilter) statusFilter.onchange = () => loadTratamentos();
  if (patientFilter) patientFilter.onchange = () => loadTratamentos();
  if (clearButton) {
    clearButton.onclick = () => {
      if (searchInput) searchInput.value = "";
      if (statusFilter) statusFilter.value = "";
      if (patientFilter) patientFilter.value = "";
      loadTratamentos();
    };
  }
  if (createForm) createForm.onsubmit = createTreatment;
  if (sessionForm) sessionForm.onsubmit = createSession;
  if (editForm) editForm.onsubmit = submitEdit;
  if (editModal && editModal.dataset.boundModal !== "true") {
    editModal.addEventListener("hidden.bs.modal", () => {
      editingTreatmentId = null;
      clearError(getElements().editError);
    });
    editModal.dataset.boundModal = "true";
  }

  try {
    await loadReferenceData();
  } catch (error) {
    setError(errorBox, error?.message || "Erro ao carregar pacientes e profissionais.");
  }

  loadTratamentos();
}
