# Sistema CRM clinica de dermato

Este ExecPlan é um documento vivo. O sistema Clinica Dermato CRM é uma plataforma web de gestão integrada voltada para clínicas dermatológicas, com o objetivo de centralizar e otimizar processos clínicos, administrativos e financeiros em um único ambiente digital.

## Purpose / Big Picture
A solução oferece suporte completo às operações da clínica, incluindo:

Centralizar informações
Unificar dados de pacientes, consultas e tratamentos em um único sistema
Melhorar a produtividade
Reduzir tarefas manuais e retrabalho administrativo
Otimizar o agendamento
Evitar conflitos de horários e melhorar a organização da agenda
Acompanhar tratamentos
Controlar sessões, progresso e histórico clínico dos pacientes
Controlar o financeiro
Monitorar faturamento, inadimplência e fluxo de caixa
Gerenciar recursos
Controlar equipe e estoque de forma eficiente
Apoiar decisões
Fornecer relatórios e indicadores estratégicos em tempo real

A interface do sistema é baseada em um dashboard moderno e orientado a dados, permitindo uma visão consolidada do desempenho da clínica, conforme descrito nas telas do sistema .

O sistema é estruturado em módulos independentes porém integrados, acessíveis por meio de um menu lateral, garantindo navegação simples, rápida e intuitiva.

## Progress
- [x] Estrutura: separar frontend e backend (`frontend/` + `backend/`)
- [x] Docs: `README.md` na raiz + `INSTRUCOES_EXECUCAO.md` atualizado
- [x] Backend: rotas básicas OK (`/health`, `/dashboard`, `/equipe`, `/pacientes`, `/consultas`, `/tratamentos`, `/faturamento`, `/relatorios`, `/estoque`)
- [x] Backend: CRUD `consultas` (`GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`)
- [x] Backend: CRUD `tratamentos` (`GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`, `POST /:id/sessoes`)
- [x] Backend: CRUD itens do estoque (`/estoque/itens/*`) + categorias (`/estoque/categorias`)
- [x] Backend: CRUD categorias de estoque (`POST/PUT/DELETE /estoque/categorias`)
- [x] Frontend: tela Estoque com CRUD (modal criar/editar/remover)
- [x] Terminar backend (checklist abaixo)
- [x] Terminar frontend (checklist abaixo)
- [x] Corrigir cores do design

### Checklist - Terminar backend
- [x] Padronizar erros: formato consistente `{ message, details? }` e status codes por caso
- [x] Endpoints extras: alinhar filtros/paginacao onde fizer sentido (ex.: `/equipe`, `/pacientes`)
- [x] Segurança mínima: validações + CORS configurável + rate limit básico (se necessário)
- [x] Documentar exemplos de requests/responses em `API.md`

### Checklist - Terminar frontend
- [x] Padronizar feedback de sucesso/erro (toast/notificações) em todos os CRUDs
- [x] Revisar UX: confirmações, estados vazios/loading e consistência visual por tela
- [x] Dashboard/Relatórios: revisar filtros de período e consistência de datas



## Surprises & Discoveries
- 2026-05-06: `git` não está disponível neste ambiente (não foi possível criar commits aqui).
- 2026-05-06: Não existe pasta `.git` neste workspace (não é um repositório Git aqui).
- 2026-05-06: `migrations.sql` cria/usa `clinica_dermato_crm2`, mas o script de migrate estava tentando conectar em um DB diferente por padrão (ajustado).
- 2026-05-06: `backend/migrations.sql` define o nome do banco dentro do próprio SQL (`CREATE DATABASE`/`USE`), então alterar apenas `DB_NAME` pode não ter efeito sem ajustar o arquivo.
- 2026-05-06: `Invoke-WebRequest` no PowerShell exigiu `-UseBasicParsing` neste ambiente (IE DOM indisponível).
- 2026-05-06: `PUT /faturamento/:id` valida `data_emissao`/`data_vencimento` como `YYYY-MM-DD` quando enviados; clientes devem enviar nesse formato ou omitir os campos.
- 2026-05-06: O smoke test inicial não encerrava por manter conexões do MySQL pool abertas; ajustado para chamar `pool.end()` no final.
- 2026-05-06: MySQL2 (prepared statements via `pool.execute`) falhou ao usar placeholders em `LIMIT ? OFFSET ?` com erro `Incorrect arguments to mysqld_stmt_execute`; ajustado para interpolar `LIMIT/OFFSET` com números já normalizados.
- 2026-05-06: PowerShell não faz "brace expansion" em URLs (`{index,equipe,...}`); validação de páginas precisa ser feita chamando cada rota explicitamente.
- 2026-05-06: `toISOString()` usa UTC e pode gerar mês/dia errado perto da virada do dia; ajustado para gerar datas ISO em horário local no frontend (Agenda e emissão no Faturamento).

