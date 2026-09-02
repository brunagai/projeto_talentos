"""Motor de matchmaking: compara talentos com perfis-alvo de cargos."""

from __future__ import annotations

import math
import unicodedata
from dataclasses import dataclass
from typing import Mapping, Protocol

from app.services.cargos_referencia import (
    CARGOS_REFERENCIA,
    HARD_SKILL_KEYS,
    SKILL_KEYS,
    CargoPerfil,
)


class MatchmakingError(ValueError):
    """Erro de validação do motor de matchmaking."""


class TalentoSkillsLike(Protocol):
    talento_id: str
    hard_skills: Mapping[str, int]
    soft_skills: Mapping[str, int]
    email: str | None
    nome: str | None


@dataclass(frozen=True, slots=True)
class CompetenciaComparacao:
    competencia: str
    tipo: str
    nota_candidato: int
    peso_exigido: int
    atende_corte: bool
    gap: int


@dataclass(frozen=True, slots=True)
class MatchResultado:
    talento_id: str
    nome: str | None
    email: str | None
    cargo_alvo: str
    area: str
    fit_percentual: float
    similaridade_cosseno: float
    competencias_atendem: list[CompetenciaComparacao]
    competencias_desenvolvimento: list[CompetenciaComparacao]


def _normalize(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    without_accents = "".join(
        character for character in normalized if not unicodedata.combining(character)
    )
    return " ".join(without_accents.strip().lower().split())


def listar_cargos() -> list[CargoPerfil]:
    return list(CARGOS_REFERENCIA)


def resolver_cargo(cargo_alvo: str) -> CargoPerfil:
    chave = _normalize(cargo_alvo)
    for cargo in CARGOS_REFERENCIA:
        if _normalize(cargo.cargo) == chave:
            return cargo
        if chave in _normalize(cargo.cargo):
            return cargo

    disponiveis = ", ".join(c.cargo for c in CARGOS_REFERENCIA)
    raise MatchmakingError(
        f"Cargo '{cargo_alvo}' não encontrado. Cargos disponíveis: {disponiveis}"
    )


def _nota_candidato(
    hard_skills: Mapping[str, int],
    soft_skills: Mapping[str, int],
    competencia: str,
) -> int:
    if competencia in hard_skills:
        return int(hard_skills[competencia])
    if competencia in soft_skills:
        return int(soft_skills[competencia])

    # Match por nome normalizado
    alvo = _normalize(competencia)
    for origem in (hard_skills, soft_skills):
        for nome, nota in origem.items():
            if _normalize(nome) == alvo:
                return int(nota)
    return 0


def _vetor_candidato(
    hard_skills: Mapping[str, int],
    soft_skills: Mapping[str, int],
) -> list[float]:
    return [
        float(_nota_candidato(hard_skills, soft_skills, skill)) for skill in SKILL_KEYS
    ]


def _vetor_cargo(cargo: CargoPerfil) -> list[float]:
    return [float(cargo.pesos[skill]) for skill in SKILL_KEYS]


def _similaridade_cosseno(a: list[float], b: list[float]) -> float:
    produto = sum(x * y for x, y in zip(a, b, strict=True))
    norma_a = math.sqrt(sum(x * x for x in a))
    norma_b = math.sqrt(sum(y * y for y in b))
    if norma_a == 0 or norma_b == 0:
        return 0.0
    return produto / (norma_a * norma_b)


def _aderencia_percentual_ponderada(
    notas: list[float], pesos: list[float]
) -> float:
    """Aderência ponderada: min(nota/peso, 1) ponderada pelo peso exigido."""
    denominador = sum(pesos)
    if denominador <= 0:
        return 0.0

    numerador = 0.0
    for nota, peso in zip(notas, pesos, strict=True):
        if peso <= 0:
            continue
        numerador += min(nota / peso, 1.0) * peso
    return (numerador / denominador) * 100.0


def calcular_fit_cargo(
    hard_skills: Mapping[str, int],
    soft_skills: Mapping[str, int],
    cargo: CargoPerfil,
    *,
    talento_id: str,
    nome: str | None = None,
    email: str | None = None,
) -> MatchResultado:
    notas = _vetor_candidato(hard_skills, soft_skills)
    pesos = _vetor_cargo(cargo)
    fit_percentual = round(_aderencia_percentual_ponderada(notas, pesos), 2)
    cosseno = round(_similaridade_cosseno(notas, pesos), 4)

    atendem: list[CompetenciaComparacao] = []
    desenvolvimento: list[CompetenciaComparacao] = []

    for skill in SKILL_KEYS:
        nota = _nota_candidato(hard_skills, soft_skills, skill)
        exigido = cargo.pesos[skill]
        gap = max(0, exigido - nota)
        item = CompetenciaComparacao(
            competencia=skill,
            tipo="hard" if skill in HARD_SKILL_KEYS else "soft",
            nota_candidato=nota,
            peso_exigido=exigido,
            atende_corte=nota >= exigido,
            gap=gap,
        )
        if item.atende_corte:
            atendem.append(item)
        else:
            desenvolvimento.append(item)

    desenvolvimento.sort(key=lambda item: item.gap, reverse=True)

    return MatchResultado(
        talento_id=talento_id,
        nome=nome,
        email=email,
        cargo_alvo=cargo.cargo,
        area=cargo.area,
        fit_percentual=fit_percentual,
        similaridade_cosseno=cosseno,
        competencias_atendem=atendem,
        competencias_desenvolvimento=desenvolvimento,
    )


def rankear_talentos_por_cargo(
    talentos: list[TalentoSkillsLike],
    cargo_alvo: str,
) -> list[MatchResultado]:
    if not talentos:
        raise MatchmakingError("Nenhum talento informado para o matchmaking.")

    cargo = resolver_cargo(cargo_alvo)
    resultados = [
        calcular_fit_cargo(
            talento.hard_skills,
            talento.soft_skills,
            cargo,
            talento_id=talento.talento_id,
            nome=getattr(talento, "nome", None),
            email=getattr(talento, "email", None),
        )
        for talento in talentos
    ]
    resultados.sort(key=lambda item: item.fit_percentual, reverse=True)
    return resultados


def melhor_cargo_para_talento(
    hard_skills: Mapping[str, int],
    soft_skills: Mapping[str, int],
    *,
    talento_id: str,
    nome: str | None = None,
    email: str | None = None,
    top_n: int = 3,
) -> list[MatchResultado]:
    resultados = [
        calcular_fit_cargo(
            hard_skills,
            soft_skills,
            cargo,
            talento_id=talento_id,
            nome=nome,
            email=email,
        )
        for cargo in CARGOS_REFERENCIA
    ]
    resultados.sort(key=lambda item: item.fit_percentual, reverse=True)
    return resultados[: max(1, top_n)]
