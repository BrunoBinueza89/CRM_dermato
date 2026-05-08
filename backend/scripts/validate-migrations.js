const fs = require("node:fs");

function normalizeNewlines(text) {
  return text.replace(/\r\n/g, "\n");
}

function getCreateTableStatements(sql) {
  const matches = [];
  const re =
    /CREATE TABLE\s+[a-zA-Z0-9_]+\s*\([\s\S]*?\)\s*(?:ENGINE=[^;]+)?;/gi;
  let match;
  while ((match = re.exec(sql)) !== null) {
    matches.push(match[0].trim());
  }
  return matches;
}

function extractTableName(createStatement) {
  const match = createStatement.match(/^CREATE TABLE\s+([a-zA-Z0-9_]+)\s*\(/i);
  return match ? match[1] : null;
}

function extractFkReferences(createStatement) {
  const refs = [];
  const re = /REFERENCES\s+([a-zA-Z0-9_]+)\s*\(\s*([a-zA-Z0-9_]+)\s*\)/gi;
  let match;
  while ((match = re.exec(createStatement)) !== null) {
    refs.push({ table: match[1], column: match[2] });
  }
  return refs;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const raw = fs.readFileSync(
    require("node:path").resolve(__dirname, "..", "migrations.sql"),
    "utf8"
  );
  const sql = normalizeNewlines(raw);

  const expectedEquipe = normalizeNewlines(`CREATE TABLE equipe (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  cargo VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  telefone VARCHAR(20),
  especialidade VARCHAR(255),
  status ENUM('ativo','inativo') DEFAULT 'ativo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`);

  assert(
    sql.includes(expectedEquipe),
    "A tabela `equipe` não está exatamente conforme especificado."
  );

  const createStatements = getCreateTableStatements(sql);
  assert(createStatements.length > 0, "Nenhum CREATE TABLE encontrado.");

  const tableNames = new Set();
  const fkRefs = [];

  for (const stmt of createStatements) {
    const tableName = extractTableName(stmt);
    assert(tableName, "Falha ao extrair nome de tabela em um CREATE TABLE.");
    tableNames.add(tableName);

    assert(
      /id\s+INT\s+AUTO_INCREMENT\s+PRIMARY\s+KEY/i.test(stmt),
      `Tabela \`${tableName}\` sem 'id INT AUTO_INCREMENT PRIMARY KEY'.`
    );

    assert(
      /created_at\s+TIMESTAMP\s+DEFAULT\s+CURRENT_TIMESTAMP/i.test(stmt),
      `Tabela \`${tableName}\` sem 'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'.`
    );

    fkRefs.push(...extractFkReferences(stmt).map((r) => ({ from: tableName, ...r })));
  }

  for (const ref of fkRefs) {
    assert(
      tableNames.has(ref.table),
      `FK em \`${ref.from}\` referencia tabela inexistente: \`${ref.table}\`.`
    );
    assert(
      ref.column.toLowerCase() === "id",
      `FK em \`${ref.from}\` referencia coluna diferente de id: \`${ref.table}.${ref.column}\`.`
    );
  }

  console.log("Validação OK: schema e FKs coerentes e equipe exata.");
}

main();
