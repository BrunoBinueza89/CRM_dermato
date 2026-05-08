import { api } from "../api.js";
import { toast } from "../toast.js";

function el(id) {
  return document.getElementById(id);
}

function getModalInstance() {
  const modalElement = el("newMemberModal");
  if (!modalElement || !globalThis.bootstrap?.Modal) return null;
  return globalThis.bootstrap.Modal.getOrCreateInstance(modalElement);
}

let lastRowsById = new Map();
let editingMemberId = null;
let currentPage = 1;
const pageSize = 20;
let lastPagination = null;
let isLoadingList = false;

function setListLoading(isLoading) {
  const searchInput = el("searchInput");
  const statusSelect = el("statusSelect");
  const searchButton = el("searchButton");
  const clearButton = el("clearButton");
  const refreshButton = el("refreshButton");
  const emptyState = el("equipeEmptyState");

  isLoadingList = isLoading;
  if (searchInput) searchInput.disabled = isLoading;
  if (statusSelect) statusSelect.disabled = isLoading;
  if (searchButton) searchButton.disabled = isLoading;
  if (clearButton) clearButton.disabled = isLoading;
  if (refreshButton) refreshButton.disabled = isLoading;

  if (isLoading && emptyState) {
    emptyState.textContent = "Carregando equipe...";
    emptyState.classList.remove("is-hidden");
  } else if (emptyState) {
    emptyState.textContent = "Nenhum profissional encontrado";
  }
}

function showError(message) {
  const box = el("errorBox");
  if (!box) return;
  box.textContent = message;
  box.classList.remove("is-hidden");
}

function clearError() {
  const box = el("errorBox");
  if (!box) return;
  box.textContent = "";
  box.classList.add("is-hidden");
}

function showFormError(message) {
  const box = el("memberFormError");
  if (!box) return;
  box.textContent = message;
  box.classList.remove("is-hidden");
}

function clearFormError() {
  const box = el("memberFormError");
  if (!box) return;
  box.textContent = "";
  box.classList.add("is-hidden");
}

