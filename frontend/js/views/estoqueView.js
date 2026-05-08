import { api } from "../api.js";
import { toast } from "../toast.js";

function el(id) {
  return document.getElementById(id);
}

function getElements() {
  return {
    refreshButton: el("refreshButton"),
    errorBox: el("estoqueErrorBox"),
    tableBody: el("estoqueTableBody"),
    emptyState: el("estoqueEmptyState"),
    searchInput: el("estoqueSearchInput"),
    categoryFilter: el("estoqueCategoryFilter"),
    searchButton: el("estoqueSearchButton"),
    clearButton: el("estoqueClearButton"),
    newItemButton: el("estoqueNewItemButton"),
    manageCategoriesButton: el("estoqueManageCategoriesButton"),
    modal: el("estoqueItemModal"),
    modalTitle: el("estoqueItemModalTitle"),
    form: el("estoqueItemForm"),
    formError: el("estoqueItemFormError"),
    saveButton: el("estoqueItemSaveButton"),
    itemNome: el("estoqueItemNome"),
    itemCategoria: el("estoqueItemCategoria"),
    itemQuantidade: el("estoqueItemQuantidade"),
    itemUnidade: el("estoqueItemUnidade"),
    itemQuantidadeMinima: el("estoqueItemQuantidadeMinima"),
    itemCustoUnitario: el("estoqueItemCustoUnitario"),
    itemValidade: el("estoqueItemValidade"),
    categoriesModal: el("estoqueCategoriesModal"),
    categoriesError: el("estoqueCategoriesError"),
    categoriesTableBody: el("estoqueCategoriesTableBody"),
    categoriesEmptyState: el("estoqueCategoriesEmptyState"),
    categoryForm: el("estoqueCategoryForm"),
    categorySaveButton: el("estoqueCategorySaveButton"),
    categoryCancelButton: el("estoqueCategoryCancelButton"),
    categoryNome: el("estoqueCategoryNome"),
    categoryDescricao: el("estoqueCategoryDescricao"),
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

function formatNumber(value) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: Number(value % 1 !== 0),
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
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

function normalizeCategoryOptions(payload) {
  const options = Array.isArray(payload?.categoryOptions) ? payload.categoryOptions : [];
  if (options.length) return options.filter((row) => row && row.id && row.nome);

  const names = Array.isArray(payload?.categories) ? payload.categories : [];
  return names
    .filter((name) => typeof name === "string" && name.trim())
    .map((name) => ({ id: null, nome: name }));
}

function renderCategories(categoryOptions) {
  const { categoryFilter } = getElements();
  if (!categoryFilter) return;

  const current = categoryFilter.value;
  const options = ['<option value="">Todas</option>']
    .concat(
      (categoryOptions || []).map((category) => {
        const label = category?.nome ?? "";
        return `<option value="${label}">${label}</option>`;
      })
    )
    .join("");

  categoryFilter.innerHTML = options;
  if ([...categoryFilter.options].some((option) => option.value === current)) {
    categoryFilter.value = current;
  }
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
    const safeId = row.id ?? "";
    tr.innerHTML = `
      <td>${row.nome || "-"}</td>
      <td>${row.categoria || "-"}</td>
      <td>${formatNumber(row.quantidade)} ${row.unidade || ""}</td>
      <td>${formatNumber(row.quantidade_minima)} ${row.unidade || ""}</td>
      <td>${formatMoney(row.custo_unitario)}</td>
      <td>${formatDate(row.validade)}</td>
      <td><span class="status-badge status-badge--${row.status_estoque}">${row.status_estoque || "-"}</span></td>
      <td class="table-actions">
        <button class="btn btn--ghost btn--small" type="button" data-edit-item-id="${safeId}">Editar</button>
        <button class="btn btn--ghost btn--small" type="button" data-remove-item-id="${safeId}">Remover</button>
      </td>
    `.trim();
    tableBody.appendChild(tr);
  }
}

function getModalInstance() {
  const { modal } = getElements();
  if (!modal || !globalThis.bootstrap?.Modal) return null;
  return globalThis.bootstrap.Modal.getOrCreateInstance(modal);
}

function showFormError(message) {
  const { formError } = getElements();
  setError(formError, message);
}

function clearFormError() {
  const { formError } = getElements();
  clearError(formError);
}

function readForm() {
  const {
    itemNome,
    itemCategoria,
    itemQuantidade,
    itemUnidade,
    itemQuantidadeMinima,
    itemCustoUnitario,
    itemValidade,
  } = getElements();

  return {
    nome: itemNome?.value.trim() || "",
    estoque_id: itemCategoria?.value ? Number(itemCategoria.value) : null,
    quantidade: itemQuantidade?.value === "" ? "" : Number(itemQuantidade?.value),
    unidade: itemUnidade?.value.trim() || "",
    quantidade_minima: itemQuantidadeMinima?.value === "" ? "" : Number(itemQuantidadeMinima?.value),
    custo_unitario: itemCustoUnitario?.value === "" ? "" : Number(itemCustoUnitario?.value),
    validade: itemValidade?.value || "",
  };
}

function validateForm(payload) {
  if (!payload.nome) return "Informe o nome do item.";
  if (!payload.estoque_id) return "Selecione uma categoria.";
  if (payload.quantidade === "" || Number.isNaN(payload.quantidade)) return "Informe uma quantidade valida.";
  if (payload.quantidade_minima === "" || Number.isNaN(payload.quantidade_minima)) return "Informe uma quantidade minima valida.";
  if (payload.custo_unitario === "" || Number.isNaN(payload.custo_unitario)) return "Informe um custo unitario valido.";
  return "";
}

function fillForm(row, categoryOptions) {
  const {
    modalTitle,
    itemNome,
    itemCategoria,
    itemQuantidade,
    itemUnidade,
    itemQuantidadeMinima,
    itemCustoUnitario,
    itemValidade,
  } = getElements();

  if (modalTitle) modalTitle.textContent = row ? "Editar item" : "Novo item";
  if (itemNome) itemNome.value = row?.nome || "";

  if (itemCategoria) {
    const selectedId = row?.estoque_id ?? "";
    const options = ['<option value="">Selecione</option>']
      .concat(
        (categoryOptions || []).map(
          (cat) => `<option value="${cat.id}">${cat.nome}</option>`
        )
      )
      .join("");
    itemCategoria.innerHTML = options;
    if (selectedId && [...itemCategoria.options].some((o) => String(o.value) === String(selectedId))) {
      itemCategoria.value = String(selectedId);
    }
  }

  if (itemQuantidade) itemQuantidade.value = row?.quantidade ?? 0;
  if (itemUnidade) itemUnidade.value = row?.unidade || "";
  if (itemQuantidadeMinima) itemQuantidadeMinima.value = row?.quantidade_minima ?? 0;
  if (itemCustoUnitario) itemCustoUnitario.value = row?.custo_unitario ?? 0;
  if (itemValidade) itemValidade.value = row?.validade ? String(row.validade).slice(0, 10) : "";
}

let lastCategoryOptions = [];
let editingItemId = null;
let lastRowsById = new Map();
let categoriesRowsById = new Map();
let editingCategoryId = null;
let isLoadingList = false;

function setListLoading(isLoading) {
  const {
    refreshButton,
    searchButton,
    clearButton,
    searchInput,
    categoryFilter,
    newItemButton,
    manageCategoriesButton,
    emptyState,
  } = getElements();

  isLoadingList = isLoading;
  if (refreshButton) refreshButton.disabled = isLoading;
  if (searchButton) searchButton.disabled = isLoading;
  if (clearButton) clearButton.disabled = isLoading;
  if (searchInput) searchInput.disabled = isLoading;
  if (categoryFilter) categoryFilter.disabled = isLoading;
  if (newItemButton) newItemButton.disabled = isLoading;
  if (manageCategoriesButton) manageCategoriesButton.disabled = isLoading;

  if (isLoading && emptyState) {
    emptyState.textContent = "Carregando estoque...";
    emptyState.classList.remove("is-hidden");
  } else if (emptyState) {
    emptyState.textContent = "Nenhum item encontrado.";
  }
}

function getCategoriesModalInstance() {
  const { categoriesModal } = getElements();
  if (!categoriesModal || !globalThis.bootstrap?.Modal) return null;
  return globalThis.bootstrap.Modal.getOrCreateInstance(categoriesModal);
}

async function fetchCategories() {
  const rows = await api.get("/estoque/categorias");
  return Array.isArray(rows) ? rows : [];
}

function renderCategoriesTable(rows) {
  const { categoriesTableBody, categoriesEmptyState } = getElements();
  if (!categoriesTableBody || !categoriesEmptyState) return;

  categoriesTableBody.innerHTML = "";
  categoriesRowsById = new Map((rows || []).map((row) => [String(row.id), row]));

  if (!Array.isArray(rows) || rows.length === 0) {
    categoriesEmptyState.classList.remove("is-hidden");
    return;
  }

  categoriesEmptyState.classList.add("is-hidden");

  for (const row of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.id ?? ""}</td>
      <td>${row.nome ?? ""}</td>
      <td>${row.descricao ?? "-"}</td>
      <td class="table-actions">
        <button class="btn btn--ghost btn--small" type="button" data-edit-category-id="${row.id}">Editar</button>
        <button class="btn btn--danger btn--small" type="button" data-remove-category-id="${row.id}">Remover</button>
      </td>
    `.trim();
    categoriesTableBody.appendChild(tr);
  }

  categoriesTableBody.querySelectorAll("[data-edit-category-id]").forEach((button) => {
    button.onclick = () => {
      const id = button.getAttribute("data-edit-category-id");
      const row = id ? categoriesRowsById.get(String(id)) : null;
      if (!row) return;
      editingCategoryId = row.id;
      clearError(getElements().categoriesError);
      const { categoryNome, categoryDescricao } = getElements();
      if (categoryNome) categoryNome.value = row.nome || "";
      if (categoryDescricao) categoryDescricao.value = row.descricao || "";
    };
  });

  categoriesTableBody.querySelectorAll("[data-remove-category-id]").forEach((button) => {
    button.onclick = async () => {
      const id = button.getAttribute("data-remove-category-id");
      const row = id ? categoriesRowsById.get(String(id)) : null;
      const confirmed = globalThis.confirm(`Remover a categoria "${row?.nome || id}"?`);
      if (!confirmed) return;
      try {
        await api.del(`/estoque/categorias/${id}`);
        await loadCategoriesModal();
        await loadEstoque();
        toast.success("Categoria removida.");
      } catch (error) {
        setError(getElements().categoriesError, error?.message || "Erro ao remover categoria.");
        toast.error(error?.message || "Erro ao remover categoria.");
      }
    };
  });
}

async function loadCategoriesModal() {
  const { categoriesError } = getElements();
  clearError(categoriesError);

  try {
    const rows = await fetchCategories();
    renderCategoriesTable(rows);

    lastCategoryOptions = rows.map((row) => ({ id: row.id, nome: row.nome }));
  } catch (error) {
    renderCategoriesTable([]);
    setError(categoriesError, error?.message || "Erro ao carregar categorias.");
  }
}

function clearCategoryForm() {
  editingCategoryId = null;
  const { categoryNome, categoryDescricao } = getElements();
  if (categoryNome) categoryNome.value = "";
  if (categoryDescricao) categoryDescricao.value = "";
  clearError(getElements().categoriesError);
}

async function submitCategoryForm(event) {
  event?.preventDefault();
  const { categoriesError, categorySaveButton, categoryNome, categoryDescricao } = getElements();
  clearError(categoriesError);

  const nome = categoryNome?.value.trim() || "";
  const descricao = categoryDescricao?.value.trim() || "";
  if (!nome) return setError(categoriesError, "Informe o nome da categoria.");

  try {
    if (categorySaveButton) categorySaveButton.disabled = true;
    if (editingCategoryId) {
      await api.put(`/estoque/categorias/${editingCategoryId}`, { nome, descricao: descricao || null });
      toast.success("Categoria atualizada.");
    } else {
      await api.post("/estoque/categorias", { nome, descricao: descricao || null });
      toast.success("Categoria criada.");
    }
    clearCategoryForm();
    await loadCategoriesModal();
    await loadEstoque();
  } catch (error) {
    setError(categoriesError, error?.message || "Erro ao salvar categoria.");
    toast.error(error?.message || "Erro ao salvar categoria.");
  } finally {
    if (categorySaveButton) categorySaveButton.disabled = false;
  }
}

export async function loadEstoque() {
  const { errorBox, searchInput, categoryFilter } = getElements();
  clearError(errorBox);
  setListLoading(true);

  try {
    const payload = await api.get("/estoque", {
      query: {
        search: searchInput?.value.trim() || "",
        category: categoryFilter?.value || "",
      },
    });

    lastCategoryOptions = normalizeCategoryOptions(payload);
    const rows = Array.isArray(payload?.items) ? payload.items : [];
    lastRowsById = new Map(rows.map((row) => [String(row.id), row]));

    renderCategories(lastCategoryOptions);
    renderRows(rows);

    const { tableBody } = getElements();
    tableBody?.querySelectorAll("[data-edit-item-id]").forEach((button) => {
      button.onclick = () => {
        const id = button.getAttribute("data-edit-item-id");
        const row = id ? lastRowsById.get(String(id)) : null;
        if (!row) return;
        editingItemId = row.id;
        clearFormError();
        fillForm(row, lastCategoryOptions.filter((c) => c.id));
        getModalInstance()?.show();
      };
    });

    tableBody?.querySelectorAll("[data-remove-item-id]").forEach((button) => {
      button.onclick = async () => {
        const id = button.getAttribute("data-remove-item-id");
        if (!id) return;
        const row = lastRowsById.get(String(id));
        const confirmed = globalThis.confirm(`Remover o item "${row?.nome || id}"?`);
        if (!confirmed) return;
        try {
          await api.del(`/estoque/itens/${id}`);
          await loadEstoque();
          toast.success("Item removido do estoque.");
        } catch (error) {
          setError(errorBox, error?.message || "Erro ao remover item.");
          toast.error(error?.message || "Erro ao remover item.");
        }
      };
    });
  } catch (error) {
    renderRows([]);
    setError(errorBox, error?.message || "Erro ao carregar estoque.");
  } finally {
    setListLoading(false);
  }
}

async function openNewItemModal() {
  editingItemId = null;
  clearFormError();

  let categories = [];
  try {
    categories = await fetchCategories();
  } catch {
    categories = [];
  }

  fillForm(null, categories);
  getModalInstance()?.show();
}

async function submitForm(event) {
  event?.preventDefault();
  clearFormError();

  const { saveButton } = getElements();
  const payload = readForm();
  const validationError = validateForm(payload);
  if (validationError) {
    showFormError(validationError);
    return;
  }

  try {
    if (saveButton) saveButton.disabled = true;
    const body = {
      estoque_id: payload.estoque_id,
      nome: payload.nome,
      unidade: payload.unidade || null,
      quantidade: payload.quantidade,
      quantidade_minima: payload.quantidade_minima,
      custo_unitario: payload.custo_unitario,
      validade: payload.validade || null,
    };

    if (editingItemId) {
      await api.put(`/estoque/itens/${editingItemId}`, body);
      toast.success("Item atualizado.");
    } else {
      await api.post("/estoque/itens", body);
      toast.success("Item criado.");
    }

    getModalInstance()?.hide();
    await loadEstoque();
  } catch (error) {
    showFormError(error?.message || "Erro ao salvar item.");
    toast.error(error?.message || "Erro ao salvar item.");
  } finally {
    if (saveButton) saveButton.disabled = false;
  }
}

export function initEstoqueView() {
  const {
    refreshButton,
    searchButton,
    clearButton,
    searchInput,
    categoryFilter,
    newItemButton,
    manageCategoriesButton,
    form,
    modal,
    categoriesModal,
    categoryForm,
    categoryCancelButton,
  } = getElements();

  if (refreshButton) refreshButton.onclick = () => loadEstoque();
  if (searchButton) searchButton.onclick = () => loadEstoque();
  if (searchInput) {
    searchInput.onkeydown = (event) => {
      if (event.key === "Enter") loadEstoque();
    };
  }
  if (categoryFilter) categoryFilter.onchange = () => loadEstoque();
  if (clearButton) {
    clearButton.onclick = () => {
      if (searchInput) searchInput.value = "";
      if (categoryFilter) categoryFilter.value = "";
      loadEstoque();
    };
  }

  if (newItemButton) newItemButton.onclick = openNewItemModal;
  if (manageCategoriesButton) {
    manageCategoriesButton.onclick = async () => {
      clearCategoryForm();
      await loadCategoriesModal();
      getCategoriesModalInstance()?.show();
    };
  }
  if (form) form.onsubmit = submitForm;
  if (modal && modal.dataset.boundModal !== "true") {
    modal.addEventListener("hidden.bs.modal", () => {
      editingItemId = null;
      clearFormError();
    });
    modal.dataset.boundModal = "true";
  }

  if (categoryForm) categoryForm.onsubmit = submitCategoryForm;
  if (categoryCancelButton) categoryCancelButton.onclick = clearCategoryForm;
  if (categoriesModal && categoriesModal.dataset.boundModal !== "true") {
    categoriesModal.addEventListener("hidden.bs.modal", () => {
      clearCategoryForm();
      renderCategoriesTable([]);
    });
    categoriesModal.dataset.boundModal = "true";
  }

  loadEstoque();
}
