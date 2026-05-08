-- Clinica Dermato CRM - seeders.sql
-- Execute este arquivo somente apos rodar o migrations.sql no banco correto.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM faturamento;
DELETE FROM consultas;
DELETE FROM sessoes_tratamento;
DELETE FROM tratamentos;
DELETE FROM itens_estoque;
DELETE FROM estoque;
DELETE FROM equipe;
DELETE FROM pacientes;

SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO pacientes (id, nome, email, telefone, data_nascimento, observacoes, status) VALUES
(1, 'Ana Carolina Mendes', 'ana.mendes@exemplo.com', '(11) 98811-1001', '1991-03-14', 'Acompanhamento para melasma e cuidados preventivos.', 'ativo'),
(2, 'Bruno Oliveira Costa', 'bruno.costa@exemplo.com', '(11) 98811-1002', '1986-07-22', 'Historico de acne adulta com sensibilidade a isotretinoina.', 'ativo'),
(3, 'Camila Ferreira Rocha', 'camila.rocha@exemplo.com', '(11) 98811-1003', '1994-10-05', 'Tratamento de manchas pos-inflamatorias.', 'ativo'),
(4, 'Daniela Almeida Prado', 'daniela.prado@exemplo.com', '(11) 98811-1004', '1979-12-18', 'Paciente em rotina de toxina botulinica e bioestimulador.', 'ativo'),
(5, 'Eduardo Nunes Ribeiro', 'eduardo.ribeiro@exemplo.com', '(11) 98811-1005', '1988-01-09', 'Controle de rosacea e skincare personalizado.', 'ativo'),
(6, 'Fernanda Lopes Teixeira', 'fernanda.teixeira@exemplo.com', '(11) 98811-1006', '1996-04-27', 'Queloide em acompanhamento apos procedimento cirurgico.', 'ativo'),
(7, 'Gabriel Martins Araujo', 'gabriel.araujo@exemplo.com', '(11) 98811-1007', '1983-08-11', 'Revisao anual de pintas e mapeamento corporal.', 'ativo'),
(8, 'Helena Barbosa Lima', 'helena.lima@exemplo.com', '(11) 98811-1008', '1990-06-03', 'Protocolo para rejuvenescimento facial.', 'ativo'),
(9, 'Igor Santos Pires', 'igor.pires@exemplo.com', '(11) 98811-1009', '1985-11-29', 'Paciente inativo apos alta clinica.', 'inativo'),
(10, 'Juliana Castro Freitas', 'juliana.freitas@exemplo.com', '(11) 98811-1010', '1998-09-16', 'Dermatite de contato com controle sazonal.', 'ativo'),
(11, 'Karina Monteiro Gomes', 'karina.gomes@exemplo.com', '(11) 98811-1011', '1975-02-24', 'Acompanhamento de alopecia androgenetica.', 'ativo'),
(12, 'Lucas Henrique Souza', 'lucas.souza@exemplo.com', '(11) 98811-1012', '1992-05-30', 'Protocolo de limpeza de pele e peeling seriado.', 'ativo');

INSERT INTO equipe (id, nome, cargo, email, telefone, especialidade, status) VALUES
(1, 'Dr. Joao Silva', 'Dermatologista', 'joao@clinica.com', '(11) 4002-1001', 'Dermatologia clinica', 'ativo'),
(2, 'Dra. Beatriz Ramos', 'Dermatologista', 'beatriz@clinica.com', '(11) 4002-1002', 'Dermatologia estetica', 'ativo'),
(3, 'Mariana Souza', 'Recepcionista', 'mariana@clinica.com', '(11) 4002-1003', 'Atendimento e agenda', 'inativo'),
(4, 'Paula Nogueira', 'Biomedica', 'paula@clinica.com', '(11) 4002-1004', 'Procedimentos faciais', 'ativo'),
(5, 'Renato Alves', 'Gerente financeiro', 'renato@clinica.com', '(11) 4002-1005', 'Faturamento e cobranca', 'ativo'),
(6, 'Clara Menezes', 'Enfermeira', 'clara@clinica.com', '(11) 4002-1006', 'Apoio assistencial', 'inativo');

