# Documentacao do Frontend - Clinica Dermato CRM

## Objetivo deste documento

Este documento descreve a estrutura atual do frontend do sistema, os recursos implementados, os fluxos de navegacao, as regras de negocio refletidas na interface, os componentes de UI, a UX atual e oportunidades de evolucao.

A ideia e que ele sirva como base para:

- entender rapidamente o sistema
- criar prompts melhores e mais especificos
- identificar lacunas de produto e frontend
- planejar melhorias visuais, tecnicas e funcionais

---

## Visao geral do frontend

O frontend foi organizado como um conjunto de paginas independentes, cada uma com uma responsabilidade principal:

- `frontend/index.html`: Dashboard
- `frontend/equipe.html`: Equipe
- `frontend/pacientes.html`: Pacientes e perfil do paciente
- `frontend/agenda.html`: Consultas e agendamento
- `frontend/tratamentos.html`: Tratamentos e sessoes
- `frontend/faturamento.html`: Faturamento
- `frontend/relatorios.html`: Relatorios analiticos
- `frontend/estoque.html`: Estoque

Todas essas paginas compartilham uma mesma estrutura base renderizada via JavaScript em `frontend/js/pageTemplates.js`.

O bootstrap do frontend acontece em `frontend/js/main.js`, que:

- detecta qual pagina foi aberta pelo `data-page`
- monta o layout comum
- inicializa a view da tela correspondente
- destaca o item ativo da sidebar

---

## Arquitetura atual

### Estrutura principal

- `frontend/js/main.js`
  - ponto de entrada do frontend
  - decide qual view sera carregada
- `frontend/js/pageTemplates.js`
  - concentra o shell visual compartilhado
  - monta sidebar, header e estrutura da pagina
- `frontend/js/sidebar.js`
  - controla recolher/expandir sidebar
  - persiste estado no `localStorage`
- `frontend/js/api.js`
  - encapsula o `fetch`
  - padroniza `GET`, `POST`, `PUT`, `DELETE`
  - trata query params e erros de resposta
- `frontend/js/views/*.js`
  - cada arquivo contem a logica de uma tela especifica

### Padrao usado nas views

As views seguem um padrao consistente:

- funcao `el(id)` para buscar elementos
- funcao `getElements()` ou equivalente para centralizar referencias DOM
- funcoes `setError` e `clearError`
- funcoes de renderizacao separadas
- `load...()` para consumir a API
- `init...View()` para registrar eventos e disparar carregamento inicial

Esse padrao e bom para criar prompts de evolucao porque permite pedir melhorias por tela sem reescrever o projeto inteiro.

---

## Navegacao do sistema

### Sidebar

A sidebar e o principal mecanismo de navegacao entre modulos.

Rotas visuais atuais:

- Dashboard
- Equipe
- Pacientes
- Agenda
- Tratamentos
- Faturamento
- Relatorios
- Estoque

### Comportamento da sidebar

- cada item leva para uma pagina HTML diferente
- o item ativo recebe classe visual de destaque
- a sidebar pode ser recolhida e expandida
- o estado fica salvo em `localStorage` com a chave `SIDEBAR_STATE`

### Header de conteudo

Cada pagina possui:

- titulo principal
- subtitulo contextual
- botao `Atualizar`

O botao `Atualizar` funciona como refresh funcional da view atual, sem recarregar o navegador inteiro.

---

## Mapa de telas e responsabilidades

## 1. Dashboard

### Objetivo

Dar uma visao rapida da operacao da clinica.

### Recursos

- cards de KPI
- grafico semanal de consultas
- tabela de consultas do dia
- lista de pacientes recentes
- loading state
- empty states
- exibicao de erro

### Dados esperados

- pacientes ativos
- consultas do dia
- consultas realizadas na semana
- consultas canceladas na semana
- volume semanal de consultas
- pacientes recem cadastrados

### Regras refletidas na UI

