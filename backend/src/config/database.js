function toInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const databaseConfig = {
  host: process.env.DB_HOST || "localhost",
  port: toInt(process.env.DB_PORT, 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "123456",
  database: process.env.DB_NAME || "clinica_dermato_crm2",
  connectionLimit: toInt(process.env.DB_CONNECTION_LIMIT, 10),
};

module.exports = { databaseConfig };