## Decision Log
- 2026-05-06: Estrutura adotada: manter `package.json` na raiz e mover todo o backend para `backend/`, mantendo `frontend/` separado.
- 2026-05-06: Scripts do backend passaram a resolver caminhos via `__dirname` para funcionarem independente do `cwd`.
- 2026-05-06: Endpoints do backend expandidos para incluir `GET/PUT/DELETE` em `consultas` e `tratamentos` (suporte a CRUD completo futuro).
- 2026-05-06: Estoque passou a ter CRUD de `itens_estoque` via API (`/estoque/itens/*`) e a UI do frontend ganhou modal de criação/edição.
- 2026-05-06: Faturamento passou a permitir atualização de status via API (`PUT /faturamento/:id`) e a UI ganhou ações (marcar paga/cancelar).
- 2026-05-06: UI do Faturamento ganhou modal de edição para atualizar status/valor/datas/observações via `PUT /faturamento/:id`.
- 2026-05-06: UI da Agenda ganhou ações e modal de edição para gerenciar consultas via `PUT /consultas/:id` (editar, marcar realizada, cancelar).
- 2026-05-06: UI de Tratamentos ganhou ações e modal de edição para gerenciar tratamentos via `PUT /tratamentos/:id` (editar, concluir, cancelar, remover).
- 2026-05-06: UI de Equipe ganhou ações (editar/remover) reutilizando o modal existente e integrando com `PUT /equipe/:id` e `DELETE /equipe/:id`.
- 2026-05-06: UI de Estoque ganhou gerenciamento de categorias via modal (listar/criar/editar/remover) usando `/estoque/categorias`.
- 2026-05-06: Backend faturamento expandido para CRUD básico (`POST` e `DELETE`) para permitir completar o módulo end-to-end.
- 2026-05-06: Adotado padrão de feedback via toast no frontend (`frontend/js/toast.js`) e aplicado nos fluxos CRUD principais.
- 2026-05-06: UI de Faturamento ganhou criação de faturas via modal (paciente → tratamentos do paciente) usando `POST /faturamento`.
- 2026-05-06: UI de Faturamento ganhou remoção de faturas via `DELETE /faturamento/:id`.
- 2026-05-08: Paleta do frontend alinhada ao `design.md` via variáveis CSS (`--primary`/`--secondary`) e substituição de cores hardcoded por `rgba(var(--primary-rgb), …)` em componentes principais.

## Outcomes & Retrospective
- Não foi registrado nada

## Context and Orientation
O projeto já foi iniciado, existe algumas páginas e tabelas. Agora o objetivo é evoluir o projeto de uma maneira mais profissional atingindo as expectativas de: Purpose / Big Picture

## Plan of Work
O projeto deve avançar para uma estrutura profissional separando frontend de backend.

Para corrigir as cores do sistema utilize o arquivo design.md

