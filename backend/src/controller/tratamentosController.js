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

function normalizeId(value) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDate(value) {
  const text = normalizeText(value);
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  return text;
}

function normalizeDateTime(value) {
  const text = normalizeText(value);
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)) return null;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;
  return `${text}:00`;
}

function normalizeStatus(value) {
  const raw = normalizeText(value).toLowerCase();
  if (raw === "ativo" || raw === "concluido" || raw === "cancelado") return raw;
  return "";
}

function normalizeSessionStatus(value) {
  const raw = normalizeText(value).toLowerCase();
  if (raw === "agendada" || raw === "realizada" || raw === "cancelada") return raw;
  return "";
}

function calculateProgress(sessionRows) {
  const validSessions = sessionRows.filter((session) => session.status !== "cancelada");
  if (validSessions.length === 0) return 0;

  const completed = validSessions.filter((session) => session.status === "realizada").length;
  return Math.round((completed / validSessions.length) * 100);
}

function mapTratamento(row, sessions) {
  const progresso = calculateProgress(sessions);

  return {
    id: row.id,
    paciente_id: row.paciente_id,
    profissional_id: row.profissional_id,
    nome: row.nome,
    descricao: row.descricao,
    data_inicio: row.data_inicio,
    data_fim: row.data_fim,
    status: row.status,
    created_at: row.created_at,
    paciente_nome: row.paciente_nome,
    profissional_nome: row.profissional_nome,
    progresso,
    sessoes: sessions.map((session) => ({
      id: session.id,
      data_hora: session.data_hora,
      status: session.status,
      observacoes: session.observacoes,
      created_at: session.created_at,
    })),
  };
}

async function loadSessionsByTreatmentIds(ids) {
  if (!ids.length) return new Map();

  const placeholders = ids.map(() => "?").join(", ");
  const [rows] = await pool.query(
    `
SELECT id, tratamento_id, data_hora, status, observacoes, created_at
FROM sessoes_tratamento
WHERE tratamento_id IN (${placeholders})
ORDER BY data_hora ASC, id ASC;
    `.trim(),
    ids
  );

  const sessionsByTreatment = new Map();
  for (const row of rows) {
    if (!sessionsByTreatment.has(row.tratamento_id)) {
      sessionsByTreatment.set(row.tratamento_id, []);
    }
    sessionsByTreatment.get(row.tratamento_id).push(row);
  }

  return sessionsByTreatment;
}

async function list(req, res) {
  const search = normalizeText(req.query.search);
  const status = normalizeStatus(req.query.status);
  const pacienteId = req.query.paciente_id ? normalizeId(req.query.paciente_id) : null;
  const like = `%${search}%`;

  try {
    const [rows] = await pool.execute(
      `
SELECT
  t.id,
  t.paciente_id,
  t.profissional_id,
  t.nome,
  t.descricao,
  t.data_inicio,
  t.data_fim,
  t.status,
  t.created_at,
  p.nome AS paciente_nome,
  e.nome AS profissional_nome
FROM tratamentos t
INNER JOIN pacientes p ON p.id = t.paciente_id
INNER JOIN equipe e ON e.id = t.profissional_id
WHERE (t.nome LIKE ? OR p.nome LIKE ? OR e.nome LIKE ?)
  AND (? = '' OR t.status = ?)
  AND (? IS NULL OR t.paciente_id = ?)
ORDER BY t.created_at DESC, t.id DESC;
      `.trim(),
      [like, like, like, status, status, pacienteId, pacienteId]
    );

    const ids = rows.map((row) => row.id);
    const sessionsByTreatment = await loadSessionsByTreatmentIds(ids);

    res.status(200).json(
      rows.map((row) => mapTratamento(row, sessionsByTreatment.get(row.id) || []))
    );
  } catch (error) {
    return sendError(res, 500, error?.message || "Erro ao listar tratamentos.");
  }
}

