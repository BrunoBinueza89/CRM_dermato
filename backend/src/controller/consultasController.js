const { pool } = require("../../connection");
const { sendError } = require("../utils/http");

function normalizeText(value) {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return String(value[0] ?? "").trim();
  return String(value).trim();
}

function normalizeStatus(value) {
  const raw = normalizeText(value).toLowerCase();
  if (raw === "agendada" || raw === "realizada" || raw === "cancelada") return raw;
  return "";
}

function normalizeId(value) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDate(value) {
  const text = normalizeText(value);
  if (!text) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return "";
  return text;
}

function normalizeMonth(value) {
  const text = normalizeText(value);
  if (!text) return "";
  if (!/^\d{4}-\d{2}$/.test(text)) return "";
  return text;
}

function normalizeDateTime(value) {
  const text = normalizeText(value);
  if (!text) return "";
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)) return "";

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return "";
  return `${text}:00`;
}

function buildConsultaPayload(row) {
  return {
    id: row.id,
    paciente_id: row.paciente_id,
    profissional_id: row.profissional_id,
    data_hora: row.data_hora,
    status: row.status,
    descricao: row.descricao,
    observacoes: row.observacoes,
    created_at: row.created_at,
    paciente_nome: row.paciente_nome,
    profissional_nome: row.profissional_nome,
  };
}

async function ensureNoConflict({ profissionalId, dataHora, ignoreId = null }) {
  const params = [profissionalId, dataHora];
  let sql = `
SELECT id
FROM consultas
WHERE profissional_id = ?
  AND data_hora = ?
  AND status <> 'cancelada'
`;

  if (ignoreId) {
    sql += " AND id <> ?";
    params.push(ignoreId);
  }

  sql += " LIMIT 1;";

  const [rows] = await pool.execute(sql.trim(), params);
  return !rows || rows.length === 0;
}

async function list(req, res) {
  const search = normalizeText(req.query.search);
  const status = normalizeStatus(req.query.status);
  const date = normalizeDate(req.query.date);
  const month = normalizeMonth(req.query.month);
  const pacienteId = req.query.paciente_id ? normalizeId(req.query.paciente_id) : null;
  const profissionalId = req.query.profissional_id ? normalizeId(req.query.profissional_id) : null;
  const like = `%${search}%`;

  if (req.query.date && !date) {
    return sendError(res, 400, "date invalida. Use YYYY-MM-DD.");
  }

  if (req.query.month && !month) {
    return sendError(res, 400, "month invalido. Use YYYY-MM.");
  }

  try {
    const [rows] = await pool.execute(
      `
SELECT
  c.id,
  c.paciente_id,
  c.profissional_id,
  c.data_hora,
  c.status,
  c.descricao,
  c.observacoes,
  c.created_at,
  p.nome AS paciente_nome,
  e.nome AS profissional_nome
FROM consultas c
INNER JOIN pacientes p ON p.id = c.paciente_id
INNER JOIN equipe e ON e.id = c.profissional_id
WHERE (p.nome LIKE ? OR e.nome LIKE ? OR COALESCE(c.descricao, '') LIKE ?)
  AND (? = '' OR c.status = ?)
  AND (? = '' OR DATE(c.data_hora) = ?)
  AND (? = '' OR DATE_FORMAT(c.data_hora, '%Y-%m') = ?)
  AND (? IS NULL OR c.paciente_id = ?)
  AND (? IS NULL OR c.profissional_id = ?)
ORDER BY c.data_hora ASC, c.id ASC;
      `.trim(),
      [
        like,
        like,
        like,
        status,
        status,
        date,
        date,
        month,
        month,
        pacienteId,
        pacienteId,
        profissionalId,
        profissionalId,
      ]
    );

    res.status(200).json(rows.map(buildConsultaPayload));
  } catch (error) {
    return sendError(res, 500, error?.message || "Erro ao listar consultas.");
  }
}

async function getById(req, res) {
  const id = normalizeId(req.params.id);
  if (!id) return sendError(res, 400, "id invalido.");

  try {
    const [rows] = await pool.execute(
      `
SELECT
  c.id,
  c.paciente_id,
  c.profissional_id,
  c.data_hora,
  c.status,
  c.descricao,
  c.observacoes,
  c.created_at,
  p.nome AS paciente_nome,
  e.nome AS profissional_nome
FROM consultas c
INNER JOIN pacientes p ON p.id = c.paciente_id
INNER JOIN equipe e ON e.id = c.profissional_id
WHERE c.id = ?;
      `.trim(),
      [id]
    );

    if (!rows || rows.length === 0) {
      return sendError(res, 404, "Consulta nao encontrada.");
    }

    return res.status(200).json(buildConsultaPayload(rows[0]));
  } catch (error) {
    return sendError(res, 500, error?.message || "Erro ao carregar consulta.");
  }
}

