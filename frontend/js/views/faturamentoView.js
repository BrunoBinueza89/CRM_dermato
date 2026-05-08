import { api } from "../api.js";
import { toast } from "../toast.js";

function toLocalIso(date = new Date()) {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString();
}

function el(id) {
  return document.getElementById(id);
}

function getElements() {
  return {
    refreshButton: el("refreshButton"),
    errorBox: el("faturamentoErrorBox"),
    kpis: el("faturamentoKpis"),
    tableBody: el("faturamentoTableBody"),
    emptyState: el("faturamentoEmptyState"),
    searchInput: el("faturamentoSearchInput"),
    statusFilter: el("faturamentoStatusFilter"),
    monthFilter: el("faturamentoMonthFilter"),
    searchButton: el("faturamentoSearchButton"),
    clearButton: el("faturamentoClearButton"),
    newButton: el("faturamentoNewButton"),
    editModal: el("faturamentoEditModal"),
    editForm: el("faturamentoEditForm"),
    editError: el("faturamentoEditFormError"),
    editSaveButton: el("faturamentoEditSaveButton"),
    editStatus: el("faturamentoEditStatus"),
    editValorTotal: el("faturamentoEditValorTotal"),
    editDataEmissao: el("faturamentoEditDataEmissao"),
    editDataVencimento: el("faturamentoEditDataVencimento"),
    editObservacoes: el("faturamentoEditObservacoes"),
    newModal: el("faturamentoNewModal"),
    newForm: el("faturamentoNewForm"),
    newError: el("faturamentoNewFormError"),
    newSaveButton: el("faturamentoNewSaveButton"),
    newPaciente: el("faturamentoNewPaciente"),
    newTratamento: el("faturamentoNewTratamento"),
    newDataEmissao: el("faturamentoNewDataEmissao"),
    newDataVencimento: el("faturamentoNewDataVencimento"),
    newValorTotal: el("faturamentoNewValorTotal"),
    newStatus: el("faturamentoNewStatus"),
    newObservacoes: el("faturamentoNewObservacoes"),
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

function formatMoney(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(value));
}

function getNewModalInstance() {
  const { newModal } = getElements();
  if (!newModal || !globalThis.bootstrap?.Modal) return null;
  return globalThis.bootstrap.Modal.getOrCreateInstance(newModal);
}

let isLoadingList = false;

function setListLoading(isLoading) {
  const {
    refreshButton,
    searchInput,
    statusFilter,
    monthFilter,
    searchButton,
    clearButton,
    newButton,
    emptyState,
  } = getElements();

  isLoadingList = isLoading;
  if (refreshButton) refreshButton.disabled = isLoading;
  if (searchInput) searchInput.disabled = isLoading;
  if (statusFilter) statusFilter.disabled = isLoading;
  if (monthFilter) monthFilter.disabled = isLoading;
  if (searchButton) searchButton.disabled = isLoading;
  if (clearButton) clearButton.disabled = isLoading;
  if (newButton) newButton.disabled = isLoading;

  if (isLoading && emptyState) {
    emptyState.textContent = "Carregando faturamento...";
    emptyState.classList.remove("is-hidden");
  } else if (emptyState) {
    emptyState.textContent = "Nenhuma fatura encontrada.";
  }
}

function renderKpis(kpis) {
  const { kpis: container } = getElements();
  if (!container) return;

  const items = [
    { label: "Total de faturas", value: kpis?.totalFaturas ?? 0, tone: "info", hint: "Quantidade de documentos" },
    { label: "Valor total", value: formatMoney(kpis?.valorTotal), tone: "warning", hint: "Soma das faturas filtradas" },
    { label: "Pago", value: formatMoney(kpis?.valorPago), tone: "success", hint: "Valores com pagamento concluido" },
    { label: "Em aberto", value: formatMoney(kpis?.valorEmAberto), tone: "danger", hint: "Valores pendentes de recebimento" },
  ];

  container.innerHTML = items
    .map(
      (item) => `
        <article class="kpi-card kpi-card--${item.tone}">
          <span class="kpi-card__label">${item.label}</span>
          <span class="kpi-card__value">${item.value}</span>
          <span class="kpi-card__hint">${item.hint}</span>
        </article>
      `.trim()
    )
    .join("");
}

function downloadInvoice(invoice) {
  const lines = [
    `Fatura #${invoice.id}`,
    `Paciente: ${invoice.paciente_nome || "-"}`,
    `Tratamento: ${invoice.tratamento_nome || "-"}`,
    `Data de emissao: ${formatDate(invoice.data_emissao)}`,
    `Data de vencimento: ${formatDate(invoice.data_vencimento)}`,
    `Valor total: ${formatMoney(invoice.valor_total)}`,
    `Status: ${invoice.status || "-"}`,
    `Observacoes: ${invoice.observacoes || "-"}`,
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `fatura-${invoice.id}.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function renderRows(rows) {
  const { tableBody, emptyState } = getElements();
  if (!tableBody || !emptyState) return;

  tableBody.innerHTML = "";

  if (!Array.isArray(rows) || rows.length === 0) {
    emptyState.classList.remove("is-hidden");
    return;
  }

  emptyState.classList.add("is-hidden");

  for (const row of rows) {
    const tr = document.createElement("tr");
    const canUpdate = row.status === "aberta";
    tr.innerHTML = `
      <td>#${row.id}</td>
      <td>${row.paciente_nome || "-"}</td>
      <td>${row.tratamento_nome || "-"}</td>
      <td>${formatDate(row.data_emissao)}</td>
      <td>${formatDate(row.data_vencimento)}</td>
      <td>${formatMoney(row.valor_total)}</td>
      <td><span class="status-badge status-badge--${row.status}">${row.status || "-"}</span></td>
      <td class="table-actions">
        <button class="btn btn--ghost btn--small" type="button" data-edit-id="${row.id}">Editar</button>
        ${
          canUpdate
            ? `<button class="btn btn--ghost btn--small" type="button" data-pay-id="${row.id}">Marcar paga</button>
               <button class="btn btn--ghost btn--small" type="button" data-cancel-id="${row.id}">Cancelar</button>`
            : ""
        }
        <button class="btn btn--danger btn--small" type="button" data-remove-id="${row.id}">Remover</button>
        <button class="btn btn--ghost btn--small" type="button" data-download-id="${row.id}">Download</button>
      </td>
    `.trim();
    tableBody.appendChild(tr);
  }

  tableBody.querySelectorAll("[data-download-id]").forEach((button) => {
    button.onclick = () => {
      const id = Number(button.getAttribute("data-download-id"));
      const invoice = rows.find((row) => row.id === id);
      if (invoice) downloadInvoice(invoice);
    };
  });

  tableBody.querySelectorAll("[data-pay-id]").forEach((button) => {
    button.onclick = async () => {
      const id = Number(button.getAttribute("data-pay-id"));
      if (!id) return;
      const invoice = rows.find((row) => row.id === id);
      const confirmed = globalThis.confirm(`Marcar a fatura #${id} como paga?`);
      if (!confirmed) return;
      try {
        await api.put(`/faturamento/${id}`, {
          status: "paga",
          observacoes: invoice?.observacoes ?? null,
        });
        await loadFaturamento();
        toast.success("Fatura marcada como paga.");
      } catch (error) {
        setError(getElements().errorBox, error?.message || "Erro ao atualizar fatura.");
        toast.error(error?.message || "Erro ao atualizar fatura.");
      }
    };
  });

  tableBody.querySelectorAll("[data-cancel-id]").forEach((button) => {
    button.onclick = async () => {
      const id = Number(button.getAttribute("data-cancel-id"));
      if (!id) return;
      const invoice = rows.find((row) => row.id === id);
      const confirmed = globalThis.confirm(`Cancelar a fatura #${id}?`);
      if (!confirmed) return;
      try {
        await api.put(`/faturamento/${id}`, {
          status: "cancelada",
          observacoes: invoice?.observacoes ?? null,
        });
        await loadFaturamento();
        toast.success("Fatura cancelada.");
      } catch (error) {
        setError(getElements().errorBox, error?.message || "Erro ao atualizar fatura.");
        toast.error(error?.message || "Erro ao atualizar fatura.");
      }
    };
  });

  tableBody.querySelectorAll("[data-edit-id]").forEach((button) => {
    button.onclick = () => {
      const id = Number(button.getAttribute("data-edit-id"));
      if (!id) return;
      const invoice = rows.find((row) => row.id === id);
      if (!invoice) return;
      openEditModal(invoice);
    };
  });

  tableBody.querySelectorAll("[data-remove-id]").forEach((button) => {
    button.onclick = async () => {
      const id = Number(button.getAttribute("data-remove-id"));
      if (!id) return;
      const invoice = rows.find((row) => row.id === id);
      const confirmed = globalThis.confirm(`Remover a fatura #${id}?`);
      if (!confirmed) return;
      try {
        await api.del(`/faturamento/${id}`);
        await loadFaturamento();
        toast.success("Fatura removida.");
      } catch (error) {
        setError(getElements().errorBox, error?.message || "Erro ao remover fatura.");
        toast.error(error?.message || "Erro ao remover fatura.");
      }
    };
  });
}

