"""Rate limiting simples em memória para endpoints sensíveis."""

from __future__ import annotations

from collections import defaultdict
from time import time

from fastapi import HTTPException, status

_buckets: dict[str, list[float]] = defaultdict(list)


def verificar_rate_limit(
    chave: str,
    *,
    max_tentativas: int = 5,
    janela_segundos: int = 60,
) -> None:
    """Bloqueia após exceder tentativas na janela de tempo."""
    agora = time()
    tentativas = _buckets[chave]
    _buckets[chave] = [momento for momento in tentativas if agora - momento < janela_segundos]

    if len(_buckets[chave]) >= max_tentativas:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Muitas tentativas. Aguarde um minuto e tente novamente.",
        )

    _buckets[chave].append(agora)