async function create(req, res) {
  const pacienteId = normalizeId(req.body?.paciente_id);
  const profissionalId = normalizeId(req.body?.profissional_id);
  const dataHora = normalizeDateTime(req.body?.data_hora);
  const status = normalizeStatus(req.body?.status) || "agendada";
  const descricao = normalizeText(req.body?.descricao) || null;
  const observacoes = normalizeText(req.body?.observacoes) || null;

  if (!pacienteId) return sendError(res, 400, "paciente_id invalido.");
  if (!profissionalId) return sendError(res, 400, "profissional_id invalido.");
  if (!dataHora) return sendError(res, 400, "data_hora invalida. Use YYYY-MM-DDTHH:mm.");
  if (new Date(dataHora).getTime() < Date.now()) {
    return sendError(res, 400, "Nao e permitido agendar consulta no passado.");
  }

  try {
    const hasNoConflict = await ensureNoConflict({ profissionalId, dataHora });
    if (!hasNoConflict) {
      return sendError(res, 409, "Ja existe consulta para este profissional neste horario.");
    }

    const [result] = await pool.execute(
      `
INSERT INTO consultas (paciente_id, profissional_id, data_hora, status, descricao, observacoes)
VALUES (?, ?, ?, ?, ?, ?);
      `.trim(),
      [pacienteId, profissionalId, dataHora, status, descricao, observacoes]
    );

    const [rows] = await pool.execute(
      `
SELECT
  c.id,
  c.paciente_id,
  c.profissional_id,
  c.data_hora,
  c.status,
  c.descricao,
  c.observacoes,
  c.created_at,
  p.nome AS paciente_nome,
  e.nome AS profissional_nome
FROM consultas c
INNER JOIN pacientes p ON p.id = c.paciente_id
INNER JOIN equipe e ON e.id = c.profissional_id
WHERE c.id = ?;
      `.trim(),
      [result.insertId]
    );

    res.status(201).json(buildConsultaPayload(rows[0]));
  } catch (error) {
    return sendError(res, 500, error?.message || "Erro ao agendar consulta.");
  }
}

async function update(req, res) {
  const id = normalizeId(req.params.id);
  if (!id) return sendError(res, 400, "id invalido.");

  const pacienteId = normalizeId(req.body?.paciente_id);
  const profissionalId = normalizeId(req.body?.profissional_id);
  const dataHora = normalizeDateTime(req.body?.data_hora);
  const status = normalizeStatus(req.body?.status);
  const descricao = normalizeText(req.body?.descricao) || null;
  const observacoes = normalizeText(req.body?.observacoes) || null;

  if (!pacienteId) return sendError(res, 400, "paciente_id invalido.");
  if (!profissionalId) return sendError(res, 400, "profissional_id invalido.");
  if (!dataHora) return sendError(res, 400, "data_hora invalida. Use YYYY-MM-DDTHH:mm.");
  if (!status) return sendError(res, 400, "status invalido.");
  if (status === "agendada" && new Date(dataHora).getTime() < Date.now()) {
    return sendError(res, 400, "Nao e permitido agendar consulta no passado.");
  }

  try {
    const [existingRows] = await pool.execute(
      "SELECT id, profissional_id, data_hora, status FROM consultas WHERE id = ?;",
      [id]
    );
    if (!existingRows || existingRows.length === 0) {
      return sendError(res, 404, "Consulta nao encontrada.");
    }

    const hasNoConflict =
      status === "cancelada"
        ? true
        : await ensureNoConflict({ profissionalId, dataHora, ignoreId: id });
    if (!hasNoConflict) {
      return sendError(res, 409, "Ja existe consulta para este profissional neste horario.");
    }

    await pool.execute(
      `
UPDATE consultas
SET paciente_id = ?, profissional_id = ?, data_hora = ?, status = ?, descricao = ?, observacoes = ?
WHERE id = ?;
      `.trim(),
      [pacienteId, profissionalId, dataHora, status, descricao, observacoes, id]
    );

    const [rows] = await pool.execute(
      `
SELECT
  c.id,
  c.paciente_id,
  c.profissional_id,
  c.data_hora,
  c.status,
  c.descricao,
  c.observacoes,
  c.created_at,
  p.nome AS paciente_nome,
  e.nome AS profissional_nome
FROM consultas c
INNER JOIN pacientes p ON p.id = c.paciente_id
INNER JOIN equipe e ON e.id = c.profissional_id
WHERE c.id = ?;
      `.trim(),
      [id]
    );

    return res.status(200).json(buildConsultaPayload(rows[0]));
  } catch (error) {
    return sendError(res, 500, error?.message || "Erro ao atualizar consulta.");
  }
}

async function remove(req, res) {
  const id = normalizeId(req.params.id);
  if (!id) return sendError(res, 400, "id invalido.");

  try {
    const [result] = await pool.execute("DELETE FROM consultas WHERE id = ?;", [id]);
    if (!result.affectedRows) {
      return sendError(res, 404, "Consulta nao encontrada.");
    }
    return res.status(204).send();
  } catch (error) {
    return sendError(res, 500, error?.message || "Erro ao remover consulta.");
  }
}

module.exports = { list, getById, create, update, remove };
