const { pool } = require("../../connection");
const { sendError } = require("../utils/http");

function normalizeMonth(value) {
  const text = value === undefined || value === null ? "" : String(value).trim();
  if (!text) return "";
  if (!/^\d{4}-\d{2}$/.test(text)) return "";
  return text;
}

function formatMonth(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(month) {
  const [year, mon] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "numeric",
  }).format(new Date(year, mon - 1, 1));
}

function buildMonthRange(baseMonth) {
  const [year, month] = baseMonth.split("-").map(Number);
  const baseDate = new Date(year, month - 1, 1);

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(baseDate.getFullYear(), baseDate.getMonth() - (5 - index), 1);
    const key = formatMonth(date);
    return { key, label: formatMonthLabel(key) };
  });
}

async function overview(req, res) {
  const requestedMonth = normalizeMonth(req.query.month);
  const currentMonth = formatMonth(new Date());
  const baseMonth = requestedMonth || currentMonth;

  if (req.query.month && !requestedMonth) {
    return sendError(res, 400, "month invalido. Use YYYY-MM.");
  }

  try {
    const [currentKpisRows] = await pool.execute(
      `
SELECT
  COUNT(*) AS totalFaturas,
  COALESCE(SUM(valor_total), 0) AS receitaTotal,
  COALESCE(SUM(CASE WHEN status = 'paga' THEN valor_total ELSE 0 END), 0) AS receitaPaga,
  COALESCE(SUM(CASE WHEN status = 'aberta' THEN valor_total ELSE 0 END), 0) AS receitaEmAberto,
  COALESCE(AVG(CASE WHEN status <> 'cancelada' THEN valor_total END), 0) AS ticketMedio
FROM faturamento
WHERE DATE_FORMAT(data_emissao, '%Y-%m') = ?;
      `.trim(),
      [baseMonth]
    );

    const previousDate = new Date(Number(baseMonth.slice(0, 4)), Number(baseMonth.slice(5, 7)) - 2, 1);
    const previousMonth = formatMonth(previousDate);

    const [comparisonRows] = await pool.execute(
      `
SELECT
  DATE_FORMAT(data_emissao, '%Y-%m') AS mes,
  COALESCE(SUM(valor_total), 0) AS receitaTotal,
  COALESCE(SUM(CASE WHEN status = 'paga' THEN valor_total ELSE 0 END), 0) AS receitaPaga
FROM faturamento
WHERE DATE_FORMAT(data_emissao, '%Y-%m') IN (?, ?)
GROUP BY DATE_FORMAT(data_emissao, '%Y-%m');
      `.trim(),
      [baseMonth, previousMonth]
    );

    const months = buildMonthRange(baseMonth);
    const [revenueRows] = await pool.execute(
      `
SELECT
  DATE_FORMAT(data_emissao, '%Y-%m') AS mes,
  COALESCE(SUM(valor_total), 0) AS receitaTotal,
  COALESCE(SUM(CASE WHEN status = 'paga' THEN valor_total ELSE 0 END), 0) AS receitaPaga,
  COALESCE(SUM(CASE WHEN status = 'aberta' THEN valor_total ELSE 0 END), 0) AS receitaEmAberto,
  COALESCE(SUM(CASE WHEN status = 'cancelada' THEN valor_total ELSE 0 END), 0) AS receitaCancelada
FROM faturamento
WHERE DATE_FORMAT(data_emissao, '%Y-%m') BETWEEN ? AND ?
GROUP BY DATE_FORMAT(data_emissao, '%Y-%m')
ORDER BY mes ASC;
      `.trim(),
      [months[0].key, months[months.length - 1].key]
    );

    const revenueMap = new Map(
      revenueRows.map((row) => [
        row.mes,
        {
          receitaTotal: Number(row.receitaTotal || 0),
          receitaPaga: Number(row.receitaPaga || 0),
          receitaEmAberto: Number(row.receitaEmAberto || 0),
          receitaCancelada: Number(row.receitaCancelada || 0),
        },
      ])
    );

    const comparisonMap = new Map(
      comparisonRows.map((row) => [
        row.mes,
        {
          receitaTotal: Number(row.receitaTotal || 0),
          receitaPaga: Number(row.receitaPaga || 0),
        },
      ])
    );

    const currentTotals = comparisonMap.get(baseMonth) || { receitaTotal: 0, receitaPaga: 0 };
    const previousTotals = comparisonMap.get(previousMonth) || { receitaTotal: 0, receitaPaga: 0 };

    const compare = (current, previous) => {
      if (!previous) return current ? 100 : 0;
      return Number((((current - previous) / previous) * 100).toFixed(2));
    };

    res.status(200).json({
      month: baseMonth,
      kpis: {
        totalFaturas: Number(currentKpisRows[0]?.totalFaturas || 0),
        receitaTotal: Number(currentKpisRows[0]?.receitaTotal || 0),
        receitaPaga: Number(currentKpisRows[0]?.receitaPaga || 0),
        receitaEmAberto: Number(currentKpisRows[0]?.receitaEmAberto || 0),
        ticketMedio: Number(currentKpisRows[0]?.ticketMedio || 0),
      },
      monthlyRevenue: months.map((monthItem) => ({
        month: monthItem.key,
        label: monthItem.label,
        receitaTotal: revenueMap.get(monthItem.key)?.receitaTotal || 0,
        receitaPaga: revenueMap.get(monthItem.key)?.receitaPaga || 0,
        receitaEmAberto: revenueMap.get(monthItem.key)?.receitaEmAberto || 0,
        receitaCancelada: revenueMap.get(monthItem.key)?.receitaCancelada || 0,
      })),
      monthComparison: {
        currentMonth: baseMonth,
        previousMonth,
        receitaTotalAtual: currentTotals.receitaTotal,
        receitaTotalAnterior: previousTotals.receitaTotal,
        receitaPagaAtual: currentTotals.receitaPaga,
        receitaPagaAnterior: previousTotals.receitaPaga,
        variacaoReceitaTotal: compare(currentTotals.receitaTotal, previousTotals.receitaTotal),
        variacaoReceitaPaga: compare(currentTotals.receitaPaga, previousTotals.receitaPaga),
      },
    });
  } catch (error) {
    sendError(res, 500, "Erro ao carregar relatorios.", error?.message);
  }
}

module.exports = { overview };