function getModalInstance() {
  const { editModal } = getElements();
  if (!editModal || !globalThis.bootstrap?.Modal) return null;
  return globalThis.bootstrap.Modal.getOrCreateInstance(editModal);
}

let editingInvoiceId = null;
let editingInvoiceSnapshot = null;

function clearEditError() {
  clearError(getElements().editError);
}

function showEditError(message) {
  setError(getElements().editError, message);
}

function fillEditForm(invoice) {
  const {
    editStatus,
    editValorTotal,
    editDataEmissao,
    editDataVencimento,
    editObservacoes,
  } = getElements();

  if (editStatus) editStatus.value = invoice?.status || "aberta";
  if (editValorTotal) editValorTotal.value = invoice?.valor_total ?? 0;
  if (editDataEmissao) editDataEmissao.value = invoice?.data_emissao ? String(invoice.data_emissao).slice(0, 10) : "";
  if (editDataVencimento) {
    editDataVencimento.value = invoice?.data_vencimento ? String(invoice.data_vencimento).slice(0, 10) : "";
  }
  if (editObservacoes) editObservacoes.value = invoice?.observacoes || "";
}

function openEditModal(invoice) {
  editingInvoiceId = invoice.id;
  editingInvoiceSnapshot = invoice;
  clearEditError();
  fillEditForm(invoice);
  getModalInstance()?.show();
}