## Concrete Steps
- [x] Mover backend para `backend/` (código, scripts e SQL)
- [x] Atualizar `package.json` para apontar para `backend/*`
- [x] Atualizar documentação de execução para nova estrutura
- [x] Backend: adicionar `GET/PUT/DELETE` para `consultas` e `tratamentos`
- [x] Backend: adicionar CRUD de itens de estoque (`/estoque/itens`)
- [x] Frontend: adicionar UI (modal) para criar/editar/remover itens do estoque
- [x] Backend: adicionar `GET /:id` e `PUT /:id` para `faturamento`
- [x] Frontend: adicionar ações de status no Faturamento (marcar paga/cancelar)
- [x] Frontend: adicionar modal de edição no Faturamento (status/valor/datas/observações)
- [x] Frontend: adicionar ações/modal de edição na Agenda (editar/realizada/cancelar)
- [x] Frontend: adicionar ações/modal de edição em Tratamentos (editar/concluir/cancelar/remover)
- [x] Frontend: adicionar ações de editar/remover na Equipe (com API)
- [x] Docs: adicionar `API.md` com endpoints/payloads
- [x] Backend: adicionar CRUD de categorias de estoque (`/estoque/categorias`)
- [x] Frontend: adicionar CRUD de categorias no Estoque (modal de categorias)
- [x] Validation: adicionar `npm run smoke:test` (smoke test automatizado)
- [x] Backend: adicionar `POST` e `DELETE` em `faturamento` (criar/remover faturas)
- [x] Frontend: adicionar criação de faturas (modal "Nova fatura")
- [x] Frontend: adicionar remoção de faturas (ação "Remover")
- [x] Backend: completar API para suportar CRUDs completos (ex.: padronizar filtros, paginação e casos de erro)
- [x] Backend: padronizar validações/erros (400/404/409) e evoluir documentação (ex.: exemplos de erro)
- [x] Frontend: revisar páginas e alinhar consumo da API (CRUDs, estados e consistência visual)
- [x] Frontend: padronizar feedback (toast) e loading states

## Validation and Acceptance
- [x] `npm run validate:migrations` passa
- [x] `npm start` inicia a API sem erro (sem depender do banco)
- [x] `npm run frontend:serve` serve o frontend e carrega `index.html`
- [x] Smoke test: rotas principais retornam 200 com MySQL conectado
- [x] Smoke test: CRUD de estoque (create/update/delete) funciona via API
- [x] Smoke test: atualização de faturamento (paga/aberta) funciona via API
- [x] Smoke test: edição de faturamento (valor_total) funciona via API (com restore)
- [x] Smoke test: atualização de consultas (cancelar/realizada) funciona via API
- [x] Smoke test: atualização de tratamentos (concluir/voltar) funciona via API
- [x] Smoke test: CRUD de categorias do estoque (create/update/delete) funciona via API
- [x] Smoke test: `estoque.html` carrega (HTTP 200)
- [x] Smoke test: criar item de estoque em categoria existente funciona via API
- [x] Smoke test automatizado: `npm run smoke:test` (OK)
- [x] Smoke test: CRUD básico de faturamento (create/delete) funciona via API
- [x] Smoke test: `faturamento.html` carrega (HTTP 200) após adicionar modal
- [x] Smoke test: `faturamento.html` carrega (HTTP 200) após adicionar remoção
- [x] Smoke test: páginas principais carregam (HTTP 200) após adicionar toasts
- [x] Smoke test: CRUD de equipe (create/update/delete) funciona via API

## Idempotence and Recovery
- Não foi registrado nada

