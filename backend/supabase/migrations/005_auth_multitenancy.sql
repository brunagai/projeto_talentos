-- Pilar 6: Autenticação, papéis e multi-tenancy (organizações)

-- ---------------------------------------------------------------------------
-- Organizações (consultorias / empresas clientes)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizacoes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER organizacoes_set_updated_at
    BEFORE UPDATE ON organizacoes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Vínculo de turmas com organização
-- ---------------------------------------------------------------------------
ALTER TABLE turmas
    ADD COLUMN IF NOT EXISTS organizacao_id UUID REFERENCES organizacoes(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_turmas_organizacao ON turmas (organizacao_id);

-- Permite turmas com mesmo nome em organizações diferentes
ALTER TABLE turmas DROP CONSTRAINT IF EXISTS turmas_nome_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_turmas_organizacao_nome
    ON turmas (organizacao_id, nome);

-- Organização padrão e backfill da turma existente
INSERT INTO organizacoes (nome, slug)
VALUES ('Cobra Coral Consultoria', 'cobra-coral')
ON CONFLICT (slug) DO NOTHING;

UPDATE turmas
SET organizacao_id = (SELECT id FROM organizacoes WHERE slug = 'cobra-coral' LIMIT 1)
WHERE organizacao_id IS NULL;

-- ---------------------------------------------------------------------------
-- Papéis de acesso
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'papel_usuario') THEN
        CREATE TYPE papel_usuario AS ENUM ('admin', 'recrutador', 'mentor', 'talento');
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Usuários da plataforma (integrável com Supabase Auth via auth_user_id)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT NOT NULL UNIQUE,
    senha_hash      TEXT NOT NULL,
    nome            TEXT NOT NULL,
    papel           papel_usuario NOT NULL,
    organizacao_id  UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
    turma_id        UUID REFERENCES turmas(id) ON DELETE SET NULL,
    talento_id      UUID REFERENCES talentos(id) ON DELETE SET NULL,
    auth_user_id    UUID UNIQUE,
    ativo           BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_organizacao ON usuarios (organizacao_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_turma ON usuarios (turma_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_papel ON usuarios (papel);

CREATE TRIGGER usuarios_set_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Usuários demo são criados pelo backend em runtime (garantir_usuarios_demo).
