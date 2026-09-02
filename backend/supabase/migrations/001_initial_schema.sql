-- Pilar 1: Persistência de Dados — schema inicial da Plataforma Talentos
-- Execute no SQL Editor do Supabase ou via CLI de migrações.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Turmas (cohorts / programas de formação)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS turmas (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome        TEXT NOT NULL UNIQUE,
    descricao   TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Catálogo de competências (20 itens: 12 hard + 8 soft)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS competencias (
    id      SMALLSERIAL PRIMARY KEY,
    nome    TEXT NOT NULL UNIQUE,
    tipo    TEXT NOT NULL CHECK (tipo IN ('hard', 'soft')),
    ordem   SMALLINT NOT NULL UNIQUE
);

-- ---------------------------------------------------------------------------
-- Cargos de referência do mercado (matriz de matchmaking)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cargos_referencia (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome        TEXT NOT NULL UNIQUE,
    area        TEXT NOT NULL,
    pesos       JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pesos normalizados por competência (opcional, para consultas relacionais)
CREATE TABLE IF NOT EXISTS cargo_competencia_pesos (
    cargo_id        UUID NOT NULL REFERENCES cargos_referencia(id) ON DELETE CASCADE,
    competencia_id  SMALLINT NOT NULL REFERENCES competencias(id) ON DELETE CASCADE,
    peso            SMALLINT NOT NULL CHECK (peso BETWEEN 0 AND 5),
    PRIMARY KEY (cargo_id, competencia_id)
);

-- ---------------------------------------------------------------------------
-- Talentos (participantes)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS talentos (
    id              UUID PRIMARY KEY,
    turma_id        UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
    email           TEXT,
    nome            TEXT,
    hard_skills     JSONB NOT NULL DEFAULT '{}'::jsonb,
    soft_skills     JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (turma_id, email)
);

-- ---------------------------------------------------------------------------
-- Avaliações semanais completas (20 competências + campos qualitativos)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS avaliacoes_semanais (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    turma_id                    UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
    talento_id                  UUID NOT NULL REFERENCES talentos(id) ON DELETE CASCADE,
    semana_numero               INTEGER NOT NULL CHECK (semana_numero > 0),
    horas_dedicadas             DOUBLE PRECISION NOT NULL DEFAULT 0,
    autoavaliacao_tecnica       SMALLINT CHECK (autoavaliacao_tecnica BETWEEN 0 AND 5),
    autoavaliacao_socioemocional SMALLINT CHECK (autoavaliacao_socioemocional BETWEEN 0 AND 5),
    media_tecnica               DOUBLE PRECISION,
    media_socioemocional        DOUBLE PRECISION,
    fit_vaga                    DOUBLE PRECISION,
    hard_skills                 JSONB NOT NULL DEFAULT '{}'::jsonb,
    soft_skills                 JSONB NOT NULL DEFAULT '{}'::jsonb,
    feedback_case               TEXT,
    interdependencias           TEXT,
    ajustes_rota                TEXT,
    rituais_mentoria            TEXT,
    link_projeto                TEXT,
    link_linkedin               TEXT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (talento_id, semana_numero)
);

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_talentos_turma_id ON talentos (turma_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_turma_semana ON avaliacoes_semanais (turma_id, semana_numero);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_talento_id ON avaliacoes_semanais (talento_id);
CREATE INDEX IF NOT EXISTS idx_cargos_area ON cargos_referencia (area);

-- ---------------------------------------------------------------------------
-- Trigger genérico de updated_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER turmas_set_updated_at
    BEFORE UPDATE ON turmas
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER talentos_set_updated_at
    BEFORE UPDATE ON talentos
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER avaliacoes_set_updated_at
    BEFORE UPDATE ON avaliacoes_semanais
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER cargos_set_updated_at
    BEFORE UPDATE ON cargos_referencia
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ---------------------------------------------------------------------------
-- Turma padrão (compatível com uploads sem turma explícita)
-- ---------------------------------------------------------------------------
INSERT INTO turmas (nome, descricao)
VALUES ('Turma Padrão', 'Turma criada automaticamente para uploads sem cohort definido')
ON CONFLICT (nome) DO NOTHING;
