const { pool } = require("../../connection");
const { sendError } = require("../utils/http");

function normalizeText(value) {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return String(value[0] ?? "").trim();
  return String(value).trim();
}

function normalizeNullableText(value) {
  const text = normalizeText(value);
  return text || null;
}

function normalizeStatus(value) {
  const raw = normalizeText(value).toLowerCase();
  if (raw === "ativo" || raw === "inativo") return raw;
  return "";
}

function normalizeDate(value) {
  const text = normalizeText(value);
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  return text;
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

function buildPacientePayload(row) {
  if (!row) return null;

  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    telefone: row.telefone,
    data_nascimento: row.data_nascimento,
    observacoes: row.observacoes,
    status: row.status,
    created_at: row.created_at,
    ultima_consulta: row.ultima_consulta ?? null,
    proxima_consulta: row.proxima_consulta ?? null,
  };
}

async function list(req, res) {
  const search = normalizeText(req.query.search);
  const status = normalizeStatus(req.query.status);
  const like = `%${search}%`;
  const pagination = normalizePagination(req.query);
  if (pagination?.error) return sendError(res, 400, pagination.error);

  try {
    const baseWhere = `
WHERE (p.nome LIKE ? OR p.email LIKE ? OR p.telefone LIKE ?)
  AND (? = '' OR p.status = ?)
    `.trim();

    if (!pagination) {
      const [rows] = await pool.execute(
        `
SELECT
  p.id,
  p.nome,
  p.email,
  p.telefone,
  p.data_nascimento,
  p.observacoes,
  p.status,
  p.created_at,
  (
    SELECT MAX(c.data_hora)
    FROM consultas c
    WHERE c.paciente_id = p.id
      AND c.data_hora < NOW()
      AND c.status = 'realizada'
  ) AS ultima_consulta,
  (
    SELECT MIN(c.data_hora)
    FROM consultas c
    WHERE c.paciente_id = p.id
      AND c.data_hora >= NOW()
      AND c.status = 'agendada'
  ) AS proxima_consulta
FROM pacientes p
${baseWhere}
ORDER BY p.nome ASC, p.id DESC;
      `.trim(),
        [like, like, like, status, status]
      );

      return res.status(200).json(rows.map(buildPacientePayload));
    }

    const offset = (pagination.page - 1) * pagination.pageSize;

    const [[countRow]] = await pool.execute(
      `
SELECT COUNT(*) AS total
FROM pacientes p
${baseWhere};
      `.trim(),
      [like, like, like, status, status]
    );

    const total = Number(countRow?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize));

    const [rows] = await pool.execute(
      `
SELECT
  p.id,
  p.nome,
  p.email,
  p.telefone,
  p.data_nascimento,
  p.observacoes,
  p.status,
  p.created_at,
  (
    SELECT MAX(c.data_hora)
    FROM consultas c
    WHERE c.paciente_id = p.id
      AND c.data_hora < NOW()
      AND c.status = 'realizada'
  ) AS ultima_consulta,
  (
    SELECT MIN(c.data_hora)
    FROM consultas c
    WHERE c.paciente_id = p.id
      AND c.data_hora >= NOW()
      AND c.status = 'agendada'
  ) AS proxima_consulta
FROM pacientes p
${baseWhere}
ORDER BY p.nome ASC, p.id DESC
LIMIT ${pagination.pageSize} OFFSET ${offset};
      `.trim(),
      [like, like, like, status, status]
    );

    res.status(200).json({
      data: rows.map(buildPacientePayload),
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
        totalPages,
      },
    });
  } catch (error) {
    sendError(res, 500, "Erro ao listar pacientes.", error?.message);
  }
}

async function getById(req, res) {
  const id = normalizeId(req.params.id);
  if (!id) return sendError(res, 400, "id invalido.");

  try {
    const [rows] = await pool.execute(
      `
SELECT id, nome, email, telefone, data_nascimento, observacoes, status, created_at
FROM pacientes
WHERE id = ?;
      `.trim(),
      [id]
    );

    if (!rows || rows.length === 0) {
      return sendError(res, 404, "Paciente nao encontrado.");
    }

    res.status(200).json(buildPacientePayload(rows[0]));
  } catch (error) {
    sendError(res, 500, "Erro ao buscar paciente.", error?.message);
  }
}

