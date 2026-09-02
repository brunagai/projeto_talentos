from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

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
