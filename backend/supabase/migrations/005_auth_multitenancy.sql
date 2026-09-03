-- Pilar 6: Autenticação, papéis e multi-tenancy (organizações)
-- Idempotente: seguro re-executar após falha parcial ou schema incompleto.
--
-- Se continuar falhando e NÃO houver dados importantes em usuarios/organizacoes:
--   DROP TABLE IF EXISTS usuarios CASCADE;
--   DROP TABLE IF EXISTS organizacoes CASCADE;
-- e execute este arquivo novamente do início.

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

ALTER TABLE organizacoes ADD COLUMN IF NOT EXISTS nome TEXT;
ALTER TABLE organizacoes ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE organizacoes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE organizacoes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

UPDATE organizacoes
SET nome = 'Cobra Coral Consultoria'
WHERE nome IS NULL OR trim(nome) = '';

UPDATE organizacoes
SET slug = 'cobra-coral'
WHERE slug IS NULL
  AND (nome ILIKE '%cobra%coral%' OR nome = 'Cobra Coral Consultoria');

UPDATE organizacoes
SET slug = lower(regexp_replace(trim(nome), '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL OR trim(slug) = '';

UPDATE organizacoes SET created_at = now() WHERE created_at IS NULL;
UPDATE organizacoes SET updated_at = now() WHERE updated_at IS NULL;

ALTER TABLE organizacoes ALTER COLUMN nome SET NOT NULL;
ALTER TABLE organizacoes ALTER COLUMN slug SET NOT NULL;
ALTER TABLE organizacoes ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE organizacoes ALTER COLUMN updated_at SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS organizacoes_slug_key ON organizacoes (slug);

DROP TRIGGER IF EXISTS organizacoes_set_updated_at ON organizacoes;
CREATE TRIGGER organizacoes_set_updated_at
    BEFORE UPDATE ON organizacoes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Vínculo de turmas com organização
-- ---------------------------------------------------------------------------
ALTER TABLE turmas
    ADD COLUMN IF NOT EXISTS organizacao_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'turmas_organizacao_id_fkey'
    ) THEN
        ALTER TABLE turmas
            ADD CONSTRAINT turmas_organizacao_id_fkey
            FOREIGN KEY (organizacao_id) REFERENCES organizacoes(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_turmas_organizacao ON turmas (organizacao_id);

ALTER TABLE turmas DROP CONSTRAINT IF EXISTS turmas_nome_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_turmas_organizacao_nome
    ON turmas (organizacao_id, nome);

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

-- Corrige tabela usuarios criada incompleta em execução anterior
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS senha_hash TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nome TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS papel papel_usuario;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS organizacao_id UUID;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS turma_id UUID;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS talento_id UUID;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS auth_user_id UUID;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE usuarios ALTER COLUMN id SET DEFAULT gen_random_uuid();

UPDATE usuarios SET ativo = true WHERE ativo IS NULL;
UPDATE usuarios SET created_at = now() WHERE created_at IS NULL;
UPDATE usuarios SET updated_at = now() WHERE updated_at IS NULL;

UPDATE usuarios
SET organizacao_id = (SELECT id FROM organizacoes WHERE slug = 'cobra-coral' LIMIT 1)
WHERE organizacao_id IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_organizacao_id_fkey'
    ) THEN
        ALTER TABLE usuarios
            ADD CONSTRAINT usuarios_organizacao_id_fkey
            FOREIGN KEY (organizacao_id) REFERENCES organizacoes(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_turma_id_fkey'
    ) THEN
        ALTER TABLE usuarios
            ADD CONSTRAINT usuarios_turma_id_fkey
            FOREIGN KEY (turma_id) REFERENCES turmas(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_talento_id_fkey'
    ) THEN
        ALTER TABLE usuarios
            ADD CONSTRAINT usuarios_talento_id_fkey
            FOREIGN KEY (talento_id) REFERENCES talentos(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_key ON usuarios (email);
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_auth_user_id_key ON usuarios (auth_user_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_organizacao ON usuarios (organizacao_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_turma ON usuarios (turma_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_papel ON usuarios (papel);

DROP TRIGGER IF EXISTS usuarios_set_updated_at ON usuarios;
CREATE TRIGGER usuarios_set_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Usuários demo: criar manualmente via `python -m scripts.seed_demo` (não no boot da API).
