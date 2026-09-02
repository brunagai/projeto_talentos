-- Pilar 1: dados de referência (competências e cargos de matchmaking)
-- Depende de: 001_initial_schema.sql

-- ---------------------------------------------------------------------------
-- Competências (20)
-- ---------------------------------------------------------------------------
INSERT INTO competencias (nome, tipo, ordem) VALUES
    ('Aprendizagem autodirigida e contínua', 'hard', 1),
    ('Gestão de Processos', 'hard', 2),
    ('Metodologia Ágil', 'hard', 3),
    ('Gestão de projetos', 'hard', 4),
    ('Excel', 'hard', 5),
    ('SQL', 'hard', 6),
    ('Databricks', 'hard', 7),
    ('Python', 'hard', 8),
    ('Machine Learning', 'hard', 9),
    ('Postgree', 'hard', 10),
    ('IA Gen', 'hard', 11),
    ('Prompt engineering', 'hard', 12),
    ('Ética', 'soft', 13),
    ('Pensamento crítico', 'soft', 14),
    ('Relacionamento interpessoal', 'soft', 15),
    ('Comunicação (escuta ativa e oratória)', 'soft', 16),
    ('Resolução de problemas', 'soft', 17),
    ('Gestão de tempo', 'soft', 18),
    ('Inteligência Emocional', 'soft', 19),
    ('Empatia', 'soft', 20)
