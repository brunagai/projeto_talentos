"""Rate limiting para endpoints sensíveis.

Usa Redis quando `REDIS_URL` está definida (compartilhado entre workers);
caso contrário, buckets em memória do processo.
"""

from __future__ import annotations

from collections import defaultdict
from time import time
from typing import Protocol

from fastapi import HTTPException, status

from app.core.config import settings

_buckets: dict[str, list[float]] = defaultdict(list)
_redis_client = None
_redis_failed = False


class _RedisLike(Protocol):
    def incr(self, name: str) -> int: ...
    def expire(self, name: str, time: int) -> bool: ...


def _get_redis() -> _RedisLike | None:
    global _redis_client, _redis_failed
    if _redis_failed or not settings.REDIS_URL:
        return None
    if _redis_client is not None:
        return _redis_client
    try:
        import redis

        _redis_client = redis.Redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=1,
        )
        _redis_client.ping()
        return _redis_client
    except Exception:
        _redis_failed = True
        _redis_client = None
        return None


def _verificar_memoria(
    chave: str,
    *,
    max_tentativas: int,
    janela_segundos: int,
) -> None:
    agora = time()
    tentativas = _buckets[chave]
    _buckets[chave] = [
        momento for momento in tentativas if agora - momento < janela_segundos
    ]

    if len(_buckets[chave]) >= max_tentativas:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Muitas tentativas. Aguarde um minuto e tente novamente.",
        )

    _buckets[chave].append(agora)


def _verificar_redis(
    client: _RedisLike,
    chave: str,
    *,
    max_tentativas: int,
    janela_segundos: int,
) -> None:
    redis_key = f"rate:{chave}"
    contagem = int(client.incr(redis_key))
    if contagem == 1:
        client.expire(redis_key, janela_segundos)
    if contagem > max_tentativas:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Muitas tentativas. Aguarde um minuto e tente novamente.",
        )


def verificar_rate_limit(
    chave: str,
    *,
    max_tentativas: int = 5,
    janela_segundos: int = 60,
) -> None:
    """Bloqueia após exceder tentativas na janela de tempo."""
    client = _get_redis()
    if client is not None:
        try:
            _verificar_redis(
                client,
                chave,
                max_tentativas=max_tentativas,
                janela_segundos=janela_segundos,
            )
            return
        except HTTPException:
            raise
        except Exception:
            pass

    _verificar_memoria(
        chave,
        max_tentativas=max_tentativas,
        janela_segundos=janela_segundos,
    )
