from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.services.gestor_store import GestorStoreError, obter_comparativo_gestor
from app.services.pdi_service import PdiServiceError, gerar_pdi
from app.services.talentos_store import TalentosStoreError, listar_historico_talento

router = APIRouter(prefix="/talentos", tags=["talentos"])


class SemanaHistoricoResponse(BaseModel):
    semana_numero: int
    horas_dedicadas: float = 0
    media_tecnica: float | None = None
    media_socioemocional: float | None = None
    fit_vaga: float | None = None
    hard_skills: dict[str, int] = Field(default_factory=dict)
    soft_skills: dict[str, int] = Field(default_factory=dict)
    feedback_case: str | None = None
    interdependencias: str | None = None
    ajustes_rota: str | None = None
    rituais_mentoria: str | None = None
    link_projeto: str | None = None
    link_linkedin: str | None = None


class HistoricoTalentoResponse(BaseModel):
    talento_id: str
    nome: str | None = None
    email: str | None = None
    turma_id: str | None = None
    total_semanas: int
    series: list[SemanaHistoricoResponse]


@router.get("/{talento_id}/historico", response_model=HistoricoTalentoResponse)
def obter_historico_talento(
    talento_id: str,
    turma_id: str | None = Query(
        default=None,
        description="ID da turma. Se omitido, usa a turma padrão.",
    ),
) -> HistoricoTalentoResponse:
    """Retorna a série temporal de avaliações semanais de um talento."""
    try:
        historico = listar_historico_talento(talento_id, turma_id=turma_id)
    except TalentosStoreError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    if historico is None:
        raise HTTPException(status_code=404, detail="Talento não encontrado.")

    return HistoricoTalentoResponse(
        talento_id=historico["talento_id"],
        nome=historico.get("nome"),
        email=historico.get("email"),
        turma_id=historico.get("turma_id"),
        total_semanas=historico["total_semanas"],
        series=[
            SemanaHistoricoResponse(
                semana_numero=item["semana_numero"],
                horas_dedicadas=float(item.get("horas_dedicadas") or 0),
                media_tecnica=item.get("media_tecnica"),
                media_socioemocional=item.get("media_socioemocional"),
                fit_vaga=item.get("fit_vaga"),
                hard_skills=item.get("hard_skills") or {},
                soft_skills=item.get("soft_skills") or {},
                feedback_case=item.get("feedback_case"),
                interdependencias=item.get("interdependencias"),
                ajustes_rota=item.get("ajustes_rota"),
                rituais_mentoria=item.get("rituais_mentoria"),
                link_projeto=item.get("link_projeto"),
                link_linkedin=item.get("link_linkedin"),
            )
            for item in historico["series"]
        ],
    )


class PerspectivaResumo(BaseModel):
    hard_skills: dict[str, int] = Field(default_factory=dict)
    soft_skills: dict[str, int] = Field(default_factory=dict)
    media_tecnica: float | None = None
    media_socioemocional: float | None = None


class AutopercepcaoResumo(PerspectivaResumo):
    feedback_case: str | None = None
    interdependencias: str | None = None
    ajustes_rota: str | None = None
    rituais_mentoria: str | None = None


class AvaliacaoGestorResumo(PerspectivaResumo):
    id: str | None = None
    gestor_nome: str | None = None
    feedback_performance: str | None = None
    alinhamento_cultural: str | None = None
    pontos_desenvolvimento: str | None = None
    pontos_fortes: str | None = None


class CompetenciaComparativoResponse(BaseModel):
    competencia: str
    tipo: str
    nota_autopercepcao: int
    nota_gestor: int | None = None
    delta: int | None = None


class ComparativoResumoResponse(BaseModel):
    media_tecnica_autopercepcao: float
    media_socioemocional_autopercepcao: float
    media_tecnica_gestor: float | None = None
    media_socioemocional_gestor: float | None = None
    delta_media_tecnica: float | None = None
    delta_media_socioemocional: float | None = None
    taxa_convergencia_percentual: float | None = None
    total_competencias: int


class ComparativoGestorResponse(BaseModel):
    talento_id: str
    nome: str | None = None
    email: str | None = None
    semana_numero: int
    autopercepcao: AutopercepcaoResumo
    avaliacao_gestor: AvaliacaoGestorResumo | None = None
    competencias: list[CompetenciaComparativoResponse]
    resumo: ComparativoResumoResponse