ON CONFLICT (nome) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Cargos de referência (16) — pesos em JSONB + tabela normalizada
-- ---------------------------------------------------------------------------
INSERT INTO cargos_referencia (nome, area, pesos) VALUES
(
    'Engenheiro(a) de Software',
    'Engenharia de Software',
    '{"Aprendizagem autodirigida e contínua":4,"Gestão de Processos":3,"Metodologia Ágil":4,"Gestão de projetos":3,"Excel":2,"SQL":5,"Databricks":2,"Python":5,"Machine Learning":2,"Postgree":5,"IA Gen":3,"Prompt engineering":3,"Ética":5,"Pensamento crítico":5,"Relacionamento interpessoal":3,"Comunicação (escuta ativa e oratória)":3,"Resolução de problemas":5,"Gestão de tempo":4,"Inteligência Emocional":3,"Empatia":3}'::jsonb
),
(
    'Cientista de Dados',
    'Ciência de Dados e IA',
    '{"Aprendizagem autodirigida e contínua":5,"Gestão de Processos":3,"Metodologia Ágil":3,"Gestão de projetos":3,"Excel":3,"SQL":5,"Databricks":4,"Python":5,"Machine Learning":5,"Postgree":4,"IA Gen":5,"Prompt engineering":4,"Ética":5,"Pensamento crítico":5,"Relacionamento interpessoal":3,"Comunicação (escuta ativa e oratória)":4,"Resolução de problemas":5,"Gestão de tempo":4,"Inteligência Emocional":4,"Empatia":3}'::jsonb
),
(
    'Engenheiro(a) de Dados',
    'Engenharia de Dados',
    '{"Aprendizagem autodirigida e contínua":4,"Gestão de Processos":3,"Metodologia Ágil":3,"Gestão de projetos":3,"Excel":3,"SQL":5,"Databricks":5,"Python":5,"Machine Learning":3,"Postgree":5,"IA Gen":3,"Prompt engineering":3,"Ética":5,"Pensamento crítico":4,"Relacionamento interpessoal":3,"Comunicação (escuta ativa e oratória)":3,"Resolução de problemas":5,"Gestão de tempo":4,"Inteligência Emocional":3,"Empatia":3}'::jsonb
),
(
    'Gerente de Projetos / Project Manager',
    'Gestão de Projetos',
    '{"Aprendizagem autodirigida e contínua":4,"Gestão de Processos":5,"Metodologia Ágil":5,"Gestão de projetos":5,"Excel":4,"SQL":1,"Databricks":1,"Python":1,"Machine Learning":1,"Postgree":1,"IA Gen":2,"Prompt engineering":2,"Ética":5,"Pensamento crítico":4,"Relacionamento interpessoal":5,"Comunicação (escuta ativa e oratória)":5,"Resolução de problemas":4,"Gestão de tempo":5,"Inteligência Emocional":5,"Empatia":4}'::jsonb
),
(
    'Analista de Processos e Operações',
    'Gestão de Processos e Operações',
    '{"Aprendizagem autodirigida e contínua":3,"Gestão de Processos":5,"Metodologia Ágil":4,"Gestão de projetos":4,"Excel":5,"SQL":2,"Databricks":1,"Python":1,"Machine Learning":1,"Postgree":1,"IA Gen":2,"Prompt engineering":2,"Ética":5,"Pensamento crítico":4,"Relacionamento interpessoal":4,"Comunicação (escuta ativa e oratória)":4,"Resolução de problemas":5,"Gestão de tempo":5,"Inteligência Emocional":4,"Empatia":4}'::jsonb
),
(
    'Analista de Dados / BI',
    'Análise de Dados e BI',
    '{"Aprendizagem autodirigida e contínua":4,"Gestão de Processos":3,"Metodologia Ágil":3,"Gestão de projetos":3,"Excel":5,"SQL":5,"Databricks":3,"Python":4,"Machine Learning":2,"Postgree":4,"IA Gen":3,"Prompt engineering":3,"Ética":5,"Pensamento crítico":5,"Relacionamento interpessoal":4,"Comunicação (escuta ativa e oratória)":4,"Resolução de problemas":5,"Gestão de tempo":4,"Inteligência Emocional":4,"Empatia":3}'::jsonb
),
(
    'Analista de Negócios (Business Analyst)',
    'Análise de Negócios',
    '{"Aprendizagem autodirigida e contínua":4,"Gestão de Processos":4,"Metodologia Ágil":4,"Gestão de projetos":4,"Excel":4,"SQL":3,"Databricks":1,"Python":2,"Machine Learning":1,"Postgree":2,"IA Gen":3,"Prompt engineering":3,"Ética":5,"Pensamento crítico":5,"Relacionamento interpessoal":5,"Comunicação (escuta ativa e oratória)":5,"Resolução de problemas":5,"Gestão de tempo":4,"Inteligência Emocional":4,"Empatia":4}'::jsonb
),
(
    'Scrum Master / Agile Coach',
    'Agilidade e Facilitação',
    '{"Aprendizagem autodirigida e contínua":4,"Gestão de Processos":4,"Metodologia Ágil":5,"Gestão de projetos":5,"Excel":3,"SQL":1,"Databricks":1,"Python":1,"Machine Learning":1,"Postgree":1,"IA Gen":2,"Prompt engineering":2,"Ética":5,"Pensamento crítico":4,"Relacionamento interpessoal":5,"Comunicação (escuta ativa e oratória)":5,"Resolução de problemas":4,"Gestão de tempo":5,"Inteligência Emocional":5,"Empatia":5}'::jsonb
),
(
    'Especialista em People Operations / HRBP',
    'Desenvolvimento Organizacional',
    '{"Aprendizagem autodirigida e contínua":4,"Gestão de Processos":4,"Metodologia Ágil":3,"Gestão de projetos":4,"Excel":4,"SQL":1,"Databricks":1,"Python":1,"Machine Learning":1,"Postgree":1,"IA Gen":2,"Prompt engineering":2,"Ética":5,"Pensamento crítico":4,"Relacionamento interpessoal":5,"Comunicação (escuta ativa e oratória)":5,"Resolução de problemas":4,"Gestão de tempo":4,"Inteligência Emocional":5,"Empatia":5}'::jsonb
),
(
    'DevRel / Mentor(a) Técnico(a)',
    'Suporte Técnico e Mentoria',
    '{"Aprendizagem autodirigida e contínua":5,"Gestão de Processos":3,"Metodologia Ágil":4,"Gestão de projetos":3,"Excel":3,"SQL":3,"Databricks":2,"Python":4,"Machine Learning":2,"Postgree":3,"IA Gen":4,"Prompt engineering":4,"Ética":5,"Pensamento crítico":4,"Relacionamento interpessoal":5,"Comunicação (escuta ativa e oratória)":5,"Resolução de problemas":4,"Gestão de tempo":4,"Inteligência Emocional":5,"Empatia":5}'::jsonb
),
(
    'Analista Administrativo / Financeiro',
    'Operações Administrativas',
    '{"Aprendizagem autodirigida e contínua":3,"Gestão de Processos":4,"Metodologia Ágil":2,"Gestão de projetos":3,"Excel":5,"SQL":1,"Databricks":1,"Python":1,"Machine Learning":1,"Postgree":1,"IA Gen":1,"Prompt engineering":1,"Ética":5,"Pensamento crítico":4,"Relacionamento interpessoal":4,"Comunicação (escuta ativa e oratória)":4,"Resolução de problemas":4,"Gestão de tempo":5,"Inteligência Emocional":4,"Empatia":3}'::jsonb
),
(
    'Administrador(a) de Banco de Dados (DBA)',
    'Infraestrutura de Dados',
    '{"Aprendizagem autodirigida e contínua":4,"Gestão de Processos":3,"Metodologia Ágil":2,"Gestão de projetos":2,"Excel":3,"SQL":5,"Databricks":4,"Python":3,"Machine Learning":1,"Postgree":5,"IA Gen":1,"Prompt engineering":1,"Ética":5,"Pensamento crítico":4,"Relacionamento interpessoal":3,"Comunicação (escuta ativa e oratória)":3,"Resolução de problemas":5,"Gestão de tempo":4,"Inteligência Emocional":3,"Empatia":2}'::jsonb
),
(
    'Analista de Segurança e Compliance',
    'Segurança e Compliance',
    '{"Aprendizagem autodirigida e contínua":4,"Gestão de Processos":4,"Metodologia Ágil":3,"Gestão de projetos":3,"Excel":4,"SQL":3,"Databricks":2,"Python":2,"Machine Learning":1,"Postgree":3,"IA Gen":2,"Prompt engineering":2,"Ética":5,"Pensamento crítico":5,"Relacionamento interpessoal":4,"Comunicação (escuta ativa e oratória)":4,"Resolução de problemas":5,"Gestão de tempo":4,"Inteligência Emocional":4,"Empatia":3}'::jsonb
),
(
    'Engenheiro(a) de Prompts / Especialista em LLMs',
    'Inteligência Artificial',
    '{"Aprendizagem autodirigida e contínua":5,"Gestão de Processos":3,"Metodologia Ágil":3,"Gestão de projetos":2,"Excel":3,"SQL":3,"Databricks":2,"Python":4,"Machine Learning":3,"Postgree":2,"IA Gen":5,"Prompt engineering":5,"Ética":5,"Pensamento crítico":5,"Relacionamento interpessoal":3,"Comunicação (escuta ativa e oratória)":4,"Resolução de problemas":5,"Gestão de tempo":4,"Inteligência Emocional":4,"Empatia":3}'::jsonb
),
(
    'Especialista em Gestão de Mudança',
    'Gestão de Mudança',
    '{"Aprendizagem autodirigida e contínua":4,"Gestão de Processos":5,"Metodologia Ágil":4,"Gestão de projetos":5,"Excel":3,"SQL":1,"Databricks":1,"Python":1,"Machine Learning":1,"Postgree":1,"IA Gen":2,"Prompt engineering":2,"Ética":5,"Pensamento crítico":4,"Relacionamento interpessoal":5,"Comunicação (escuta ativa e oratória)":5,"Resolução de problemas":4,"Gestão de tempo":4,"Inteligência Emocional":5,"Empatia":5}'::jsonb
),
(
    'Analista de Treinamento e Desenvolvimento (L&D)',
    'Educação Corporativa',
    '{"Aprendizagem autodirigida e contínua":5,"Gestão de Processos":4,"Metodologia Ágil":3,"Gestão de projetos":4,"Excel":4,"SQL":1,"Databricks":1,"Python":1,"Machine Learning":1,"Postgree":1,"IA Gen":3,"Prompt engineering":3,"Ética":5,"Pensamento crítico":4,"Relacionamento interpessoal":5,"Comunicação (escuta ativa e oratória)":5,"Resolução de problemas":4,"Gestão de tempo":4,"Inteligência Emocional":5,"Empatia":5}'::jsonb
)
ON CONFLICT (nome) DO NOTHING;

-- Popula cargo_competencia_pesos a partir do JSONB de cada cargo
INSERT INTO cargo_competencia_pesos (cargo_id, competencia_id, peso)
SELECT
    c.id,
    comp.id,
    (c.pesos ->> comp.nome)::smallint
FROM cargos_referencia c
CROSS JOIN competencias comp
WHERE c.pesos ? comp.nome
ON CONFLICT (cargo_id, competencia_id) DO NOTHING;
