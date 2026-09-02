"""Matriz de pesos ideais (1–5) por cargo e competência."""

from __future__ import annotations

from dataclasses import dataclass

SKILL_KEYS: tuple[str, ...] = (
    "Aprendizagem autodirigida e contínua",
    "Gestão de Processos",
    "Metodologia Ágil",
    "Gestão de projetos",
    "Excel",
    "SQL",
    "Databricks",
    "Python",
    "Machine Learning",
    "Postgree",
    "IA Gen",
    "Prompt engineering",
    "Ética",
    "Pensamento crítico",
    "Relacionamento interpessoal",
    "Comunicação (escuta ativa e oratória)",
    "Resolução de problemas",
    "Gestão de tempo",
    "Inteligência Emocional",
    "Empatia",
)

HARD_SKILL_KEYS: tuple[str, ...] = SKILL_KEYS[:12]
SOFT_SKILL_KEYS: tuple[str, ...] = SKILL_KEYS[12:]


@dataclass(frozen=True, slots=True)
class CargoPerfil:
    cargo: str
    area: str
    pesos: dict[str, int]


def _perfil(cargo: str, area: str, pesos: tuple[int, ...]) -> CargoPerfil:
    if len(pesos) != len(SKILL_KEYS):
        raise ValueError(f"Pesos inválidos para o cargo {cargo}")
    return CargoPerfil(
        cargo=cargo,
        area=area,
        pesos={skill: peso for skill, peso in zip(SKILL_KEYS, pesos, strict=True)},
    )


CARGOS_REFERENCIA: tuple[CargoPerfil, ...] = (
    _perfil(
        "Engenheiro(a) de Software",
        "Engenharia de Software",
        (4, 3, 4, 3, 2, 5, 2, 5, 2, 5, 3, 3, 5, 5, 3, 3, 5, 4, 3, 3),
    ),
    _perfil(
        "Cientista de Dados",
        "Ciência de Dados e IA",
        (5, 3, 3, 3, 3, 5, 4, 5, 5, 4, 5, 4, 5, 5, 3, 4, 5, 4, 4, 3),
    ),
    _perfil(
        "Engenheiro(a) de Dados",
        "Engenharia de Dados",
        (4, 3, 3, 3, 3, 5, 5, 5, 3, 5, 3, 3, 5, 4, 3, 3, 5, 4, 3, 3),
    ),
    _perfil(
        "Gerente de Projetos / Project Manager",
        "Gestão de Projetos",
        (4, 5, 5, 5, 4, 1, 1, 1, 1, 1, 2, 2, 5, 4, 5, 5, 4, 5, 5, 4),
    ),
    _perfil(
        "Analista de Processos e Operações",
        "Gestão de Processos e Operações",
        (3, 5, 4, 4, 5, 2, 1, 1, 1, 1, 2, 2, 5, 4, 4, 4, 5, 5, 4, 4),
    ),
    _perfil(
        "Analista de Dados / BI",
        "Análise de Dados e BI",
        (4, 3, 3, 3, 5, 5, 3, 4, 2, 4, 3, 3, 5, 5, 4, 4, 5, 4, 4, 3),
    ),
    _perfil(
        "Analista de Negócios (Business Analyst)",
        "Análise de Negócios",
        (4, 4, 4, 4, 4, 3, 1, 2, 1, 2, 3, 3, 5, 5, 5, 5, 5, 4, 4, 4),
    ),
    _perfil(
        "Scrum Master / Agile Coach",
        "Agilidade e Facilitação",
        (4, 4, 5, 5, 3, 1, 1, 1, 1, 1, 2, 2, 5, 4, 5, 5, 4, 5, 5, 5),
    ),
    _perfil(
        "Especialista em People Operations / HRBP",
        "Desenvolvimento Organizacional",
        (4, 4, 3, 4, 4, 1, 1, 1, 1, 1, 2, 2, 5, 4, 5, 5, 4, 4, 5, 5),
    ),
    _perfil(
        "DevRel / Mentor(a) Técnico(a)",
        "Suporte Técnico e Mentoria",
        (5, 3, 4, 3, 3, 3, 2, 4, 2, 3, 4, 4, 5, 4, 5, 5, 4, 4, 5, 5),
    ),
    _perfil(
        "Analista Administrativo / Financeiro",
        "Operações Administrativas",
        (3, 4, 2, 3, 5, 1, 1, 1, 1, 1, 1, 1, 5, 4, 4, 4, 4, 5, 4, 3),
    ),
    _perfil(
        "Administrador(a) de Banco de Dados (DBA)",
        "Infraestrutura de Dados",
        (4, 3, 2, 2, 3, 5, 4, 3, 1, 5, 1, 1, 5, 4, 3, 3, 5, 4, 3, 2),
    ),
    _perfil(
        "Analista de Segurança e Compliance",
        "Segurança e Compliance",
        (4, 4, 3, 3, 4, 3, 2, 2, 1, 3, 2, 2, 5, 5, 4, 4, 5, 4, 4, 3),
    ),
    _perfil(
        "Engenheiro(a) de Prompts / Especialista em LLMs",
        "Inteligência Artificial",
        (5, 3, 3, 2, 3, 3, 2, 4, 3, 2, 5, 5, 5, 5, 3, 4, 5, 4, 4, 3),
    ),
    _perfil(
        "Especialista em Gestão de Mudança",
        "Gestão de Mudança",
        (4, 5, 4, 5, 3, 1, 1, 1, 1, 1, 2, 2, 5, 4, 5, 5, 4, 4, 5, 5),
    ),
    _perfil(
        "Analista de Treinamento e Desenvolvimento (L&D)",
        "Educação Corporativa",
        (5, 4, 3, 4, 4, 1, 1, 1, 1, 1, 3, 3, 5, 4, 5, 5, 4, 4, 5, 5),
    ),
)

CARGOS_POR_NOME: dict[str, CargoPerfil] = {
    cargo.cargo: cargo for cargo in CARGOS_REFERENCIA
}
