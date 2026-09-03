import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.avaliacoes import router as avaliacoes_router
from app.api.gestor import router as gestor_router
from app.api.health import router as health_router
from app.api.matchmaking import router as matchmaking_router
from app.api.talentos import router as talentos_router
from app.core.config import settings
from app.core.database import get_supabase_admin
from app.exceptions import registrar_exception_handlers
from app.services.auth_store import garantir_organizacao_padrao
from app.services.talentos_store import garantir_turma_padrao

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Valida conexão com Supabase e garante org/turma padrão na inicialização."""
    try:
        client = get_supabase_admin()
        client.table("turmas").select("id").limit(1).execute()
        organizacao_id = garantir_organizacao_padrao()
        garantir_turma_padrao(organizacao_id=organizacao_id)
    except Exception:
        logger.exception(
            "Falha ao validar Supabase ou garantir organização/turma no startup. "
            "A API sobe, mas dados iniciais podem estar incompletos."
        )
        if settings.is_production:
            raise
    yield


_docs = None if settings.is_production else "/docs"
_redoc = None if settings.is_production else "/redoc"
_openapi = None if settings.is_production else "/openapi.json"

app = FastAPI(
    title="Plataforma Talentos",
    description="API da plataforma de gestão e avaliação de talentos.",
    version="0.1.0",
    lifespan=lifespan,
    docs_url=_docs,
    redoc_url=_redoc,
    openapi_url=_openapi,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

registrar_exception_handlers(app)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(avaliacoes_router)
app.include_router(gestor_router)
app.include_router(matchmaking_router)
app.include_router(talentos_router)
