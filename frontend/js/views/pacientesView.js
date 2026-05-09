import { api } from "../api.js";
import { toast } from "../toast.js";

function el(id) {
  return document.getElementById(id);
}

function getCreateModalInstance() {
  const modalElement = el("newPatientModal");
  if (!modalElement || !globalThis.bootstrap?.Modal) return null;
  return globalThis.bootstrap.Modal.getOrCreateInstance(modalElement);
}

function getListElements() {
  return {
    searchInput: el("patientSearchInput"),
    searchButton: el("patientSearchButton"),
    clearButton: el("patientClearButton"),
    refreshButton: el("refreshButton"),
    errorBox: el("patientsErrorBox"),
    cards: el("patientsCards"),
    emptyState: el("patientsEmptyState"),
    pager: el("patientsPager"),
    pagerPrev: el("patientsPagerPrev"),
    pagerNext: el("patientsPagerNext"),
    pagerLabel: el("patientsPagerLabel"),
    form: el("patientCreateForm"),
    submitButton: el("patientCreateButton"),
    formError: el("patientFormError"),
  };
}

function getProfileElements() {
  return {
    loading: el("patientProfileLoading"),
    content: el("patientProfileContent"),
    errorBox: el("patientProfileErrorBox"),
    title: el("patientProfileTitle"),
    subtitle: el("patientProfileSubtitle"),
    form: el("patientProfileForm"),
    deleteButton: el("patientDeleteButton"),
    backButton: el("patientBackButton"),
  };
}

