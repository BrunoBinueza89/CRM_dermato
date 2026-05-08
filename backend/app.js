const express = require("express");
const cors = require("cors");

const { pool } = require("./connection");
const { sendError } = require("./src/utils/http");
const dashboardController = require("./src/controller/dashboardController");
const consultasController = require("./src/controller/consultasController");
const equipeController = require("./src/controller/equipeController");
const estoqueController = require("./src/controller/estoqueController");
const faturamentoController = require("./src/controller/faturamentoController");
const pacientesController = require("./src/controller/pacientesController");
const relatoriosController = require("./src/controller/relatoriosController");
const tratamentosController = require("./src/controller/tratamentosController");
const { createRateLimiter } = require("./src/middleware/rateLimit");
const { securityHeaders } = require("./src/middleware/securityHeaders");

const app = express();

function parseBoolean(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on") return true;
  if (normalized === "0" || normalized === "false" || normalized === "no" || normalized === "off") return false;
  return fallback;
}

function parseOrigins(value) {
  const text = value === undefined || value === null ? "" : String(value).trim();
  if (!text || text === "*") return "*";
  return text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

app.set("trust proxy", parseBoolean(process.env.TRUST_PROXY, false));

const corsOrigins = parseOrigins(process.env.CORS_ORIGIN);

app.use(
  cors({
    origin:
      corsOrigins === "*"
        ? true
        : function (origin, callback) {
            if (!origin) return callback(null, true);
            if (corsOrigins.includes(origin)) return callback(null, true);
            return callback(new Error("CORS origin not allowed"));
          },
  })
);

app.use(securityHeaders);
app.use(express.json({ limit: process.env.JSON_LIMIT || "1mb" }));

app.use(
  createRateLimiter({
    enabled: parseBoolean(process.env.RATE_LIMIT_ENABLED, true),
    windowMs: process.env.RATE_LIMIT_WINDOW_MS,
    max: process.env.RATE_LIMIT_MAX,
    skip: (req) => req.path === "/health",
  })
);

app.get("/dashboard", dashboardController.overview);

app.get("/health", async (req, res) => {
  try {
    const connection = await pool.getConnection();
    connection.release();
    res.status(200).json({ status: "ok", database: "connected" });
  } catch (error) {
    sendError(res, 500, "Falha ao conectar no banco.", error?.message);
  }
});

const equipeRouter = express.Router();
const consultasRouter = express.Router();
const estoqueRouter = express.Router();
const faturamentoRouter = express.Router();
const pacientesRouter = express.Router();
const relatoriosRouter = express.Router();
const tratamentosRouter = express.Router();

equipeRouter.get("/", equipeController.list);
equipeRouter.get("/:id", equipeController.getById);
equipeRouter.post("/", equipeController.create);
equipeRouter.put("/:id", equipeController.update);
equipeRouter.delete("/:id", equipeController.remove);

app.use("/equipe", equipeRouter);

consultasRouter.get("/", consultasController.list);
consultasRouter.get("/:id", consultasController.getById);
consultasRouter.post("/", consultasController.create);
consultasRouter.put("/:id", consultasController.update);
consultasRouter.delete("/:id", consultasController.remove);

app.use("/consultas", consultasRouter);

estoqueRouter.get("/", estoqueController.list);
estoqueRouter.get("/categorias", estoqueController.listCategories);
estoqueRouter.post("/categorias", estoqueController.createCategory);
estoqueRouter.put("/categorias/:id", estoqueController.updateCategory);
estoqueRouter.delete("/categorias/:id", estoqueController.removeCategory);
estoqueRouter.post("/itens", estoqueController.createItem);
estoqueRouter.put("/itens/:id", estoqueController.updateItem);
estoqueRouter.delete("/itens/:id", estoqueController.removeItem);

app.use("/estoque", estoqueRouter);

faturamentoRouter.get("/", faturamentoController.list);
faturamentoRouter.get("/:id", faturamentoController.getById);
faturamentoRouter.post("/", faturamentoController.create);
faturamentoRouter.put("/:id", faturamentoController.update);
faturamentoRouter.delete("/:id", faturamentoController.remove);

app.use("/faturamento", faturamentoRouter);

relatoriosRouter.get("/", relatoriosController.overview);

app.use("/relatorios", relatoriosRouter);

tratamentosRouter.get("/", tratamentosController.list);
tratamentosRouter.get("/:id", tratamentosController.getById);
tratamentosRouter.post("/", tratamentosController.create);
tratamentosRouter.put("/:id", tratamentosController.update);
tratamentosRouter.delete("/:id", tratamentosController.remove);
tratamentosRouter.post("/:id/sessoes", tratamentosController.createSession);

app.use("/tratamentos", tratamentosRouter);

pacientesRouter.get("/", pacientesController.list);
pacientesRouter.get("/:id", pacientesController.getById);
pacientesRouter.post("/", pacientesController.create);
pacientesRouter.put("/:id", pacientesController.update);
pacientesRouter.delete("/:id", pacientesController.remove);

app.use("/pacientes", pacientesRouter);

app.use((req, res) => {
  sendError(res, 404, "Rota nao encontrada.");
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const message = error?.message || "";
  if (message.toLowerCase().includes("cors")) {
    return sendError(res, 403, "CORS origin nao permitido.", message);
  }
  sendError(res, 500, "Erro interno.", message);
});

module.exports = app;
