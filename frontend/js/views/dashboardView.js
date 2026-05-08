import { api } from "../api.js";

function el(id) {
  return document.getElementById(id);
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(value));
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

function renderKpis(kpis) {
  const container = el("dashboardKpis");
  if (!container) return;

  const items = [
    {
      label: "Pacientes ativos",
      value: kpis?.pacientesAtivos ?? 0,
      hint: "Base atual de pacientes em acompanhamento",
      tone: "info",
    },
    {
      label: "Consultas hoje",
      value: kpis?.consultasHoje ?? 0,
      hint: "Compromissos marcados para o dia",
      tone: "warning",
    },
    {
      label: "Realizadas na semana",
      value: kpis?.realizadasSemana ?? 0,
      hint: "Atendimentos concluidos nos ultimos 7 dias",
      tone: "success",
    },
    {
      label: "Canceladas na semana",
      value: kpis?.canceladasSemana ?? 0,
      hint: "Consultas perdidas ou remarcadas recentemente",
      tone: "danger",
    },
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

function renderWeeklyChart(rows) {
  const container = el("weeklyChart");
  if (!container) return;

  if (!Array.isArray(rows) || rows.length === 0 || rows.every((row) => Number(row.total || 0) === 0)) {
    container.innerHTML = '<div class="weekly-chart__empty">Nenhuma consulta encontrada nos ultimos 7 dias.</div>';
    return;
  }

  const max = Math.max(...rows.map((row) => Number(row.total || 0)), 1);

  container.innerHTML = rows
    .map((row) => {
      const total = Number(row.total || 0);
      const height = Math.max((total / max) * 100, total > 0 ? 14 : 6);

      return `
        <div class="weekly-chart__col">
          <div class="weekly-chart__bar-wrap" title="${row.label}: ${total} consultas">
            <div class="weekly-chart__bar" style="height:${height}%"></div>
          </div>
          <div class="weekly-chart__meta">
            <span class="weekly-chart__value">${total}</span>
            <span class="weekly-chart__label">${row.label}</span>
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
            <th>Horario</th>
            <th>Paciente</th>
            <th>Profissional</th>
            <th>Descricao</th>
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
                  <td>${time}</td>
                  <td>${row.patientName || "-"}</td>
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

function renderRecentPatients(rows) {
  const container = el("recentPatients");
  if (!container) return;

  if (!Array.isArray(rows) || rows.length === 0) {
    container.innerHTML = '<div class="list-empty">Nenhum paciente cadastrado ate o momento.</div>';
    return;
  }

  container.innerHTML = `
    <div class="recent-list">
      ${rows
        .map(
          (row) => `
            <article class="recent-list__item">
              <div class="recent-list__top">
                <div class="recent-list__name">${row.name || "-"}</div>
                <span class="status-badge status-badge--${row.status}">${row.status || "-"}</span>
              </div>
              <div class="recent-list__meta">
                <span>${row.email || row.phone || "Sem contato informado"}</span>
                <span>${formatDate(row.createdAt)}</span>
              </div>
            </article>
          `.trim()
        )
        .join("")}
    </div>
  `;
}

export async function loadDashboard() {
  clearError();
  setLoading(true);

  try {
    const payload = await api.get("/dashboard");
    renderKpis(payload?.kpis || {});
    renderWeeklyChart(Array.isArray(payload?.weeklyAppointments) ? payload.weeklyAppointments : []);
    renderTodayAppointments(Array.isArray(payload?.todayAppointments) ? payload.todayAppointments : []);
    renderRecentPatients(Array.isArray(payload?.recentPatients) ? payload.recentPatients : []);
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
