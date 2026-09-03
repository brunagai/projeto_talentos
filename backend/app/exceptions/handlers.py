from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.exceptions.base import AppError


async def tratar_app_error(_: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content=exc.to_dict())


def _mensagem_store(exc: Exception) -> str:
    return str(exc) if str(exc) else "Erro ao acessar o banco de dados."


def _status_store(exc: Exception) -> int:
    mensagem = str(exc).lower()
    if "não encontrad" in mensagem or "nao encontrad" in mensagem:
        return 404
    if any(
        termo in mensagem
        for termo in ("planilha", "duplicat", "conflito", "inválido", "invalido")
    ):
        return 400
    return 503


async def tratar_store_error(_: Request, exc: Exception) -> JSONResponse:
    status = _status_store(exc)
    code = "not_found" if status == 404 else "service_unavailable"
    return JSONResponse(
        status_code=status,
        content={"code": code, "message": _mensagem_store(exc)},
    )


def registrar_exception_handlers(app: FastAPI) -> None:
    from app.services.auth_store import AuthStoreError
    from app.services.gestor_store import GestorStoreError
    from app.services.talentos_store import TalentosStoreError

    app.add_exception_handler(AppError, tratar_app_error)
    for store_error in (TalentosStoreError, GestorStoreError, AuthStoreError):
        app.add_exception_handler(store_error, tratar_store_error)
