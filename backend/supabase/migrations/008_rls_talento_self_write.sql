-- Políticas complementares para request path com RLS (Fase F).
-- Permite ao talento inserir/atualizar a própria autoavaliação semanal.

DROP POLICY IF EXISTS avaliacoes_semanais_self_write ON avaliacoes_semanais;
CREATE POLICY avaliacoes_semanais_self_write ON avaliacoes_semanais
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.usuario_papel() = 'talento'
        AND talento_id = public.usuario_talento_id()
        AND public.turma_da_organizacao(turma_id)
    );

DROP POLICY IF EXISTS avaliacoes_semanais_self_update ON avaliacoes_semanais;
CREATE POLICY avaliacoes_semanais_self_update ON avaliacoes_semanais
    FOR UPDATE
    TO authenticated
    USING (
        public.usuario_papel() = 'talento'
        AND talento_id = public.usuario_talento_id()
        AND public.turma_da_organizacao(turma_id)
    )
    WITH CHECK (
        public.usuario_papel() = 'talento'
        AND talento_id = public.usuario_talento_id()
        AND public.turma_da_organizacao(turma_id)
    );
