import { api } from "./api.js";
import { renderPageTemplate } from "./pageTemplates.js";
import { initSidebar, setActiveRoute } from "./sidebar.js";
import { initAgendaView } from "./views/agendaView.js";
import { initDashboardView } from "./views/dashboardView.js";
import { initEquipeView } from "./views/equipeView.js";
import { initEstoqueView } from "./views/estoqueView.js";
import { initFaturamentoView } from "./views/faturamentoView.js";
import { initPacientePerfilView, initPacientesView } from "./views/pacientesView.js";
import { initRelatoriosView } from "./views/relatoriosView.js";
import { initTratamentosView } from "./views/tratamentosView.js";

const page = document.body.dataset.page || "dashboard";

function setApiLabel() {
  const apiLabel = document.getElementById("apiBaseUrlLabel");
  if (apiLabel) apiLabel.textContent = api.baseUrl;
}

function initPacientesPage() {
  const pageTitle = document.getElementById("pageTitle");
  const pageSubtitle = document.getElementById("pageSubtitle");
  const listView = document.getElementById("pacientesView");
  const profileView = document.getElementById("pacientePerfilView");

  const resolve = () => {
    const isProfile = /^#\/pacientes\/\d+$/.test(globalThis.location.hash || "");

    listView?.classList.toggle("is-hidden", isProfile);
    profileView?.classList.toggle("is-hidden", !isProfile);

    if (pageTitle) pageTitle.textContent = isProfile ? "Perfil do Paciente" : "Pacientes";
    if (pageSubtitle) {
      pageSubtitle.textContent = isProfile
        ? "Consulta e atualizacao do cadastro"
        : "Busca, cadastro e acesso ao perfil";
    }

    if (isProfile) {
      initPacientePerfilView();
      return;
    }

    initPacientesView();
  };

  globalThis.addEventListener("hashchange", resolve);
  resolve();
}

renderPageTemplate(page);
initSidebar();
setApiLabel();

const initializers = {
  dashboard: () => initDashboardView(),
  equipe: () => initEquipeView(),
  pacientes: () => initPacientesPage(),
  agenda: () => initAgendaView(),
  tratamentos: () => initTratamentosView(),
  faturamento: () => initFaturamentoView(),
  relatorios: () => initRelatoriosView(),
  estoque: () => initEstoqueView(),
};

setActiveRoute(`/${page === "dashboard" ? "dashboard" : page}`);
initializers[page]?.();