## Artifacts and Notes
- 2026-05-06: Backend movido para `backend/` (inclui `backend/app.js`, `backend/server.js`, `backend/connection.js`, `backend/src/*`, `backend/scripts/*`, `backend/migrations.sql`, `backend/seeders.sql`).
- 2026-05-06: `package.json` atualizado para usar scripts `backend/*`.
- 2026-05-06: `INSTRUCOES_EXECUCAO.md` atualizado para refletir a nova estrutura e DB padrão (`clinica_dermato_crm2`).
- 2026-05-06: Adicionados `src/README.md` e `scripts/README.md` para evitar confusão (diretórios antigos ficaram como apontadores).
- 2026-05-06: Comandos executados:
  - `npm run validate:migrations` (OK)
  - `node backend/scripts/validate-migrations.js` (OK)
  - `node backend/server.js` (subiu na porta 3001; comando encerrado por timeout do runner)
  - `node backend/scripts/serve-frontend.js` (subiu na porta 5173; comando encerrado por timeout do runner)
  - `npm run smoke:test` (OK)
  - `npm run smoke:test` (OK) (re-run após ajustes no plano)
  - `npm run smoke:test` (OK) (re-run após adicionar toasts)
  - `npm run smoke:test` (OK) (re-run após padronizar erros no backend)
  - `npm run smoke:test` (falhou) (ao adicionar paginação; corrigido e re-run OK)
  - `npm run smoke:test` (OK) (re-run após corrigir `LIMIT/OFFSET`)
  - `npm run smoke:test` (OK) (re-run após adicionar CORS configurável + rate limit)
  - `npm run smoke:test` (OK) (re-run após documentar exemplos em `API.md`)
  - `npm run smoke:test` (OK) (re-run após adicionar loading no frontend)
  - `Start-Process node backend/scripts/serve-frontend.js ...; $pages=@(\"/\",\"/equipe.html\",\"/pacientes.html\",\"/agenda.html\",\"/tratamentos.html\",\"/faturamento.html\",\"/estoque.html\",\"/relatorios.html\"); foreach($p in $pages){ Invoke-WebRequest (\"http://localhost:5173\"+$p) -UseBasicParsing }` (OK) (re-run após loading/ajustes de datas)
  - `npm run smoke:test` (OK) (re-run em 2026-05-08)
  - `npm run smoke:test` (OK) (re-run em 2026-05-08; após marcar linhas 109-111 como concluídas)
  - `Start-Process node backend/scripts/serve-frontend.js ...; $pages=@(\"/\",\"/equipe.html\",\"/pacientes.html\",\"/agenda.html\",\"/tratamentos.html\",\"/faturamento.html\",\"/estoque.html\",\"/relatorios.html\"); foreach($p in $pages){ Invoke-WebRequest (\"http://localhost:5173\"+$p) -UseBasicParsing }` (OK) (re-run em 2026-05-08)
  - `Start-Process node backend/scripts/serve-frontend.js ...; $pages=@(\"/\",\"/equipe.html\",\"/pacientes.html\",\"/agenda.html\",\"/tratamentos.html\",\"/faturamento.html\",\"/estoque.html\",\"/relatorios.html\"); foreach($p in $pages){ Invoke-WebRequest (\"http://localhost:5173\"+$p) -UseBasicParsing }` (OK)
  - `Start-Process node backend/scripts/serve-frontend.js ...; Invoke-WebRequest http://localhost:5173/{index,equipe,pacientes,agenda,tratamentos,faturamento,estoque,relatorios}.html -UseBasicParsing` (OK)
  - `Start-Process node backend/scripts/serve-frontend.js ...; $pages=@(\"/\",\"/equipe.html\",\"/pacientes.html\"); foreach($p in $pages){ Invoke-WebRequest (\"http://localhost:5173\"+$p) -UseBasicParsing }` (OK)
  - `Start-Process node backend/scripts/serve-frontend.js ...; Invoke-WebRequest http://localhost:5173/ -UseBasicParsing` (OK) (re-run em 2026-05-08; valida CSS/aparência)
- 2026-05-06: Backend: padronização de erros aplicada em:
  - `backend/src/utils/http.js` (helper `sendError`)
  - `backend/app.js` (handler 404/500 + `/health` com `sendError`)
  - `backend/src/controller/{pacientes,dashboard,relatorios}.js` (uso de `sendError`, incluindo `409` para email duplicado em pacientes)
- 2026-05-06: Backend: paginação adicionada em:
  - `backend/src/controller/pacientesController.js` (`GET /pacientes?page=&pageSize=` → `{ data, pagination }`)
  - `backend/src/controller/equipeController.js` (`GET /equipe?page=&pageSize=` → `{ data, pagination }`)
- 2026-05-06: Frontend: pager adicionado em:
  - `frontend/js/pageTemplates.js` (controles `patientsPager` e `equipePager`)
  - `frontend/js/views/pacientesView.js` (consumo `{ data, pagination }`)
  - `frontend/js/views/equipeView.js` (consumo `{ data, pagination }`)
  - `frontend/styles.css` (estilos `.pager`)
- 2026-05-06: Frontend: estados de loading adicionados em:
  - `frontend/js/views/pacientesView.js` (desabilita filtros e mostra "Carregando...")
  - `frontend/js/views/equipeView.js` (desabilita filtros e mostra "Carregando...")
  - `frontend/js/views/relatoriosView.js` + `frontend/js/pageTemplates.js` (loading container)
