"""Cliente oficial do Supabase para persistência relacional.

Há dois modos:
- Admin (`service_role`): seed, login, health, lifespan — bypassa RLS.
- Request path (anon + JWT do usuário): respeita RLS quando
  `SUPABASE_ANON_KEY` está configurada (Fase F).
"""

from __future__ import annotations

from contextvars import ContextVar, Token
from functools import lru_cache

from supabase import Client, create_client

from app.core.config import settings

_request_client: ContextVar[Client | None] = ContextVar(
    "supabase_request_client",
    default=None,
)


class DatabaseError(RuntimeError):
    """Erro ao comunicar com o Supabase."""


@lru_cache
def get_supabase_admin() -> Client:
    """Cliente com service_role (bypassa RLS). Só para boot, seed e auth."""
    try:
        return create_client(
            str(settings.SUPABASE_URL),
            settings.SUPABASE_KEY,
        )
    except Exception as exc:
        raise DatabaseError(f"Falha ao conectar ao Supabase (admin): {exc}") from exc


def get_supabase() -> Client:
    """Cliente do request atual (RLS) ou admin se o modo RLS estiver off."""
    client = _request_client.get()
    if client is not None:
        return client
    return get_supabase_admin()


def bind_request_supabase(access_token: str) -> Token | None:
    """Associa o JWT do usuário ao PostgREST para o request (RLS ativo)."""
    if not settings.rls_request_path_enabled:
        return None
    anon = settings.SUPABASE_ANON_KEY
    if not anon:
        return None
    try:
        client = create_client(str(settings.SUPABASE_URL), anon)
        client.postgrest.auth(access_token)
    except Exception as exc:
        raise DatabaseError(
            f"Falha ao criar cliente Supabase com JWT do usuário: {exc}"
        ) from exc
    return _request_client.set(client)


def reset_request_supabase(token: Token | None) -> None:
    if token is not None:
        _request_client.reset(token)
