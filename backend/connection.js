const mysql = require("mysql2/promise");
const { databaseConfig } = require("./src/config/database");

const pool = mysql.createPool({
  host: databaseConfig.host,
  port: databaseConfig.port,
  user: databaseConfig.user,
  password: databaseConfig.password,
  database: databaseConfig.database,
  waitForConnections: true,
  connectionLimit: databaseConfig.connectionLimit,
  queueLimit: 0,
});

module.exports = { pool };