async function getById(req, res) {
  const id = normalizeId(req.params.id);
  if (!id) return sendError(res, 400, "id invalido.");

  try {
    const [rows] = await pool.execute(
      `
SELECT
  t.id,
  t.paciente_id,
  t.profissional_id,
  t.nome,
  t.descricao,
  t.data_inicio,
  t.data_fim,
  t.status,
  t.created_at,
  p.nome AS paciente_nome,
  e.nome AS profissional_nome
FROM tratamentos t
INNER JOIN pacientes p ON p.id = t.paciente_id
INNER JOIN equipe e ON e.id = t.profissional_id
WHERE t.id = ?;
      `.trim(),
      [id]
    );

    if (!rows || rows.length === 0) {
      return sendError(res, 404, "Tratamento nao encontrado.");
    }

    const sessionsByTreatment = await loadSessionsByTreatmentIds([id]);
    return res.status(200).json(mapTratamento(rows[0], sessionsByTreatment.get(id) || []));
  } catch (error) {
    return sendError(res, 500, error?.message || "Erro ao carregar tratamento.");
  }
}

async function create(req, res) {
  const pacienteId = normalizeId(req.body?.paciente_id);
  const profissionalId = normalizeId(req.body?.profissional_id);
  const nome = normalizeText(req.body?.nome);
  const descricao = normalizeNullableText(req.body?.descricao);
  const dataInicio = req.body?.data_inicio === undefined ? null : normalizeDate(req.body?.data_inicio);
  const dataFim = req.body?.data_fim === undefined ? null : normalizeDate(req.body?.data_fim);
  const status = normalizeStatus(req.body?.status) || "ativo";

  if (!pacienteId) return sendError(res, 400, "paciente_id invalido.");
  if (!profissionalId) return sendError(res, 400, "profissional_id invalido.");
  if (!nome) return sendError(res, 400, "nome e obrigatorio.");
  if (req.body?.data_inicio !== undefined && normalizeText(req.body?.data_inicio) && !dataInicio) {
    return sendError(res, 400, "data_inicio invalida. Use YYYY-MM-DD.");
  }
  if (req.body?.data_fim !== undefined && normalizeText(req.body?.data_fim) && !dataFim) {
    return sendError(res, 400, "data_fim invalida. Use YYYY-MM-DD.");
  }
  if (dataInicio && dataFim && dataFim < dataInicio) {
    return sendError(res, 400, "data_fim nao pode ser anterior a data_inicio.");
  }

  try {
    const [result] = await pool.execute(
      `
INSERT INTO tratamentos (paciente_id, profissional_id, nome, descricao, data_inicio, data_fim, status)
VALUES (?, ?, ?, ?, ?, ?, ?);
      `.trim(),
      [pacienteId, profissionalId, nome, descricao, dataInicio, dataFim, status]
    );

    const [rows] = await pool.execute(
      `
SELECT
  t.id,
  t.paciente_id,
  t.profissional_id,
  t.nome,
  t.descricao,
  t.data_inicio,
  t.data_fim,
  t.status,
  t.created_at,
  p.nome AS paciente_nome,
  e.nome AS profissional_nome
FROM tratamentos t
INNER JOIN pacientes p ON p.id = t.paciente_id
INNER JOIN equipe e ON e.id = t.profissional_id
WHERE t.id = ?;
      `.trim(),
      [result.insertId]
    );

    res.status(201).json(mapTratamento(rows[0], []));
  } catch (error) {
    return sendError(res, 500, error?.message || "Erro ao criar tratamento.");
  }
}