- 2026-05-06: Frontend: loading/consistência adicional:
  - `frontend/js/views/agendaView.js` (desabilita filtros e mostra "Carregando agenda...")
  - `frontend/js/views/tratamentosView.js` (desabilita filtros e mostra "Carregando tratamentos...")
  - `frontend/js/views/faturamentoView.js` (desabilita filtros e mostra "Carregando faturamento..." + datas em horário local)
  - `frontend/js/views/estoqueView.js` (desabilita filtros e mostra "Carregando estoque...")
- 2026-05-08: Cores do design corrigidas:
  - `frontend/styles.css` (variáveis `--primary`/`--secondary`, sidebar branca com sombra no tom primário, ajustes de botões/inputs/estados ativos e gráficos)
- 2026-05-06: Docs:
  - `API.md` (documentado `page`/`pageSize` para equipe e pacientes)
  - `API.md` (formato padrão de erro + status codes comuns)
  - `README.md` e `INSTRUCOES_EXECUCAO.md` (variáveis de ambiente de segurança)
- 2026-05-06: Backend: segurança mínima adicionada em:
  - `backend/app.js` (CORS configurável, rate limit, JSON limit, headers de segurança)
  - `backend/src/middleware/rateLimit.js` (rate limit básico 429)
  - `backend/src/middleware/securityHeaders.js` (headers)
- 2026-05-06: Smoke test API (com MySQL conectado):
  - `Start-Process node backend/server.js ...; Invoke-RestMethod http://localhost:3001/health`
  - `Start-Process node backend/server.js ...; Invoke-RestMethod /dashboard /equipe /pacientes /consultas /tratamentos /faturamento /relatorios /estoque`
  - `Start-Process node backend/server.js ...; Invoke-RestMethod /consultas/1 e /tratamentos/1`
- 2026-05-06: Smoke test frontend:
  - `Start-Process node backend/scripts/serve-frontend.js ...; Invoke-WebRequest http://localhost:5173/ -UseBasicParsing`
  - `Start-Process node backend/scripts/serve-frontend.js ...; Invoke-WebRequest http://localhost:5173/estoque.html -UseBasicParsing`
  - `Start-Process node backend/scripts/serve-frontend.js ...; Invoke-WebRequest http://localhost:5173/faturamento.html -UseBasicParsing`
  - `Start-Process node backend/scripts/serve-frontend.js ...; Invoke-WebRequest http://localhost:5173/agenda.html -UseBasicParsing`
  - `Start-Process node backend/scripts/serve-frontend.js ...; Invoke-WebRequest http://localhost:5173/tratamentos.html -UseBasicParsing`
  - `Start-Process node backend/scripts/serve-frontend.js ...; Invoke-WebRequest http://localhost:5173/equipe.html -UseBasicParsing`
  - `Start-Process node backend/scripts/serve-frontend.js ...; Invoke-WebRequest http://localhost:5173/{index,equipe,pacientes,agenda,tratamentos,faturamento,estoque,relatorios}.html -UseBasicParsing`
- 2026-05-06: CRUD estoque via API:
  - `Invoke-RestMethod POST/PUT/DELETE http://localhost:3001/estoque/itens/*` (item de teste criado/atualizado/removido)
- 2026-05-06: Frontend estoque atualizado:
  - `frontend/js/pageTemplates.js` (modal + ações)
  - `frontend/js/views/estoqueView.js` (handlers create/edit/delete)
  - `frontend/styles.css` (layout `grid-2` e ações de tabela)
- 2026-05-06: Frontend estoque categorias atualizado:
  - `frontend/js/pageTemplates.js` (modal de categorias)
  - `frontend/js/views/estoqueView.js` (listar/criar/editar/remover categorias via API)
- 2026-05-06: Backend faturamento atualizado:
  - `backend/app.js` (rotas `GET /faturamento/:id` e `PUT /faturamento/:id`)
  - `backend/src/controller/faturamentoController.js` (getById/update)
- 2026-05-06: Frontend faturamento atualizado:
  - `frontend/js/pageTemplates.js` (coluna Acoes)
  - `frontend/js/views/faturamentoView.js` (ações marcar paga/cancelar)
- 2026-05-06: Frontend faturamento edit atualizado:
  - `frontend/js/pageTemplates.js` (modal de edição)
  - `frontend/js/views/faturamentoView.js` (editar/salvar via API)
