from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.core.auth import Papel, UsuarioAutenticado, exigir_papeis, resolver_turma_id
from app.services.cargos_referencia import CARGOS_REFERENCIA
from app.services.matchmaking_service import (
    MatchmakingError,
    melhor_cargo_para_talento,
    rankear_talentos_por_cargo,
)
from app.services.talentos_store import TalentosStoreError, listar_talentos

router = APIRouter(prefix="/matchmaking", tags=["matchmaking"])


class CargoResumoResponse(BaseModel):
    cargo: str
    area: str
    pesos: dict[str, int]


class TalentoMatchInput(BaseModel):
    talento_id: str
    email: str | None = None
    nome: str | None = None
    hard_skills: dict[str, int] = Field(default_factory=dict)
    soft_skills: dict[str, int] = Field(default_factory=dict)


class CompetenciaMatchResponse(BaseModel):
    competencia: str
    tipo: str
    nota_candidato: int
    peso_exigido: int
    atende_corte: bool
    gap: int


class MatchCandidatoResponse(BaseModel):
    talento_id: str
    nome: str | None = None
    email: str | None = None
    cargo_alvo: str
    area: str
    fit_percentual: float
    similaridade_cosseno: float
    competencias_atendem: list[CompetenciaMatchResponse]
    competencias_desenvolvimento: list[CompetenciaMatchResponse]


class RankingCargoResponse(BaseModel):
    cargo_alvo: str
    area: str
    total_candidatos: int
    ranking: list[MatchCandidatoResponse]


class RankearRequest(BaseModel):
    talentos: list[TalentoMatchInput]


def _to_match_response(resultado: Any) -> MatchCandidatoResponse:
    return MatchCandidatoResponse(
        talento_id=resultado.talento_id,
        nome=resultado.nome,
        email=resultado.email,
        cargo_alvo=resultado.cargo_alvo,
        area=resultado.area,
        fit_percentual=resultado.fit_percentual,
        similaridade_cosseno=resultado.similaridade_cosseno,
        competencias_atendem=[
            CompetenciaMatchResponse(
                competencia=item.competencia,
                tipo=item.tipo,
                nota_candidato=item.nota_candidato,
                peso_exigido=item.peso_exigido,
                atende_corte=item.atende_corte,
                gap=item.gap,
            )
            for item in resultado.competencias_atendem
        ],
        competencias_desenvolvimento=[
            CompetenciaMatchResponse(
                competencia=item.competencia,
                tipo=item.tipo,
                nota_candidato=item.nota_candidato,
                peso_exigido=item.peso_exigido,
                atende_corte=item.atende_corte,
                gap=item.gap,
            )
            for item in resultado.competencias_desenvolvimento
        ],
    )


def _talentos_do_store(
    usuario: UsuarioAutenticado,
    *,
    page: int = 1,
    page_size: int | None = None,
) -> list[TalentoMatchInput]:
    try:
        turma_id = resolver_turma_id(usuario)
        bruto = listar_talentos(turma_id=turma_id, page=page, page_size=page_size)
    except TalentosStoreError as exc:
        raise HTTPException(
            status_code=getattr(exc, "status_code", 503),
            detail=getattr(exc, "public_message", str(exc)),
        ) from exc
    return [TalentoMatchInput.model_validate(item) for item in bruto]


@router.get("/cargos", response_model=list[CargoResumoResponse] | RankingCargoResponse)
def matchmaking_cargos(
    cargo_alvo: str | None = Query(
        default=None,
        description="Se informado, ranqueia os talentos persistidos para este cargo.",
    ),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    usuario: Annotated[
        UsuarioAutenticado,
        Depends(
            exigir_papeis(Papel.ADMIN, Papel.MENTOR, Papel.RECRUTADOR, Papel.TALENTO)
        ),
    ] = None,
) -> list[CargoResumoResponse] | RankingCargoResponse:
    """Lista cargos de referência ou ranqueia talentos para um cargo alvo."""
    if cargo_alvo is None:
        return [
            CargoResumoResponse(cargo=cargo.cargo, area=cargo.area, pesos=cargo.pesos)
            for cargo in CARGOS_REFERENCIA
        ]

    if usuario.papel == Papel.TALENTO:
        raise HTTPException(
            status_code=403,
            detail="Talentos não podem ranquear a turma completa.",
        )

    try:
        talentos = _talentos_do_store(usuario, page=page, page_size=page_size)
        if not talentos:
            raise MatchmakingError(
                "Nenhum talento persistido. Faça upload de uma planilha ou "
                "envie talentos via POST /matchmaking/rankear."
            )
        ranking = rankear_talentos_por_cargo(talentos, cargo_alvo)
    except MatchmakingError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    primeiro = ranking[0]
    return RankingCargoResponse(
        cargo_alvo=primeiro.cargo_alvo,
        area=primeiro.area,
        total_candidatos=len(ranking),
        ranking=[_to_match_response(item) for item in ranking],
    )


@router.post("/rankear", response_model=RankingCargoResponse)
def rankear_candidatos(
    payload: RankearRequest,
    cargo_alvo: str = Query(..., description="Cargo alvo da matriz de referência."),
    _: Annotated[
        UsuarioAutenticado,
        Depends(exigir_papeis(Papel.ADMIN, Papel.RECRUTADOR)),
    ] = None,
) -> RankingCargoResponse:
    """Ranqueia talentos enviados no body pelo Fit % com o cargo selecionado.

    Operação pura: não persiste talentos. Use POST /avaliacoes/upload para salvar.
    """
    try:
        ranking = rankear_talentos_por_cargo(payload.talentos, cargo_alvo)
    except MatchmakingError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    primeiro = ranking[0]
    return RankingCargoResponse(
        cargo_alvo=primeiro.cargo_alvo,
        area=primeiro.area,
        total_candidatos=len(ranking),
        ranking=[_to_match_response(item) for item in ranking],
    )


@router.post("/recomendar-cargos", response_model=list[MatchCandidatoResponse])
def recomendar_cargos_para_talento(
    talento: TalentoMatchInput,
    top_n: int = Query(default=3, ge=1, le=16),
    _: Annotated[
        UsuarioAutenticado,
        Depends(
            exigir_papeis(Papel.ADMIN, Papel.MENTOR, Papel.RECRUTADOR, Papel.TALENTO)
        ),
    ] = None,
) -> list[MatchCandidatoResponse]:
    """Sugere os cargos com maior Fit % para um único talento."""
    try:
        resultados = melhor_cargo_para_talento(
            talento.hard_skills,
            talento.soft_skills,
            talento_id=talento.talento_id,
            nome=talento.nome,
            email=talento.email,
            top_n=top_n,
        )
    except MatchmakingError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return [_to_match_response(item) for item in resultados]
