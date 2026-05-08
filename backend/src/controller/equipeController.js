const { pool } = require("../../connection");
const { sendError } = require("../utils/http");

function normalizeSearch(value) {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return String(value[0] ?? "").trim();
  return String(value).trim();
}

function normalizeStatus(value) {
  const raw = normalizeSearch(value).toLowerCase();
  if (raw === "ativo" || raw === "inativo") return raw;
  return "";
}

function normalizeId(value) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizePagination(query) {
  const hasPage = query?.page !== undefined && query?.page !== null && String(query.page).trim() !== "";
  const hasPageSize = query?.pageSize !== undefined && query?.pageSize !== null && String(query.pageSize).trim() !== "";
  if (!hasPage && !hasPageSize) return null;

  const pageRaw = hasPage ? Number.parseInt(String(query.page), 10) : 1;
  const pageSizeRaw = hasPageSize ? Number.parseInt(String(query.pageSize), 10) : 20;

  if (!Number.isFinite(pageRaw) || pageRaw < 1) return { error: "page invalido (>= 1)." };
  if (!Number.isFinite(pageSizeRaw) || pageSizeRaw < 1) return { error: "pageSize invalido (1-100)." };

  const pageSize = Math.min(pageSizeRaw, 100);
  return { page: pageRaw, pageSize };
}

async function list(req, res) {
  const search = normalizeSearch(req.query.search);
  const status = normalizeStatus(req.query.status);
  const pagination = normalizePagination(req.query);
  if (pagination?.error) return sendError(res, 400, pagination.error);

  const like = `%${search}%`;

  const baseWhere = `
WHERE 
(nome LIKE ? OR email LIKE ? OR cargo LIKE ?)
AND (? = '' OR status = ?)
  `.trim();

  const sql = `
SELECT * FROM equipe
${baseWhere}
ORDER BY id DESC;
`.trim();

  try {
    if (!pagination) {
      const [rows] = await pool.execute(sql, [like, like, like, status, status]);
      return res.status(200).json(rows);
    }

    const offset = (pagination.page - 1) * pagination.pageSize;

    const [[countRow]] = await pool.execute(
      `
SELECT COUNT(*) AS total
FROM equipe
${baseWhere};
      `.trim(),
      [like, like, like, status, status]
    );

    const total = Number(countRow?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize));

    const [rows] = await pool.execute(
      `
SELECT *
FROM equipe
${baseWhere}
ORDER BY id DESC
LIMIT ${pagination.pageSize} OFFSET ${offset};
      `.trim(),
      [like, like, like, status, status]
    );

    res.status(200).json({
      data: rows,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
        totalPages,
      },
    });
  } catch (error) {
    return sendError(res, 500, error?.message || "Erro ao listar equipe.");
  }
}

async function getById(req, res) {
  const id = normalizeId(req.params.id);
  if (!id) return sendError(res, 400, "id inválido.");

  try {
    const [rows] = await pool.execute("SELECT * FROM equipe WHERE id = ?;", [id]);
    if (!rows || rows.length === 0) return sendError(res, 404, "Registro não encontrado.");
    res.status(200).json(rows[0]);
  } catch (error) {
    return sendError(res, 500, error?.message || "Erro ao buscar equipe.");
  }
}

async function create(req, res) {
  const nome = normalizeSearch(req.body?.nome);
  const cargo = normalizeSearch(req.body?.cargo) || null;
  const email = normalizeSearch(req.body?.email) || null;
  const telefone = normalizeSearch(req.body?.telefone) || null;
  const especialidade = normalizeSearch(req.body?.especialidade) || null;
  const status = normalizeStatus(req.body?.status) || "ativo";

  if (!nome) return sendError(res, 400, "nome é obrigatório.");

  try {
    const [result] = await pool.execute(
      `
INSERT INTO equipe (nome, cargo, email, telefone, especialidade, status)
VALUES (?, ?, ?, ?, ?, ?);
      `.trim(),
      [nome, cargo, email, telefone, especialidade, status]
    );

    const insertedId = result.insertId;
    const [rows] = await pool.execute("SELECT * FROM equipe WHERE id = ?;", [insertedId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    return sendError(res, 500, error?.message || "Erro ao criar equipe.");
  }
}

async function update(req, res) {
  const id = normalizeId(req.params.id);
  if (!id) return sendError(res, 400, "id inválido.");

  const nome = req.body?.nome !== undefined ? normalizeSearch(req.body?.nome) : undefined;
  const cargo = req.body?.cargo !== undefined ? (normalizeSearch(req.body?.cargo) || null) : undefined;
  const email = req.body?.email !== undefined ? (normalizeSearch(req.body?.email) || null) : undefined;
  const telefone = req.body?.telefone !== undefined ? (normalizeSearch(req.body?.telefone) || null) : undefined;
  const especialidade =
    req.body?.especialidade !== undefined ? (normalizeSearch(req.body?.especialidade) || null) : undefined;
  const status = req.body?.status !== undefined ? normalizeStatus(req.body?.status) : undefined;

  const fields = [];
  const values = [];

  if (nome !== undefined) {
    if (!nome) return sendError(res, 400, "nome não pode ser vazio.");
    fields.push("nome = ?");
    values.push(nome);
  }
  if (cargo !== undefined) {
    fields.push("cargo = ?");
    values.push(cargo);
  }
  if (email !== undefined) {
    fields.push("email = ?");
    values.push(email);
  }
  if (telefone !== undefined) {
    fields.push("telefone = ?");
    values.push(telefone);
  }
  if (especialidade !== undefined) {
    fields.push("especialidade = ?");
    values.push(especialidade);
  }
  if (status !== undefined) {
    const normalized = status || "";
    if (!normalized) return sendError(res, 400, "status inválido (use ativo/inativo).");
    fields.push("status = ?");
    values.push(normalized);
  }

  if (fields.length === 0) return sendError(res, 400, "Nenhum campo para atualizar.");

  try {
    const [result] = await pool.execute(
      `UPDATE equipe SET ${fields.join(", ")} WHERE id = ?;`,
      [...values, id]
    );

    if (result.affectedRows === 0) return sendError(res, 404, "Registro não encontrado.");

    const [rows] = await pool.execute("SELECT * FROM equipe WHERE id = ?;", [id]);
    res.status(200).json(rows[0]);
  } catch (error) {
    return sendError(res, 500, error?.message || "Erro ao atualizar equipe.");
  }
}

async function remove(req, res) {
  const id = normalizeId(req.params.id);
  if (!id) return sendError(res, 400, "id inválido.");

  try {
    const [result] = await pool.execute("DELETE FROM equipe WHERE id = ?;", [id]);
    if (result.affectedRows === 0) return sendError(res, 404, "Registro não encontrado.");
    res.status(204).send();
  } catch (error) {
    return sendError(res, 500, error?.message || "Erro ao remover equipe.");
  }
}

module.exports = { list, getById, create, update, remove };
