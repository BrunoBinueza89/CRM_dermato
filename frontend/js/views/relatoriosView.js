import { api } from "../api.js";

function el(id) {
  return document.getElementById(id);
}

function getElements() {
  return {
    refreshButton: el("refreshButton"),
    errorBox: el("relatoriosErrorBox"),
    monthFilter: el("relatoriosMonthFilter"),
    applyButton: el("relatoriosApplyButton"),
    clearButton: el("relatoriosClearButton"),
    kpis: el("relatoriosKpis"),
    revenueChart: el("relatoriosRevenueChart"),
    comparisonCards: el("relatoriosComparisonCards"),
    loading: el("relatoriosLoading"),
    content: el("relatoriosContent"),
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

function setLoading(isLoading) {
  const { loading, content, refreshButton, applyButton, clearButton, monthFilter } = getElements();
  loading?.classList.toggle("is-hidden", !isLoading);
  content?.classList.toggle("is-hidden", isLoading);
  if (refreshButton) refreshButton.disabled = isLoading;
  if (applyButton) applyButton.disabled = isLoading;
  if (clearButton) clearButton.disabled = isLoading;
  if (monthFilter) monthFilter.disabled = isLoading;
}

function formatMoney(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));
}

function formatDelta(value) {
  const sign = Number(value || 0) > 0 ? "+" : "";
  return `${sign}${Number(value || 0).toFixed(2)}%`;
}

function renderKpis(kpis) {
  const { kpis: container } = getElements();
  if (!container) return;

  const items = [
    { label: "Receita total", value: formatMoney(kpis?.receitaTotal), hint: "Somatorio das faturas do mes", tone: "warning" },
    { label: "Receita paga", value: formatMoney(kpis?.receitaPaga), hint: "Apenas pagamentos concluidos", tone: "success" },
    { label: "Em aberto", value: formatMoney(kpis?.receitaEmAberto), hint: "Valores ainda pendentes", tone: "danger" },
    { label: "Ticket medio", value: formatMoney(kpis?.ticketMedio), hint: "Media por fatura ativa", tone: "info" },
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

function renderRevenueChart(rows) {
  const { revenueChart } = getElements();
  if (!revenueChart) return;

  if (!Array.isArray(rows) || rows.length === 0 || rows.every((row) => Number(row.receitaTotal || 0) === 0)) {
    revenueChart.innerHTML = '<div class="list-empty">Sem dados de receita para o periodo selecionado.</div>';
    return;
  }

  const max = Math.max(...rows.map((row) => Number(row.receitaTotal || 0)), 1);

  revenueChart.innerHTML = rows
    .map((row) => {
      const totalHeight = Math.max((Number(row.receitaTotal || 0) / max) * 100, 8);
      const paidHeight = Math.max((Number(row.receitaPaga || 0) / max) * 100, row.receitaPaga ? 8 : 0);
      return `
        <div class="report-chart__col">
          <div class="report-chart__bars">
            <div class="report-chart__bar report-chart__bar--total" style="height:${totalHeight}%"></div>
            <div class="report-chart__bar report-chart__bar--paid" style="height:${paidHeight}%"></div>
          </div>
          <div class="report-chart__meta">
            <strong>${formatMoney(row.receitaTotal)}</strong>
            <span>${row.label}</span>
          </div>
        </div>
      `.trim();
    })
    .join("");
}

function renderComparisonCards(comparison) {
  const { comparisonCards } = getElements();
  if (!comparisonCards) return;

  const items = [
    {
      label: "Receita total",
      current: formatMoney(comparison?.receitaTotalAtual),
      previous: formatMoney(comparison?.receitaTotalAnterior),
      delta: formatDelta(comparison?.variacaoReceitaTotal),
      positive: Number(comparison?.variacaoReceitaTotal || 0) >= 0,
    },
    {
      label: "Receita paga",
      current: formatMoney(comparison?.receitaPagaAtual),
      previous: formatMoney(comparison?.receitaPagaAnterior),
      delta: formatDelta(comparison?.variacaoReceitaPaga),
      positive: Number(comparison?.variacaoReceitaPaga || 0) >= 0,
    },
  ];

  comparisonCards.innerHTML = items
    .map(
      (item) => `
        <article class="comparison-card">
          <div class="comparison-card__label">${item.label}</div>
          <div class="comparison-card__values">
            <span>Atual: ${item.current}</span>
            <span>Anterior: ${item.previous}</span>
          </div>
          <div class="comparison-card__delta ${item.positive ? "is-positive" : "is-negative"}">${item.delta}</div>
        </article>
      `.trim()
    )
    .join("");
}

export async function loadRelatorios() {
  const { errorBox, monthFilter } = getElements();
  clearError(errorBox);
  setLoading(true);

  try {
    const payload = await api.get("/relatorios", {
      query: {
        month: monthFilter?.value || "",
      },
    });

    renderKpis(payload?.kpis || {});
    renderRevenueChart(Array.isArray(payload?.monthlyRevenue) ? payload.monthlyRevenue : []);
    renderComparisonCards(payload?.monthComparison || {});
  } catch (error) {
    renderKpis({});
    renderRevenueChart([]);
    renderComparisonCards({});
    setError(errorBox, error?.message || "Erro ao carregar relatorios.");
  } finally {
    setLoading(false);
  }
}

export function initRelatoriosView() {
  const { refreshButton, applyButton, clearButton, monthFilter } = getElements();

  if (refreshButton) refreshButton.onclick = () => loadRelatorios();
  if (applyButton) applyButton.onclick = () => loadRelatorios();
  if (monthFilter) {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    if (!monthFilter.value) monthFilter.value = currentMonth;
    monthFilter.onchange = () => loadRelatorios();
  }
  if (clearButton) {
    clearButton.onclick = () => {
      if (monthFilter) monthFilter.value = "";
      loadRelatorios();
    };
  }

  loadRelatorios();
}
