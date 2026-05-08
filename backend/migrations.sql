-- Clinica Dermato CRM - migrations.sql
-- Este script cria o banco e, em seguida, cria toda a estrutura de tabelas.

CREATE DATABASE IF NOT EXISTS clinica_dermato_crm2
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE clinica_dermato_crm2;

SET NAMES utf8mb4;
SET default_storage_engine = InnoDB;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE pacientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  telefone VARCHAR(20),
  data_nascimento DATE,
  observacoes TEXT,
  status ENUM('ativo','inativo') DEFAULT 'ativo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TABELA EQUIPE (OBRIGATORIA E CRITICA) - NAO ALTERAR
CREATE TABLE equipe (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  cargo VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  telefone VARCHAR(20),
  especialidade VARCHAR(255),
  status ENUM('ativo','inativo') DEFAULT 'ativo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tratamentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  paciente_id INT NOT NULL,
  profissional_id INT NOT NULL,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  data_inicio DATE,
  data_fim DATE,
  status ENUM('ativo','concluido','cancelado') DEFAULT 'ativo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tratamentos_paciente_id (paciente_id),
  INDEX idx_tratamentos_profissional_id (profissional_id),
  CONSTRAINT fk_tratamentos_paciente
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_tratamentos_profissional
    FOREIGN KEY (profissional_id) REFERENCES equipe(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sessoes_tratamento (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tratamento_id INT NOT NULL,
  data_hora DATETIME NOT NULL,
  status ENUM('agendada','realizada','cancelada') DEFAULT 'agendada',
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sessoes_tratamento_tratamento_id (tratamento_id),
  CONSTRAINT fk_sessoes_tratamento_tratamento
    FOREIGN KEY (tratamento_id) REFERENCES tratamentos(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE consultas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  paciente_id INT NOT NULL,
  profissional_id INT NOT NULL,
  data_hora DATETIME NOT NULL,
  status ENUM('agendada','realizada','cancelada') DEFAULT 'agendada',
  descricao VARCHAR(255),
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_consultas_paciente_id (paciente_id),
  INDEX idx_consultas_profissional_id (profissional_id),
  INDEX idx_consultas_data_hora (data_hora),
  CONSTRAINT fk_consultas_paciente
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_consultas_profissional
    FOREIGN KEY (profissional_id) REFERENCES equipe(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE faturamento (
  id INT AUTO_INCREMENT PRIMARY KEY,
  paciente_id INT NOT NULL,
  tratamento_id INT NOT NULL,
  data_emissao DATE NOT NULL,
  data_vencimento DATE,
  valor_total DECIMAL(10,2) NOT NULL,
  status ENUM('aberta','paga','cancelada') DEFAULT 'aberta',
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_faturamento_paciente_id (paciente_id),
  INDEX idx_faturamento_tratamento_id (tratamento_id),
  CONSTRAINT fk_faturamento_paciente
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_faturamento_tratamento
    FOREIGN KEY (tratamento_id) REFERENCES tratamentos(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE estoque (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE itens_estoque (
  id INT AUTO_INCREMENT PRIMARY KEY,
  estoque_id INT NOT NULL,
  nome VARCHAR(255) NOT NULL,
  unidade VARCHAR(50),
  quantidade DECIMAL(10,2) NOT NULL DEFAULT 0,
  quantidade_minima DECIMAL(10,2) DEFAULT 0,
  custo_unitario DECIMAL(10,2) DEFAULT 0,
  validade DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_itens_estoque_estoque_id (estoque_id),
  CONSTRAINT fk_itens_estoque_estoque
    FOREIGN KEY (estoque_id) REFERENCES estoque(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
