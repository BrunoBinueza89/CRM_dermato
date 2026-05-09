import { api } from "../api.js";

function el(id) {
  return document.getElementById(id);
}

function clearError() {
  const box = el("dashboardErrorBox");
  if (!box) return;
  box.textContent = "";
  box.classList.add("is-hidden");
}

function showError(message) {
  const box = el("dashboardErrorBox");
  if (!box) return;
  box.textContent = message;
  box.classList.remove("is-hidden");
}

function setLoading(isLoading) {
  const loading = el("dashboardLoading");
  const content = el("dashboardContent");
  loading?.classList.toggle("is-hidden", !isLoading);
  content?.classList.toggle("is-hidden", isLoading);
}

function formatCurrency(value) {
  const number = Number(value || 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(number);
}

function formatCurrencyCompact(value) {
  const number = Number(value || 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(number);
}

function renderKpis(payload) {
  const container = el("dashboardKpis");
  if (!container) return;

  const kpisV2 = payload?.kpisV2 || null;
  const fallback = payload?.kpis || {};

  const items = [
    {
      key: "consultasHoje",
      label: "Consultas Hoje",
      icon: "bi-calendar-check",
      value: kpisV2?.consultasHoje?.value ?? fallback?.consultasHoje ?? 0,
      formatter: (v) => String(v),
    },
    {
      key: "receitaMensal",
      label: "Receita Mensal",
      icon: "bi-currency-dollar",
      value: kpisV2?.receitaMensal?.value ?? 0,
      formatter: (v) => formatCurrencyCompact(v),
    },
    {
      key: "tratamentosPendentes",
      label: "Tratamento Pendente",
      icon: "bi-journal-medical",
      value: kpisV2?.tratamentosPendentes?.value ?? 0,
      formatter: (v) => String(v),
    },
  ];

  container.innerHTML = items
    .map(
      (item) => {
        const meta = kpisV2?.[item.key] || null;
        const deltaPercent = typeof meta?.deltaPercent === "number" ? meta.deltaPercent : null;
        const periodLabel = meta?.periodLabel || "";

        return `
        <article class="kpi-hero">
          <div class="kpi-hero__icon">
            <i class="bi ${item.icon}" aria-hidden="true"></i>
          </div>
          <div class="kpi-hero__body">
            <div class="kpi-hero__label">${item.label}</div>
            <div class="kpi-hero__value">${item.formatter(item.value)}</div>
            <div class="kpi-hero__meta">
              ${
                typeof deltaPercent === "number"
                  ? `<span class="kpi-hero__delta ${deltaPercent >= 0 ? "is-up" : "is-down"}">
                      <i class="bi ${deltaPercent >= 0 ? "bi-arrow-up" : "bi-arrow-down"}" aria-hidden="true"></i>
                      ${Math.abs(deltaPercent)}%
                    </span>`
                  : `<span class="kpi-hero__delta is-muted">—</span>`
              }
              <span class="kpi-hero__period">${periodLabel}</span>
            </div>
          </div>
        </article>
      `.trim();
      }
    )
    .join("");
}

function renderWeeklyChart(rows) {
  const container = el("weeklyChart");
  if (!container) return;

  if (!Array.isArray(rows) || rows.length === 0 || rows.every((row) => Number(row.total || 0) === 0)) {
    container.innerHTML = '<div class="weekly-chart__empty">Nenhuma consulta encontrada nos ultimos 7 dias.</div>';
    return;
  }

  const max = Math.max(...rows.map((row) => Number(row.total || 0)), 1);
  const maxIndex = rows.findIndex((row) => Number(row.total || 0) === max);

  container.innerHTML = rows
    .map((row, index) => {
      const total = Number(row.total || 0);
      const height = Math.max((total / max) * 100, total > 0 ? 14 : 6);

      return `
        <div class="weekly-chart__col">
          <div class="weekly-chart__bar-wrap" title="${row.label}: ${total} consultas">
            <div class="weekly-chart__bar ${index === maxIndex ? "is-peak" : ""}" style="height:${height}%"></div>
          </div>
          <div class="weekly-chart__meta">
            <span class="weekly-chart__label">${String(row.label || "").split(" ")[0]}</span>
          </div>
        </div>
      `.trim();
    })
    .join("");
}

function renderTodayAppointments(rows) {
  const container = el("todayAppointments");
  if (!container) return;

  if (!Array.isArray(rows) || rows.length === 0) {
    container.innerHTML = '<div class="list-empty">Nenhuma consulta agendada para hoje.</div>';
    return;
  }

  container.innerHTML = `
    <div class="table-wrap">
      <table class="table appointments-table">
        <thead>
          <tr>
            <th>Paciente</th>
            <th>Horario</th>
            <th>Profissional</th>
            <th>Procedimento</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map((row) => {
              const time = new Intl.DateTimeFormat("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(row.dateTime));

              return `
                <tr>
                  <td>${row.patientName || "-"}</td>
                  <td>${time}</td>
                  <td>${row.professionalName || "-"}</td>
                  <td>${row.description || "-"}</td>
                  <td><span class="status-badge status-badge--${row.status}">${row.status || "-"}</span></td>
                </tr>
              `.trim();
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderStockAlerts(rows) {
  const container = el("stockAlerts");
  if (!container) return;

  if (!Array.isArray(rows) || rows.length === 0) {
    container.innerHTML = '<div class="list-empty">Nenhum item abaixo do mínimo.</div>';
    return;
  }

  container.innerHTML = `
    <div class="stock-alerts">
      ${rows
        .map((row) => {
          const level = row.level === "em_falta" ? "em_falta" : "baixo";
          const badgeText = level === "em_falta" ? "Em falta" : "Baixo";
          const badgeClass = level === "em_falta" ? "danger" : "warning";

          return `
            <div class="stock-alerts__row">
              <span class="pill pill--${badgeClass}">${badgeText}</span>
              <span class="stock-alerts__name">${row.name || "-"}</span>
              <span class="stock-alerts__qty">${Number(row.quantity || 0)} / ${Number(row.minimum || 0)}</span>
            </div>
          `.trim();
        })
        .join("")}
    </div>
  `;
}

export async function loadDashboard() {
  clearError();
  setLoading(true);

  try {
    const payload = await api.get("/dashboard");
    renderKpis(payload);
    renderWeeklyChart(Array.isArray(payload?.weeklyAppointments) ? payload.weeklyAppointments : []);
    renderTodayAppointments(Array.isArray(payload?.todayAppointments) ? payload.todayAppointments : []);
    renderStockAlerts(Array.isArray(payload?.stockAlerts) ? payload.stockAlerts : []);
  } catch (error) {
    showError(error?.message || "Erro ao carregar dashboard.");
  } finally {
    setLoading(false);
  }
}

export function initDashboardView() {
  const refreshButton = el("refreshButton");
  if (refreshButton) refreshButton.onclick = () => loadDashboard();
  loadDashboard();
}
