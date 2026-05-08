import { setActiveRoute } from "./sidebar.js";
import { initDashboardView } from "./views/dashboardView.js";
import { initEquipeView } from "./views/equipeView.js";
import { initAgendaView } from "./views/agendaView.js";
import { initEstoqueView } from "./views/estoqueView.js";
import { initFaturamentoView } from "./views/faturamentoView.js";
import { initPacientePerfilView, initPacientesView } from "./views/pacientesView.js";
import { initRelatoriosView } from "./views/relatoriosView.js";
import { initTratamentosView } from "./views/tratamentosView.js";

function showView(name) {
  const dashboard = document.getElementById("dashboardView");
  const equipe = document.getElementById("equipeView");
  const agenda = document.getElementById("agendaView");
  const estoque = document.getElementById("estoqueView");
  const faturamento = document.getElementById("faturamentoView");
  const relatorios = document.getElementById("relatoriosView");
  const tratamentos = document.getElementById("tratamentosView");
  const pacientes = document.getElementById("pacientesView");
  const pacientePerfil = document.getElementById("pacientePerfilView");
  const placeholder = document.getElementById("placeholderView");

  dashboard?.classList.toggle("is-hidden", name !== "dashboard");
  equipe?.classList.toggle("is-hidden", name !== "equipe");
  agenda?.classList.toggle("is-hidden", name !== "agenda");
  estoque?.classList.toggle("is-hidden", name !== "estoque");
  faturamento?.classList.toggle("is-hidden", name !== "faturamento");
  relatorios?.classList.toggle("is-hidden", name !== "relatorios");
  tratamentos?.classList.toggle("is-hidden", name !== "tratamentos");
  pacientes?.classList.toggle("is-hidden", name !== "pacientes");
  pacientePerfil?.classList.toggle("is-hidden", name !== "pacientePerfil");
  placeholder?.classList.toggle("is-hidden", name !== "placeholder");

  if (name === "dashboard") {
    initDashboardView();
    return;
  }

  if (name === "equipe") {
    initEquipeView();
    return;
  }

  if (name === "pacientes") {
    initPacientesView();
    return;
  }

  if (name === "agenda") {
    initAgendaView();
    return;
  }

  if (name === "faturamento") {
    initFaturamentoView();
    return;
  }

  if (name === "estoque") {
    initEstoqueView();
    return;
  }

  if (name === "relatorios") {
    initRelatoriosView();
    return;
  }

  if (name === "tratamentos") {
    initTratamentosView();
    return;
  }

  if (name === "pacientePerfil") {
    initPacientePerfilView();
  }
}

function getMeta(route) {
  if (/^\/pacientes\/\d+$/.test(route)) {
    return {
      title: "Perfil do Paciente",
      subtitle: "Consulta e atualizacao do cadastro",
      view: "pacientePerfil",
      activeRoute: "/pacientes",
    };
  }

  if (route === "/dashboard") {
    return {
      title: "Dashboard",
      subtitle: "Indicadores, agenda do dia e pacientes recentes",
      view: "dashboard",
      activeRoute: "/dashboard",
    };
  }

  if (route === "/equipe") {
    return {
      title: "Equipe",
      subtitle: "Consumo via fetch padrao",
      view: "equipe",
      activeRoute: "/equipe",
    };
  }

  if (route === "/pacientes") {
    return {
      title: "Pacientes",
      subtitle: "Busca, cadastro e acesso ao perfil",
      view: "pacientes",
      activeRoute: "/pacientes",
    };
  }

  if (route === "/agenda") {
    return {
      title: "Agenda",
      subtitle: "Calendario, filtros e agendamento",
      view: "agenda",
      activeRoute: "/agenda",
    };
  }

  if (route === "/tratamentos") {
    return {
      title: "Tratamentos",
      subtitle: "Progresso, status e sessoes por paciente",
      view: "tratamentos",
      activeRoute: "/tratamentos",
    };
  }

  if (route === "/faturamento") {
    return {
      title: "Faturamento",
      subtitle: "KPIs, faturas e status de pagamento",
      view: "faturamento",
      activeRoute: "/faturamento",
    };
  }

  if (route === "/estoque") {
    return {
      title: "Estoque",
      subtitle: "Categorias, niveis criticos e materiais",
      view: "estoque",
      activeRoute: "/estoque",
    };
  }

  if (route === "/relatorios") {
    return {
      title: "Relatorios",
      subtitle: "KPIs, receita e comparacoes mensais",
      view: "relatorios",
      activeRoute: "/relatorios",
    };
  }

  const label =
    route === "/pacientes"
      ? "Pacientes"
      : route === "/agenda"
        ? "Agenda"
        : route === "/faturamento"
          ? "Faturamento"
        : route === "/estoque"
          ? "Estoque"
        : route === "/relatorios"
          ? "Relatorios"
        : route === "/tratamentos"
          ? "Tratamentos"
            : "Tela";

  return {
    title: label,
    subtitle: "Tela em construcao",
    view: "placeholder",
    activeRoute: route,
  };
}

export function initRouter() {
  const title = document.getElementById("pageTitle");
  const subtitle = document.getElementById("pageSubtitle");

  const resolve = () => {
    const hash = globalThis.location.hash || "#/dashboard";
    const route = hash.replace(/^#/, "");
    const meta = getMeta(route);

    setActiveRoute(meta.activeRoute || route);
    if (title) title.textContent = meta.title;
    if (subtitle) subtitle.textContent = meta.subtitle;
    showView(meta.view);
  };

  globalThis.addEventListener("hashchange", resolve);
  resolve();
}
