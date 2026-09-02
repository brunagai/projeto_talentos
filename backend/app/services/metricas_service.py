from collections.abc import Sequence
from dataclasses import dataclass

from app.models.avaliacao import AvaliacaoSemanalCreate


class MetricasCalculationError(ValueError):
    """Indica que não há dados suficientes para calcular métricas."""


@dataclass(frozen=True, slots=True)
class MetricasIndividuais:
    """Métricas sintéticas de uma única autoavaliação semanal."""

    media_tecnica: float
    media_socioemocional: float
    media_competencias: float


@dataclass(frozen=True, slots=True)
class MetricasAgregadas:
    """Métricas sintéticas consolidadas de múltiplas autoavaliações."""

    media_tecnica: float
    media_socioemocional: float
    media_competencias: float
    total_horas_dedicadas: float
    quantidade_avaliacoes: int


def _media_segura(valores: Sequence[float | int]) -> float:
    """Calcula a média aritmética ou levanta erro se a sequência estiver vazia."""
    if not valores:
        raise MetricasCalculationError(
            "Não é possível calcular a média: nenhum valor informado."
        )
    return sum(valores) / len(valores)


def calcular_metricas_individuais(
    avaliacao: AvaliacaoSemanalCreate,
) -> MetricasIndividuais:
    """Deriva métricas sintéticas a partir de uma autoavaliação semanal."""
    media_tecnica = float(avaliacao.autoavaliacao_tecnica)
    media_socioemocional = float(avaliacao.autoavaliacao_socioemocional)
    media_competencias = _media_segura(
        [avaliacao.autoavaliacao_tecnica, avaliacao.autoavaliacao_socioemocional]
    )

    return MetricasIndividuais(
        media_tecnica=media_tecnica,
        media_socioemocional=media_socioemocional,
        media_competencias=media_competencias,
    )


def calcular_metricas_agregadas(
    avaliacoes: Sequence[AvaliacaoSemanalCreate],
) -> MetricasAgregadas:
    """Consolida métricas sintéticas de um conjunto de autoavaliações semanais."""
    if not avaliacoes:
        raise MetricasCalculationError(
            "Não é possível calcular métricas agregadas: lista de avaliações vazia."
        )

    tecnicas = [avaliacao.autoavaliacao_tecnica for avaliacao in avaliacoes]
    socioemocionais = [
        avaliacao.autoavaliacao_socioemocional for avaliacao in avaliacoes
    ]
    medias_competencias = [
        _media_segura(
            [avaliacao.autoavaliacao_tecnica, avaliacao.autoavaliacao_socioemocional]
        )
        for avaliacao in avaliacoes
    ]

    return MetricasAgregadas(
        media_tecnica=_media_segura(tecnicas),
        media_socioemocional=_media_segura(socioemocionais),
        media_competencias=_media_segura(medias_competencias),
        total_horas_dedicadas=sum(avaliacao.horas_dedicadas for avaliacao in avaliacoes),
        quantidade_avaliacoes=len(avaliacoes),
    )


class MetricasService:
    """Utilitários para cálculo de métricas sintéticas de autoavaliações."""

    calcular_individuais = staticmethod(calcular_metricas_individuais)
    calcular_agregadas = staticmethod(calcular_metricas_agregadas)
