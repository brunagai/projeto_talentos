"""Autenticação JWT, papéis e dependências FastAPI."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from enum import Enum
from typing import Annotated, Callable

import jwt
from fastapi import Cookie, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.core.config import settings

bearer_scheme = HTTPBearer(auto_error=False)

JWT_ALGORITHM = "HS256"


class Papel(str, Enum):
    ADMIN = "admin"
    RECRUTADOR = "recrutador"
    MENTOR = "mentor"
    TALENTO = "talento"


class TokenPayload(BaseModel):
    sub: str
    email: str
    papel: Papel
    organizacao_id: str
    turma_id: str | None = None
    talento_id: str | None = None
    exp: int


class UsuarioAutenticado(BaseModel):
    id: str
    email: str
    nome: str
    papel: Papel
    organizacao_id: str
    organizacao_nome: str | None = None
    turma_id: str | None = None
    talento_id: str | None = None


def criar_token_acesso(usuario: dict[str, str | None]) -> str:
    expira = datetime.now(UTC) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload = {
        "sub": str(usuario["id"]),
        "email": usuario["email"],
        "papel": usuario["papel"],
        "organizacao_id": str(usuario["organizacao_id"]),
        "turma_id": str(usuario["turma_id"]) if usuario.get("turma_id") else None,
        "talento_id": str(usuario["talento_id"]) if usuario.get("talento_id") else None,
        "exp": expira,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=JWT_ALGORITHM)


def decodificar_token(token: str) -> TokenPayload:
    try:
        dados = jwt.decode(token, settings.SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return TokenPayload(
            sub=str(dados["sub"]),
            email=str(dados["email"]),
            papel=Papel(str(dados["papel"])),
            organizacao_id=str(dados["organizacao_id"]),
            turma_id=str(dados["turma_id"]) if dados.get("turma_id") else None,
            talento_id=str(dados["talento_id"]) if dados.get("talento_id") else None,
            exp=int(dados["exp"]),
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


async def obter_usuario_atual(
    credenciais: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    access_token: Annotated[str | None, Cookie(alias=settings.AUTH_COOKIE_NAME)] = None,
) -> UsuarioAutenticado:
    token: str | None = None
    if credenciais is not None and credenciais.credentials:
        token = credenciais.credentials
    elif access_token:
        token = access_token

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticação necessária.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    from app.services.auth_store import buscar_usuario_por_id

    payload = decodificar_token(token)
    usuario = buscar_usuario_por_id(payload.sub)
    if usuario is None or not usuario.get("ativo", True):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado ou inativo.",
        )

    if str(usuario["organizacao_id"]) != payload.organizacao_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Contexto de organização inválido.",
        )

    return UsuarioAutenticado(
        id=str(usuario["id"]),
        email=str(usuario["email"]),
        nome=str(usuario["nome"]),
        papel=Papel(str(usuario["papel"])),
        organizacao_id=str(usuario["organizacao_id"]),
        organizacao_nome=usuario.get("organizacao_nome"),
        turma_id=str(usuario["turma_id"]) if usuario.get("turma_id") else None,
        talento_id=str(usuario["talento_id"]) if usuario.get("talento_id") else None,
    )


class RoleChecker:
    """Dependência que restringe rotas a papéis específicos."""

    def __init__(self, papeis_permitidos: list[Papel]) -> None:
        self.papeis_permitidos = papeis_permitidos

    async def __call__(
        self,
        usuario: Annotated[UsuarioAutenticado, Depends(obter_usuario_atual)],
    ) -> UsuarioAutenticado:
        if usuario.papel not in self.papeis_permitidos:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permissão insuficiente para esta operação.",
            )
        return usuario


def exigir_papeis(*papeis: Papel) -> Callable[..., UsuarioAutenticado]:
    return RoleChecker(list(papeis))


def resolver_turma_id(
    usuario: UsuarioAutenticado,
    turma_id_query: str | None = None,
) -> str:
    """Resolve turma do contexto autenticado, validando isolamento multi-tenant."""
    from app.services.auth_store import validar_turma_na_organizacao
    from app.services.talentos_store import garantir_turma_padrao

    if usuario.papel == Papel.ADMIN:
        turma_resolvida = turma_id_query or usuario.turma_id
        if turma_resolvida is None:
            turma_resolvida = garantir_turma_padrao(organizacao_id=usuario.organizacao_id)
        try:
            validar_turma_na_organizacao(turma_resolvida, usuario.organizacao_id)
        except Exception as exc:
            from app.services.auth_store import AuthStoreError

            if isinstance(exc, AuthStoreError):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=getattr(
                        exc,
                        "public_message",
                        "Acesso negado à turma solicitada.",
                    ),
                ) from exc
            raise
        return turma_resolvida

    if usuario.turma_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário sem turma vinculada.",
        )

    if turma_id_query and turma_id_query != usuario.turma_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado à turma solicitada.",
        )

    try:
        validar_turma_na_organizacao(usuario.turma_id, usuario.organizacao_id)
    except Exception as exc:
        from app.services.auth_store import AuthStoreError

        if isinstance(exc, AuthStoreError):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=getattr(
                    exc,
                    "public_message",
                    "Acesso negado à turma solicitada.",
                ),
            ) from exc
        raise
    return usuario.turma_id


def verificar_acesso_talento(usuario: UsuarioAutenticado, talento_id: str) -> None:
    """Garante que talentos só acessem o próprio perfil."""
    if usuario.papel == Papel.TALENTO:
        if usuario.talento_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Perfil de talento não vinculado a este usuário.",
            )
        if usuario.talento_id != talento_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso permitido apenas aos seus próprios dados.",
            )


def garantir_talento_na_turma(
    usuario: UsuarioAutenticado,
    talento_id: str,
    *,
    turma_id: str | None = None,
) -> str:
    """Valida acesso ao talento e garante que ele pertence à turma do contexto."""
    from app.services.talentos_store import validar_talento_na_turma

    verificar_acesso_talento(usuario, talento_id)
    turma_resolvida = turma_id or resolver_turma_id(usuario)
    validar_talento_na_turma(talento_id, turma_resolvida)
    return turma_resolvida
