# Clinica Dermato CRM - Como Rodar o Projeto

## Visao Geral

Este projeto possui:

- Backend Node.js + Express
- Frontend estatico servido por um servidor Node simples
- Banco MySQL

Portas padrao:

- API backend: `http://localhost:3001`
- Frontend: `http://localhost:5173`

## Pre-requisitos

Antes de rodar, tenha instalado:

- Node.js 18 ou superior
- MySQL 8 ou compatível
- npm

## 1. Instalar dependencias

Na raiz do projeto, execute:

```powershell
npm install
```

## 2. Configurar o banco

O projeto espera um banco chamado:

```text
clinica_dermato_crm2
```

Variaveis de ambiente aceitas:

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_CONNECTION_LIMIT`
- `CORS_ORIGIN` (padrão `*`)
- `RATE_LIMIT_ENABLED` (padrão `true`)
- `RATE_LIMIT_WINDOW_MS` (padrão `60000`)
- `RATE_LIMIT_MAX` (padrão `300`)
- `JSON_LIMIT` (padrão `1mb`)
- `TRUST_PROXY` (padrão `false`)

### Observacao importante

Existe uma diferenca no projeto atual:

- o backend em `backend/src/config/database.js` usa `DB_PASSWORD` com fallback `123456`
- o script `backend/scripts/run-migrations.js` usa `DB_PASSWORD` com fallback `123456`

Para evitar erro de conexao, rode tudo com as variaveis definidas manualmente.

Exemplo no PowerShell:

```powershell
$env:DB_HOST="localhost"
$env:DB_PORT="3306"
$env:DB_USER="root"
$env:DB_PASSWORD="123456"
$env:DB_NAME="clinica_dermato_crm2"
```

## 3. Criar as tabelas

O arquivo `backend/migrations.sql` ja cria o banco e as tabelas.

Voce pode executar de duas formas.

### Opcao A - Pelo script do projeto

```powershell
npm run migrate
```

### Opcao B - Manualmente no MySQL

```powershell
mysql -u root -p < backend/migrations.sql
```

## 4. Popular com dados iniciais

O projeto possui o arquivo `backend/seeders.sql`.

Execute manualmente no MySQL:

```powershell
mysql -u root -p clinica_dermato_crm2 < seeders.sql
```

## 5. Rodar o backend

Na raiz do projeto:

```powershell
npm start
```

Se tudo estiver certo, a API deve subir em:

```text
http://localhost:3001
```

Teste rapido:

```text
http://localhost:3001/health
```

## 6. Rodar o frontend

Em outro terminal, ainda na raiz do projeto:

```powershell
npm run frontend:serve
```

O frontend sera servido em:

```text
http://localhost:5173
```

## 7. Abrir no navegador

Abra este endereco:

```text
http://localhost:5173
```

## 8. Como o frontend encontra a API

O frontend usa por padrao:

```text
http://localhost:3001
```

Isso vem de [frontend/js/config.js](/c:/Users/gentiltec/Desktop/Prototipo%20Clinica2/frontend/js/config.js:1).

Se quiser apontar para outra API, no console do navegador voce pode definir:

```javascript
localStorage.setItem("API_BASE_URL", "http://localhost:3001");
location.reload();
```

## 9. Ordem recomendada para subir tudo

1. Configurar variaveis do banco
2. Rodar `npm install`
3. Rodar `npm run migrate`
4. Executar `seeders.sql`
5. Rodar `npm start`
6. Rodar `npm run frontend:serve`
7. Abrir `http://localhost:5173`

## 10. Problemas comuns

### Erro: Access denied for user 'root'@'localhost'

Causa mais comum:

- senha do MySQL diferente da configurada no projeto

Correcao:

- defina `DB_USER` e `DB_PASSWORD` antes de rodar backend e migrations

### Frontend abre, mas nao carrega dados

Verifique:

- se o backend esta rodando em `http://localhost:3001`
- se o banco foi migrado
- se o seed foi executado
- se o `API_BASE_URL` salvo no `localStorage` nao aponta para outra URL

### Porta ocupada

Voce pode trocar as portas:

- backend com `PORT`
- frontend com `FRONTEND_PORT`

Exemplo:

```powershell
$env:PORT="3002"
$env:FRONTEND_PORT="5174"
```

## Arquivos uteis

- [package.json](/c:/Users/gentiltec/Desktop/Prototipo%20Clinica2/package.json:1)
- [backend/server.js](backend/server.js)
- [backend/connection.js](backend/connection.js)
- [backend/src/config/database.js](backend/src/config/database.js)
- [backend/migrations.sql](backend/migrations.sql)
- [backend/seeders.sql](backend/seeders.sql)
- [backend/scripts/serve-frontend.js](backend/scripts/serve-frontend.js)