- consultas canceladas precisam ser destacadas
- consultas de hoje devem mostrar horario, paciente, profissional e status
- se nao houver dados semanais, o grafico mostra vazio em vez de quebrar

### UX

- excelente como tela inicial operacional
- boa leitura executiva
- o grafico atual e manual em HTML/CSS, nao Chart.js

### Oportunidades futuras

- filtros por periodo
- comparativos com periodo anterior
- cards clicaveis levando para detalhes
- skeleton loading em vez de texto simples

---

## 2. Equipe

### Objetivo

Gerenciar profissionais da clinica.

### Recursos

- listagem de profissionais
- busca por nome, email ou cargo
- filtro por status
- busca e filtro combinados
- estado vazio
- modal de cadastro com Bootstrap
- criacao de novo membro via API
- recarregamento automatico apos salvar

### Campos do cadastro

- nome
- cargo
- email
- telefone
- especialidade
- status

### Regras de negocio refletidas na UI

- nome e obrigatorio
- email, quando informado, precisa ser valido
- status aceito: `ativo` ou `inativo`
- apos salvar, o modal fecha e a listagem atualiza

### Estados visuais

- `ativo`: badge visual positiva
- `inativo`: badge visual neutra ou negativa
- sem resultados: `Nenhum profissional encontrado`

### UX

- fluxo simples e direto
- o modal funciona bem para criacao rapida
- a tela e boa para operacao administrativa

### Oportunidades futuras

- editar membro existente
- excluir ou desativar membro
- filtros por especialidade
- ordenacao por nome, cargo ou status
- avatar/iniciais do profissional

---

## 3. Pacientes

### Objetivo

Gerenciar cadastro de pacientes e acesso ao perfil individual.

### Recursos

- listagem de pacientes
- busca
- filtro por status
- cadastro de novo paciente
- navegacao para perfil do paciente
- edicao de paciente
- exclusao de paciente

### Fluxo principal

1. usuario entra em `pacientes.html`
2. visualiza a lista
3. pode buscar e filtrar
4. pode cadastrar um novo paciente
5. pode clicar em `Ver perfil`
6. a mesma pagina alterna para o modo perfil via hash `#/pacientes/:id`

### Campos do cadastro/perfil

- nome
- email
- telefone
- data de nascimento
- status
- observacoes

### Regras de negocio refletidas na UI

- nome obrigatorio
- email valido, se preenchido
- data no formato `YYYY-MM-DD`
- status aceito: `ativo` ou `inativo`
- exclusao depende de confirmacao do usuario

### UX

- boa separacao entre lista e perfil
- perfil embutido na mesma responsabilidade funcional faz sentido
- a navegacao por hash dentro da pagina evita criar uma pagina extra so para perfil

### Oportunidades futuras

- historico clinico
- anexos e fotos
- timeline de consultas e tratamentos
- alertas de aniversario ou retorno
- tabs dentro do perfil: dados, consultas, tratamentos, financeiro

---

## 4. Agenda

### Objetivo

Controlar agendamento de consultas e visualizar a ocupacao do calendario.

### Recursos

- calendario mensal
- selecao de data
- lista de consultas do dia
- filtros por status, profissional e paciente
- form de agendamento
- carregamento de pacientes e profissionais ativos

### Campos do agendamento

- paciente
- profissional
- data
- horario
- status
- descricao
- observacoes

### Regras de negocio refletidas na UI

- nao permite agendar no passado
- paciente e profissional sao obrigatorios
- data e hora sao obrigatorias
- filtros afetam tanto a lista quanto a visao mensal
- o calendario mostra volume por dia

### Regras que dependem mais do backend

- conflito de horario
- validacao final de disponibilidade
- consistencia de status de consulta

### UX

- boa mistura entre visao calendaria e lista operacional
- a tela serve tanto para secretaria quanto para coordenacao
- bom equilibrio entre consulta rapida e acao de agendar

### Oportunidades futuras

- drag and drop de consultas
- remarcacao
- visualizacao semanal
- cores por status no calendario
- bloqueio visual de horarios indisponiveis