async function update(req, res) {
  const id = normalizeId(req.params.id);
  if (!id) return sendError(res, 400, "id invalido.");

  const pacienteId = normalizeId(req.body?.paciente_id);
  const profissionalId = normalizeId(req.body?.profissional_id);
  const nome = normalizeText(req.body?.nome);
  const descricao = normalizeNullableText(req.body?.descricao);
  const dataInicio = req.body?.data_inicio === undefined ? null : normalizeDate(req.body?.data_inicio);
  const dataFim = req.body?.data_fim === undefined ? null : normalizeDate(req.body?.data_fim);
  const status = normalizeStatus(req.body?.status);

  if (!pacienteId) return sendError(res, 400, "paciente_id invalido.");
  if (!profissionalId) return sendError(res, 400, "profissional_id invalido.");
  if (!nome) return sendError(res, 400, "nome e obrigatorio.");
  if (!status) return sendError(res, 400, "status invalido.");
  if (req.body?.data_inicio !== undefined && normalizeText(req.body?.data_inicio) && !dataInicio) {
    return sendError(res, 400, "data_inicio invalida. Use YYYY-MM-DD.");
  }
  if (req.body?.data_fim !== undefined && normalizeText(req.body?.data_fim) && !dataFim) {
    return sendError(res, 400, "data_fim invalida. Use YYYY-MM-DD.");
  }
  if (dataInicio && dataFim && dataFim < dataInicio) {
    return sendError(res, 400, "data_fim nao pode ser anterior a data_inicio.");
  }

  try {
    const [existingRows] = await pool.execute("SELECT id FROM tratamentos WHERE id = ?;", [id]);
    if (!existingRows || existingRows.length === 0) {
      return sendError(res, 404, "Tratamento nao encontrado.");
    }

    await pool.execute(
      `
UPDATE tratamentos
SET paciente_id = ?, profissional_id = ?, nome = ?, descricao = ?, data_inicio = ?, data_fim = ?, status = ?
WHERE id = ?;
      `.trim(),
      [pacienteId, profissionalId, nome, descricao, dataInicio, dataFim, status, id]
    );

    const [rows] = await pool.execute(
      `
SELECT
  t.id,
  t.paciente_id,
  t.profissional_id,
  t.nome,
  t.descricao,
  t.data_inicio,
  t.data_fim,
  t.status,
  t.created_at,
  p.nome AS paciente_nome,
  e.nome AS profissional_nome
FROM tratamentos t
INNER JOIN pacientes p ON p.id = t.paciente_id
INNER JOIN equipe e ON e.id = t.profissional_id
WHERE t.id = ?;
      `.trim(),
      [id]
    );

    const sessionsByTreatment = await loadSessionsByTreatmentIds([id]);
    return res.status(200).json(mapTratamento(rows[0], sessionsByTreatment.get(id) || []));
  } catch (error) {
    return sendError(res, 500, error?.message || "Erro ao atualizar tratamento.");
  }
}

async function remove(req, res) {
  const id = normalizeId(req.params.id);
  if (!id) return sendError(res, 400, "id invalido.");

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [existingRows] = await connection.execute("SELECT id FROM tratamentos WHERE id = ?;", [id]);
    if (!existingRows || existingRows.length === 0) {
      await connection.rollback();
      return sendError(res, 404, "Tratamento nao encontrado.");
    }

    await connection.execute("DELETE FROM sessoes_tratamento WHERE tratamento_id = ?;", [id]);
    const [result] = await connection.execute("DELETE FROM tratamentos WHERE id = ?;", [id]);

    await connection.commit();

    if (!result.affectedRows) {
      return sendError(res, 404, "Tratamento nao encontrado.");
    }

    return res.status(204).send();
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }

    if (error && (error.code === "ER_ROW_IS_REFERENCED_2" || error.errno === 1451)) {
      return sendError(
        res,
        409,
        "Nao foi possivel remover o tratamento pois existem registros vinculados (ex.: faturamento)."
      );
    }

    return sendError(res, 500, error?.message || "Erro ao remover tratamento.");
  } finally {
    if (connection) connection.release();
  }
}

async function createSession(req, res) {
  const tratamentoId = normalizeId(req.params.id);
  const dataHora = normalizeDateTime(req.body?.data_hora);
  const status = normalizeSessionStatus(req.body?.status) || "agendada";
  const observacoes = normalizeNullableText(req.body?.observacoes);

  if (!tratamentoId) return sendError(res, 400, "id invalido.");
  if (!dataHora) return sendError(res, 400, "data_hora invalida. Use YYYY-MM-DDTHH:mm.");

  try {
    const [tratamentoRows] = await pool.execute("SELECT id FROM tratamentos WHERE id = ?;", [tratamentoId]);
    if (!tratamentoRows || tratamentoRows.length === 0) {
      return sendError(res, 404, "Tratamento nao encontrado.");
    }

    const [result] = await pool.execute(
      `
INSERT INTO sessoes_tratamento (tratamento_id, data_hora, status, observacoes)
VALUES (?, ?, ?, ?);
      `.trim(),
      [tratamentoId, dataHora, status, observacoes]
    );

    const [rows] = await pool.execute(
      `
SELECT id, tratamento_id, data_hora, status, observacoes, created_at
FROM sessoes_tratamento
WHERE id = ?;
      `.trim(),
      [result.insertId]
    );

    res.status(201).json({
      id: rows[0].id,
      tratamento_id: rows[0].tratamento_id,
      data_hora: rows[0].data_hora,
      status: rows[0].status,
      observacoes: rows[0].observacoes,
      created_at: rows[0].created_at,
    });
  } catch (error) {
    return sendError(res, 500, error?.message || "Erro ao criar sessao.");
  }
}

module.exports = { list, getById, create, update, remove, createSession };
