function shell({ pageTitle, pageSubtitle, activeRoute, pageClass = "", content }) {
  return `
    <div class="app">
      <aside class="sidebar" data-state="expanded">
        <div class="sidebar__top">
          <button class="btn btn--icon" id="sidebarToggle" type="button" aria-label="Alternar sidebar">
            ==
          </button>
          <div class="sidebar__brand">
            <div class="brand__title">Clinica Dermato CRM</div>
            <div class="brand__subtitle">Frontend</div>
          </div>
        </div>

        <nav class="sidebar__nav" aria-label="Navegacao">
          <a class="nav__item" href="./index.html" data-route="/dashboard">
            <span class="nav__icon">DS</span>
            <span class="nav__label">Dashboard</span>
          </a>
          <a class="nav__item" href="./equipe.html" data-route="/equipe">
            <span class="nav__icon">EQ</span>
            <span class="nav__label">Equipe</span>
          </a>
          <a class="nav__item" href="./pacientes.html" data-route="/pacientes">
            <span class="nav__icon">PC</span>
            <span class="nav__label">Pacientes</span>
          </a>
          <a class="nav__item" href="./agenda.html" data-route="/agenda">
            <span class="nav__icon">AG</span>
            <span class="nav__label">Agenda</span>
          </a>
          <a class="nav__item" href="./tratamentos.html" data-route="/tratamentos">
            <span class="nav__icon">TR</span>
            <span class="nav__label">Tratamentos</span>
          </a>
          <a class="nav__item" href="./faturamento.html" data-route="/faturamento">
            <span class="nav__icon">FT</span>
            <span class="nav__label">Faturamento</span>
          </a>
          <a class="nav__item" href="./relatorios.html" data-route="/relatorios">
            <span class="nav__icon">RL</span>
            <span class="nav__label">Relatorios</span>
          </a>
          <a class="nav__item" href="./estoque.html" data-route="/estoque">
            <span class="nav__icon">ET</span>
            <span class="nav__label">Estoque</span>
          </a>
        </nav>

        <div class="sidebar__bottom">
          <div class="muted">API: <span id="apiBaseUrlLabel"></span></div>
        </div>
      </aside>

      <main class="content">
        <header class="content__header">
          <div>
            <h1 class="content__title" id="pageTitle">${pageTitle}</h1>
            <div class="content__subtitle" id="pageSubtitle">${pageSubtitle}</div>
          </div>
          <div class="header__actions">
            <button class="btn" id="refreshButton" type="button">Atualizar</button>
          </div>
        </header>

        <div class="${pageClass}" data-active-route="${activeRoute}">
          ${content}
        </div>
      </main>
    </div>

    <div class="toast-region" id="toastRegion" role="status" aria-live="polite" aria-relevant="additions text"></div>
  `.trim();
}

const templates = {};

export function registerPageTemplate(page, factory) {
  templates[page] = factory;
}

export function renderPageTemplate(page) {
  const template = templates[page] || templates.dashboard;
  document.body.innerHTML = shell(template());
}

registerPageTemplate("dashboard", () => ({
  pageTitle: "Dashboard",
  pageSubtitle: "Indicadores, agenda do dia e pacientes recentes",
  activeRoute: "/dashboard",
  pageClass: "dashboard",
  content: `
    <section class="dashboard" id="dashboardView" data-view="dashboard">
      <div class="alert alert--error is-hidden" id="dashboardErrorBox"></div>
      <div class="dashboard__loading" id="dashboardLoading">Carregando dashboard...</div>
      <div class="dashboard__content is-hidden" id="dashboardContent">
        <section class="dashboard__kpis" id="dashboardKpis"></section>
        <div class="dashboard__grid">
          <section class="card">
            <div class="card__header">
              <div>
                <strong>Consultas na semana</strong>
                <div class="muted">Ultimos 7 dias</div>
              </div>
            </div>
            <div class="card__body">
              <div class="weekly-chart" id="weeklyChart"></div>
            </div>
          </section>
          <section class="card">
            <div class="card__header">
              <div>
                <strong>Pacientes recentes</strong>
                <div class="muted">Cadastros mais novos</div>
              </div>
            </div>
            <div class="card__body" id="recentPatients"></div>
          </section>
        </div>
        <section class="card">
          <div class="card__header">
            <div>
              <strong>Consultas de hoje</strong>
              <div class="muted">Agenda consolidada do dia</div>
            </div>
          </div>
          <div class="card__body" id="todayAppointments"></div>
        </section>
      </div>
    </section>
  `,
}));

