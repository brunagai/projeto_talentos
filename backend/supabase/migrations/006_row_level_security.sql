-- Pilar 6 / Auditoria P0: Row Level Security por organização e turma
-- O backend usa service_role (bypass de RLS). Estas políticas protegem acesso direto
-- via chave anon/authenticated do Supabase, usando claims JWT customizados.

-- ---------------------------------------------------------------------------
-- Helpers para claims JWT (organizacao_id, turma_id, papel, talento_id)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.jwt_claim(claim text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
    SELECT coalesce(
        current_setting('request.jwt.claims', true)::json ->> claim,
        ''
    );
$$;

CREATE OR REPLACE FUNCTION public.usuario_organizacao_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
    SELECT NULLIF(public.jwt_claim('organizacao_id'), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION public.usuario_turma_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
    SELECT NULLIF(public.jwt_claim('turma_id'), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION public.usuario_talento_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
    SELECT NULLIF(public.jwt_claim('talento_id'), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION public.usuario_papel()
RETURNS text
LANGUAGE sql
STABLE
AS $$
    SELECT public.jwt_claim('papel');
$$;

CREATE OR REPLACE FUNCTION public.turma_da_organizacao(turma uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM turmas t
        WHERE t.id = turma
          AND t.organizacao_id = public.usuario_organizacao_id()
    );
$$;

-- ---------------------------------------------------------------------------
-- Habilitar RLS nas tabelas multi-tenant
-- ---------------------------------------------------------------------------
ALTER TABLE organizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE talentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacoes_semanais ENABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacoes_gestor ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Políticas: organizações
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS organizacoes_select_own ON organizacoes;
CREATE POLICY organizacoes_select_own ON organizacoes
    FOR SELECT
    TO authenticated
    USING (id = public.usuario_organizacao_id());

-- ---------------------------------------------------------------------------
-- Políticas: turmas (isolamento por organização)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS turmas_org_isolation ON turmas;
CREATE POLICY turmas_org_isolation ON turmas
    FOR ALL
    TO authenticated
    USING (organizacao_id = public.usuario_organizacao_id())
    WITH CHECK (organizacao_id = public.usuario_organizacao_id());

-- ---------------------------------------------------------------------------
-- Políticas: talentos
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS talentos_org_staff ON talentos;
CREATE POLICY talentos_org_staff ON talentos
    FOR ALL
    TO authenticated
    USING (
        public.usuario_papel() IN ('admin', 'recrutador', 'mentor')
        AND public.turma_da_organizacao(turma_id)
    )
    WITH CHECK (
        public.usuario_papel() IN ('admin', 'recrutador', 'mentor')
        AND public.turma_da_organizacao(turma_id)
    );

DROP POLICY IF EXISTS talentos_self_read ON talentos;
CREATE POLICY talentos_self_read ON talentos
    FOR SELECT
    TO authenticated
    USING (
        public.usuario_papel() = 'talento'
        AND id = public.usuario_talento_id()
        AND public.turma_da_organizacao(turma_id)
    );

-- ---------------------------------------------------------------------------
-- Políticas: avaliações semanais
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS avaliacoes_semanais_org_staff ON avaliacoes_semanais;
CREATE POLICY avaliacoes_semanais_org_staff ON avaliacoes_semanais
    FOR ALL
    TO authenticated
    USING (
        public.usuario_papel() IN ('admin', 'recrutador', 'mentor')
        AND public.turma_da_organizacao(turma_id)
    )
    WITH CHECK (
        public.usuario_papel() IN ('admin', 'recrutador', 'mentor')
        AND public.turma_da_organizacao(turma_id)
    );

DROP POLICY IF EXISTS avaliacoes_semanais_self_read ON avaliacoes_semanais;
CREATE POLICY avaliacoes_semanais_self_read ON avaliacoes_semanais
    FOR SELECT
    TO authenticated
    USING (
        public.usuario_papel() = 'talento'
        AND talento_id = public.usuario_talento_id()
        AND public.turma_da_organizacao(turma_id)
    );

-- ---------------------------------------------------------------------------
-- Políticas: avaliações do gestor
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS avaliacoes_gestor_org_staff ON avaliacoes_gestor;
CREATE POLICY avaliacoes_gestor_org_staff ON avaliacoes_gestor
    FOR ALL
    TO authenticated
    USING (
        public.usuario_papel() IN ('admin', 'recrutador', 'mentor')
        AND public.turma_da_organizacao(turma_id)
    )
    WITH CHECK (
        public.usuario_papel() IN ('admin', 'recrutador', 'mentor')
        AND public.turma_da_organizacao(turma_id)
    );

DROP POLICY IF EXISTS avaliacoes_gestor_self_read ON avaliacoes_gestor;
CREATE POLICY avaliacoes_gestor_self_read ON avaliacoes_gestor
    FOR SELECT
    TO authenticated
    USING (
        public.usuario_papel() = 'talento'
        AND talento_id = public.usuario_talento_id()
        AND public.turma_da_organizacao(turma_id)
    );

-- ---------------------------------------------------------------------------
-- Políticas: usuários (mesma organização; cada um vê o próprio registro)
-- ---------------------------------------------------------------------------
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