- 2026-05-06: Frontend faturamento criação atualizado:
  - `frontend/js/pageTemplates.js` (modal "Nova fatura")
  - `frontend/js/views/faturamentoView.js` (carrega pacientes/tratamentos e cria via API)
- 2026-05-06: Frontend faturamento remoção atualizado:
  - `frontend/js/views/faturamentoView.js` (ação "Remover" via API)
- 2026-05-06: Frontend agenda atualizado:
  - `frontend/js/pageTemplates.js` (coluna Acoes + modal de edição)
  - `frontend/js/views/agendaView.js` (editar/realizada/cancelar via API)
- 2026-05-06: Frontend tratamentos atualizado:
  - `frontend/js/pageTemplates.js` (modal de edição)
  - `frontend/js/views/tratamentosView.js` (editar/concluir/cancelar/remover via API)
  - `frontend/styles.css` (`.treatment-card__actions`)
- 2026-05-06: Frontend equipe atualizado:
  - `frontend/js/pageTemplates.js` (coluna Acoes)
  - `frontend/js/views/equipeView.js` (editar/remover + reutiliza modal)
- 2026-05-06: Frontend toasts:
  - `frontend/js/toast.js` (helper de toast)
  - `frontend/js/pageTemplates.js` (container global `#toastRegion`)
  - `frontend/styles.css` (estilos do toast)
  - `frontend/js/views/{estoque,equipe,agenda,tratamentos,faturamento,pacientes}View.js` (feedback sucesso/erro)
- 2026-05-06: Padronização de erros no backend: criado helper `sendError(res, status, message, details?)` e aplicado em todos os controllers + handler global 404/500 no `backend/app.js` (inclui `409` para duplicidade de email em pacientes).
- 2026-05-06: Paginação opcional adicionada em `GET /pacientes` e `GET /equipe` via query params `page`/`pageSize` (mantém compatibilidade retornando array quando não informado). Frontend ganhou pager simples nas telas de lista.
- 2026-05-06: Segurança mínima no backend: CORS configurável por `CORS_ORIGIN`, rate limit por IP (env `RATE_LIMIT_*`), headers de segurança e limite de JSON (`JSON_LIMIT`).
- 2026-05-06: `API.md` revisado com exemplos executáveis em PowerShell e padronização de setas/encoding (recriado para evitar caracteres corrompidos).
- 2026-05-06: UX frontend: adicionados estados de loading nas listas de Equipe/Pacientes e loading no Relatorios (toggle de container).
- 2026-05-06: Consistência de datas: Agenda e Faturamento passaram a usar ISO em horário local (evita dia/mês errado por UTC).
- 2026-05-06: Smoke test faturamento via API:
  - `Invoke-RestMethod PUT http://localhost:3001/faturamento/:id` (status paga e retorno para aberta)
  - `Invoke-RestMethod PUT http://localhost:3001/faturamento/:id` (valor_total alterado e restaurado)
- 2026-05-06: Smoke test consultas via API:
  - `Invoke-RestMethod PUT http://localhost:3001/consultas/:id` (cancelada e retorno para realizada)
- 2026-05-06: Smoke test tratamentos via API:
  - `Invoke-RestMethod PUT http://localhost:3001/tratamentos/:id` (concluido e retorno para ativo)
- 2026-05-06: Smoke test equipe via API:
  - `Invoke-RestMethod POST/PUT/DELETE http://localhost:3001/equipe/:id` (membro de teste criado/atualizado/removido)
- 2026-05-06: Criado `README.md` na raiz com passo a passo e estrutura do projeto.
- 2026-05-06: Criado `API.md` com resumo de endpoints e payloads.
- 2026-05-06: Smoke test categorias de estoque via API:
  - `Invoke-RestMethod POST/PUT/DELETE http://localhost:3001/estoque/categorias/:id` (categoria de teste criada/atualizada/removida)
- 2026-05-06: Smoke test item + categoria via API:
  - `Invoke-RestMethod POST http://localhost:3001/estoque/itens` (criou item em categoria existente e removeu em seguida)
- 2026-05-06: Smoke test faturamento CRUD via API:
  - `Invoke-RestMethod POST http://localhost:3001/faturamento` (criou fatura e removeu em seguida)

## Interfaces and Dependencies
Node.js
Express
MySQL
MySQL2
CORS
Bootstrap
Bootstrap Icons
