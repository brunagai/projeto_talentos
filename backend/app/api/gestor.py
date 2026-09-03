from __future__ import annotations

import asyncio
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.core.auth import Papel, UsuarioAutenticado, exigir_papeis, garantir_talento_na_turma, verificar_acesso_talento
from app.models.avaliacao_gestor import AvaliacaoGestorCreate
from app.services.gestor_store import (
    buscar_avaliacao_gestor,
    salvar_avaliacao_gestor,
)

router = APIRouter(prefix="/gestor", tags=["gestor"])


class AvaliacaoGestorResponse(BaseModel):
    id: str
    talento_id: str
    semana_numero: int
    gestor_nome: str | None = None
    hard_skills: dict[str, int] = Field(default_factory=dict)
    soft_skills: dict[str, int] = Field(default_factory=dict)
    media_tecnica: float | None = None
    media_socioemocional: float | None = None
    feedback_performance: str | None = None
    alinhamento_cultural: str | None = None
    pontos_desenvolvimento: str | None = None
    pontos_fortes: str | None = None


@router.post("/avaliacoes", response_model=AvaliacaoGestorResponse)
async def registrar_avaliacao_gestor(
    payload: AvaliacaoGestorCreate,
    usuario: Annotated[
        UsuarioAutenticado,
        Depends(exigir_papeis(Papel.ADMIN, Papel.MENTOR)),
    ],
) -> AvaliacaoGestorResponse:
    """Registra ou atualiza a avaliação formal do gestor para um talento/semana."""
    payload.validar_notas()
    turma_id = garantir_talento_na_turma(usuario, str(payload.talento_id))
    resultado = await asyncio.to_thread(
        salvar_avaliacao_gestor,
        payload.model_dump(mode="json"),
        turma_id,
        usuario.nome,
    )

    return AvaliacaoGestorResponse(**resultado)


@router.get("/avaliacoes/{talento_id}", response_model=AvaliacaoGestorResponse)
async def obter_avaliacao_gestor(
    talento_id: str,
    semana_numero: int = Query(..., ge=1),
    usuario: Annotated[
        UsuarioAutenticado,
        Depends(
            exigir_papeis(Papel.ADMIN, Papel.MENTOR, Papel.RECRUTADOR, Papel.TALENTO)
        ),
    ] = None,
) -> AvaliacaoGestorResponse:
    """Busca a avaliação do gestor para um talento em uma semana específica."""
    verificar_acesso_talento(usuario, talento_id)
    turma_id = garantir_talento_na_turma(usuario, talento_id)
    resultado = await asyncio.to_thread(
        buscar_avaliacao_gestor,
        talento_id,
        semana_numero,
        turma_id,
    )

    if resultado is None:
        raise HTTPException(
            status_code=404,
            detail="Avaliação do gestor não encontrada para esta semana.",
        )

    return AvaliacaoGestorResponse(**resultado)