---

## 5. Tratamentos

### Objetivo

Gerenciar tratamentos em andamento e acompanhar sessoes.

### Recursos

- listagem de tratamentos
- busca
- filtros por status e paciente
- cadastro de tratamento
- cadastro de sessao
- exibicao de sessoes por tratamento
- barra de progresso percentual

### Campos do tratamento

- paciente
- profissional
- nome
- descricao
- data inicial
- data final
- status

### Campos da sessao

- tratamento
- data
- hora
- status
- observacoes

### Regras de negocio refletidas na UI

- tratamento precisa de paciente, profissional e nome
- data final nao pode ser anterior a data inicial
- sessao exige tratamento, data e hora
- progresso e exibido como percentual
- status de sessao influencia leitura operacional do tratamento

### Interpretacao funcional

A tela sugere um modelo em que:

- um tratamento possui varias sessoes
- o progresso vem do backend
- a view apenas apresenta esse progresso

Isso e bom, porque evita calculos duplicados no frontend.

### UX

- componente de card por tratamento funciona melhor que tabela
- visualmente a tela ja passa a ideia de acompanhamento clinico

### Oportunidades futuras

- filtro por profissional
- linha do tempo de sessoes
- detalhes expandiveis
- progresso com metas e previsao de termino
- botao de concluir ou cancelar tratamento

---

## 6. Faturamento

### Objetivo

Mostrar saude financeira basica da clinica e permitir consulta de faturas.

### Recursos

- KPIs financeiros
- tabela de faturas
- filtro por busca, status e mes
- download da fatura em `.txt`

### KPIs exibidos

- total de faturas
- valor total
- valor pago
- valor em aberto

### Regras de negocio refletidas na UI

- status de pagamento precisam ser exibidos com badge
- os KPIs mudam de acordo com os filtros
- o download usa os dados reais da fatura retornada pela API

### UX

- tela objetiva e financeira
- boa para operacao administrativa
- download simples, mas funcional

### Oportunidades futuras

- exportar PDF
- marcacao manual de pagamento
- resumo por periodo
- grafico de inadimplencia
- conciliacao por paciente

---

## 7. Relatorios

### Objetivo

Entregar uma camada analitica do financeiro.

### Recursos

- KPIs do mes
- grafico de receita
- comparacoes mensais
- filtro por mes

### KPIs atuais

- receita total
- receita paga
- receita em aberto
- ticket medio

### Comparacoes atuais

- receita total atual x anterior
- receita paga atual x anterior
- delta percentual

### Regras de negocio refletidas na UI

- metricas nao sao valores fixos
- comparacao deve considerar periodo atual e anterior
- sem dados, a tela mostra estado vazio em vez de inventar numero

### UX

- tela orientada a acompanhamento gerencial
- leitura clara e comparativa
- o grafico atual e renderizado manualmente em DOM

### Oportunidades futuras

- comparar periodos customizados
- filtros por profissional, tratamento ou unidade
- legenda mais rica
- exportar relatorio
- drill-down por indicador

---

## 8. Estoque

### Objetivo

Controlar materiais e sinalizar niveis criticos.

### Recursos

- listagem de itens
- busca
- filtro por categoria
- status de estoque baseado em quantidade

### Dados exibidos

- item
- categoria
- quantidade
- quantidade minima
- custo unitario
- validade
- status

### Regras de negocio refletidas na UI

- itens sem resultado geram estado vazio
- filtros por categoria e busca podem ser combinados
- o status vem do backend e deve refletir quantidade real
- niveis criticos nao devem ser ignorados

### Interpretacao funcional

O sistema trabalha com pelo menos tres niveis visuais:

- normal
- critico
- esgotado

### UX

- tabela e o formato certo para inventario
- leitura operacional eficiente

### Oportunidades futuras

- cadastro e edicao de itens
- alertas de validade
- historico de entradas e saidas
- dashboard de consumo
- filtros por status de estoque

---

