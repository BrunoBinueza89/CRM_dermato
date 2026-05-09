# Clinica Dermato CRM - API (resumo)

Base URL (local): `http://localhost:3001`

## Formato de erro (padrao)

Quando ocorre erro, o backend responde:

```json
{ "message": "..." }
```

Opcionalmente pode incluir detalhes:

```json
{ "message": "...", "details": "..." }
```

Status comuns:

- `400` validacao/parametros invalidos
- `403` CORS origin nao permitido
- `404` recurso/rota nao encontrada
- `409` conflito (ex.: email duplicado)
- `429` rate limit excedido

## Exemplos (PowerShell)

Os exemplos abaixo assumem API em `http://localhost:3001`.

### 1) Listar pacientes (paginado)

```powershell
Invoke-RestMethod "http://localhost:3001/pacientes?search=&status=ativo&page=1&pageSize=20"
```

Retorno (exemplo):

```json
{
  "data": [{ "id": 1, "nome": "..." }],
  "pagination": { "page": 1, "pageSize": 20, "total": 123, "totalPages": 7 }
}
```

### 2) Criar paciente

```powershell
$body = @{
  nome = "Paciente Exemplo"
  email = "paciente@example.com"
  telefone = "11999999999"
  data_nascimento = "1990-01-20"
  status = "ativo"
  observacoes = "Criado via API"
} | ConvertTo-Json

Invoke-RestMethod "http://localhost:3001/pacientes" -Method Post -ContentType "application/json" -Body $body
```

### 3) Erro de validacao (400)

```powershell
$body = @{ nome = "" } | ConvertTo-Json
Invoke-RestMethod "http://localhost:3001/pacientes" -Method Post -ContentType "application/json" -Body $body
```

Retorno (exemplo):

```json
{ "message": "nome e obrigatorio." }
```

### 4) Conflito (409) - email duplicado

```powershell
$body = @{ nome="Outro"; email="paciente@example.com"; status="ativo" } | ConvertTo-Json
Invoke-RestMethod "http://localhost:3001/pacientes" -Method Post -ContentType "application/json" -Body $body
```

Retorno (exemplo):

```json
{ "message": "Ja existe paciente com este email." }
```

### 5) Rate limit (429)

Para simular, diminua o limite e rode varias requisicoes:

```powershell
$env:RATE_LIMIT_MAX="5"
$env:RATE_LIMIT_WINDOW_MS="60000"
npm start
```

Quando exceder:

```json
{ "message": "Rate limit excedido. Tente novamente em instantes." }
```

## Health

- `GET /health` -> `{ status, database }`

## Dashboard

- `GET /dashboard` -> `{ kpis, kpisV2, weeklyAppointments, todayAppointments, recentPatients, stockAlerts }`

## Equipe

- `GET /equipe?search=&status=` -> lista de membros
- `GET /equipe?search=&status=&page=1&pageSize=20` -> `{ data, pagination }`
- `GET /equipe/:id` -> membro
- `POST /equipe` -> cria membro
  - body: `{ nome, cargo?, email?, telefone?, especialidade?, status }`
- `PUT /equipe/:id` -> atualiza membro
  - body: `{ nome, cargo?, email?, telefone?, especialidade?, status }`
- `DELETE /equipe/:id` -> 204

## Pacientes

- `GET /pacientes?search=&status=` -> lista
- `GET /pacientes?search=&status=&page=1&pageSize=20` -> `{ data, pagination }`
- `GET /pacientes/:id` -> paciente
- `POST /pacientes` -> cria
  - body: `{ nome, email?, telefone?, data_nascimento?, status, observacoes? }`
- `PUT /pacientes/:id` -> atualiza
  - body: `{ nome, email?, telefone?, data_nascimento?, status, observacoes? }`
- `DELETE /pacientes/:id` -> 204

## Consultas

- `GET /consultas?month=YYYY-MM&date=YYYY-MM-DD&status=&paciente_id=&profissional_id=` -> lista
- `GET /consultas/:id` -> consulta
- `POST /consultas` -> cria
  - body: `{ paciente_id, profissional_id, data_hora:"YYYY-MM-DDTHH:mm", status, descricao?, observacoes? }`
- `PUT /consultas/:id` -> atualiza
  - body: `{ paciente_id, profissional_id, data_hora:"YYYY-MM-DDTHH:mm", status, descricao?, observacoes? }`
  - regra: nao permite `status="agendada"` no passado
- `DELETE /consultas/:id` -> 204

## Tratamentos

- `GET /tratamentos?search=&status=&paciente_id=` -> lista (inclui `sessoes` e `progresso`)
- `GET /tratamentos/:id` -> tratamento
- `POST /tratamentos` -> cria
  - body: `{ paciente_id, profissional_id, nome, descricao?, data_inicio?, data_fim?, status }`
- `PUT /tratamentos/:id` -> atualiza
  - body: `{ paciente_id, profissional_id, nome, descricao?, data_inicio?, data_fim?, status }`
- `DELETE /tratamentos/:id` -> 204 (remove sessoes antes; pode retornar 409 se houver vinculos)
- `POST /tratamentos/:id/sessoes` -> cria sessao
  - body: `{ data_hora:"YYYY-MM-DDTHH:mm", status, observacoes? }`

## Faturamento

- `GET /faturamento?search=&status=&month=YYYY-MM` -> `{ kpis, invoices }`
- `GET /faturamento/:id` -> fatura
- `POST /faturamento` -> cria fatura
  - body: `{ paciente_id, tratamento_id, data_emissao, data_vencimento?, valor_total, status?, observacoes? }`
- `PUT /faturamento/:id` -> atualiza (parcial; `status` obrigatorio)
  - body: `{ status, valor_total?, data_emissao?, data_vencimento?, observacoes? }`
  - datas: `YYYY-MM-DD` (ou omitir)
- `DELETE /faturamento/:id` -> 204

## Estoque

- `GET /estoque?search=&category=` -> `{ categories, categoryOptions, items }`
- `GET /estoque/categorias` -> lista categorias (tabela `estoque`)
- `POST /estoque/categorias` -> cria categoria
  - body: `{ nome, descricao? }`
- `PUT /estoque/categorias/:id` -> atualiza categoria
  - body: `{ nome, descricao? }`
- `DELETE /estoque/categorias/:id` -> 204 (ou 409 se houver itens vinculados)
- `POST /estoque/itens` -> cria item
  - body: `{ estoque_id, nome, unidade?, quantidade, quantidade_minima, custo_unitario, validade? }`
- `PUT /estoque/itens/:id` -> atualiza item
  - body: `{ estoque_id, nome, unidade?, quantidade, quantidade_minima, custo_unitario, validade? }`
- `DELETE /estoque/itens/:id` -> 204