@router.get("/{talento_id}/comparativo-gestor", response_model=ComparativoGestorResponse)
def comparativo_gestor(
    talento_id: str,
    semana_numero: int = Query(..., ge=1),
    turma_id: str | None = Query(
        default=None,
        description="ID da turma. Se omitido, usa a turma padrão.",
    ),
) -> ComparativoGestorResponse:
    """Cruza autopercepção do estagiário com a avaliação formal do gestor."""
    try:
        comparativo = obter_comparativo_gestor(
            talento_id,
            semana_numero,
            turma_id=turma_id,
        )
    except GestorStoreError as exc:
        status = 404 if "não encontrado" in str(exc).lower() else 503
        raise HTTPException(status_code=status, detail=str(exc)) from exc

    gestor = comparativo.get("avaliacao_gestor")
    return ComparativoGestorResponse(
        talento_id=comparativo["talento_id"],
        nome=comparativo.get("nome"),
        email=comparativo.get("email"),
        semana_numero=comparativo["semana_numero"],
        autopercepcao=AutopercepcaoResumo(**comparativo["autopercepcao"]),
        avaliacao_gestor=AvaliacaoGestorResumo(**gestor) if gestor else None,
        competencias=[
            CompetenciaComparativoResponse(**item)
            for item in comparativo["competencias"]
        ],
        resumo=ComparativoResumoResponse(**comparativo["resumo"]),
    )


class AcaoPdiResponse(BaseModel):
    tipo: str
    descricao: str


class MetaPdiResponse(BaseModel):
    competencia: str
    tipo: str
    nota_atual: float
    nota_autopercepcao: float
    nota_gestor: float | None = None
    nota_meta: float
    peso_exigido_cargo: int
    gap_cargo: int
    motivos: list[str]
    prioridade: str
    prazo_semanas: int
    prazo_descricao: str
    acoes: list[AcaoPdiResponse]


class ResumoPdiResponse(BaseModel):
    focos_abaixo_limiar: int
    focos_gap_cargo: int
    focos_desalinhamento_gestor: int
    prazo_medio_semanas: float


class PdiTalentoResponse(BaseModel):
    talento_id: str
    nome: str | None = None
    email: str | None = None
    semana_referencia: int
    cargo_alvo: str
    area: str
    fit_percentual_atual: float
    limiar_nota: float
    total_metas: int
    tem_avaliacao_gestor: bool
    resumo: ResumoPdiResponse
    metas: list[MetaPdiResponse]


@router.get("/{talento_id}/pdi", response_model=PdiTalentoResponse)
def obter_pdi_talento(
    talento_id: str,
    cargo_alvo: str = Query(..., description="Cargo alvo para calcular gaps de desenvolvimento."),
    semana_numero: int | None = Query(
        default=None,
        ge=1,
        description="Semana de referência. Se omitida, usa a mais recente.",
    ),
    turma_id: str | None = Query(default=None),
) -> PdiTalentoResponse:
    """Gera PDI automatizado com metas, prazos e ações práticas."""
    try:
        pdi = gerar_pdi(
            talento_id,
            cargo_alvo,
            semana_numero=semana_numero,
            turma_id=turma_id,
        )
    except PdiServiceError as exc:
        status = 404 if "não encontrad" in str(exc).lower() else 400
        raise HTTPException(status_code=status, detail=str(exc)) from exc

    return PdiTalentoResponse(
        talento_id=pdi["talento_id"],
        nome=pdi.get("nome"),
        email=pdi.get("email"),
        semana_referencia=pdi["semana_referencia"],
        cargo_alvo=pdi["cargo_alvo"],
        area=pdi["area"],
        fit_percentual_atual=pdi["fit_percentual_atual"],
        limiar_nota=pdi["limiar_nota"],
        total_metas=pdi["total_metas"],
        tem_avaliacao_gestor=pdi["tem_avaliacao_gestor"],
        resumo=ResumoPdiResponse(**pdi["resumo"]),
        metas=[
            MetaPdiResponse(
                **{
                    **meta,
                    "acoes": [AcaoPdiResponse(**acao) for acao in meta["acoes"]],
                }
            )
            for meta in pdi["metas"]
        ],
    )