INSERT INTO tratamentos (id, paciente_id, profissional_id, nome, descricao, data_inicio, data_fim, status) VALUES
(1, 1, 1, 'Protocolo Melasma Premium', 'Aplicacoes mensais com orientacao domiciliar e fotoprotecao.', '2026-01-10', '2026-04-10', 'ativo'),
(2, 2, 1, 'Controle de Acne Adulta', 'Peelings seriados e revisao medicamentosa.', '2026-01-18', '2026-05-20', 'ativo'),
(3, 4, 2, 'Rejuvenescimento Full Face', 'Bioestimulador associado a laser fracionado.', '2026-02-05', '2026-04-28', 'concluido'),
(4, 6, 4, 'Tratamento de Queloide', 'Infiltracoes e acompanhamento fotografico.', '2026-03-02', '2026-06-15', 'ativo'),
(5, 8, 2, 'Skin Booster Intensivo', 'Hidratacao profunda em sessoes quinzenais.', '2026-02-14', '2026-04-14', 'cancelado'),
(6, 11, 1, 'Protocolo Capilar', 'Sesssões com LED e aplicacao topica orientada.', '2026-01-25', '2026-05-25', 'ativo');

INSERT INTO sessoes_tratamento (tratamento_id, data_hora, status, observacoes) VALUES
(1, '2026-01-10 09:00:00', 'realizada', 'Boa resposta inicial ao clareador.'),
(1, '2026-02-10 09:00:00', 'realizada', 'Reducao visivel das manchas malares.'),
(1, '2026-03-10 09:00:00', 'agendada', 'Sessao de reforco com revisao de rotina.'),
(2, '2026-01-18 14:30:00', 'realizada', 'Pele mais oleosa em regiao T.'),
(2, '2026-02-08 14:30:00', 'realizada', 'Melhora parcial das lesoes inflamatorias.'),
(2, '2026-03-01 14:30:00', 'agendada', 'Nova avaliacao e ajuste de skincare.'),
(2, '2026-03-22 14:30:00', 'cancelada', 'Paciente reagendou por viagem.'),
(3, '2026-02-05 11:00:00', 'realizada', 'Aplicacao de bioestimulador concluida.'),
(3, '2026-03-05 11:00:00', 'realizada', 'Laser executado sem intercorrencias.'),
(3, '2026-04-02 11:00:00', 'realizada', 'Encerramento do protocolo.'),
(4, '2026-03-02 16:00:00', 'realizada', 'Queloide mais plano na reavaliacao.'),
(4, '2026-03-30 16:00:00', 'agendada', 'Reforco da infiltração.'),
(5, '2026-02-14 10:00:00', 'cancelada', 'Paciente optou por adiar tratamento.'),
(5, '2026-03-01 10:00:00', 'cancelada', 'Protocolo suspenso.'),
(6, '2026-01-25 08:30:00', 'realizada', 'Boa adesao ao protocolo capilar.'),
(6, '2026-02-25 08:30:00', 'realizada', 'Queda reduzida conforme relato.'),
(6, '2026-03-25 08:30:00', 'agendada', 'Sessao de continuidade.');

INSERT INTO consultas (id, paciente_id, profissional_id, data_hora, status, descricao, observacoes) VALUES
(1, 1, 1, '2026-04-01 09:00:00', 'realizada', 'Retorno melasma', 'Ajuste de clareador domiciliar.'),
(2, 2, 1, '2026-04-01 10:00:00', 'realizada', 'Avaliacao acne', 'Reduziu lesoes ativas.'),
(3, 3, 2, '2026-04-01 11:00:00', 'agendada', 'Consulta estetica', 'Primeira avaliacao.'),
(4, 4, 2, '2026-04-01 14:00:00', 'cancelada', 'Retorno bioestimulador', 'Paciente reagendou.'),
(5, 5, 1, '2026-04-02 09:30:00', 'realizada', 'Controle rosacea', 'Manter rotina calmante.'),
(6, 6, 4, '2026-04-02 10:30:00', 'agendada', 'Sessao queloide', 'Aguardando procedimento.'),
(7, 7, 1, '2026-04-02 11:30:00', 'realizada', 'Mapeamento corporal', 'Sem lesoes suspeitas.'),
(8, 8, 2, '2026-04-02 15:00:00', 'agendada', 'Skin booster', 'A confirmar anestesico topico.'),
(9, 9, 1, '2026-04-03 08:00:00', 'cancelada', 'Revisao alta clinica', 'Paciente nao compareceu.'),
(10, 10, 2, '2026-04-03 09:00:00', 'realizada', 'Dermatite de contato', 'Suspenso produto sensibilizante.'),
(11, 11, 1, '2026-04-03 10:00:00', 'agendada', 'Controle alopecia', 'Revisar exames.'),
(12, 12, 4, '2026-04-03 14:30:00', 'agendada', 'Peeling superficial', 'Orientada sobre cuidados pos.'),
(13, 1, 1, '2026-04-04 09:00:00', 'agendada', 'Revisao protocolo', 'Em observacao.'),
(14, 2, 1, '2026-04-04 10:00:00', 'agendada', 'Seguimento acne', 'Avaliar tolerancia.'),
(15, 3, 2, '2026-04-04 11:00:00', 'realizada', 'Consulta manchas', 'Indicado laser.'),
(16, 4, 2, '2026-04-05 09:00:00', 'realizada', 'Retorno rejuvenescimento', 'Satisfacao alta.'),
(17, 5, 1, '2026-04-05 10:00:00', 'agendada', 'Rosacea', 'Consulta de rotina.'),
(18, 6, 4, '2026-04-05 11:00:00', 'agendada', 'Queloide', 'Sessao de acompanhamento.'),
(19, 8, 2, '2026-04-05 14:00:00', 'cancelada', 'Skin booster', 'Reagendar apos viagem.'),
(20, 10, 2, '2026-04-06 09:30:00', 'agendada', 'Dermatite', 'Verificar resposta ao tratamento.'),
(21, 11, 1, '2026-04-06 10:30:00', 'realizada', 'Consulta capilar', 'Melhora discreta.'),
(22, 12, 4, '2026-04-06 15:00:00', 'agendada', 'Limpeza de pele', 'Paciente confirmou presenca.');