function readEditForm() {
  const {
    editStatus,
    editValorTotal,
    editDataEmissao,
    editDataVencimento,
    editObservacoes,
  } = getElements();

  return {
    status: editStatus?.value || "",
    valor_total: editValorTotal?.value === "" ? "" : Number(editValorTotal?.value),
    data_emissao: editDataEmissao?.value || "",
    data_vencimento: editDataVencimento?.value || "",
    observacoes: editObservacoes?.value.trim() || "",
  };
}

function validateEdit(payload) {
  if (payload.status !== "aberta" && payload.status !== "paga" && payload.status !== "cancelada") {
    return "Selecione um status valido.";
  }
  if (payload.valor_total === "" || Number.isNaN(payload.valor_total)) return "Informe um valor_total valido.";
  if (payload.data_emissao && !/^\d{4}-\d{2}-\d{2}$/.test(payload.data_emissao)) return "Data de emissao invalida.";
  if (payload.data_vencimento && !/^\d{4}-\d{2}-\d{2}$/.test(payload.data_vencimento)) return "Data de vencimento invalida.";
  return "";
}

async function submitEdit(event) {
  event?.preventDefault();
  clearEditError();

  if (!editingInvoiceId) return;

  const { editSaveButton } = getElements();
  const payload = readEditForm();
  const validationError = validateEdit(payload);
  if (validationError) return showEditError(validationError);

  try {
    if (editSaveButton) editSaveButton.disabled = true;
    await api.put(`/faturamento/${editingInvoiceId}`, {
      status: payload.status,
      valor_total: payload.valor_total,
      data_emissao: payload.data_emissao || null,
      data_vencimento: payload.data_vencimento || null,
      observacoes: payload.observacoes || null,
    });
    getModalInstance()?.hide();
    await loadFaturamento();
    toast.success("Fatura atualizada.");
  } catch (error) {
    showEditError(error?.message || "Erro ao salvar fatura.");
    toast.error(error?.message || "Erro ao salvar fatura.");
  } finally {
    if (editSaveButton) editSaveButton.disabled = false;
  }
}