function getProfileIdFromHash() {
  const match = globalThis.location.hash.match(/^#\/pacientes\/(\d+)$/);
  return match ? Number.parseInt(match[1], 10) : null;
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

function readCreateForm() {
  return {
    nome: el("patientCreateNome")?.value.trim() || "",
    email: el("patientCreateEmail")?.value.trim() || "",
    telefone: el("patientCreateTelefone")?.value.trim() || "",
    data_nascimento: el("patientCreateNascimento")?.value || "",
    status: el("patientCreateStatus")?.value || "ativo",
    observacoes: el("patientCreateObservacoes")?.value.trim() || "",
  };
}

function readProfileForm() {
  return {
    nome: el("patientProfileNome")?.value.trim() || "",
    email: el("patientProfileEmail")?.value.trim() || "",
    telefone: el("patientProfileTelefone")?.value.trim() || "",
    data_nascimento: el("patientProfileNascimento")?.value || "",
    status: el("patientProfileStatus")?.value || "ativo",
    observacoes: el("patientProfileObservacoes")?.value.trim() || "",
  };
}

function validatePaciente(payload) {
  if (!payload.nome) return "Informe o nome do paciente.";
  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) return "Informe um email valido.";
  if (payload.data_nascimento && !/^\d{4}-\d{2}-\d{2}$/.test(payload.data_nascimento)) {
    return "Use a data no formato YYYY-MM-DD.";
  }
  if (payload.status !== "ativo" && payload.status !== "inativo") return "Selecione um status valido.";
  return "";
}

function normalizePayload(payload) {
  return {
    nome: payload.nome,
    email: payload.email || null,
    telefone: payload.telefone || null,
    data_nascimento: payload.data_nascimento || null,
    status: payload.status,
    observacoes: payload.observacoes || null,
  };
}

let currentPage = 1;
const pageSize = 20;
let lastPagination = null;
let isLoadingList = false;

function setListLoading(isLoading) {
  const { searchButton, refreshButton, searchInput, emptyState } = getListElements();
  isLoadingList = isLoading;
  if (searchButton) searchButton.disabled = isLoading;
  if (refreshButton) refreshButton.disabled = isLoading;
  if (searchInput) searchInput.disabled = isLoading;

  if (isLoading && emptyState) {
    emptyState.textContent = "Carregando pacientes...";
    emptyState.classList.remove("is-hidden");
  } else if (emptyState) {
    emptyState.textContent = "Nenhum paciente encontrado.";
  }
}

function normalizePagedResponse(payload) {
  if (Array.isArray(payload)) {
    return { data: payload, pagination: null };
  }

  if (payload && typeof payload === "object" && Array.isArray(payload.data)) {
    return { data: payload.data, pagination: payload.pagination || null };
  }

  return { data: [], pagination: null };
}

function renderPager(pagination) {
  const { pager, pagerPrev, pagerNext, pagerLabel } = getListElements();
  lastPagination = pagination || null;

  if (!pager || !pagerPrev || !pagerNext || !pagerLabel) return;

  if (!pagination) {
    pager.classList.add("is-hidden");
    return;
  }

  pager.classList.remove("is-hidden");
  const totalPages = Number(pagination.totalPages || 1);
  const page = Number(pagination.page || 1);
  const total = Number(pagination.total || 0);

  pagerLabel.textContent = `Pagina ${page} de ${totalPages} (Total: ${total})`;
  pagerPrev.disabled = page <= 1;
  pagerNext.disabled = page >= totalPages;
}

function renderRows(rows, pagination) {
  const { cards, emptyState } = getListElements();
  if (!cards || !emptyState) return;

  cards.innerHTML = "";

  if (!Array.isArray(rows) || rows.length === 0) {
    emptyState.classList.remove("is-hidden");
    renderPager(pagination);
    return;
  }

  emptyState.classList.add("is-hidden");
  renderPager(pagination);

  const formatDate = (value) => {
    if (!value) return "-";
    return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
  };

  const getAgeText = (value) => {
    if (!value) return "";
    const date = new Date(String(value).slice(0, 10));
    if (Number.isNaN(date.getTime())) return "";
    const now = new Date();
    let age = now.getFullYear() - date.getFullYear();
    const m = now.getMonth() - date.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < date.getDate())) age -= 1;
    if (age < 0 || age > 120) return "";
    return `${age} anos`;
  };

  for (const row of rows) {
    const status = row.status === "inativo" ? "inativo" : "ativo";
    const ageText = getAgeText(row.data_nascimento);
    const subtitle = [ageText].filter(Boolean).join(" • ");

    const card = document.createElement("article");
    card.className = "patient-card";
    card.innerHTML = `
      <div class="patient-card__top">
        <div class="patient-card__avatar"><i class="bi bi-person" aria-hidden="true"></i></div>
        <div class="patient-card__head">
          <div class="patient-card__name">${row.nome ?? "-"}</div>
          <div class="patient-card__sub">${subtitle || " "}</div>
        </div>
        <span class="pill pill--${status === "ativo" ? "success" : "muted"}">${status === "ativo" ? "Ativo" : "Inativo"}</span>
      </div>

      <div class="patient-card__contacts">
        <div class="patient-card__contact"><i class="bi bi-envelope" aria-hidden="true"></i> <span>${row.email ?? "-"}</span></div>
        <div class="patient-card__contact"><i class="bi bi-telephone" aria-hidden="true"></i> <span>${row.telefone ?? "-"}</span></div>
      </div>

      <div class="patient-card__dates">
        <div class="patient-card__date">
          <div class="patient-card__date-label">Ultima consulta:</div>
          <div class="patient-card__date-value">${formatDate(row.ultima_consulta)}</div>
        </div>
        <div class="patient-card__date">
          <div class="patient-card__date-label">Proxima consulta:</div>
          <div class="patient-card__date-value">${formatDate(row.proxima_consulta)}</div>
        </div>
      </div>

      <div class="patient-card__actions">
        <button class="btn btn--small" type="button" data-edit-id="${row.id}">Editar</button>
        <button class="btn btn--danger btn--small" type="button" data-remove-id="${row.id}">Deletar</button>
      </div>
    `.trim();

    cards.appendChild(card);
  }

  cards.querySelectorAll("[data-edit-id]").forEach((button) => {
    button.onclick = () => {
      const id = button.getAttribute("data-edit-id");
      if (!id) return;
      globalThis.location.hash = `#/pacientes/${id}`;
    };
  });

  cards.querySelectorAll("[data-remove-id]").forEach((button) => {
    button.onclick = async () => {
      const id = button.getAttribute("data-remove-id");
      if (!id) return;
      const confirmed = globalThis.confirm("Deseja remover este paciente?");
      if (!confirmed) return;
      try {
        await api.del(`/pacientes/${id}`);
        await loadPacientes();
        toast.success("Paciente removido.");
      } catch (error) {
        const { errorBox } = getListElements();
        setError(errorBox, error?.message || "Erro ao remover paciente.");
        toast.error(error?.message || "Erro ao remover paciente.");
      }
    };
  });
}

export async function loadPacientes() {
  const { searchInput, errorBox } = getListElements();
  clearError(errorBox);
  setListLoading(true);

  try {
    const payload = await api.get("/pacientes", {
      query: {
        search: searchInput?.value.trim() || "",
        page: String(currentPage),
        pageSize: String(pageSize),
      },
    });

    const { data, pagination } = normalizePagedResponse(payload);
    renderRows(data, pagination);
  } catch (error) {
    renderRows([], lastPagination);
    setError(errorBox, error?.message || "Erro ao carregar pacientes.");
  } finally {
    setListLoading(false);
  }
}

