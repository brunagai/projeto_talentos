"""Cache em memória dos últimos talentos processados (upload/formulário)."""

from __future__ import annotations

from threading import Lock
from typing import Any

_lock = Lock()
_talentos: list[dict[str, Any]] = []


def salvar_talentos(talentos: list[dict[str, Any]]) -> None:
    with _lock:
        global _talentos
        _talentos = list(talentos)


def listar_talentos() -> list[dict[str, Any]]:
    with _lock:
        return list(_talentos)


def limpar_talentos() -> None:
    with _lock:
        global _talentos
        _talentos = []