INSERT INTO faturamento (id, paciente_id, tratamento_id, data_emissao, data_vencimento, valor_total, status, observacoes) VALUES
(1, 1, 1, '2026-01-10', '2026-01-20', 850.00, 'paga', 'Pagamento via PIX.'),
(2, 2, 2, '2026-01-18', '2026-01-28', 620.00, 'paga', 'Cartao de credito.'),
(3, 4, 3, '2026-02-05', '2026-02-15', 1800.00, 'paga', 'Parcelado em duas vezes.'),
(4, 6, 4, '2026-03-02', '2026-03-12', 540.00, 'aberta', 'Primeira parcela pendente.'),
(5, 8, 5, '2026-02-14', '2026-02-24', 920.00, 'cancelada', 'Tratamento cancelado antes da execucao.'),
(6, 11, 6, '2026-01-25', '2026-02-04', 760.00, 'aberta', 'Aguardando quitacao do pacote.'),
(7, 1, 1, '2026-02-10', '2026-02-20', 430.00, 'paga', 'Sessao complementar.'),
(8, 2, 2, '2026-03-01', '2026-03-11', 310.00, 'aberta', 'Consulta de retorno em aberto.'),
(9, 4, 3, '2026-04-02', '2026-04-12', 450.00, 'paga', 'Encerramento do protocolo.'),
(10, 6, 4, '2026-03-30', '2026-04-09', 270.00, 'aberta', 'Sessao de reforco a vencer.'),
(11, 11, 6, '2026-02-25', '2026-03-07', 380.00, 'paga', 'Segunda sessao quitada.'),
(12, 11, 6, '2026-03-25', '2026-04-04', 380.00, 'aberta', 'Sessao futura agendada.');

INSERT INTO estoque (id, nome, descricao) VALUES
(1, 'Injetaveis', 'Materiais para procedimentos injetaveis e bioestimuladores.'),
(2, 'Descartaveis', 'Itens de uso unico para atendimento e assepsia.'),
(3, 'Skincare', 'Produtos dermocosmeticos para cabine e revenda.'),
(4, 'Equipamentos auxiliares', 'Materiais de apoio para procedimentos e limpeza.');

INSERT INTO itens_estoque (id, estoque_id, nome, unidade, quantidade, quantidade_minima, custo_unitario, validade) VALUES
(1, 1, 'Toxina botulinica 100U', 'frasco', 12.00, 4.00, 689.90, '2026-11-30'),
(2, 1, 'Bioestimulador de colageno', 'frasco', 3.00, 3.00, 420.00, '2026-09-15'),
(3, 1, 'Anestesico topico', 'tubo', 0.00, 2.00, 39.90, '2026-07-10'),
(4, 2, 'Luvas nitrilicas', 'caixa', 24.00, 8.00, 32.50, '2028-01-01'),
(5, 2, 'Touca descartavel', 'pacote', 5.00, 5.00, 18.00, '2027-06-01'),
(6, 2, 'Seringa 3ml', 'caixa', 2.00, 4.00, 27.40, '2028-04-20'),
(7, 3, 'Protetor solar FPS 70', 'unidade', 18.00, 6.00, 48.90, '2027-03-31'),
(8, 3, 'Serum clareador', 'unidade', 7.00, 4.00, 71.20, '2026-10-31'),
(9, 3, 'Gel de limpeza suave', 'unidade', 1.00, 3.00, 29.90, '2027-02-28'),
(10, 4, 'Escova de limpeza facial', 'unidade', 9.00, 2.00, 110.00, '2029-12-31'),
(11, 4, 'Mascara de LED', 'unidade', 2.00, 1.00, 1450.00, '2029-12-31'),
(12, 4, 'Cuba inox pequena', 'unidade', 6.00, 2.00, 68.00, '2029-12-31');
