# CRM Dermato (Protótipo)

Repositório: `BrunoBinueza89/CRM_dermato`

## Visão geral

Projeto composto por:

- Backend: Node.js + Express + MySQL (`backend/`)
- Frontend: páginas estáticas servidas por um servidor Node simples (`frontend/`)

Portas padrão:

- API: `http://localhost:3001`
- Frontend: `http://localhost:5173`

## Configurações de segurança (opcional)

O backend suporta configurações simples via variáveis de ambiente:

- `CORS_ORIGIN`: `*` (padrão) ou lista separada por vírgula (ex.: `http://localhost:5173,http://127.0.0.1:5173`)
- `RATE_LIMIT_ENABLED`: `true` (padrão) ou `false`
- `RATE_LIMIT_WINDOW_MS`: janela em ms (padrão `60000`)
- `RATE_LIMIT_MAX`: máx. requisições por IP/janela (padrão `300`)
- `JSON_LIMIT`: limite do body JSON (padrão `1mb`)
- `TRUST_PROXY`: `true/false` (padrão `false`)

## Como rodar (passo a passo)

O guia completo está em `INSTRUCOES_EXECUCAO.md`.

Resumo rápido:

```powershell
# 1) Instalar dependências
npm install

# 2) (Opcional) Definir variáveis do banco (ajuste usuário/senha conforme seu MySQL)
$env:DB_HOST="localhost"
$env:DB_PORT="3306"
$env:DB_USER="root"
$env:DB_PASSWORD="123456"
$env:DB_NAME="clinica_dermato_crm2"

# 3) Criar tabelas
npm run migrate

# 4) Popular dados iniciais (execute no MySQL apontando para clinica_dermato_crm2)
# mysql -u root -p clinica_dermato_crm2 < backend/seeders.sql

# 5) Rodar API
npm start

# 6) Rodar Frontend (em outro terminal)
npm run frontend:serve
```

## Estrutura de pastas

- `backend/`: API, scripts e SQLs (migrations/seed)
- `frontend/`: HTML/CSS/JS do sistema
