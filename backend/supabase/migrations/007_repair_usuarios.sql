-- Reparo: recria tabela usuarios com schema esperado pela aplicação
-- Execute no SQL Editor do Supabase se o login falhar com usuários demo.

DROP TABLE IF EXISTS usuarios CASCADE;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'papel_usuario') THEN
        CREATE TYPE papel_usuario AS ENUM ('admin', 'recrutador', 'mentor', 'talento');
    END IF;
END $$;

CREATE TABLE usuarios (
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

CREATE INDEX idx_usuarios_organizacao ON usuarios (organizacao_id);
CREATE INDEX idx_usuarios_turma ON usuarios (turma_id);
CREATE INDEX idx_usuarios_papel ON usuarios (papel);

DROP TRIGGER IF EXISTS usuarios_set_updated_at ON usuarios;
CREATE TRIGGER usuarios_set_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS usuarios_self_read ON usuarios;
CREATE POLICY usuarios_self_read ON usuarios
    FOR SELECT
    TO authenticated
    USING (
        id = NULLIF(public.jwt_claim('sub'), '')::uuid
        AND organizacao_id = public.usuario_organizacao_id()
    );

DROP POLICY IF EXISTS usuarios_admin_org ON usuarios;
CREATE POLICY usuarios_admin_org ON usuarios
    FOR ALL
    TO authenticated
    USING (
        public.usuario_papel() = 'admin'
        AND organizacao_id = public.usuario_organizacao_id()
    )
    WITH CHECK (
        public.usuario_papel() = 'admin'
        AND organizacao_id = public.usuario_organizacao_id()
    );
