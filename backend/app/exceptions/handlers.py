from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.exceptions.base import AppError


async def tratar_app_error(_: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content=exc.to_dict())


def _mensagem_publica(exc: Exception) -> str:
    public = getattr(exc, "public_message", None)
    if isinstance(public, str) and public.strip():
        return public
    return "Erro ao acessar o banco de dados."


def _status_e_codigo(exc: Exception) -> tuple[int, str]:
    status = getattr(exc, "status_code", None)
    code = getattr(exc, "code", None)
    if isinstance(status, int) and isinstance(code, str):
        return status, code
    return 503, "service_unavailable"


async def tratar_store_error(_: Request, exc: Exception) -> JSONResponse:
    status, code = _status_e_codigo(exc)
    return JSONResponse(
        status_code=status,
        content={"code": code, "message": _mensagem_publica(exc)},
    )


def registrar_exception_handlers(app: FastAPI) -> None:
    from app.services.auth_store import AuthStoreError
    from app.services.gestor_store import GestorStoreError
    from app.services.talentos_store import TalentosStoreError

    app.add_exception_handler(AppError, tratar_app_error)
    for store_error in (TalentosStoreError, GestorStoreError, AuthStoreError):
        app.add_exception_handler(store_error, tratar_store_error)
