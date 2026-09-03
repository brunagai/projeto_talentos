-- Pilar 4: avaliações formais do gestor (cruzamento com autopercepção)

CREATE TABLE IF NOT EXISTS avaliacoes_gestor (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    turma_id                UUID NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
    talento_id              UUID NOT NULL REFERENCES talentos(id) ON DELETE CASCADE,
    avaliacao_semanal_id    UUID REFERENCES avaliacoes_semanais(id) ON DELETE SET NULL,
    semana_numero           INTEGER NOT NULL CHECK (semana_numero > 0),
    gestor_nome             TEXT,
    hard_skills             JSONB NOT NULL DEFAULT '{}'::jsonb,
    soft_skills             JSONB NOT NULL DEFAULT '{}'::jsonb,
    media_tecnica           DOUBLE PRECISION,
    media_socioemocional    DOUBLE PRECISION,
    feedback_performance    TEXT,
    alinhamento_cultural    TEXT,
    pontos_desenvolvimento  TEXT,
    pontos_fortes           TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (talento_id, semana_numero)
);

CREATE INDEX IF NOT EXISTS idx_avaliacoes_gestor_talento_semana
    ON avaliacoes_gestor (talento_id, semana_numero);

CREATE INDEX IF NOT EXISTS idx_avaliacoes_gestor_turma
    ON avaliacoes_gestor (turma_id);

CREATE TRIGGER avaliacoes_gestor_set_updated_at
    BEFORE UPDATE ON avaliacoes_gestor
    FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

COMMENT ON TABLE avaliacoes_gestor IS
    'Avaliação formal da liderança para cruzamento com autopercepção semanal';
