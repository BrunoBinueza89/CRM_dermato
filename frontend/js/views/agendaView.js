import { api } from "../api.js";
import { toast } from "../toast.js";

function toLocalIso(date = new Date()) {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString();
}

const state = {
  month: toLocalIso().slice(0, 7),
  selectedDate: toLocalIso().slice(0, 10),
};

let isLoadingAgenda = false;

function el(id) {
  return document.getElementById(id);
}

function getElements() {
  return {
    refreshButton: el("refreshButton"),
    errorBox: el("agendaErrorBox"),
    formError: el("agendaFormError"),
    monthLabel: el("agendaMonthLabel"),
    calendar: el("agendaCalendar"),
    listBody: el("agendaTableBody"),
    emptyState: el("agendaEmptyState"),
    prevMonthButton: el("agendaPrevMonth"),
    nextMonthButton: el("agendaNextMonth"),
    clearFiltersButton: el("agendaClearFilters"),
    applyFiltersButton: el("agendaApplyFilters"),
    statusFilter: el("agendaStatusFilter"),
    professionalFilter: el("agendaProfessionalFilter"),
    patientFilter: el("agendaPatientFilter"),
    form: el("agendaCreateForm"),
    createButton: el("agendaCreateButton"),
    pacienteSelect: el("agendaPacienteSelect"),
    profissionalSelect: el("agendaProfissionalSelect"),
    dataInput: el("agendaDataInput"),
    horaInput: el("agendaHoraInput"),
    statusInput: el("agendaStatusInput"),
    descricaoInput: el("agendaDescricaoInput"),
    observacoesInput: el("agendaObservacoesInput"),
    editModal: el("agendaEditModal"),
    editForm: el("agendaEditForm"),
    editError: el("agendaEditFormError"),
    editSaveButton: el("agendaEditSaveButton"),
    editData: el("agendaEditData"),
    editHora: el("agendaEditHora"),
    editStatus: el("agendaEditStatus"),
    editDescricao: el("agendaEditDescricao"),
    editObservacoes: el("agendaEditObservacoes"),
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

function setAgendaLoading(isLoading) {
  const {
    refreshButton,
    prevMonthButton,
    nextMonthButton,
    clearFiltersButton,
    applyFiltersButton,
    statusFilter,
    professionalFilter,
    patientFilter,
    emptyState,
    listBody,
  } = getElements();

  isLoadingAgenda = isLoading;

  if (refreshButton) refreshButton.disabled = isLoading;
  if (prevMonthButton) prevMonthButton.disabled = isLoading;
  if (nextMonthButton) nextMonthButton.disabled = isLoading;
  if (clearFiltersButton) clearFiltersButton.disabled = isLoading;
  if (applyFiltersButton) applyFiltersButton.disabled = isLoading;
  if (statusFilter) statusFilter.disabled = isLoading;
  if (professionalFilter) professionalFilter.disabled = isLoading;
  if (patientFilter) patientFilter.disabled = isLoading;

  if (isLoading) {
    if (listBody) listBody.innerHTML = "";
    if (emptyState) {
      emptyState.textContent = "Carregando agenda...";
      emptyState.classList.remove("is-hidden");
    }
  } else if (emptyState) {
    emptyState.textContent = "Nenhuma consulta encontrada para os filtros atuais.";
  }
}

function formatMonthLabel(month) {
  const [year, mon] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, mon - 1, 1));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function validateForm() {
  const { pacienteSelect, profissionalSelect, dataInput, horaInput } = getElements();
  if (!pacienteSelect?.value) return "Selecione um paciente.";
  if (!profissionalSelect?.value) return "Selecione um profissional.";
  if (!dataInput?.value) return "Informe a data da consulta.";
  if (!horaInput?.value) return "Informe o horario da consulta.";
  if (new Date(`${dataInput.value}T${horaInput.value}:00`).getTime() < Date.now()) {
    return "Nao e permitido agendar consulta no passado.";
  }
  return "";
}

function getDateCounts(rows) {
  const counts = new Map();
  for (const row of rows) {
    const key = String(row.data_hora).slice(0, 10);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function renderCalendar(rows) {
  const { calendar, monthLabel } = getElements();
  if (!calendar || !monthLabel) return;

  monthLabel.textContent = formatMonthLabel(state.month);

  const [year, month] = state.month.split("-").map(Number);
  const first = new Date(year, month - 1, 1);
  const firstDay = (first.getDay() + 6) % 7;
  const totalDays = new Date(year, month, 0).getDate();
  const counts = getDateCounts(rows);

  const cells = [];
  for (let i = 0; i < firstDay; i += 1) {
    cells.push('<div class="calendar__cell calendar__cell--empty"></div>');
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const date = `${state.month}-${String(day).padStart(2, "0")}`;
    const count = counts.get(date) || 0;
    const isSelected = state.selectedDate === date;

    cells.push(`
      <button class="calendar__cell ${isSelected ? "is-selected" : ""}" type="button" data-calendar-date="${date}">
        <span class="calendar__day">${day}</span>
        <span class="calendar__count">${count ? `${count} consulta${count > 1 ? "s" : ""}` : "Livre"}</span>
      </button>
    `);
  }

  calendar.innerHTML = cells.join("");

  calendar.querySelectorAll("[data-calendar-date]").forEach((button) => {
    button.onclick = () => {
      state.selectedDate = button.getAttribute("data-calendar-date") || state.selectedDate;
      const { dataInput } = getElements();
      if (dataInput) dataInput.value = state.selectedDate;
      loadAgenda();
    };
  });
}

function renderRows(rows) {
  const { listBody, emptyState } = getElements();
  if (!listBody || !emptyState) return;

  listBody.innerHTML = "";

  if (!Array.isArray(rows) || rows.length === 0) {
    emptyState.classList.remove("is-hidden");
    return;
  }

  emptyState.classList.add("is-hidden");

  for (const row of rows) {
    const tr = document.createElement("tr");
    const canManage = row.status !== "cancelada";
    tr.innerHTML = `
      <td>${formatDateTime(row.data_hora)}</td>
      <td>${row.paciente_nome || "-"}</td>
      <td>${row.profissional_nome || "-"}</td>
      <td>${row.descricao || "-"}</td>
      <td><span class="status-badge status-badge--${row.status}">${row.status || "-"}</span></td>
      <td class="table-actions">
        <button class="btn btn--ghost btn--small" type="button" data-edit-id="${row.id}">Editar</button>
        ${
          canManage
            ? `<button class="btn btn--ghost btn--small" type="button" data-done-id="${row.id}">Realizada</button>
               <button class="btn btn--ghost btn--small" type="button" data-cancel-id="${row.id}">Cancelar</button>`
            : ""
        }
      </td>
    `.trim();
    listBody.appendChild(tr);
  }
}

function getModalInstance() {
  const { editModal } = getElements();
  if (!editModal || !globalThis.bootstrap?.Modal) return null;
  return globalThis.bootstrap.Modal.getOrCreateInstance(editModal);
}

let lastRowsById = new Map();
let editingId = null;

function fillEditForm(row) {
  const { editData, editHora, editStatus, editDescricao, editObservacoes } = getElements();
  const iso = String(row?.data_hora || "");
  const date = iso ? iso.slice(0, 10) : "";
  const time = iso ? iso.slice(11, 16) : "";

  if (editData) editData.value = date;
  if (editHora) editHora.value = time;
  if (editStatus) editStatus.value = row?.status || "agendada";
  if (editDescricao) editDescricao.value = row?.descricao || "";
  if (editObservacoes) editObservacoes.value = row?.observacoes || "";
}

function openEditModal(row) {
  editingId = row?.id ?? null;
  clearError(getElements().editError);
  fillEditForm(row);
  getModalInstance()?.show();
}

function readEditForm() {
  const { editData, editHora, editStatus, editDescricao, editObservacoes } = getElements();
  return {
    data: editData?.value || "",
    hora: editHora?.value || "",
    status: editStatus?.value || "agendada",
    descricao: editDescricao?.value.trim() || "",
    observacoes: editObservacoes?.value.trim() || "",
  };
}

function validateEdit(payload) {
  if (!payload.data) return "Informe a data.";
  if (!payload.hora) return "Informe o horario.";
  if (payload.status !== "agendada" && payload.status !== "realizada" && payload.status !== "cancelada") {
    return "Status invalido.";
  }
  if (payload.status === "agendada" && new Date(`${payload.data}T${payload.hora}:00`).getTime() < Date.now()) {
    return "Nao e permitido agendar consulta no passado.";
  }
  return "";
}

async function saveConsultaChanges(id, changes) {
  const row = lastRowsById.get(String(id));
  if (!row) throw new Error("Consulta nao encontrada na lista atual.");

  await api.put(`/consultas/${id}`, {
    paciente_id: row.paciente_id,
    profissional_id: row.profissional_id,
    data_hora: changes.data_hora || String(row.data_hora).slice(0, 16),
    status: changes.status || row.status,
    descricao: changes.descricao === undefined ? row.descricao : changes.descricao,
    observacoes: changes.observacoes === undefined ? row.observacoes : changes.observacoes,
  });
}

async function populateSelect(select, rows, labelKey = "nome") {
  if (!select) return;
  const current = select.value;
  const baseOption = select.querySelector('option[value=""]')?.outerHTML || '<option value="">Todos</option>';
  const extraOptions = rows
    .map((item) => `<option value="${item.id}">${item[labelKey]}</option>`)
    .join("");
  select.innerHTML = baseOption + extraOptions;
  if ([...select.options].some((option) => option.value === current)) select.value = current;
}

async function loadFilterOptions() {
  const { patientFilter, professionalFilter, pacienteSelect, profissionalSelect } = getElements();

  const [patients, professionals] = await Promise.all([
    api.get("/pacientes", { query: { status: "ativo" } }),
    api.get("/equipe", { query: { status: "ativo" } }),
  ]);

  await populateSelect(patientFilter, Array.isArray(patients) ? patients : []);
  await populateSelect(pacienteSelect, Array.isArray(patients) ? patients : []);
  await populateSelect(professionalFilter, Array.isArray(professionals) ? professionals : []);
  await populateSelect(profissionalSelect, Array.isArray(professionals) ? professionals : []);
}

export async function loadAgenda() {
  const { errorBox, statusFilter, professionalFilter, patientFilter } = getElements();
  clearError(errorBox);
  setAgendaLoading(true);

  try {
    const rows = await api.get("/consultas", {
      query: {
        month: state.month,
        date: state.selectedDate,
        status: statusFilter?.value || "",
        profissional_id: professionalFilter?.value || "",
        paciente_id: patientFilter?.value || "",
      },
    });

    const monthlyRows = await api.get("/consultas", {
      query: {
        month: state.month,
        status: statusFilter?.value || "",
        profissional_id: professionalFilter?.value || "",
        paciente_id: patientFilter?.value || "",
      },
    });

    renderCalendar(Array.isArray(monthlyRows) ? monthlyRows : []);
    const listRows = Array.isArray(rows) ? rows : [];
    lastRowsById = new Map(listRows.map((row) => [String(row.id), row]));
    renderRows(listRows);

    const { listBody } = getElements();
    listBody?.querySelectorAll("[data-edit-id]").forEach((button) => {
      button.onclick = () => {
        const id = button.getAttribute("data-edit-id");
        const row = id ? lastRowsById.get(String(id)) : null;
        if (row) openEditModal(row);
      };
    });

    listBody?.querySelectorAll("[data-done-id]").forEach((button) => {
      button.onclick = async () => {
        const id = Number(button.getAttribute("data-done-id"));
        if (!id) return;
        try {
          await saveConsultaChanges(id, { status: "realizada" });
          await loadAgenda();
          toast.success("Consulta marcada como realizada.");
        } catch (error) {
          setError(errorBox, error?.message || "Erro ao atualizar consulta.");
          toast.error(error?.message || "Erro ao atualizar consulta.");
        }
      };
    });

    listBody?.querySelectorAll("[data-cancel-id]").forEach((button) => {
      button.onclick = async () => {
        const id = Number(button.getAttribute("data-cancel-id"));
        if (!id) return;
        const confirmed = globalThis.confirm("Cancelar esta consulta?");
        if (!confirmed) return;
        try {
          await saveConsultaChanges(id, { status: "cancelada" });
          await loadAgenda();
          toast.success("Consulta cancelada.");
        } catch (error) {
          setError(errorBox, error?.message || "Erro ao cancelar consulta.");
          toast.error(error?.message || "Erro ao cancelar consulta.");
        }
      };
    });
  } catch (error) {
    renderCalendar([]);
    renderRows([]);
    setError(errorBox, error?.message || "Erro ao carregar agenda.");
  } finally {
    setAgendaLoading(false);
  }
}

async function submitEdit(event) {
  event?.preventDefault();
  const { editError, editSaveButton } = getElements();
  clearError(editError);

  if (!editingId) return;

  const payload = readEditForm();
  const validationError = validateEdit(payload);
  if (validationError) {
    setError(editError, validationError);
    return;
  }

  try {
    if (editSaveButton) editSaveButton.disabled = true;
    await saveConsultaChanges(editingId, {
      data_hora: `${payload.data}T${payload.hora}`,
      status: payload.status,
      descricao: payload.descricao || null,
      observacoes: payload.observacoes || null,
    });
    getModalInstance()?.hide();
    await loadAgenda();
    toast.success("Consulta atualizada.");
  } catch (error) {
    setError(editError, error?.message || "Erro ao salvar consulta.");
    toast.error(error?.message || "Erro ao salvar consulta.");
  } finally {
    if (editSaveButton) editSaveButton.disabled = false;
  }
}

async function submitAppointment(event) {
  event?.preventDefault();

  const {
    formError,
    createButton,
    pacienteSelect,
    profissionalSelect,
    dataInput,
    horaInput,
    statusInput,
    descricaoInput,
    observacoesInput,
    form,
  } = getElements();

  clearError(formError);

  const validationError = validateForm();
  if (validationError) {
    setError(formError, validationError);
    return;
  }

  try {
    if (createButton) createButton.disabled = true;
    await api.post("/consultas", {
      paciente_id: Number(pacienteSelect?.value),
      profissional_id: Number(profissionalSelect?.value),
      data_hora: `${dataInput?.value}T${horaInput?.value}`,
      status: statusInput?.value || "agendada",
      descricao: descricaoInput?.value.trim() || null,
      observacoes: observacoesInput?.value.trim() || null,
    });

    form?.reset();
    if (statusInput) statusInput.value = "agendada";
    state.selectedDate = dataInput?.value || state.selectedDate;
    if (dataInput) dataInput.value = state.selectedDate;
    await loadAgenda();
  } catch (error) {
    setError(formError, error?.message || "Erro ao agendar consulta.");
  } finally {
    if (createButton) createButton.disabled = false;
  }
}

function shiftMonth(step) {
  const [year, month] = state.month.split("-").map(Number);
  const date = new Date(year, month - 1 + step, 1);
  state.month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  const selectedPrefix = state.selectedDate.slice(0, 7);
  if (selectedPrefix !== state.month) {
    state.selectedDate = `${state.month}-01`;
  }
  const { dataInput } = getElements();
  if (dataInput) dataInput.value = state.selectedDate;
  loadAgenda();
}

export async function initAgendaView() {
  const {
    refreshButton,
    prevMonthButton,
    nextMonthButton,
    clearFiltersButton,
    applyFiltersButton,
    statusFilter,
    professionalFilter,
    patientFilter,
    form,
    dataInput,
    statusInput,
    editForm,
    editModal,
  } = getElements();

  if (dataInput && !dataInput.value) dataInput.value = state.selectedDate;
  if (statusInput && !statusInput.value) statusInput.value = "agendada";

  if (refreshButton) refreshButton.onclick = () => loadAgenda();
  if (prevMonthButton) prevMonthButton.onclick = () => shiftMonth(-1);
  if (nextMonthButton) nextMonthButton.onclick = () => shiftMonth(1);
  if (applyFiltersButton) applyFiltersButton.onclick = () => loadAgenda();
  if (statusFilter) statusFilter.onchange = () => loadAgenda();
  if (professionalFilter) professionalFilter.onchange = () => loadAgenda();
  if (patientFilter) patientFilter.onchange = () => loadAgenda();
  if (clearFiltersButton) {
    clearFiltersButton.onclick = () => {
      if (statusFilter) statusFilter.value = "";
      if (professionalFilter) professionalFilter.value = "";
      if (patientFilter) patientFilter.value = "";
      loadAgenda();
    };
  }
  if (form) form.onsubmit = submitAppointment;
  if (editForm) editForm.onsubmit = submitEdit;
  if (editModal && editModal.dataset.boundModal !== "true") {
    editModal.addEventListener("hidden.bs.modal", () => {
      editingId = null;
      clearError(getElements().editError);
    });
    editModal.dataset.boundModal = "true";
  }

  try {
    await loadFilterOptions();
  } catch (error) {
    setError(getElements().errorBox, error?.message || "Erro ao carregar pacientes e profissionais.");
  }

  loadAgenda();
}
