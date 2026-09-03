from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.auth import Papel, UsuarioAutenticado, criar_token_acesso, obter_usuario_atual
from app.services.auth_store import AuthStoreError, autenticar_usuario

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str = Field(min_length=3)
    senha: str = Field(min_length=6)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: "UsuarioResponse"


class UsuarioResponse(BaseModel):
    id: str
    email: str
    nome: str
    papel: Papel
    organizacao_id: str
    organizacao_nome: str | None = None
    turma_id: str | None = None
    talento_id: str | None = None


def _usuario_para_resposta(usuario: dict) -> UsuarioResponse:
    return UsuarioResponse(
        id=str(usuario["id"]),
        email=str(usuario["email"]),
        nome=str(usuario["nome"]),
        papel=Papel(str(usuario["papel"])),
        organizacao_id=str(usuario["organizacao_id"]),
        organizacao_nome=usuario.get("organizacao_nome"),
        turma_id=str(usuario["turma_id"]) if usuario.get("turma_id") else None,
        talento_id=str(usuario["talento_id"]) if usuario.get("talento_id") else None,
    )


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest) -> LoginResponse:
    """Autentica usuário e retorna JWT de sessão."""
    try:
        usuario = autenticar_usuario(payload.email, payload.senha)
    except AuthStoreError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    if usuario is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha inválidos.",
        )

    token = criar_token_acesso(usuario)
    return LoginResponse(
        access_token=token,
        usuario=_usuario_para_resposta(usuario),
    )


@router.get("/me", response_model=UsuarioResponse)
def obter_perfil_atual(
    usuario: Annotated[UsuarioAutenticado, Depends(obter_usuario_atual)],
) -> UsuarioResponse:
    """Retorna o perfil do usuário autenticado."""
    return UsuarioResponse(
        id=usuario.id,
        email=usuario.email,
        nome=usuario.nome,
        papel=usuario.papel,
        organizacao_id=usuario.organizacao_id,
        organizacao_nome=usuario.organizacao_nome,
        turma_id=usuario.turma_id,
        talento_id=usuario.talento_id,
    )
