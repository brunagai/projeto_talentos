-- Pilar 3: links de projeto/portfólio e LinkedIn nas avaliações semanais

ALTER TABLE avaliacoes_semanais
    ADD COLUMN IF NOT EXISTS link_projeto TEXT,
    ADD COLUMN IF NOT EXISTS link_linkedin TEXT;

COMMENT ON COLUMN avaliacoes_semanais.link_projeto IS
    'URL do projeto, repositório ou portfólio entregue na semana';

COMMENT ON COLUMN avaliacoes_semanais.link_linkedin IS
    'URL do perfil LinkedIn do estagiário';
