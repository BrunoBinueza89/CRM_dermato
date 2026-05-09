const { pool } = require("../../connection");
const { sendError } = require("../utils/http");

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function formatDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function formatLabel(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
  }).format(date);
}

function safePercentChange(currentValue, previousValue) {
  const current = Number(currentValue || 0);
  const previous = Number(previousValue || 0);
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return 0;
  if (previous === 0) {
    if (current === 0) return 0;
    return 100;
  }
  return ((current - previous) / previous) * 100;
}

async function overview(req, res) {
  try {
    const [kpiRows] = await pool.query(
      `
SELECT
  (SELECT COUNT(*) FROM pacientes WHERE status = 'ativo') AS pacientesAtivos,
  (SELECT COUNT(*) FROM consultas WHERE DATE(data_hora) = CURDATE()) AS consultasHoje,
  (
    SELECT COUNT(*)
    FROM consultas
    WHERE data_hora >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      AND data_hora < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
      AND status = 'realizada'
  ) AS realizadasSemana,
  (
    SELECT COUNT(*)
    FROM consultas
    WHERE data_hora >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      AND data_hora < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
      AND status = 'cancelada'
  ) AS canceladasSemana
      `.trim()
    );

    const [monthlyRevenueRows] = await pool.query(
      `
SELECT
  (
    SELECT COALESCE(SUM(valor_total), 0)
    FROM faturamento
    WHERE status = 'paga'
      AND YEAR(data_emissao) = YEAR(CURDATE())
      AND MONTH(data_emissao) = MONTH(CURDATE())
  ) AS receitaMensal,
  (
    SELECT COALESCE(SUM(valor_total), 0)
    FROM faturamento
    WHERE status = 'paga'
      AND YEAR(data_emissao) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
      AND MONTH(data_emissao) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
  ) AS receitaMensalAnterior
      `.trim()
    );

    const [pendingTreatmentsRows] = await pool.query(
      `
SELECT
  (SELECT COUNT(*) FROM tratamentos WHERE status = 'ativo') AS tratamentosPendentes,
  (
    SELECT COUNT(*)
    FROM tratamentos
    WHERE status = 'ativo'
      AND created_at >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
  ) AS tratamentosNovosMes
      `.trim()
    );

    const [stockAlertsRows] = await pool.query(
      `
SELECT
  ie.id,
  ie.nome,
  ie.quantidade,
  ie.quantidade_minima
FROM itens_estoque ie
WHERE ie.quantidade <= COALESCE(ie.quantidade_minima, 0)
ORDER BY (ie.quantidade <= 0) DESC, ie.quantidade ASC, ie.id ASC
LIMIT 6;
      `.trim()
    );

    const [weeklyRows] = await pool.query(
      `
SELECT
  DATE(data_hora) AS dia,
  COUNT(*) AS total,
  SUM(CASE WHEN status = 'agendada' THEN 1 ELSE 0 END) AS agendadas,
  SUM(CASE WHEN status = 'realizada' THEN 1 ELSE 0 END) AS realizadas,
  SUM(CASE WHEN status = 'cancelada' THEN 1 ELSE 0 END) AS canceladas
FROM consultas
WHERE data_hora >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
  AND data_hora < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
GROUP BY DATE(data_hora)
ORDER BY dia ASC;
      `.trim()
    );

    const [todayAppointments] = await pool.query(
      `
SELECT
  c.id,
  c.data_hora,
  c.status,
  c.descricao,
  p.nome AS paciente_nome,
  e.nome AS profissional_nome
FROM consultas c
INNER JOIN pacientes p ON p.id = c.paciente_id
INNER JOIN equipe e ON e.id = c.profissional_id
WHERE DATE(c.data_hora) = CURDATE()
ORDER BY c.data_hora ASC;
      `.trim()
    );

    const [recentPatients] = await pool.query(
      `
SELECT
  id,
  nome,
  email,
  telefone,
  status,
  created_at
FROM pacientes
ORDER BY created_at DESC, id DESC
LIMIT 6;
      `.trim()
    );

    const weeklyMap = new Map(
      weeklyRows.map((row) => [
        formatDateKey(new Date(row.dia)),
        {
          total: Number(row.total || 0),
          agendadas: Number(row.agendadas || 0),
          realizadas: Number(row.realizadas || 0),
          canceladas: Number(row.canceladas || 0),
        },
      ])
    );

    const start = startOfToday();
    start.setDate(start.getDate() - 6);

    const weeklyAppointments = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);

      const key = formatDateKey(date);
      const values = weeklyMap.get(key) || {
        total: 0,
        agendadas: 0,
        realizadas: 0,
        canceladas: 0,
      };

      return {
        date: key,
        label: formatLabel(date),
        ...values,
      };
    });

    const receitaMensal = Number(monthlyRevenueRows[0]?.receitaMensal || 0);
    const receitaMensalAnterior = Number(monthlyRevenueRows[0]?.receitaMensalAnterior || 0);
    const receitaMensalDelta = safePercentChange(receitaMensal, receitaMensalAnterior);

    const tratamentosPendentes = Number(pendingTreatmentsRows[0]?.tratamentosPendentes || 0);
    const tratamentosNovosMes = Number(pendingTreatmentsRows[0]?.tratamentosNovosMes || 0);

    res.status(200).json({
      generatedAt: new Date().toISOString(),
      kpis: {
        pacientesAtivos: Number(kpiRows[0]?.pacientesAtivos || 0),
        consultasHoje: Number(kpiRows[0]?.consultasHoje || 0),
        realizadasSemana: Number(kpiRows[0]?.realizadasSemana || 0),
        canceladasSemana: Number(kpiRows[0]?.canceladasSemana || 0),
      },
      kpisV2: {
        consultasHoje: {
          value: Number(kpiRows[0]?.consultasHoje || 0),
          deltaPercent: null,
          periodLabel: "hoje",
        },
        receitaMensal: {
          value: receitaMensal,
          deltaPercent: Number.isFinite(receitaMensalDelta) ? Math.round(receitaMensalDelta * 10) / 10 : 0,
          periodLabel: "este mês",
        },
        tratamentosPendentes: {
          value: tratamentosPendentes,
          deltaPercent: null,
          periodLabel: "ativos",
          hint: tratamentosNovosMes > 0 ? `${tratamentosNovosMes} novos no último mês` : null,
        },
      },
      weeklyAppointments,
      todayAppointments: todayAppointments.map((item) => ({
        id: item.id,
        dateTime: item.data_hora,
        status: item.status,
        description: item.descricao,
        patientName: item.paciente_nome,
        professionalName: item.profissional_nome,
      })),
      recentPatients: recentPatients.map((item) => ({
        id: item.id,
        name: item.nome,
        email: item.email,
        phone: item.telefone,
        status: item.status,
        createdAt: item.created_at,
      })),
      stockAlerts: stockAlertsRows.map((item) => {
        const qty = Number(item.quantidade || 0);
        const min = Number(item.quantidade_minima || 0);
        const level = qty <= 0 ? "em_falta" : "baixo";

        return {
          id: item.id,
          name: item.nome,
          quantity: qty,
          minimum: min,
          level,
        };
      }),
    });
  } catch (error) {
    sendError(res, 500, "Erro ao carregar dashboard.", error?.message);
  }
}

module.exports = { overview };