registerPageTemplate("equipe", () => ({
  pageTitle: "Equipe",
  pageSubtitle: "Busca, filtros e cadastro integrados com a API",
  activeRoute: "/equipe",
  content: `
    <section class="card" id="equipeView" data-view="equipe">
      <div class="card__header">
        <div class="filters">
          <div class="field">
            <label for="searchInput">Busca</label>
            <input id="searchInput" type="text" placeholder="nome, email ou cargo" />
          </div>
          <div class="field">
            <label for="statusSelect">Status</label>
            <select id="statusSelect">
              <option value="">Todos</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
          <div class="field field--actions">
            <button class="btn" id="searchButton" type="button">Filtrar</button>
            <button class="btn btn--ghost" id="clearButton" type="button">Limpar</button>
            <button class="btn" id="newMemberButton" type="button" data-bs-toggle="modal" data-bs-target="#newMemberModal">
              + Novo membro
            </button>
          </div>
        </div>
      </div>
      <div class="card__body">
        <div class="alert alert--error is-hidden" id="errorBox"></div>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>Cargo</th>
                <th>Email</th>
                <th>Telefone</th>
                <th>Especialidade</th>
                <th>Status</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody id="equipeTableBody"></tbody>
          </table>
        </div>
        <div class="pager is-hidden" id="equipePager">
          <button class="btn btn--ghost" id="equipePagerPrev" type="button">Anterior</button>
          <div class="pager__label" id="equipePagerLabel"></div>
          <button class="btn btn--ghost" id="equipePagerNext" type="button">Proxima</button>
        </div>
        <div class="list-empty is-hidden" id="equipeEmptyState">Nenhum profissional encontrado</div>
      </div>
    </section>

    <div class="modal fade" id="newMemberModal" tabindex="-1" aria-labelledby="newMemberModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content modal-content--crm">
          <div class="modal-header border-0">
            <div>
              <h2 class="modal-title fs-5" id="newMemberModalLabel">Novo membro da equipe</h2>
              <div class="muted">Cadastro integrado com a API</div>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
          </div>
          <div class="modal-body pt-0">
            <div class="alert alert--error is-hidden" id="memberFormError"></div>
            <form class="form-grid" id="memberForm">
              <div class="field field--span-2">
                <label for="memberNome">Nome</label>
                <input id="memberNome" type="text" required />
              </div>
              <div class="field">
                <label for="memberCargo">Cargo</label>
                <input id="memberCargo" type="text" />
              </div>
              <div class="field">
                <label for="memberEmail">Email</label>
                <input id="memberEmail" type="email" />
              </div>
              <div class="field">
                <label for="memberTelefone">Telefone</label>
                <input id="memberTelefone" type="text" />
              </div>
              <div class="field">
                <label for="memberEspecialidade">Especialidade</label>
                <input id="memberEspecialidade" type="text" />
              </div>
              <div class="field field--span-2">
                <label for="memberStatus">Status</label>
                <select id="memberStatus">
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
              <div class="field field--actions field--span-2">
                <button class="btn" id="saveMemberButton" type="submit">Salvar membro</button>
                <button class="btn btn--ghost" type="button" data-bs-dismiss="modal">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
}));

registerPageTemplate("pacientes", () => ({
  pageTitle: "Pacientes",
  pageSubtitle: "Busca, cadastro e acesso ao perfil",
  activeRoute: "/pacientes",
  content: `
    <section class="patients-layout" id="pacientesView" data-view="pacientes">
      <section class="card">
        <div class="card__header">
          <div class="filters">
            <div class="field">
              <label for="patientSearchInput">Busca</label>
              <input id="patientSearchInput" type="text" placeholder="nome, email ou telefone" />
            </div>
            <div class="field">
              <label for="patientStatusSelect">Status</label>
              <select id="patientStatusSelect">
                <option value="">Todos</option>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
            <div class="field field--actions">
              <button class="btn" id="patientSearchButton" type="button">Buscar</button>
              <button class="btn btn--ghost" id="patientClearButton" type="button">Limpar</button>
            </div>
          </div>
        </div>
        <div class="card__body">
          <div class="alert alert--error is-hidden" id="patientsErrorBox"></div>
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Telefone</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody id="patientsTableBody"></tbody>
            </table>
          </div>
          <div class="pager is-hidden" id="patientsPager">
            <button class="btn btn--ghost" id="patientsPagerPrev" type="button">Anterior</button>
            <div class="pager__label" id="patientsPagerLabel"></div>
            <button class="btn btn--ghost" id="patientsPagerNext" type="button">Proxima</button>
          </div>
          <div class="list-empty is-hidden" id="patientsEmptyState">Nenhum paciente encontrado.</div>
        </div>
      </section>

      <section class="card">
        <div class="card__header">
          <div>
            <strong>Novo paciente</strong>
            <div class="muted">Cadastro via API</div>
          </div>
        </div>
        <div class="card__body">
          <div class="alert alert--error is-hidden" id="patientFormError"></div>
          <form class="form-grid" id="patientCreateForm">
            <div class="field field--span-2">
              <label for="patientCreateNome">Nome</label>
              <input id="patientCreateNome" type="text" required />
            </div>
            <div class="field">
              <label for="patientCreateEmail">Email</label>
              <input id="patientCreateEmail" type="email" />
            </div>
            <div class="field">
              <label for="patientCreateTelefone">Telefone</label>
              <input id="patientCreateTelefone" type="text" />
            </div>
            <div class="field">
              <label for="patientCreateNascimento">Data de nascimento</label>
              <input id="patientCreateNascimento" type="date" />
            </div>
            <div class="field">
              <label for="patientCreateStatus">Status</label>
              <select id="patientCreateStatus">
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
            <div class="field field--span-2">
              <label for="patientCreateObservacoes">Observacoes</label>
              <textarea id="patientCreateObservacoes" rows="5"></textarea>
            </div>
            <div class="field field--actions">
              <button class="btn" id="patientCreateButton" type="submit">Cadastrar</button>
            </div>
          </form>
        </div>
      </section>
    </section>

    <section class="card is-hidden" id="pacientePerfilView" data-view="pacientePerfil">
      <div class="card__header card__header--split">
        <div>
          <strong id="patientProfileTitle">Perfil do paciente</strong>
          <div class="muted" id="patientProfileSubtitle">Carregando...</div>
        </div>
        <div class="header__actions">
          <button class="btn btn--ghost" id="patientBackButton" type="button">Voltar</button>
          <button class="btn btn--danger" id="patientDeleteButton" type="button">Excluir</button>
        </div>
      </div>
      <div class="card__body">
        <div class="alert alert--error is-hidden" id="patientProfileErrorBox"></div>
        <div class="dashboard__loading" id="patientProfileLoading">Carregando perfil...</div>
        <div class="is-hidden" id="patientProfileContent">
          <form class="form-grid" id="patientProfileForm">
            <div class="field field--span-2">
              <label for="patientProfileNome">Nome</label>
              <input id="patientProfileNome" type="text" required />
            </div>
            <div class="field">
              <label for="patientProfileEmail">Email</label>
              <input id="patientProfileEmail" type="email" />
            </div>
            <div class="field">
              <label for="patientProfileTelefone">Telefone</label>
              <input id="patientProfileTelefone" type="text" />
            </div>
            <div class="field">
              <label for="patientProfileNascimento">Data de nascimento</label>
              <input id="patientProfileNascimento" type="date" />
            </div>
            <div class="field">
              <label for="patientProfileStatus">Status</label>
              <select id="patientProfileStatus">
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
            <div class="field field--span-2">
              <label for="patientProfileObservacoes">Observacoes</label>
              <textarea id="patientProfileObservacoes" rows="6"></textarea>
            </div>
            <div class="field field--actions">
              <button class="btn" type="submit">Salvar alteracoes</button>
            </div>
          </form>
        </div>
      </div>
    </section>
  `,
}));

registerPageTemplate("agenda", () => ({
  pageTitle: "Agenda",
  pageSubtitle: "Calendario, filtros e agendamento",
  activeRoute: "/agenda",
  content: `
    <section class="agenda-layout" id="agendaView" data-view="agenda">
      <section class="card">
        <div class="card__header card__header--split">
          <div>
            <strong>Calendario de consultas</strong>
            <div class="muted">Selecione um dia para ver a agenda</div>
          </div>
          <div class="header__actions">
            <button class="btn btn--ghost" id="agendaPrevMonth" type="button">Mes anterior</button>
            <div class="agenda__month" id="agendaMonthLabel"></div>
            <button class="btn btn--ghost" id="agendaNextMonth" type="button">Proximo mes</button>
          </div>
        </div>
        <div class="card__body">
          <div class="alert alert--error is-hidden" id="agendaErrorBox"></div>
          <div class="agenda__filters">
            <div class="field">
              <label for="agendaStatusFilter">Status</label>
              <select id="agendaStatusFilter">
                <option value="">Todos</option>
                <option value="agendada">Agendada</option>
                <option value="realizada">Realizada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
            <div class="field">
              <label for="agendaProfessionalFilter">Profissional</label>
              <select id="agendaProfessionalFilter">
                <option value="">Todos</option>
              </select>
            </div>
            <div class="field">
              <label for="agendaPatientFilter">Paciente</label>
              <select id="agendaPatientFilter">
                <option value="">Todos</option>
              </select>
            </div>
            <div class="field field--actions">
              <button class="btn" id="agendaApplyFilters" type="button">Aplicar</button>
              <button class="btn btn--ghost" id="agendaClearFilters" type="button">Limpar</button>
            </div>
          </div>
          <div class="calendar" id="agendaCalendar"></div>
        </div>
      </section>

      <section class="card">
        <div class="card__header">
          <div>
            <strong>Agendar consulta</strong>
            <div class="muted">Sem conflito de horario</div>
          </div>
        </div>
        <div class="card__body">
          <div class="alert alert--error is-hidden" id="agendaFormError"></div>
          <form class="form-grid" id="agendaCreateForm">
            <div class="field">
              <label for="agendaPacienteSelect">Paciente</label>
              <select id="agendaPacienteSelect" required>
                <option value="">Selecione</option>
              </select>
            </div>
            <div class="field">
              <label for="agendaProfissionalSelect">Profissional</label>
              <select id="agendaProfissionalSelect" required>
                <option value="">Selecione</option>
              </select>
            </div>
            <div class="field">
              <label for="agendaDataInput">Data</label>
              <input id="agendaDataInput" type="date" required />
            </div>
            <div class="field">
              <label for="agendaHoraInput">Horario</label>
              <input id="agendaHoraInput" type="time" required />
            </div>
            <div class="field">
              <label for="agendaStatusInput">Status</label>
              <select id="agendaStatusInput">
                <option value="agendada">Agendada</option>
                <option value="realizada">Realizada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
            <div class="field field--span-2">
              <label for="agendaDescricaoInput">Descricao</label>
              <input id="agendaDescricaoInput" type="text" placeholder="Retorno, avaliacao, procedimento..." />
            </div>
            <div class="field field--span-2">
              <label for="agendaObservacoesInput">Observacoes</label>
              <textarea id="agendaObservacoesInput" rows="4"></textarea>
            </div>
            <div class="field field--actions">
              <button class="btn" id="agendaCreateButton" type="submit">Agendar</button>
            </div>
          </form>
        </div>
      </section>

      <section class="card agenda-layout__full">
        <div class="card__header">
          <div>
            <strong>Consultas do dia</strong>
            <div class="muted">Lista filtrada pela data selecionada</div>
          </div>
        </div>
        <div class="card__body">
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Data e hora</th>
                  <th>Paciente</th>
                  <th>Profissional</th>
                  <th>Descricao</th>
                  <th>Status</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody id="agendaTableBody"></tbody>
            </table>
          </div>
          <div class="list-empty is-hidden" id="agendaEmptyState">Nenhuma consulta encontrada para os filtros atuais.</div>
        </div>
      </section>

      <div class="modal fade" id="agendaEditModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content modal-content--crm">
            <div class="modal-header">
              <h5 class="modal-title" id="agendaEditModalTitle">Editar consulta</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
            </div>
            <form id="agendaEditForm">
              <div class="modal-body">
                <div class="alert alert--error is-hidden" id="agendaEditFormError"></div>

                <div class="grid-2">
                  <div class="field">
                    <label for="agendaEditData">Data</label>
                    <input id="agendaEditData" type="date" required />
                  </div>
                  <div class="field">
                    <label for="agendaEditHora">Horario</label>
                    <input id="agendaEditHora" type="time" required />
                  </div>
                </div>

                <div class="field">
                  <label for="agendaEditStatus">Status</label>
                  <select id="agendaEditStatus">
                    <option value="agendada">Agendada</option>
                    <option value="realizada">Realizada</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>

                <div class="field">
                  <label for="agendaEditDescricao">Descricao</label>
                  <input id="agendaEditDescricao" type="text" placeholder="Retorno, avaliacao, procedimento..." />
                </div>

                <div class="field">
                  <label for="agendaEditObservacoes">Observacoes</label>
                  <textarea id="agendaEditObservacoes" rows="4"></textarea>
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn btn--ghost" type="button" data-bs-dismiss="modal">Cancelar</button>
                <button class="btn" id="agendaEditSaveButton" type="submit">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  `,
}));

registerPageTemplate("tratamentos", () => ({
  pageTitle: "Tratamentos",
  pageSubtitle: "Progresso, status e sessoes por paciente",
  activeRoute: "/tratamentos",
  content: `
    <section class="treatments-layout" id="tratamentosView" data-view="tratamentos">
      <section class="card treatments-layout__full">
        <div class="card__header">
          <div class="filters">
            <div class="field">
              <label for="tratamentosSearchInput">Busca</label>
              <input id="tratamentosSearchInput" type="text" placeholder="tratamento, paciente ou profissional" />
            </div>
            <div class="field">
              <label for="tratamentosStatusFilter">Status</label>
              <select id="tratamentosStatusFilter">
                <option value="">Todos</option>
                <option value="ativo">Ativo</option>
                <option value="concluido">Concluido</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
            <div class="field">
              <label for="tratamentosPatientFilter">Paciente</label>
              <select id="tratamentosPatientFilter">
                <option value="">Todos</option>
              </select>
            </div>
            <div class="field field--actions">
              <button class="btn" id="tratamentosSearchButton" type="button">Buscar</button>
              <button class="btn btn--ghost" id="tratamentosClearButton" type="button">Limpar</button>
            </div>
          </div>
        </div>
        <div class="card__body">
          <div class="alert alert--error is-hidden" id="tratamentosErrorBox"></div>
          <div class="treatments-list" id="tratamentosList"></div>
          <div class="list-empty is-hidden" id="tratamentosEmptyState">Nenhum tratamento encontrado.</div>
        </div>
      </section>

      <section class="card">
        <div class="card__header">
          <div>
            <strong>Novo tratamento</strong>
            <div class="muted">Vinculado a paciente e profissional</div>
          </div>
        </div>
        <div class="card__body">
          <div class="alert alert--error is-hidden" id="tratamentosFormError"></div>
          <form class="form-grid" id="tratamentoCreateForm">
            <div class="field">
              <label for="tratamentoPacienteSelect">Paciente</label>
              <select id="tratamentoPacienteSelect" required>
                <option value="">Selecione</option>
              </select>
            </div>
            <div class="field">
              <label for="tratamentoProfissionalSelect">Profissional</label>
              <select id="tratamentoProfissionalSelect" required>
                <option value="">Selecione</option>
              </select>
            </div>
            <div class="field field--span-2">
              <label for="tratamentoNome">Nome</label>
              <input id="tratamentoNome" type="text" required />
            </div>
            <div class="field">
              <label for="tratamentoDataInicio">Data inicial</label>
              <input id="tratamentoDataInicio" type="date" />
            </div>
            <div class="field">
              <label for="tratamentoDataFim">Data final</label>
              <input id="tratamentoDataFim" type="date" />
            </div>
            <div class="field">
              <label for="tratamentoStatus">Status</label>
              <select id="tratamentoStatus">
                <option value="ativo">Ativo</option>
                <option value="concluido">Concluido</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
            <div class="field field--span-2">
              <label for="tratamentoDescricao">Descricao</label>
              <textarea id="tratamentoDescricao" rows="4"></textarea>
            </div>
            <div class="field field--actions">
              <button class="btn" id="tratamentoCreateButton" type="submit">Cadastrar</button>
            </div>
          </form>
        </div>
      </section>

      <section class="card">
        <div class="card__header">
          <div>
            <strong>Nova sessao</strong>
            <div class="muted">Afeta o progresso calculado</div>
          </div>
        </div>
        <div class="card__body">
          <div class="alert alert--error is-hidden" id="tratamentosSessionError"></div>
          <form class="form-grid" id="tratamentoSessaoForm">
            <div class="field field--span-2">
              <label for="tratamentoSessaoTratamento">Tratamento</label>
              <select id="tratamentoSessaoTratamento" required>
                <option value="">Selecione</option>
              </select>
            </div>
            <div class="field">
              <label for="tratamentoSessaoData">Data</label>
              <input id="tratamentoSessaoData" type="date" required />
            </div>
            <div class="field">
              <label for="tratamentoSessaoHora">Horario</label>
              <input id="tratamentoSessaoHora" type="time" required />
            </div>
            <div class="field">
              <label for="tratamentoSessaoStatus">Status</label>
              <select id="tratamentoSessaoStatus">
                <option value="agendada">Agendada</option>
                <option value="realizada">Realizada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
            <div class="field field--span-2">
              <label for="tratamentoSessaoObservacoes">Observacoes</label>
              <textarea id="tratamentoSessaoObservacoes" rows="4"></textarea>
            </div>
            <div class="field field--actions">
              <button class="btn" id="tratamentoSessaoButton" type="submit">Adicionar sessao</button>
            </div>
          </form>
        </div>
      </section>

      <div class="modal fade" id="tratamentosEditModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content modal-content--crm">
            <div class="modal-header">
              <h5 class="modal-title" id="tratamentosEditModalTitle">Editar tratamento</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
            </div>
            <form id="tratamentosEditForm">
              <div class="modal-body">
                <div class="alert alert--error is-hidden" id="tratamentosEditFormError"></div>

                <div class="field">
                  <label for="tratamentosEditNome">Nome</label>
                  <input id="tratamentosEditNome" type="text" required />
                </div>

                <div class="grid-2">
                  <div class="field">
                    <label for="tratamentosEditDataInicio">Data inicial</label>
                    <input id="tratamentosEditDataInicio" type="date" />
                  </div>
                  <div class="field">
                    <label for="tratamentosEditDataFim">Data final</label>
                    <input id="tratamentosEditDataFim" type="date" />
                  </div>
                </div>

                <div class="field">
                  <label for="tratamentosEditStatus">Status</label>
                  <select id="tratamentosEditStatus">
                    <option value="ativo">Ativo</option>
                    <option value="concluido">Concluido</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>

                <div class="field">
                  <label for="tratamentosEditDescricao">Descricao</label>
                  <textarea id="tratamentosEditDescricao" rows="4"></textarea>
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn btn--ghost" type="button" data-bs-dismiss="modal">Cancelar</button>
                <button class="btn" id="tratamentosEditSaveButton" type="submit">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  `,
}));

registerPageTemplate("faturamento", () => ({
  pageTitle: "Faturamento",
  pageSubtitle: "KPIs, faturas e status de pagamento",
  activeRoute: "/faturamento",
  pageClass: "dashboard",
  content: `
    <section class="dashboard" id="faturamentoView" data-view="faturamento">
      <section class="card">
        <div class="card__header">
          <div class="filters">
            <div class="field">
              <label for="faturamentoSearchInput">Busca</label>
              <input id="faturamentoSearchInput" type="text" placeholder="paciente, tratamento ou numero da fatura" />
            </div>
            <div class="field">
              <label for="faturamentoStatusFilter">Status</label>
              <select id="faturamentoStatusFilter">
                <option value="">Todos</option>
                <option value="aberta">Aberta</option>
                <option value="paga">Paga</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
            <div class="field">
              <label for="faturamentoMonthFilter">Mes</label>
              <input id="faturamentoMonthFilter" type="month" />
            </div>
            <div class="field field--actions">
              <button class="btn" id="faturamentoSearchButton" type="button">Buscar</button>
              <button class="btn btn--ghost" id="faturamentoClearButton" type="button">Limpar</button>
              <button class="btn" id="faturamentoNewButton" type="button">Nova fatura</button>
            </div>
          </div>
        </div>
        <div class="card__body">
          <div class="alert alert--error is-hidden" id="faturamentoErrorBox"></div>
          <section class="dashboard__kpis" id="faturamentoKpis"></section>
        </div>
      </section>

      <section class="card">
        <div class="card__header">
          <div>
            <strong>Faturas</strong>
            <div class="muted">Dados financeiros vindos da API</div>
          </div>
        </div>
        <div class="card__body">
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Fatura</th>
                  <th>Paciente</th>
                  <th>Tratamento</th>
                  <th>Emissao</th>
                  <th>Vencimento</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody id="faturamentoTableBody"></tbody>
            </table>
          </div>
          <div class="list-empty is-hidden" id="faturamentoEmptyState">Nenhuma fatura encontrada.</div>
        </div>
      </section>

      <div class="modal fade" id="faturamentoEditModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content modal-content--crm">
            <div class="modal-header">
              <h5 class="modal-title" id="faturamentoEditModalTitle">Editar fatura</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
            </div>
            <form id="faturamentoEditForm">
              <div class="modal-body">
                <div class="alert alert--error is-hidden" id="faturamentoEditFormError"></div>

                <div class="grid-2">
                  <div class="field">
                    <label for="faturamentoEditStatus">Status</label>
                    <select id="faturamentoEditStatus">
                      <option value="aberta">Aberta</option>
                      <option value="paga">Paga</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </div>
                  <div class="field">
                    <label for="faturamentoEditValorTotal">Valor total</label>
                    <input id="faturamentoEditValorTotal" type="number" step="0.01" />
                  </div>
                </div>

                <div class="grid-2">
                  <div class="field">
                    <label for="faturamentoEditDataEmissao">Data de emissao</label>
                    <input id="faturamentoEditDataEmissao" type="date" />
                  </div>
                  <div class="field">
                    <label for="faturamentoEditDataVencimento">Data de vencimento</label>
                    <input id="faturamentoEditDataVencimento" type="date" />
                  </div>
                </div>

                <div class="field">
                  <label for="faturamentoEditObservacoes">Observacoes</label>
                  <textarea id="faturamentoEditObservacoes" rows="4"></textarea>
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn btn--ghost" type="button" data-bs-dismiss="modal">Cancelar</button>
                <button class="btn" id="faturamentoEditSaveButton" type="submit">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div class="modal fade" id="faturamentoNewModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content modal-content--crm">
            <div class="modal-header">
              <h5 class="modal-title">Nova fatura</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
            </div>
            <form id="faturamentoNewForm">
              <div class="modal-body">
                <div class="alert alert--error is-hidden" id="faturamentoNewFormError"></div>

                <div class="field">
                  <label for="faturamentoNewPaciente">Paciente</label>
                  <select id="faturamentoNewPaciente">
                    <option value="">Selecione</option>
                  </select>
                </div>

                <div class="field">
                  <label for="faturamentoNewTratamento">Tratamento</label>
                  <select id="faturamentoNewTratamento">
                    <option value="">Selecione</option>
                  </select>
                </div>

                <div class="grid-2">
                  <div class="field">
                    <label for="faturamentoNewDataEmissao">Data de emissao</label>
                    <input id="faturamentoNewDataEmissao" type="date" />
                  </div>
                  <div class="field">
                    <label for="faturamentoNewDataVencimento">Data de vencimento</label>
                    <input id="faturamentoNewDataVencimento" type="date" />
                  </div>
                </div>

                <div class="grid-2">
                  <div class="field">
                    <label for="faturamentoNewValorTotal">Valor total</label>
                    <input id="faturamentoNewValorTotal" type="number" step="0.01" />
                  </div>
                  <div class="field">
                    <label for="faturamentoNewStatus">Status</label>
                    <select id="faturamentoNewStatus">
                      <option value="aberta">Aberta</option>
                      <option value="paga">Paga</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </div>
                </div>

                <div class="field">
                  <label for="faturamentoNewObservacoes">Observacoes</label>
                  <textarea id="faturamentoNewObservacoes" rows="4"></textarea>
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn btn--ghost" type="button" data-bs-dismiss="modal">Cancelar</button>
                <button class="btn" id="faturamentoNewSaveButton" type="submit">Criar</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  `,
}));

registerPageTemplate("relatorios", () => ({
  pageTitle: "Relatorios",
  pageSubtitle: "KPIs, receita e comparacoes mensais",
  activeRoute: "/relatorios",
  pageClass: "dashboard",
  content: `
    <section class="dashboard" id="relatoriosView" data-view="relatorios">
      <div class="dashboard__loading is-hidden" id="relatoriosLoading">Carregando relatorios...</div>
      <div id="relatoriosContent">
      <section class="card">
        <div class="card__header">
          <div class="filters">
            <div class="field">
              <label for="relatoriosMonthFilter">Mes</label>
              <input id="relatoriosMonthFilter" type="month" />
            </div>
            <div class="field field--actions">
              <button class="btn" id="relatoriosApplyButton" type="button">Aplicar</button>
              <button class="btn btn--ghost" id="relatoriosClearButton" type="button">Limpar</button>
            </div>
          </div>
        </div>
        <div class="card__body">
          <div class="alert alert--error is-hidden" id="relatoriosErrorBox"></div>
          <section class="dashboard__kpis" id="relatoriosKpis"></section>
        </div>
      </section>

      <section class="reports-grid">
        <section class="card">
          <div class="card__header">
            <div>
              <strong>Receita por mes</strong>
              <div class="muted">Serie historica dos ultimos 6 meses</div>
            </div>
          </div>
          <div class="card__body">
            <div class="report-chart" id="relatoriosRevenueChart"></div>
          </div>
        </section>

        <section class="card">
          <div class="card__header">
            <div>
              <strong>Comparacao mensal</strong>
              <div class="muted">Atual versus mes anterior</div>
            </div>
          </div>
          <div class="card__body">
            <div class="comparison-grid" id="relatoriosComparisonCards"></div>
          </div>
        </section>
      </section>
      </div>
    </section>
  `,
}));

registerPageTemplate("estoque", () => ({
  pageTitle: "Estoque",
  pageSubtitle: "Categorias, niveis criticos e materiais",
  activeRoute: "/estoque",
  pageClass: "dashboard",
  content: `
    <section class="dashboard" id="estoqueView" data-view="estoque">
      <section class="card">
        <div class="card__header">
          <div class="filters">
            <div class="field">
              <label for="estoqueSearchInput">Busca</label>
              <input id="estoqueSearchInput" type="text" placeholder="material ou categoria" />
            </div>
            <div class="field">
              <label for="estoqueCategoryFilter">Categoria</label>
              <select id="estoqueCategoryFilter">
                <option value="">Todas</option>
              </select>
            </div>
            <div class="field field--actions">
              <button class="btn" id="estoqueSearchButton" type="button">Buscar</button>
              <button class="btn btn--ghost" id="estoqueClearButton" type="button">Limpar</button>
              <button class="btn" id="estoqueNewItemButton" type="button">Novo item</button>
              <button class="btn btn--ghost" id="estoqueManageCategoriesButton" type="button">Categorias</button>
            </div>
          </div>
        </div>
        <div class="card__body">
          <div class="alert alert--error is-hidden" id="estoqueErrorBox"></div>
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Categoria</th>
                  <th>Quantidade</th>
                  <th>Minimo</th>
                  <th>Custo unitario</th>
                  <th>Validade</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody id="estoqueTableBody"></tbody>
            </table>
          </div>
          <div class="list-empty is-hidden" id="estoqueEmptyState">Nenhum item encontrado.</div>
        </div>
      </section>

      <div class="modal fade" id="estoqueItemModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content modal-content--crm">
            <div class="modal-header">
              <h5 class="modal-title" id="estoqueItemModalTitle">Novo item</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
            </div>
            <form id="estoqueItemForm">
              <div class="modal-body">
                <div class="alert alert--error is-hidden" id="estoqueItemFormError"></div>

                <div class="field">
                  <label for="estoqueItemNome">Item</label>
                  <input id="estoqueItemNome" type="text" placeholder="Nome do material" />
                </div>

                <div class="field">
                  <label for="estoqueItemCategoria">Categoria</label>
                  <select id="estoqueItemCategoria">
                    <option value="">Selecione</option>
                  </select>
                </div>

                <div class="grid-2">
                  <div class="field">
                    <label for="estoqueItemQuantidade">Quantidade</label>
                    <input id="estoqueItemQuantidade" type="number" step="0.01" />
                  </div>
                  <div class="field">
                    <label for="estoqueItemUnidade">Unidade</label>
                    <input id="estoqueItemUnidade" type="text" placeholder="ex.: caixa, frasco" />
                  </div>
                </div>

                <div class="grid-2">
                  <div class="field">
                    <label for="estoqueItemQuantidadeMinima">Quantidade minima</label>
                    <input id="estoqueItemQuantidadeMinima" type="number" step="0.01" />
                  </div>
                  <div class="field">
                    <label for="estoqueItemCustoUnitario">Custo unitario</label>
                    <input id="estoqueItemCustoUnitario" type="number" step="0.01" />
                  </div>
                </div>

                <div class="field">
                  <label for="estoqueItemValidade">Validade</label>
                  <input id="estoqueItemValidade" type="date" />
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn btn--ghost" type="button" data-bs-dismiss="modal">Cancelar</button>
                <button class="btn" id="estoqueItemSaveButton" type="submit">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div class="modal fade" id="estoqueCategoriesModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-lg">
          <div class="modal-content modal-content--crm">
            <div class="modal-header">
              <h5 class="modal-title">Categorias do estoque</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
            </div>
            <div class="modal-body">
              <div class="alert alert--error is-hidden" id="estoqueCategoriesError"></div>

              <form class="form-grid" id="estoqueCategoryForm">
                <div class="field field--span-2">
                  <label for="estoqueCategoryNome">Nome</label>
                  <input id="estoqueCategoryNome" type="text" placeholder="Ex.: Skincare, Injetaveis..." />
                </div>
                <div class="field field--span-2">
                  <label for="estoqueCategoryDescricao">Descricao</label>
                  <input id="estoqueCategoryDescricao" type="text" placeholder="Opcional" />
                </div>
                <div class="field field--actions field--span-2">
                  <button class="btn" id="estoqueCategorySaveButton" type="submit">Salvar</button>
                  <button class="btn btn--ghost" id="estoqueCategoryCancelButton" type="button">Limpar</button>
                </div>
              </form>

              <div class="table-wrap" style="margin-top: 16px;">
                <table class="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nome</th>
                      <th>Descricao</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody id="estoqueCategoriesTableBody"></tbody>
                </table>
              </div>
              <div class="list-empty is-hidden" id="estoqueCategoriesEmptyState">Nenhuma categoria cadastrada.</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
}));
