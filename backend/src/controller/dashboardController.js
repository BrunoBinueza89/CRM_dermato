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

    res.status(200).json({
      generatedAt: new Date().toISOString(),
      kpis: {
        pacientesAtivos: Number(kpiRows[0]?.pacientesAtivos || 0),
        consultasHoje: Number(kpiRows[0]?.consultasHoje || 0),
        realizadasSemana: Number(kpiRows[0]?.realizadasSemana || 0),
        canceladasSemana: Number(kpiRows[0]?.canceladasSemana || 0),
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
    });
  } catch (error) {
    sendError(res, 500, "Erro ao carregar dashboard.", error?.message);
  }
}

module.exports = { overview };