export async function loadFaturamento() {
  const { errorBox, searchInput, statusFilter, monthFilter } = getElements();
  clearError(errorBox);
  setListLoading(true);

  try {
    const payload = await api.get("/faturamento", {
      query: {
        search: searchInput?.value.trim() || "",
        status: statusFilter?.value || "",
        month: monthFilter?.value || "",
      },
    });

    renderKpis(payload?.kpis || {});
    renderRows(Array.isArray(payload?.invoices) ? payload.invoices : []);
  } catch (error) {
    renderKpis({});
    renderRows([]);
    setError(errorBox, error?.message || "Erro ao carregar faturamento.");
  } finally {
    setListLoading(false);
  }
}

export function initFaturamentoView() {
  const {
    refreshButton,
    searchButton,
    clearButton,
    searchInput,
    statusFilter,
    monthFilter,
    editForm,
    editModal,
    newButton,
    newForm,
    newModal,
    newPaciente,
  } = getElements();

  if (monthFilter && !monthFilter.value) {
    const now = new Date();
    monthFilter.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  if (refreshButton) refreshButton.onclick = () => loadFaturamento();
  if (searchButton) searchButton.onclick = () => loadFaturamento();
  if (searchInput) {
    searchInput.onkeydown = (event) => {
      if (event.key === "Enter") loadFaturamento();
    };
  }
  if (statusFilter) statusFilter.onchange = () => loadFaturamento();
  if (monthFilter) monthFilter.onchange = () => loadFaturamento();
  if (clearButton) {
    clearButton.onclick = () => {
      if (searchInput) searchInput.value = "";
      if (statusFilter) statusFilter.value = "";
      if (monthFilter) monthFilter.value = "";
      loadFaturamento();
    };
  }

  if (editForm) editForm.onsubmit = submitEdit;
  if (editModal && editModal.dataset.boundModal !== "true") {
    editModal.addEventListener("hidden.bs.modal", () => {
      editingInvoiceId = null;
      editingInvoiceSnapshot = null;
      clearEditError();
    });
    editModal.dataset.boundModal = "true";
  }

  if (newButton) {
    newButton.onclick = async () => {
      await openNewModal();
    };
  }
  if (newForm) newForm.onsubmit = submitNew;
  if (newPaciente && newPaciente.dataset.boundPaciente !== "true") {
    newPaciente.addEventListener("change", () => loadTratamentosDoPaciente(newPaciente.value));
    newPaciente.dataset.boundPaciente = "true";
  }
  if (newModal && newModal.dataset.boundModal !== "true") {
    newModal.addEventListener("hidden.bs.modal", () => {
      clearNewForm();
      clearError(getElements().newError);
    });
    newModal.dataset.boundModal = "true";
  }

  loadFaturamento();
}

function clearNewForm() {
  const {
    newPaciente,
    newTratamento,
    newDataEmissao,
    newDataVencimento,
    newValorTotal,
    newStatus,
    newObservacoes,
  } = getElements();
  if (newPaciente) newPaciente.value = "";
  if (newTratamento) newTratamento.value = "";
  if (newDataEmissao) newDataEmissao.value = "";
  if (newDataVencimento) newDataVencimento.value = "";
  if (newValorTotal) newValorTotal.value = "";
  if (newStatus) newStatus.value = "aberta";
  if (newObservacoes) newObservacoes.value = "";
}

function renderOptions(select, rows, labelKey = "nome") {
  if (!select) return;
  const base = select.querySelector('option[value=""]')?.outerHTML || '<option value="">Selecione</option>';
  const extra = (rows || [])
    .map((row) => `<option value="${row.id}">${row[labelKey] ?? row.nome ?? row.id}</option>`)
    .join("");
  select.innerHTML = base + extra;
}

async function openNewModal() {
  clearError(getElements().newError);
  clearNewForm();

  const isoToday = toLocalIso().slice(0, 10);
  if (getElements().newDataEmissao && !getElements().newDataEmissao.value) {
    getElements().newDataEmissao.value = isoToday;
  }

  try {
    const pacientes = await api.get("/pacientes", { query: { status: "ativo" } });
    renderOptions(getElements().newPaciente, Array.isArray(pacientes) ? pacientes : []);
  } catch (error) {
    setError(getElements().newError, error?.message || "Erro ao carregar pacientes.");
  }

  getNewModalInstance()?.show();
}

async function loadTratamentosDoPaciente(pacienteId) {
  if (!pacienteId) {
    renderOptions(getElements().newTratamento, []);
    return;
  }
  try {
    const tratamentos = await api.get("/tratamentos", { query: { paciente_id: pacienteId } });
    renderOptions(getElements().newTratamento, Array.isArray(tratamentos) ? tratamentos : []);
  } catch (error) {
    setError(getElements().newError, error?.message || "Erro ao carregar tratamentos.");
    renderOptions(getElements().newTratamento, []);
  }
}

function readNewForm() {
  const {
    newPaciente,
    newTratamento,
    newDataEmissao,
    newDataVencimento,
    newValorTotal,
    newStatus,
    newObservacoes,
  } = getElements();
  return {
    paciente_id: newPaciente?.value ? Number(newPaciente.value) : null,
    tratamento_id: newTratamento?.value ? Number(newTratamento.value) : null,
    data_emissao: newDataEmissao?.value || "",
    data_vencimento: newDataVencimento?.value || "",
    valor_total: newValorTotal?.value === "" ? "" : Number(newValorTotal.value),
    status: newStatus?.value || "aberta",
    observacoes: newObservacoes?.value.trim() || "",
  };
}

function validateNew(payload) {
  if (!payload.paciente_id) return "Selecione um paciente.";
  if (!payload.tratamento_id) return "Selecione um tratamento.";
  if (!payload.data_emissao) return "Informe a data de emissao.";
  if (payload.valor_total === "" || Number.isNaN(payload.valor_total)) return "Informe um valor total valido.";
  return "";
}

async function submitNew(event) {
  event?.preventDefault();
  clearError(getElements().newError);

  const { newSaveButton, newPaciente, newTratamento } = getElements();
  const payload = readNewForm();
  const validationError = validateNew(payload);
  if (validationError) return setError(getElements().newError, validationError);

  try {
    if (newSaveButton) newSaveButton.disabled = true;
    await api.post("/faturamento", {
      paciente_id: payload.paciente_id,
      tratamento_id: payload.tratamento_id,
      data_emissao: payload.data_emissao,
      data_vencimento: payload.data_vencimento || null,
      valor_total: payload.valor_total,
      status: payload.status,
      observacoes: payload.observacoes || null,
    });
    getNewModalInstance()?.hide();
    await loadFaturamento();
    toast.success("Fatura criada.");
  } catch (error) {
    setError(getElements().newError, error?.message || "Erro ao criar fatura.");
    toast.error(error?.message || "Erro ao criar fatura.");
  } finally {
    if (newSaveButton) newSaveButton.disabled = false;
  }
}
