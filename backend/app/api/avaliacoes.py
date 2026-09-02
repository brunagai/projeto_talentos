from typing import Literal, Union

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.models.avaliacao import AvaliacaoSemanalCreate
from app.services.metricas_service import MetricasCalculationError, MetricasService
from app.services.planilha_service import (
    PlanilhaProcessingError,
    SUPPORTED_EXTENSIONS,
    processar_planilha,
)
from app.services.talentos_store import TalentosStoreError, salvar_talentos

router = APIRouter(prefix="/avaliacoes", tags=["avaliacoes"])


class MetricasIndividuaisResponse(BaseModel):
    tipo: Literal["individual"] = "individual"
    media_tecnica: float
    media_socioemocional: float
    media_competencias: float


class MetricasAgregadasResponse(BaseModel):
    tipo: Literal["agregada"] = "agregada"
    media_tecnica: float
    media_socioemocional: float
    media_competencias: float
    total_horas_dedicadas: float
    quantidade_avaliacoes: int


class PerfilTalentoResponse(BaseModel):
    talento_id: str
    email: str | None = None
    nome: str | None = None
    semana_numero: int
    hard_skills: dict[str, int]
    soft_skills: dict[str, int]
    media_tecnica: float
    media_socioemocional: float
    fit_vaga: float
    feedback_case: str | None = None
    interdependencias: str | None = None
    ajustes_rota: str | None = None
    rituais_mentoria: str | None = None
    link_projeto: str | None = None
    link_linkedin: str | None = None


class UploadMetricasResponse(BaseModel):
    arquivo: str
    linhas_processadas: int
    linhas_com_erro: int
    erros: list[str]
    metricas: MetricasAgregadasResponse
    perfis: list[PerfilTalentoResponse]


MetricasResponse = Union[MetricasIndividuaisResponse, MetricasAgregadasResponse]


def _validar_extensao(nome_arquivo: str | None) -> str:
    if not nome_arquivo:
        raise HTTPException(status_code=400, detail="Nome do arquivo não informado.")

    extensao = nome_arquivo.lower()[nome_arquivo.rfind(".") :]
    if extensao not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Formato não suportado. Envie arquivos .csv ou .xlsx.",
        )
    return extensao


@router.post("/metricas", response_model=MetricasResponse)
def calcular_metricas(
    payload: AvaliacaoSemanalCreate | list[AvaliacaoSemanalCreate],
) -> MetricasResponse:
    """Calcula métricas sintéticas a partir de uma ou mais autoavaliações semanais."""
    try:
        if isinstance(payload, list):
            metricas = MetricasService.calcular_agregadas(payload)
            return MetricasAgregadasResponse(
                media_tecnica=metricas.media_tecnica,
                media_socioemocional=metricas.media_socioemocional,
                media_competencias=metricas.media_competencias,
                total_horas_dedicadas=metricas.total_horas_dedicadas,
                quantidade_avaliacoes=metricas.quantidade_avaliacoes,
            )

        metricas = MetricasService.calcular_individuais(payload)
        return MetricasIndividuaisResponse(
            media_tecnica=metricas.media_tecnica,
            media_socioemocional=metricas.media_socioemocional,
            media_competencias=metricas.media_competencias,
        )
    except MetricasCalculationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/upload", response_model=UploadMetricasResponse)
async def upload_avaliacoes(arquivo: UploadFile = File(...)) -> UploadMetricasResponse:
    """Recebe planilha CSV/XLSX, mapeia linhas e retorna métricas e perfis granulares."""
    _validar_extensao(arquivo.filename)
    conteudo = await arquivo.read()

    if not conteudo:
        raise HTTPException(status_code=400, detail="Arquivo enviado está vazio.")

    try:
        resultado = processar_planilha(arquivo.filename or "planilha", conteudo)
        metricas = MetricasService.calcular_agregadas(resultado.avaliacoes)
    except PlanilhaProcessingError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except MetricasCalculationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    perfis_response = [
        PerfilTalentoResponse(
            talento_id=perfil.talento_id,
            email=perfil.email,
            nome=perfil.nome,
            semana_numero=perfil.semana_numero,
            hard_skills=perfil.hard_skills,
            soft_skills=perfil.soft_skills,
            media_tecnica=perfil.media_tecnica,
            media_socioemocional=perfil.media_socioemocional,
            fit_vaga=perfil.fit_vaga,
            feedback_case=perfil.feedback_case,
            interdependencias=perfil.interdependencias,
            ajustes_rota=perfil.ajustes_rota,
            rituais_mentoria=perfil.rituais_mentoria,
            link_projeto=perfil.link_projeto,
            link_linkedin=perfil.link_linkedin,
        )
        for perfil in resultado.perfis
    ]

    avaliacoes_por_perfil = {
        (str(avaliacao.talento_id), avaliacao.semana_numero): avaliacao
        for avaliacao in resultado.avaliacoes
    }

    try:
        salvar_talentos(
            [
                {
                    "talento_id": perfil.talento_id,
                    "email": perfil.email,
                    "nome": perfil.nome,
                    "semana_numero": perfil.semana_numero,
                    "horas_dedicadas": (
                        avaliacoes_por_perfil[(perfil.talento_id, perfil.semana_numero)].horas_dedicadas
                        if (perfil.talento_id, perfil.semana_numero) in avaliacoes_por_perfil
                        else 0.0
                    ),
                    "autoavaliacao_tecnica": int(round(perfil.media_tecnica)),
                    "autoavaliacao_socioemocional": int(round(perfil.media_socioemocional)),
                    "media_tecnica": perfil.media_tecnica,
                    "media_socioemocional": perfil.media_socioemocional,
                    "fit_vaga": perfil.fit_vaga,
                    "hard_skills": perfil.hard_skills,
                    "soft_skills": perfil.soft_skills,
                    "feedback_case": perfil.feedback_case,
                    "interdependencias": perfil.interdependencias,
                    "ajustes_rota": perfil.ajustes_rota,
                    "rituais_mentoria": perfil.rituais_mentoria,
                    "link_projeto": perfil.link_projeto,
                    "link_linkedin": perfil.link_linkedin,
                }
                for perfil in resultado.perfis
            ]
        )
    except TalentosStoreError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return UploadMetricasResponse(
        arquivo=arquivo.filename or "planilha",
        linhas_processadas=resultado.linhas_processadas,
        linhas_com_erro=resultado.linhas_com_erro,
        erros=resultado.erros,
        metricas=MetricasAgregadasResponse(
            media_tecnica=metricas.media_tecnica,
            media_socioemocional=metricas.media_socioemocional,
            media_competencias=metricas.media_competencias,
            total_horas_dedicadas=metricas.total_horas_dedicadas,
            quantidade_avaliacoes=metricas.quantidade_avaliacoes,
        ),
        perfis=perfis_response,
    )
