const fs = require("node:fs");
const path = require("node:path");
const mysql = require("mysql2/promise");

function toInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function main() {
  const migrationsPath = path.resolve(__dirname, "..", "migrations.sql");
  const sql = fs.readFileSync(migrationsPath, "utf8");

  const databaseName = process.env.DB_NAME || "clinica_dermato_crm2";

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: toInt(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "123456",
    multipleStatements: true,
  });

  try {
    await connection.query(sql);
    console.log(
      `Migrations executadas com sucesso (DB_NAME=${databaseName}, arquivo=${migrationsPath}).`
    );
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Falha ao executar migrations:", error?.message || error);
  process.exit(1);
});
