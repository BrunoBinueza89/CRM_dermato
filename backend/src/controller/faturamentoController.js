const { pool } = require("../../connection");
const { sendError } = require("../utils/http");

function normalizeText(value) {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return String(value[0] ?? "").trim();
  return String(value).trim();
}

function normalizeId(value) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeStatus(value) {
  const raw = normalizeText(value).toLowerCase();
  if (raw === "aberta" || raw === "paga" || raw === "cancelada") return raw;
  return "";
}

function normalizeMonth(value) {
  const text = normalizeText(value);
  if (!text) return "";
  if (!/^\d{4}-\d{2}$/.test(text)) return "";
  return text;
}

function normalizeDate(value) {
  const text = normalizeText(value);
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  return text;
}

function normalizeDecimal(value, { allowNull = false } = {}) {
  if (value === undefined || value === null || value === "") return allowNull ? null : 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCurrency(value) {
  return Number(value || 0);
}

function mapInvoiceRow(row) {
  return {
    id: row.id,
    paciente_id: row.paciente_id,
    tratamento_id: row.tratamento_id,
    paciente_nome: row.paciente_nome,
    tratamento_nome: row.tratamento_nome,
    data_emissao: row.data_emissao,
    data_vencimento: row.data_vencimento,
    valor_total: formatCurrency(row.valor_total),
    status: row.status,
    observacoes: row.observacoes,
    created_at: row.created_at,
  };
}

async function list(req, res) {
  const search = normalizeText(req.query.search);
  const status = normalizeStatus(req.query.status);
  const month = normalizeMonth(req.query.month);
  const like = `%${search}%`;

  if (req.query.month && !month) {
    return sendError(res, 400, "month invalido. Use YYYY-MM.");
  }

  try {
    const [invoiceRows] = await pool.execute(
      `
SELECT
  f.id,
  f.paciente_id,
  f.tratamento_id,
  f.data_emissao,
  f.data_vencimento,
  f.valor_total,
  f.status,
  f.observacoes,
  f.created_at,
  p.nome AS paciente_nome,
  t.nome AS tratamento_nome
FROM faturamento f
INNER JOIN pacientes p ON p.id = f.paciente_id
INNER JOIN tratamentos t ON t.id = f.tratamento_id
WHERE (p.nome LIKE ? OR t.nome LIKE ? OR CAST(f.id AS CHAR) LIKE ?)
  AND (? = '' OR f.status = ?)
  AND (? = '' OR DATE_FORMAT(f.data_emissao, '%Y-%m') = ?)
ORDER BY f.data_emissao DESC, f.id DESC;
      `.trim(),
      [like, like, like, status, status, month, month]
    );

    const [kpiRows] = await pool.execute(
      `
SELECT
  COUNT(*) AS totalFaturas,
  COALESCE(SUM(valor_total), 0) AS valorTotal,
  COALESCE(SUM(CASE WHEN status = 'paga' THEN valor_total ELSE 0 END), 0) AS valorPago,
  COALESCE(SUM(CASE WHEN status = 'aberta' THEN valor_total ELSE 0 END), 0) AS valorEmAberto,
  COALESCE(SUM(CASE WHEN status = 'cancelada' THEN valor_total ELSE 0 END), 0) AS valorCancelado
FROM faturamento
WHERE (? = '' OR status = ?)
  AND (? = '' OR DATE_FORMAT(data_emissao, '%Y-%m') = ?);
      `.trim(),
      [status, status, month, month]
    );

    res.status(200).json({
      kpis: {
        totalFaturas: Number(kpiRows[0]?.totalFaturas || 0),
        valorTotal: formatCurrency(kpiRows[0]?.valorTotal),
        valorPago: formatCurrency(kpiRows[0]?.valorPago),
        valorEmAberto: formatCurrency(kpiRows[0]?.valorEmAberto),
        valorCancelado: formatCurrency(kpiRows[0]?.valorCancelado),
      },
      invoices: invoiceRows.map(mapInvoiceRow),
    });
  } catch (error) {
    return sendError(res, 500, error?.message || "Erro ao carregar faturamento.");
  }
}

async function getById(req, res) {
  const id = normalizeId(req.params.id);
  if (!id) return sendError(res, 400, "id invalido.");

  try {
    const [rows] = await pool.execute(
      `
SELECT
  f.id,
  f.paciente_id,
  f.tratamento_id,
  f.data_emissao,
  f.data_vencimento,
  f.valor_total,
  f.status,
  f.observacoes,
  f.created_at,
  p.nome AS paciente_nome,
  t.nome AS tratamento_nome
FROM faturamento f
INNER JOIN pacientes p ON p.id = f.paciente_id
INNER JOIN tratamentos t ON t.id = f.tratamento_id
WHERE f.id = ?;
      `.trim(),
      [id]
    );

    if (!rows || rows.length === 0) {
      return sendError(res, 404, "Fatura nao encontrada.");
    }

    return res.status(200).json(mapInvoiceRow(rows[0]));
  } catch (error) {
    return sendError(res, 500, error?.message || "Erro ao carregar fatura.");
  }
}

async function create(req, res) {
  const pacienteId = normalizeId(req.body?.paciente_id);
  const tratamentoId = normalizeId(req.body?.tratamento_id);
  const dataEmissao = normalizeDate(req.body?.data_emissao);
  const dataVencimento =
    req.body?.data_vencimento === undefined ? null : normalizeDate(req.body?.data_vencimento);
  const valorTotal = normalizeDecimal(req.body?.valor_total);
  const status = normalizeStatus(req.body?.status) || "aberta";
  const observacoes = normalizeText(req.body?.observacoes) || null;

  if (!pacienteId) return sendError(res, 400, "paciente_id invalido.");
  if (!tratamentoId) return sendError(res, 400, "tratamento_id invalido.");
  if (!dataEmissao) return sendError(res, 400, "data_emissao invalida. Use YYYY-MM-DD.");
  if (req.body?.data_vencimento !== undefined && normalizeText(req.body?.data_vencimento) && !dataVencimento) {
    return sendError(res, 400, "data_vencimento invalida. Use YYYY-MM-DD.");
  }
  if (valorTotal === null) return sendError(res, 400, "valor_total invalido.");

  try {
    const [pacienteRows] = await pool.execute("SELECT id FROM pacientes WHERE id = ?;", [pacienteId]);
    if (!pacienteRows || pacienteRows.length === 0) {
      return sendError(res, 404, "Paciente nao encontrado.");
    }

    const [tratamentoRows] = await pool.execute("SELECT id, paciente_id FROM tratamentos WHERE id = ?;", [tratamentoId]);
    if (!tratamentoRows || tratamentoRows.length === 0) {
      return sendError(res, 404, "Tratamento nao encontrado.");
    }
    if (Number(tratamentoRows[0].paciente_id) !== Number(pacienteId)) {
      return sendError(res, 409, "Tratamento nao pertence ao paciente informado.");
    }

    const [result] = await pool.execute(
      `
INSERT INTO faturamento (paciente_id, tratamento_id, data_emissao, data_vencimento, valor_total, status, observacoes)
VALUES (?, ?, ?, ?, ?, ?, ?);
      `.trim(),
      [pacienteId, tratamentoId, dataEmissao, dataVencimento, valorTotal, status, observacoes]
    );

    req.params.id = String(result.insertId);
    return getById(req, res);
  } catch (error) {
    return sendError(res, 500, error?.message || "Erro ao criar fatura.");
  }
}

async function update(req, res) {
  const id = normalizeId(req.params.id);
  if (!id) return sendError(res, 400, "id invalido.");

  const status = normalizeStatus(req.body?.status);
  const valorTotal = normalizeDecimal(req.body?.valor_total, { allowNull: true });
  const dataEmissao = req.body?.data_emissao === undefined ? null : normalizeDate(req.body?.data_emissao);
  const dataVencimento =
    req.body?.data_vencimento === undefined ? null : normalizeDate(req.body?.data_vencimento);
  const observacoes = normalizeText(req.body?.observacoes) || null;

  if (!status) return sendError(res, 400, "status invalido.");
  if (req.body?.valor_total !== undefined && valorTotal === null) {
    return sendError(res, 400, "valor_total invalido.");
  }
  if (req.body?.data_emissao !== undefined && normalizeText(req.body?.data_emissao) && !dataEmissao) {
    return sendError(res, 400, "data_emissao invalida. Use YYYY-MM-DD.");
  }
  if (
    req.body?.data_vencimento !== undefined &&
    normalizeText(req.body?.data_vencimento) &&
    !dataVencimento
  ) {
    return sendError(res, 400, "data_vencimento invalida. Use YYYY-MM-DD.");
  }

  try {
    const [existing] = await pool.execute("SELECT id FROM faturamento WHERE id = ?;", [id]);
    if (!existing || existing.length === 0) {
      return sendError(res, 404, "Fatura nao encontrada.");
    }

    const fields = [];
    const params = [];

    fields.push("status = ?");
    params.push(status);

    if (req.body?.valor_total !== undefined) {
      fields.push("valor_total = ?");
      params.push(valorTotal);
    }
    if (req.body?.data_emissao !== undefined) {
      fields.push("data_emissao = ?");
      params.push(dataEmissao);
    }
    if (req.body?.data_vencimento !== undefined) {
      fields.push("data_vencimento = ?");
      params.push(dataVencimento);
    }
    if (req.body?.observacoes !== undefined) {
      fields.push("observacoes = ?");
      params.push(observacoes);
    }

    params.push(id);

    await pool.execute(`UPDATE faturamento SET ${fields.join(", ")} WHERE id = ?;`, params);

    return getById(req, res);
  } catch (error) {
    return sendError(res, 500, error?.message || "Erro ao atualizar fatura.");
  }
}

async function remove(req, res) {
  const id = normalizeId(req.params.id);
  if (!id) return sendError(res, 400, "id invalido.");

  try {
    const [result] = await pool.execute("DELETE FROM faturamento WHERE id = ?;", [id]);
    if (!result.affectedRows) {
      return sendError(res, 404, "Fatura nao encontrada.");
    }
    return res.status(204).send();
  } catch (error) {
    return sendError(res, 500, error?.message || "Erro ao remover fatura.");
  }
}

module.exports = { list, getById, create, update, remove };
