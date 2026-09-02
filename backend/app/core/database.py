"""Cliente oficial do Supabase para persistência relacional."""

from __future__ import annotations

from functools import lru_cache

from supabase import Client, create_client

from app.core.config import settings


class DatabaseError(RuntimeError):
    """Erro ao comunicar com o Supabase."""


@lru_cache
def get_supabase() -> Client:
    """Retorna instância singleton do cliente Supabase."""
    try:
        return create_client(
            str(settings.SUPABASE_URL),
            settings.SUPABASE_KEY,
        )
    except Exception as exc:
        raise DatabaseError(f"Falha ao conectar ao Supabase: {exc}") from exc
