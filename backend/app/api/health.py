"""Probes de vivacidade e prontidão para orquestração."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.core.database import get_supabase_admin

router = APIRouter(tags=["health"])


class HealthChecks(BaseModel):
    supabase: Literal["ok", "error"]


class HealthResponse(BaseModel):
    status: Literal["ok", "error"]
    checks: HealthChecks


@router.get("/health/live", summary="Liveness probe")
def liveness() -> dict[str, str]:
    """Confirma que o processo HTTP está no ar, sem I/O externo."""
    return {"status": "ok"}


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Readiness probe",
    responses={
        503: {"model": HealthResponse},
    },
)
def readiness() -> HealthResponse | JSONResponse:
    """Verifica conectividade rápida com o Supabase antes de receber tráfego."""
    try:
        client = get_supabase_admin()
        client.table("turmas").select("id").limit(1).execute()
    except Exception:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "error", "checks": {"supabase": "error"}},
        )

    return HealthResponse(status="ok", checks=HealthChecks(supabase="ok"))