async function createPaciente(event) {
  event?.preventDefault();

  const { form, submitButton, formError } = getListElements();
  clearError(formError);

  const rawPayload = readCreateForm();
  const validationError = validatePaciente(rawPayload);
  if (validationError) {
    setError(formError, validationError);
    return;
  }

  try {
    if (submitButton) submitButton.disabled = true;
    const created = await api.post("/pacientes", normalizePayload(rawPayload));
    form?.reset();
    const statusField = el("patientCreateStatus");
    if (statusField) statusField.value = "ativo";
    await loadPacientes();
    toast.success("Paciente cadastrado.");
    getCreateModalInstance()?.hide();
    if (created?.id) globalThis.location.hash = `#/pacientes/${created.id}`;
  } catch (error) {
    setError(formError, error?.message || "Erro ao cadastrar paciente.");
    toast.error(error?.message || "Erro ao cadastrar paciente.");
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

function fillProfileForm(paciente) {
  const { title, subtitle } = getProfileElements();
  if (title) title.textContent = paciente?.nome || "Perfil do paciente";
  if (subtitle) subtitle.textContent = `Paciente #${paciente?.id ?? "-"}`;

  const fields = {
    patientProfileNome: paciente?.nome || "",
    patientProfileEmail: paciente?.email || "",
    patientProfileTelefone: paciente?.telefone || "",
    patientProfileNascimento: paciente?.data_nascimento ? String(paciente.data_nascimento).slice(0, 10) : "",
    patientProfileStatus: paciente?.status || "ativo",
    patientProfileObservacoes: paciente?.observacoes || "",
  };

  for (const [id, value] of Object.entries(fields)) {
    const field = el(id);
    if (field) field.value = value;
  }
}

async function updatePaciente(event) {
  event?.preventDefault();

  const id = getProfileIdFromHash();
  const { form, errorBox } = getProfileElements();
  if (!id || !form) return;

  clearError(errorBox);

  const rawPayload = readProfileForm();
  const validationError = validatePaciente(rawPayload);
  if (validationError) {
    setError(errorBox, validationError);
    return;
  }

  try {
    const updated = await api.put(`/pacientes/${id}`, normalizePayload(rawPayload));
    fillProfileForm(updated);
    await loadPacientes();
    toast.success("Paciente atualizado.");
  } catch (error) {
    setError(errorBox, error?.message || "Erro ao atualizar paciente.");
    toast.error(error?.message || "Erro ao atualizar paciente.");
  }
}

async function deletePaciente() {
  const id = getProfileIdFromHash();
  const { deleteButton, errorBox } = getProfileElements();
  if (!id) return;

  clearError(errorBox);

  const confirmed = globalThis.confirm("Deseja remover este paciente?");
  if (!confirmed) return;

  try {
    if (deleteButton) deleteButton.disabled = true;
    await api.del(`/pacientes/${id}`);
    await loadPacientes();
    globalThis.location.hash = "#/pacientes";
    toast.success("Paciente removido.");
  } catch (error) {
    setError(errorBox, error?.message || "Erro ao remover paciente.");
    toast.error(error?.message || "Erro ao remover paciente.");
  } finally {
    if (deleteButton) deleteButton.disabled = false;
  }
}

export async function loadPacientePerfil() {
  const id = getProfileIdFromHash();
  const { loading, content, errorBox } = getProfileElements();

  clearError(errorBox);
  if (loading) loading.classList.remove("is-hidden");
  if (content) content.classList.add("is-hidden");

  if (!id) {
    setError(errorBox, "Paciente invalido.");
    if (loading) loading.classList.add("is-hidden");
    return;
  }

  try {
    const paciente = await api.get(`/pacientes/${id}`);
    fillProfileForm(paciente);
    if (content) content.classList.remove("is-hidden");
  } catch (error) {
    setError(errorBox, error?.message || "Erro ao carregar perfil do paciente.");
  } finally {
    if (loading) loading.classList.add("is-hidden");
  }
}

export function initPacientesView() {
  const {
    searchButton,
    refreshButton,
    searchInput,
    form,
    pagerPrev,
    pagerNext,
    formError,
  } = getListElements();

  const run = () => loadPacientes();

  if (searchButton) searchButton.onclick = () => {
    currentPage = 1;
    run();
  };
  if (refreshButton) refreshButton.onclick = run;
  if (searchInput) {
    searchInput.onkeydown = (event) => {
      if (event.key === "Enter") {
        currentPage = 1;
        run();
      }
    };
  }
  if (form) form.onsubmit = createPaciente;

  const modalElement = el("newPatientModal");
  if (modalElement && modalElement.dataset.boundModal !== "true") {
    modalElement.addEventListener("hidden.bs.modal", () => {
      clearError(formError);
      form?.reset();
      const statusField = el("patientCreateStatus");
      if (statusField) statusField.value = "ativo";
    });
    modalElement.dataset.boundModal = "true";
  }

  if (pagerPrev) {
    pagerPrev.onclick = () => {
      currentPage = Math.max(1, currentPage - 1);
      run();
    };
  }

  if (pagerNext) {
    pagerNext.onclick = () => {
      const totalPages = Number(lastPagination?.totalPages || 1);
      currentPage = Math.min(totalPages, currentPage + 1);
      run();
    };
  }

  run();
}

export function initPacientePerfilView() {
  const { form, deleteButton, backButton, refreshButton } = getProfileElements();

  if (form) form.onsubmit = updatePaciente;
  if (deleteButton) deleteButton.onclick = deletePaciente;
  if (backButton) backButton.onclick = () => {
    globalThis.location.hash = "#/pacientes";
  };
  if (refreshButton) refreshButton.onclick = () => loadPacientePerfil();

  loadPacientePerfil();
}
