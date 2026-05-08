const { pool } = require("../../connection");
const { sendError } = require("../utils/http");

function normalizeText(value) {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return String(value[0] ?? "").trim();
  return String(value).trim();
}

function normalizeCategory(value) {
  return normalizeText(value);
}

function normalizeId(value) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDecimal(value, { allowNull = false } = {}) {
  if (value === undefined || value === null || value === "") return allowNull ? null : 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDate(value) {
  const text = normalizeText(value);
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  return text;
}

function computeStatus(quantidade, quantidadeMinima) {
  const current = Number(quantidade || 0);
  const minimum = Number(quantidadeMinima || 0);

  if (current <= 0) return "esgotado";
  if (current <= minimum) return "critico";
  return "normal";
}

async function listCategories(req, res) {
  try {
    const [rows] = await pool.execute(
      `
SELECT id, nome, descricao, created_at
FROM estoque
ORDER BY nome ASC, id ASC;
      `.trim()
    );

    return res.status(200).json(
      rows.map((row) => ({
        id: row.id,
        nome: row.nome,
        descricao: row.descricao,
        created_at: row.created_at,
      }))
    );
  } catch (error) {
    return sendError(res, 500, error?.message || "Erro ao listar categorias.");
  }
}

async function createCategory(req, res) {
  const nome = normalizeText(req.body?.nome);
  const descricao = normalizeText(req.body?.descricao) || null;

  if (!nome) return sendError(res, 400, "nome e obrigatorio.");

  try {
    const [result] = await pool.execute(
      `
INSERT INTO estoque (nome, descricao)
VALUES (?, ?);
      `.trim(),
      [nome, descricao]
    );

    const [rows] = await pool.execute(
      "SELECT id, nome, descricao, created_at FROM estoque WHERE id = ?;",
      [result.insertId]
    );

    return res.status(201).json(rows[0]);
  } catch (error) {
    if (error && (error.code === "ER_DUP_ENTRY" || error.errno === 1062)) {
      return sendError(res, 409, "Ja existe uma categoria com este nome.");
    }
    return sendError(res, 500, error?.message || "Erro ao criar categoria.");
  }
}

async function updateCategory(req, res) {
  const id = normalizeId(req.params.id);
  if (!id) return sendError(res, 400, "id invalido.");

  const nome = normalizeText(req.body?.nome);
  const descricao = req.body?.descricao === undefined ? undefined : normalizeText(req.body?.descricao) || null;

  if (!nome) return sendError(res, 400, "nome e obrigatorio.");

  try {
    const [existing] = await pool.execute("SELECT id FROM estoque WHERE id = ?;", [id]);
    if (!existing || existing.length === 0) return sendError(res, 404, "Categoria nao encontrada.");

    const fields = ["nome = ?"];
    const params = [nome];
    if (descricao !== undefined) {
      fields.push("descricao = ?");
      params.push(descricao);
    }
    params.push(id);

    await pool.execute(`UPDATE estoque SET ${fields.join(", ")} WHERE id = ?;`, params);

    const [rows] = await pool.execute(
      "SELECT id, nome, descricao, created_at FROM estoque WHERE id = ?;",
      [id]
    );

    return res.status(200).json(rows[0]);
  } catch (error) {
    if (error && (error.code === "ER_DUP_ENTRY" || error.errno === 1062)) {
      return sendError(res, 409, "Ja existe uma categoria com este nome.");
    }
    return sendError(res, 500, error?.message || "Erro ao atualizar categoria.");
  }
}

async function removeCategory(req, res) {
  const id = normalizeId(req.params.id);
  if (!id) return sendError(res, 400, "id invalido.");

  try {
    const [result] = await pool.execute("DELETE FROM estoque WHERE id = ?;", [id]);
    if (!result.affectedRows) return sendError(res, 404, "Categoria nao encontrada.");
    return res.status(204).send();
  } catch (error) {
    if (error && (error.code === "ER_ROW_IS_REFERENCED_2" || error.errno === 1451)) {
      return sendError(res, 409, "Nao foi possivel remover: existem itens vinculados a esta categoria.");
    }
    return sendError(res, 500, error?.message || "Erro ao remover categoria.");
  }
}

async function list(req, res) {
  const search = normalizeText(req.query.search);
  const category = normalizeCategory(req.query.category);
  const like = `%${search}%`;

  try {
    const [rows] = await pool.execute(
      `
SELECT
  ie.id,
  ie.estoque_id,
  ie.nome,
  ie.unidade,
  ie.quantidade,
  ie.quantidade_minima,
  ie.custo_unitario,
  ie.validade,
  ie.created_at,
  e.nome AS categoria
FROM itens_estoque ie
INNER JOIN estoque e ON e.id = ie.estoque_id
WHERE (ie.nome LIKE ? OR e.nome LIKE ?)
  AND (? = '' OR e.nome = ?)
ORDER BY e.nome ASC, ie.nome ASC, ie.id DESC;
      `.trim(),
      [like, like, category, category]
    );

    const categories = [...new Set(rows.map((row) => row.categoria).filter(Boolean))];
    const [categoryRows] = await pool.execute(
      "SELECT id, nome FROM estoque ORDER BY nome ASC, id ASC;"
    );

    res.status(200).json({
      categories,
      categoryOptions: categoryRows.map((row) => ({ id: row.id, nome: row.nome })),
      items: rows.map((row) => ({
        id: row.id,
        estoque_id: row.estoque_id,
        nome: row.nome,
        categoria: row.categoria,
        unidade: row.unidade,
        quantidade: Number(row.quantidade || 0),
        quantidade_minima: Number(row.quantidade_minima || 0),
        custo_unitario: Number(row.custo_unitario || 0),
        validade: row.validade,
        created_at: row.created_at,
        status_estoque: computeStatus(row.quantidade, row.quantidade_minima),
      })),
    });
  } catch (error) {
    return sendError(res, 500, error?.message || "Erro ao carregar estoque.");
  }
}

async function createItem(req, res) {
  const estoqueId = normalizeId(req.body?.estoque_id);
  const nome = normalizeText(req.body?.nome);
  const unidade = normalizeText(req.body?.unidade) || null;
  const quantidade = normalizeDecimal(req.body?.quantidade);
  const quantidadeMinima = normalizeDecimal(req.body?.quantidade_minima);
  const custoUnitario = normalizeDecimal(req.body?.custo_unitario);
  const validade =
    req.body?.validade === undefined ? null : normalizeDate(req.body?.validade);

  if (!estoqueId) return sendError(res, 400, "estoque_id invalido.");
  if (!nome) return sendError(res, 400, "nome e obrigatorio.");
  if (quantidade === null) return sendError(res, 400, "quantidade invalida.");
  if (quantidadeMinima === null) return sendError(res, 400, "quantidade_minima invalida.");
  if (custoUnitario === null) return sendError(res, 400, "custo_unitario invalido.");
  if (req.body?.validade !== undefined && normalizeText(req.body?.validade) && !validade) {
    return sendError(res, 400, "validade invalida. Use YYYY-MM-DD.");
  }

  try {
    const [catRows] = await pool.execute("SELECT id, nome FROM estoque WHERE id = ?;", [estoqueId]);
    if (!catRows || catRows.length === 0) {
      return sendError(res, 404, "Categoria nao encontrada.");
    }

    const [result] = await pool.execute(
      `
INSERT INTO itens_estoque (
  estoque_id,
  nome,
  unidade,
  quantidade,
  quantidade_minima,
  custo_unitario,
  validade
)
VALUES (?, ?, ?, ?, ?, ?, ?);
      `.trim(),
      [estoqueId, nome, unidade, quantidade, quantidadeMinima, custoUnitario, validade]
    );

    const [rows] = await pool.execute(
      `
SELECT
  ie.id,
  ie.estoque_id,
  ie.nome,
  ie.unidade,
  ie.quantidade,
  ie.quantidade_minima,
  ie.custo_unitario,
  ie.validade,
  ie.created_at,
  e.nome AS categoria
FROM itens_estoque ie
INNER JOIN estoque e ON e.id = ie.estoque_id
WHERE ie.id = ?;
      `.trim(),
      [result.insertId]
    );

    return res.status(201).json({
      id: rows[0].id,
      estoque_id: rows[0].estoque_id,
      nome: rows[0].nome,
      categoria: rows[0].categoria,
      unidade: rows[0].unidade,
      quantidade: Number(rows[0].quantidade || 0),
      quantidade_minima: Number(rows[0].quantidade_minima || 0),
      custo_unitario: Number(rows[0].custo_unitario || 0),
      validade: rows[0].validade,
      created_at: rows[0].created_at,
      status_estoque: computeStatus(rows[0].quantidade, rows[0].quantidade_minima),
    });
  } catch (error) {
    return sendError(res, 500, error?.message || "Erro ao criar item.");
  }
}

async function updateItem(req, res) {
  const id = normalizeId(req.params.id);
  if (!id) return sendError(res, 400, "id invalido.");

  const estoqueId = normalizeId(req.body?.estoque_id);
  const nome = normalizeText(req.body?.nome);
  const unidade = normalizeText(req.body?.unidade) || null;
  const quantidade = normalizeDecimal(req.body?.quantidade);
  const quantidadeMinima = normalizeDecimal(req.body?.quantidade_minima);
  const custoUnitario = normalizeDecimal(req.body?.custo_unitario);
  const validade =
    req.body?.validade === undefined ? null : normalizeDate(req.body?.validade);

  if (!estoqueId) return sendError(res, 400, "estoque_id invalido.");
  if (!nome) return sendError(res, 400, "nome e obrigatorio.");
  if (quantidade === null) return sendError(res, 400, "quantidade invalida.");
  if (quantidadeMinima === null) return sendError(res, 400, "quantidade_minima invalida.");
  if (custoUnitario === null) return sendError(res, 400, "custo_unitario invalido.");
  if (req.body?.validade !== undefined && normalizeText(req.body?.validade) && !validade) {
    return sendError(res, 400, "validade invalida. Use YYYY-MM-DD.");
  }

  try {
    const [existing] = await pool.execute("SELECT id FROM itens_estoque WHERE id = ?;", [id]);
    if (!existing || existing.length === 0) {
      return sendError(res, 404, "Item nao encontrado.");
    }

    const [catRows] = await pool.execute("SELECT id FROM estoque WHERE id = ?;", [estoqueId]);
    if (!catRows || catRows.length === 0) {
      return sendError(res, 404, "Categoria nao encontrada.");
    }

    await pool.execute(
      `
UPDATE itens_estoque
SET estoque_id = ?, nome = ?, unidade = ?, quantidade = ?, quantidade_minima = ?, custo_unitario = ?, validade = ?
WHERE id = ?;
      `.trim(),
      [estoqueId, nome, unidade, quantidade, quantidadeMinima, custoUnitario, validade, id]
    );

    const [rows] = await pool.execute(
      `
SELECT
  ie.id,
  ie.estoque_id,
  ie.nome,
  ie.unidade,
  ie.quantidade,
  ie.quantidade_minima,
  ie.custo_unitario,
  ie.validade,
  ie.created_at,
  e.nome AS categoria
FROM itens_estoque ie
INNER JOIN estoque e ON e.id = ie.estoque_id
WHERE ie.id = ?;
      `.trim(),
      [id]
    );

    return res.status(200).json({
      id: rows[0].id,
      estoque_id: rows[0].estoque_id,
      nome: rows[0].nome,
      categoria: rows[0].categoria,
      unidade: rows[0].unidade,
      quantidade: Number(rows[0].quantidade || 0),
      quantidade_minima: Number(rows[0].quantidade_minima || 0),
      custo_unitario: Number(rows[0].custo_unitario || 0),
      validade: rows[0].validade,
      created_at: rows[0].created_at,
      status_estoque: computeStatus(rows[0].quantidade, rows[0].quantidade_minima),
    });
  } catch (error) {
    return sendError(res, 500, error?.message || "Erro ao atualizar item.");
  }
}

async function removeItem(req, res) {
  const id = normalizeId(req.params.id);
  if (!id) return sendError(res, 400, "id invalido.");

  try {
    const [result] = await pool.execute("DELETE FROM itens_estoque WHERE id = ?;", [id]);
    if (!result.affectedRows) {
      return sendError(res, 404, "Item nao encontrado.");
    }
    return res.status(204).send();
  } catch (error) {
    return sendError(res, 500, error?.message || "Erro ao remover item.");
  }
}

module.exports = {
  list,
  listCategories,
  createCategory,
  updateCategory,
  removeCategory,
  createItem,
  updateItem,
  removeItem,
};
