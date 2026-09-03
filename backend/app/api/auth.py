from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field

from app.core.auth import Papel, UsuarioAutenticado, criar_token_acesso, obter_usuario_atual
from app.core.config import settings
from app.core.rate_limit import verificar_rate_limit
from app.services.auth_store import AuthStoreError, autenticar_usuario

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str = Field(min_length=3)
    senha: str = Field(min_length=6)


class LoginResponse(BaseModel):
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


def _definir_cookie_sessao(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.AUTH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=settings.JWT_EXPIRE_MINUTES * 60,
        path="/",
    )


@router.post("/login", response_model=LoginResponse)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
) -> LoginResponse:
    """Autentica usuário e define cookie HttpOnly de sessão."""
    client_ip = request.client.host if request.client else "unknown"
    verificar_rate_limit(
        f"login:{client_ip}",
        max_tentativas=settings.LOGIN_RATE_LIMIT_ATTEMPTS,
        janela_segundos=settings.LOGIN_RATE_LIMIT_WINDOW_SECONDS,
    )

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
    _definir_cookie_sessao(response, token)
    return LoginResponse(usuario=_usuario_para_resposta(usuario))


@router.post("/logout")
def logout(response: Response) -> dict[str, bool]:
    """Encerra a sessão removendo o cookie de autenticação."""
    response.delete_cookie(
        key=settings.AUTH_COOKIE_NAME,
        path="/",
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
    )
    return {"ok": True}


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