async function create(req, res) {
  const nome = normalizeText(req.body?.nome);
  const email = normalizeNullableText(req.body?.email);
  const telefone = normalizeNullableText(req.body?.telefone);
  const dataNascimento = req.body?.data_nascimento === undefined ? null : normalizeDate(req.body?.data_nascimento);
  const observacoes = normalizeNullableText(req.body?.observacoes);
  const status = normalizeStatus(req.body?.status) || "ativo";

  if (!nome) return sendError(res, 400, "nome e obrigatorio.");
  if (req.body?.data_nascimento !== undefined && normalizeText(req.body?.data_nascimento) && !dataNascimento) {
    return sendError(res, 400, "data_nascimento invalida. Use YYYY-MM-DD.");
  }

  try {
    const [result] = await pool.execute(
      `
INSERT INTO pacientes (nome, email, telefone, data_nascimento, observacoes, status)
VALUES (?, ?, ?, ?, ?, ?);
      `.trim(),
      [nome, email, telefone, dataNascimento, observacoes, status]
    );

    const [rows] = await pool.execute(
      `
SELECT id, nome, email, telefone, data_nascimento, observacoes, status, created_at
FROM pacientes
WHERE id = ?;
      `.trim(),
      [result.insertId]
    );

    res.status(201).json(buildPacientePayload(rows[0]));
  } catch (error) {
    if (error?.code === "ER_DUP_ENTRY") {
      return sendError(res, 409, "Ja existe paciente com este email.");
    }

    sendError(res, 500, "Erro ao criar paciente.", error?.message);
  }
}

async function update(req, res) {
  const id = normalizeId(req.params.id);
  if (!id) return sendError(res, 400, "id invalido.");

  const fields = [];
  const values = [];

  if (req.body?.nome !== undefined) {
    const nome = normalizeText(req.body?.nome);
    if (!nome) return sendError(res, 400, "nome nao pode ser vazio.");
    fields.push("nome = ?");
    values.push(nome);
  }

  if (req.body?.email !== undefined) {
    fields.push("email = ?");
    values.push(normalizeNullableText(req.body?.email));
  }

  if (req.body?.telefone !== undefined) {
    fields.push("telefone = ?");
    values.push(normalizeNullableText(req.body?.telefone));
  }

  if (req.body?.data_nascimento !== undefined) {
    const raw = normalizeText(req.body?.data_nascimento);
    const dataNascimento = raw ? normalizeDate(raw) : null;
    if (raw && !dataNascimento) {
      return sendError(res, 400, "data_nascimento invalida. Use YYYY-MM-DD.");
    }
    fields.push("data_nascimento = ?");
    values.push(dataNascimento);
  }

  if (req.body?.observacoes !== undefined) {
    fields.push("observacoes = ?");
    values.push(normalizeNullableText(req.body?.observacoes));
  }

  if (req.body?.status !== undefined) {
    const status = normalizeStatus(req.body?.status);
    if (!status) return sendError(res, 400, "status invalido (use ativo/inativo).");
    fields.push("status = ?");
    values.push(status);
  }

  if (fields.length === 0) return sendError(res, 400, "Nenhum campo para atualizar.");

  try {
    const [result] = await pool.execute(`UPDATE pacientes SET ${fields.join(", ")} WHERE id = ?;`, [...values, id]);

    if (result.affectedRows === 0) {
      return sendError(res, 404, "Paciente nao encontrado.");
    }

    const [rows] = await pool.execute(
      `
SELECT id, nome, email, telefone, data_nascimento, observacoes, status, created_at
FROM pacientes
WHERE id = ?;
      `.trim(),
      [id]
    );

    res.status(200).json(buildPacientePayload(rows[0]));
  } catch (error) {
    if (error?.code === "ER_DUP_ENTRY") {
      return sendError(res, 409, "Ja existe paciente com este email.");
    }

    sendError(res, 500, "Erro ao atualizar paciente.", error?.message);
  }
}

async function remove(req, res) {
  const id = normalizeId(req.params.id);
  if (!id) return sendError(res, 400, "id invalido.");

  try {
    const [result] = await pool.execute("DELETE FROM pacientes WHERE id = ?;", [id]);

    if (result.affectedRows === 0) {
      return sendError(res, 404, "Paciente nao encontrado.");
    }

    res.status(204).send();
  } catch (error) {
    sendError(res, 500, "Erro ao remover paciente.", error?.message);
  }
}

module.exports = { list, getById, create, update, remove };