function renderRows(rows) {
  const tbody = el("equipeTableBody");
  const emptyState = el("equipeEmptyState");
  const pager = el("equipePager");
  const pagerPrev = el("equipePagerPrev");
  const pagerNext = el("equipePagerNext");
  const pagerLabel = el("equipePagerLabel");
  if (!tbody) return;

  tbody.innerHTML = "";
  if (!Array.isArray(rows) || rows.length === 0) {
    emptyState?.classList.remove("is-hidden");
    pager?.classList.add("is-hidden");
    return;
  }

  emptyState?.classList.add("is-hidden");
  lastRowsById = new Map(rows.map((row) => [String(row.id), row]));
  if (pager && lastPagination) {
    pager.classList.remove("is-hidden");
    const totalPages = Number(lastPagination.totalPages || 1);
    const page = Number(lastPagination.page || 1);
    const total = Number(lastPagination.total || 0);
    if (pagerLabel) pagerLabel.textContent = `Pagina ${page} de ${totalPages} (Total: ${total})`;
    if (pagerPrev) pagerPrev.disabled = page <= 1;
    if (pagerNext) pagerNext.disabled = page >= totalPages;
  } else {
    pager?.classList.add("is-hidden");
  }

  for (const row of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.id ?? ""}</td>
      <td>${row.nome ?? ""}</td>
      <td>${row.cargo ?? ""}</td>
      <td>${row.email ?? ""}</td>
      <td>${row.telefone ?? "-"}</td>
      <td>${row.especialidade ?? "-"}</td>
      <td><span class="status-badge status-badge--${row.status}">${row.status ?? "-"}</span></td>
      <td class="table-actions">
        <button class="btn btn--ghost btn--small" type="button" data-edit-id="${row.id}">Editar</button>
        <button class="btn btn--danger btn--small" type="button" data-remove-id="${row.id}">Remover</button>
      </td>
    `.trim();
    tbody.appendChild(tr);
  }

  tbody.querySelectorAll("[data-edit-id]").forEach((button) => {
    button.onclick = () => {
      const id = button.getAttribute("data-edit-id");
      const row = id ? lastRowsById.get(String(id)) : null;
      if (!row) return;
      openEditModal(row);
    };
  });

  tbody.querySelectorAll("[data-remove-id]").forEach((button) => {
    button.onclick = async () => {
      const id = button.getAttribute("data-remove-id");
      const row = id ? lastRowsById.get(String(id)) : null;
      const confirmed = globalThis.confirm(`Remover "${row?.nome || id}" da equipe?`);
      if (!confirmed) return;
      try {
        await api.del(`/equipe/${id}`);
        await loadEquipe({
          search: (el("searchInput")?.value || "").trim(),
          status: el("statusSelect")?.value || "",
        });
        toast.success("Membro removido.");
      } catch (error) {
        showError(error?.message || "Erro ao remover membro.");
        toast.error(error?.message || "Erro ao remover membro.");
      }
    };
  });
}

export async function loadEquipe({ search = "", status = "" } = {}) {
  clearError();
  setListLoading(true);
  try {
    const payload = await api.get("/equipe", { query: { search, status, page: String(currentPage), pageSize: String(pageSize) } });
    if (Array.isArray(payload)) {
      lastPagination = null;
      renderRows(payload);
      return;
    }

    const rows = payload && typeof payload === "object" && Array.isArray(payload.data) ? payload.data : [];
    lastPagination = payload?.pagination || null;
    renderRows(rows);
  } catch (error) {
    lastPagination = null;
    renderRows([]);
    showError(error?.message || "Erro ao carregar equipe.");
  } finally {
    setListLoading(false);
  }
}

function readFormData() {
  return {
    nome: el("memberNome")?.value.trim() || "",
    cargo: el("memberCargo")?.value.trim() || "",
    email: el("memberEmail")?.value.trim() || "",
    telefone: el("memberTelefone")?.value.trim() || "",
    especialidade: el("memberEspecialidade")?.value.trim() || "",
    status: el("memberStatus")?.value || "ativo",
  };
}

function validateForm(data) {
  if (!data.nome) return "Informe o nome do profissional.";
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return "Informe um email valido.";
  if (data.status !== "ativo" && data.status !== "inativo") return "Selecione um status valido.";
  return "";
}

async function submitMemberForm(event) {
  event?.preventDefault();
  clearFormError();

  const saveButton = el("saveMemberButton");
  const form = el("memberForm");
  const data = readFormData();
  const validationError = validateForm(data);

  if (validationError) {
    showFormError(validationError);
    return;
  }

  try {
    if (saveButton) saveButton.disabled = true;
    const payload = {
      nome: data.nome,
      cargo: data.cargo || null,
      email: data.email || null,
      telefone: data.telefone || null,
      especialidade: data.especialidade || null,
      status: data.status,
    };

    if (editingMemberId) {
      await api.put(`/equipe/${editingMemberId}`, payload);
      toast.success("Membro atualizado.");
    } else {
      await api.post("/equipe", payload);
      toast.success("Membro criado.");
    }

    form?.reset();
    const statusField = el("memberStatus");
    if (statusField) statusField.value = "ativo";
    editingMemberId = null;
    const title = el("newMemberModalLabel");
    if (title) title.textContent = "Novo membro da equipe";
    getModalInstance()?.hide();
    await loadEquipe({
      search: (el("searchInput")?.value || "").trim(),
      status: el("statusSelect")?.value || "",
    });
  } catch (error) {
    showFormError(error?.message || "Erro ao salvar membro.");
    toast.error(error?.message || "Erro ao salvar membro.");
  } finally {
    if (saveButton) saveButton.disabled = false;
  }
}

function openEditModal(row) {
  editingMemberId = row?.id ?? null;
  const title = el("newMemberModalLabel");
  if (title) title.textContent = "Editar membro da equipe";

  const fields = {
    memberNome: row?.nome || "",
    memberCargo: row?.cargo || "",
    memberEmail: row?.email || "",
    memberTelefone: row?.telefone || "",
    memberEspecialidade: row?.especialidade || "",
    memberStatus: row?.status || "ativo",
  };

  for (const [id, value] of Object.entries(fields)) {
    const field = el(id);
    if (field) field.value = value;
  }

  clearFormError();
  getModalInstance()?.show();
}

export function initEquipeView() {
  const searchInput = el("searchInput");
  const statusSelect = el("statusSelect");
  const searchButton = el("searchButton");
  const clearButton = el("clearButton");
  const refreshButton = el("refreshButton");
  const memberForm = el("memberForm");
  const modalElement = el("newMemberModal");
  const pagerPrev = el("equipePagerPrev");
  const pagerNext = el("equipePagerNext");

  const run = () =>
    loadEquipe({
      search: (searchInput?.value || "").trim(),
      status: statusSelect?.value || "",
    });

  if (searchButton) searchButton.onclick = () => {
    currentPage = 1;
    run();
  };
  if (refreshButton) refreshButton.onclick = run;

  if (clearButton) clearButton.onclick = () => {
    if (searchInput) searchInput.value = "";
    if (statusSelect) statusSelect.value = "";
    currentPage = 1;
    run();
  };

  if (searchInput) searchInput.onkeydown = (e) => {
    if (e.key === "Enter") {
      currentPage = 1;
      run();
    }
  };

  if (statusSelect) statusSelect.onchange = () => {
    currentPage = 1;
    run();
  };
  if (memberForm) memberForm.onsubmit = submitMemberForm;
  if (modalElement && modalElement.dataset.boundModal !== "true") {
    modalElement.addEventListener("hidden.bs.modal", () => {
      clearFormError();
      memberForm?.reset();
      const statusField = el("memberStatus");
      if (statusField) statusField.value = "ativo";
      editingMemberId = null;
      const title = el("newMemberModalLabel");
      if (title) title.textContent = "Novo membro da equipe";
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
