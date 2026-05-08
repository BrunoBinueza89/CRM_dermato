const http = require("node:http");

const app = require("../app");
const { pool } = require("../connection");

async function fetchJson(url, options) {
  const response = await fetch(url, {
    ...(options || {}),
    headers: {
      "Content-Type": "application/json",
      ...((options && options.headers) || {}),
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      (payload && typeof payload === "object" && payload.message) ||
      (typeof payload === "string" && payload) ||
      `HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = address && typeof address === "object" ? address.port : null;
  assert(port, "Falha ao iniciar servidor local para smoke test.");

  const baseUrl = `http://localhost:${port}`;

  try {
    const health = await fetchJson(`${baseUrl}/health`);
    assert(health && health.status === "ok", "Health check falhou.");
    assert(health.database === "connected", "Banco nao conectado (health.database).");

    await fetchJson(`${baseUrl}/dashboard`);
    await fetchJson(`${baseUrl}/relatorios`);
    await fetchJson(`${baseUrl}/estoque`);

    const equipeList = await fetchJson(`${baseUrl}/equipe`);
    assert(Array.isArray(equipeList), "Equipe: retorno inesperado.");

    const equipePaged = await fetchJson(`${baseUrl}/equipe?page=1&pageSize=1`);
    assert(equipePaged && Array.isArray(equipePaged.data), "Equipe (paginado): retorno inesperado.");
    assert(equipePaged.pagination && equipePaged.pagination.page === 1, "Equipe (paginado): pagination.page incorreto.");

    const createdMember = await fetchJson(`${baseUrl}/equipe`, {
      method: "POST",
      body: JSON.stringify({
        nome: "Smoke Test Member",
        cargo: "Tester",
        email: null,
        telefone: null,
        especialidade: null,
        status: "ativo",
      }),
    });
    assert(createdMember?.id, "Equipe: falha ao criar membro.");

    const updatedMember = await fetchJson(`${baseUrl}/equipe/${createdMember.id}`, {
      method: "PUT",
      body: JSON.stringify({
        nome: "Smoke Test Member 2",
        cargo: "Tester",
        email: null,
        telefone: null,
        especialidade: null,
        status: "inativo",
      }),
    });
    assert(updatedMember?.status === "inativo", "Equipe: falha ao atualizar membro.");

    await fetchJson(`${baseUrl}/equipe/${createdMember.id}`, { method: "DELETE" });

    const categorias = await fetchJson(`${baseUrl}/estoque/categorias`);
    assert(Array.isArray(categorias) && categorias.length > 0, "Estoque: sem categorias.");

    const createdCategory = await fetchJson(`${baseUrl}/estoque/categorias`, {
      method: "POST",
      body: JSON.stringify({ nome: "Smoke Test Categoria", descricao: "Criada no smoke test" }),
    });
    assert(createdCategory?.id, "Estoque: falha ao criar categoria.");

    const updatedCategory = await fetchJson(`${baseUrl}/estoque/categorias/${createdCategory.id}`, {
      method: "PUT",
      body: JSON.stringify({ nome: "Smoke Test Categoria 2", descricao: "Atualizada no smoke test" }),
    });
    assert(updatedCategory?.nome === "Smoke Test Categoria 2", "Estoque: falha ao atualizar categoria.");

    const createdItem = await fetchJson(`${baseUrl}/estoque/itens`, {
      method: "POST",
      body: JSON.stringify({
        estoque_id: categorias[0].id,
        nome: "Smoke Test Item",
        unidade: "un",
        quantidade: 1,
        quantidade_minima: 0,
        custo_unitario: 1.23,
        validade: "2027-01-01",
      }),
    });
    assert(createdItem?.id, "Estoque: falha ao criar item.");

    await fetchJson(`${baseUrl}/estoque/itens/${createdItem.id}`, { method: "DELETE" });
    await fetchJson(`${baseUrl}/estoque/categorias/${createdCategory.id}`, { method: "DELETE" });

    const faturamento = await fetchJson(`${baseUrl}/faturamento`);
    assert(Array.isArray(faturamento?.invoices), "Faturamento: retorno inesperado.");

    const invoice = faturamento.invoices[0];
    assert(invoice?.id, "Faturamento: nenhuma fatura para testar.");

    const invoiceOriginal = await fetchJson(`${baseUrl}/faturamento/${invoice.id}`);
    await fetchJson(`${baseUrl}/faturamento/${invoice.id}`, {
      method: "PUT",
      body: JSON.stringify({ status: invoiceOriginal.status, valor_total: Number(invoiceOriginal.valor_total) + 1 }),
    });
    await fetchJson(`${baseUrl}/faturamento/${invoice.id}`, {
      method: "PUT",
      body: JSON.stringify({ status: invoiceOriginal.status, valor_total: invoiceOriginal.valor_total }),
    });

    const pacientesAtivos = await fetchJson(`${baseUrl}/pacientes?status=ativo`);
    assert(Array.isArray(pacientesAtivos) && pacientesAtivos.length > 0, "Pacientes: nenhum ativo para testar.");
    const paciente = pacientesAtivos[0];

    const pacientesPaged = await fetchJson(`${baseUrl}/pacientes?status=ativo&page=1&pageSize=1`);
    assert(pacientesPaged && Array.isArray(pacientesPaged.data), "Pacientes (paginado): retorno inesperado.");
    assert(pacientesPaged.pagination && pacientesPaged.pagination.page === 1, "Pacientes (paginado): pagination.page incorreto.");

    const tratamentosDoPaciente = await fetchJson(`${baseUrl}/tratamentos?paciente_id=${paciente.id}`);
    assert(Array.isArray(tratamentosDoPaciente) && tratamentosDoPaciente.length > 0, "Tratamentos: nenhum do paciente para testar.");
    const tratamentoDoPaciente = tratamentosDoPaciente[0];

    const createdInvoice = await fetchJson(`${baseUrl}/faturamento`, {
      method: "POST",
      body: JSON.stringify({
        paciente_id: paciente.id,
        tratamento_id: tratamentoDoPaciente.id,
        data_emissao: "2026-05-06",
        data_vencimento: "2026-05-20",
        valor_total: 123.45,
        status: "aberta",
        observacoes: "Criada no smoke test",
      }),
    });
    assert(createdInvoice?.id, "Faturamento: falha ao criar fatura.");
    await fetchJson(`${baseUrl}/faturamento/${createdInvoice.id}`, { method: "DELETE" });

    const consultas = await fetchJson(`${baseUrl}/consultas`);
    assert(Array.isArray(consultas), "Consultas: retorno inesperado.");
    const consulta = consultas[0];
    assert(consulta?.id, "Consultas: nenhuma consulta para testar.");

    await fetchJson(`${baseUrl}/consultas/${consulta.id}`, {
      method: "PUT",
      body: JSON.stringify({
        paciente_id: consulta.paciente_id,
        profissional_id: consulta.profissional_id,
        data_hora: String(consulta.data_hora).slice(0, 16),
        status: "cancelada",
        descricao: consulta.descricao,
        observacoes: consulta.observacoes,
      }),
    });

    const tratamentos = await fetchJson(`${baseUrl}/tratamentos`);
    assert(Array.isArray(tratamentos), "Tratamentos: retorno inesperado.");
    const tratamento = tratamentos.find((t) => t && t.id);
    assert(tratamento?.id, "Tratamentos: nenhum tratamento para testar.");

    await fetchJson(`${baseUrl}/tratamentos/${tratamento.id}`, {
      method: "PUT",
      body: JSON.stringify({
        paciente_id: tratamento.paciente_id,
        profissional_id: tratamento.profissional_id,
        nome: tratamento.nome,
        descricao: tratamento.descricao,
        data_inicio: tratamento.data_inicio ? String(tratamento.data_inicio).slice(0, 10) : null,
        data_fim: tratamento.data_fim ? String(tratamento.data_fim).slice(0, 10) : null,
        status: "concluido",
      }),
    });

    console.log("Smoke test OK.");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Smoke test falhou:", error?.message || error);
  process.exit(1);
});
