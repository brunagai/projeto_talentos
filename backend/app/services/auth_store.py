"""Repositório de autenticação e multi-tenancy."""

from __future__ import annotations

from typing import Any
from uuid import uuid4

import bcrypt
from postgrest.exceptions import APIError

from app.core.database import get_supabase

ORGANIZACAO_PADRAO_SLUG = "cobra-coral"
ORGANIZACAO_PADRAO_NOME = "Cobra Coral Consultoria"


class AuthStoreError(RuntimeError):
    """Erro ao autenticar ou consultar usuários."""

    status_code: int = 503
    code: str = "service_unavailable"
    public_message: str = "Erro ao acessar o banco de dados."

    def __init__(self, message: str, *, public_message: str | None = None) -> None:
        super().__init__(message)
        if public_message is not None:
            self.public_message = public_message


class AuthNotFoundError(AuthStoreError):
    status_code = 404
    code = "not_found"
    public_message = "Recurso não encontrado."


class AuthValidationError(AuthStoreError):
    status_code = 400
    code = "validation_error"
    public_message = "Dados inválidos."


def _executar(operacao: str, callback: Any) -> Any:
    try:
        return callback()
    except APIError as exc:
        raise AuthStoreError(
            f"Erro Supabase ao {operacao}: {getattr(exc, 'message', exc)}"
        ) from exc
    except Exception as exc:
        raise AuthStoreError(f"Erro inesperado ao {operacao}: {exc}") from exc


def _hash_senha(senha: str) -> str:
    return bcrypt.hashpw(senha.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verificar_senha(senha: str, senha_hash: str) -> bool:
    try:
        return bcrypt.checkpw(senha.encode("utf-8"), senha_hash.encode("utf-8"))
    except ValueError:
        return False


def garantir_organizacao_padrao() -> str:
    client = get_supabase()
    existente = _executar(
        "buscar organização padrão",
        lambda: client.table("organizacoes")
        .select("id")
        .eq("slug", ORGANIZACAO_PADRAO_SLUG)
        .limit(1)
        .execute(),
    )
    if existente.data:
        return existente.data[0]["id"]

    criada = _executar(
        "criar organização padrão",
        lambda: client.table("organizacoes")
        .insert({"nome": ORGANIZACAO_PADRAO_NOME, "slug": ORGANIZACAO_PADRAO_SLUG})
        .execute(),
    )
    return criada.data[0]["id"]


def validar_turma_na_organizacao(turma_id: str, organizacao_id: str) -> None:
    client = get_supabase()
    resultado = _executar(
        "validar turma na organização",
        lambda: client.table("turmas")
        .select("id, organizacao_id")
        .eq("id", turma_id)
        .limit(1)
        .execute(),
    )
    if not resultado.data:
        raise AuthNotFoundError(
            "Turma não encontrada.",
            public_message="Turma não encontrada.",
        )
    turma = resultado.data[0]
    if turma.get("organizacao_id") and str(turma["organizacao_id"]) != organizacao_id:
        raise AuthValidationError(
            "Turma não pertence à organização do usuário.",
            public_message="Turma não pertence à organização do usuário.",
        )


def _usuario_com_organizacao(row: dict[str, Any]) -> dict[str, Any]:
    org = row.get("organizacoes") or {}
    return {
        "id": str(row["id"]),
        "email": row["email"],
        "nome": row["nome"],
        "papel": row["papel"],
        "organizacao_id": str(row["organizacao_id"]),
        "organizacao_nome": org.get("nome"),
        "turma_id": str(row["turma_id"]) if row.get("turma_id") else None,
        "talento_id": str(row["talento_id"]) if row.get("talento_id") else None,
        "senha_hash": row.get("senha_hash"),
        "ativo": row.get("ativo", True),
    }


def buscar_usuario_por_id(usuario_id: str) -> dict[str, Any] | None:
    client = get_supabase()
    resultado = _executar(
        "buscar usuário por id",
        lambda: client.table("usuarios")
        .select("*, organizacoes(nome)")
        .eq("id", usuario_id)
        .limit(1)
        .execute(),
    )
    if not resultado.data:
        return None
    return _usuario_com_organizacao(resultado.data[0])


def autenticar_usuario(email: str, senha: str) -> dict[str, Any] | None:
    client = get_supabase()
    resultado = _executar(
        "autenticar usuário",
        lambda: client.table("usuarios")
        .select("*, organizacoes(nome)")
        .eq("email", email.strip().lower())
        .limit(1)
        .execute(),
    )
    if not resultado.data:
        return None

    usuario = _usuario_com_organizacao(resultado.data[0])
    if not usuario.get("ativo", True):
        return None
    if not usuario.get("senha_hash") or not verificar_senha(senha, usuario["senha_hash"]):
        return None

    usuario.pop("senha_hash", None)
    return usuario


def garantir_usuarios_demo(
    turma_id: str,
    organizacao_id: str,
    *,
    usuarios: list[dict[str, str]],
) -> None:
    """Cria usuários fornecidos se ainda não existirem.

    Destinado ao script CLI `scripts/seed_demo.py` — não use no boot da API.
    """
    if not usuarios:
        raise AuthValidationError(
            "Lista de usuários demo vazia.",
            public_message="Lista de usuários demo vazia.",
        )

    validar_turma_na_organizacao(turma_id, organizacao_id)
    client = get_supabase()

    for demo in usuarios:
        existente = _executar(
            f"verificar usuário {demo['email']}",
            lambda email=demo["email"]: client.table("usuarios")
            .select("id")
            .eq("email", email)
            .limit(1)
            .execute(),
        )
        if existente.data:
            continue

        payload: dict[str, Any] = {
            "id": str(uuid4()),
            "email": demo["email"],
            "senha_hash": _hash_senha(demo["senha"]),
            "nome": demo["nome"],
            "papel": demo["papel"],
            "organizacao_id": organizacao_id,
            "turma_id": turma_id,
        }
        _executar(
            f"criar usuário demo {demo['email']}",
            lambda p=payload: client.table("usuarios").insert(p).execute(),
        )