## Componentes UI existentes

## Shell compartilhado

- sidebar
- header da pagina
- botao global de atualizar
- rotulo com base da API

## Componentes recorrentes

- `card`
- `table`
- `table-wrap`
- `filters`
- `field`
- `form-grid`
- `status-badge`
- `list-empty`
- `alert alert--error`
- `kpi-card`

## Componentes especificos por modulo

- dashboard:
  - `weekly-chart`
  - `recent-list`
- agenda:
  - `calendar`
- tratamentos:
  - `treatment-card`
  - `progress`
  - `sessions`
- relatorios:
  - `report-chart`
  - `comparison-card`

### Padrao visual implícito

O frontend trabalha num design de sistema leve, administrativo e modular:

- cards para agrupamento
- tabelas para dados operacionais
- badges para status
- formularios compactos
- feedback de erro inline
- vazio tratado como estado do produto e nao falha

---

## UX atual do sistema

## Pontos positivos

- separacao por modulos esta clara
- cada tela tem responsabilidade principal bem definida
- feedback de erro existe em praticamente todas as views
- estados vazios foram considerados
- botao de atualizar cria um padrao mental consistente
- combinacao de listagem + acao na mesma tela funciona bem

## Pontos que merecem evolucao

- o visual ainda e mais funcional que premium
- faltam feedbacks de sucesso mais explicitos
- faltam skeletons e loading states mais sofisticados em varias telas
- faltam confirmacoes visuais melhores em operacoes de salvar
- faltam microinteracoes e refinamento visual
- faltam trilhas de navegacao secundarias em telas mais densas

## Experiencia por perfil de usuario

### Recepcao / secretaria

Melhor atendida por:

- agenda
- pacientes
- equipe

### Gestao / administracao

Melhor atendida por:

- dashboard
- faturamento
- relatorios
- estoque

### Coordenacao clinica

Melhor atendida por:

- tratamentos
- agenda
- pacientes

---

## Regras de negocio visiveis no frontend

Estas regras ja aparecem no comportamento da interface e devem ser preservadas em prompts futuros:

- status devem ser exibidos com badges coerentes
- dados vazios devem ter mensagem clara
- filtros devem limpar corretamente
- formularios devem validar antes do envio
- email deve ser validado onde aplicavel
- datas devem respeitar formato e ordem logica
- consultas nao podem ser agendadas no passado
- perfil do paciente deve ser acessivel a partir da listagem
- salvar novo membro da equipe deve fechar modal e atualizar lista
- progresso de tratamento e exibido, nao recalculado de forma arbitraria no frontend
- KPIs dependem dos filtros ativos

---

## Integracao com API

O frontend foi preparado para depender de API real.

### Padrao tecnico

- todas as chamadas passam por `frontend/js/api.js`
- existe suporte a query params
- erros HTTP sao convertidos em mensagens de interface

### Beneficios desse padrao

- facilita testar novos endpoints
- reduz duplicacao de `fetch`
- deixa mais facil criar prompts do tipo:
  - "adicione filtro por data na tela X"
  - "inclua ordenacao por coluna na tela Y"
  - "salve formulario Z via API com validacao"

---

## Limitacoes atuais percebidas

## Limitacoes funcionais

- nao ha autenticacao nem controle de permissao no frontend
- varias telas ainda estao focadas em leitura e criacao, com pouca edicao
- alguns downloads ainda sao simplificados
- o perfil de paciente usa hash interno, enquanto o restante usa paginas independentes

## Limitacoes de UX/UI

- visual pode ficar mais sofisticado
- graficos sao manuais, sem biblioteca dedicada
- ainda nao ha sistema de notificacao global
- nao ha busca global do sistema

## Limitacoes tecnicas

- grande parte do DOM e montada por strings HTML
- nao ha componentizacao em framework
- a manutencao continua simples, mas pode crescer em complexidade

---

## O que ja esta interessante no frontend

Alguns aspectos do frontend ja sao bons pontos de partida:

- a divisao por paginas deixou a navegacao mais limpa
- cada modulo tem escopo claro
- o sistema ja possui linguagem visual consistente
- os fluxos CRUD principais comecaram a ser desenhados
- o frontend trata melhor estados vazios do que muitos sistemas internos
- existe uma base boa para evoluir sem precisar reescrever tudo

O que mais se destaca positivamente:

- `Pacientes` tem fluxo util de lista + perfil
- `Agenda` combina calendario e operacao real
- `Tratamentos` tem cara de modulo clinico de verdade
- `Relatorios` e `Faturamento` ja separam operacao de analise

---

## Como pensar novos prompts de frontend

Prompts bons para este projeto tendem a funcionar melhor quando especificam:

- tela alvo
- objetivo visual ou funcional
- dados que devem vir da API
- estados obrigatorios
- comportamento esperado
- restricoes

### Estrutura recomendada de prompt

Use algo nesse formato:

1. contexto da tela
2. objetivo funcional
3. elementos obrigatorios
4. estados obrigatorios
5. regras de negocio
6. restricoes
7. criterio de conclusao

### Exemplo de prompt forte

`Tela: Pacientes`

`Objetivo: melhorar a UX do perfil do paciente com abas para dados cadastrais, consultas, tratamentos e financeiro.`

`Obrigatorio: manter integracao com API real, preservar validacoes, nao usar dados mockados, manter navegacao pela lista de pacientes.`

`Estados: loading, vazio, erro e sucesso.`

`Termine apenas quando a tela estiver funcional e visualmente consistente com o restante do sistema.`

---

## Ideias de prompts futuros por modulo

## Dashboard

- criar filtros por periodo com preset hoje, 7 dias, 30 dias
- transformar os cards em atalhos clicaveis para modulos relacionados
- melhorar visual do grafico semanal com legenda e comparacao

## Equipe

- adicionar edicao e exclusao de profissional
- criar pagina de perfil do profissional
- incluir filtro por especialidade e cargo

## Pacientes

- transformar perfil em pagina mais rica com tabs
- adicionar historico completo do paciente
- incluir anexos, fotos e observacoes cronologicas

## Agenda

- criar visualizacao semanal e diaria
- permitir remarcacao de consultas
- bloquear horarios indisponiveis visualmente

## Tratamentos

- criar detalhes expansiveis das sessoes
- permitir finalizar ou cancelar tratamento
- incluir evolucao por sessao com observacoes clinicas

## Faturamento

- adicionar exportacao em PDF
- criar dashboard de inadimplencia
- permitir atualizar status de pagamento pela interface

## Relatorios

- criar comparativos customizados
- permitir exportar CSV ou PDF
- incluir filtros por paciente, profissional ou tratamento

## Estoque

- criar CRUD completo de itens
- incluir entradas e saidas de estoque
- alertar itens criticos e proximos do vencimento

---

## Sugestoes de prompts transversais

- revisar toda a UX do sistema e propor melhorias de navegacao
- padronizar feedbacks de sucesso, erro e loading
- criar sistema de toasts global
- melhorar responsividade de todas as telas
- aplicar acessibilidade basica em formularios e tabelas
- criar design system leve com variaveis, espacamentos e tokens
- adicionar confirmacoes elegantes para exclusao e acoes sensiveis

---

## Resumo executivo

O frontend atual ja tem uma boa base de produto:

- navegacao modular
- integracao orientada a API
- estados vazios e erros tratados
- CRUDs iniciais desenhados
- modulos coerentes com o dominio da clinica

Ele ainda precisa de mais refinamento visual, profundidade funcional e evolucao de UX, mas a estrutura esta boa o suficiente para receber prompts mais especificos, mais ambiciosos e mais orientados a produto.

Se a meta for acelerar evolucao com IA, o melhor caminho agora e criar prompts por modulo com foco em:

- UX mais madura
- CRUDs completos
- refinamento visual
- consistencia de estados
- integracao mais profunda com a API
