from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.avaliacoes import router as avaliacoes_router
from app.api.gestor import router as gestor_router
from app.api.health import router as health_router
from app.api.matchmaking import router as matchmaking_router
from app.api.talentos import router as talentos_router
from app.core.database import get_supabase
from app.core.config import settings
from app.exceptions import registrar_exception_handlers
from app.services.auth_store import garantir_organizacao_padrao, garantir_usuarios_demo
from app.services.talentos_store import garantir_turma_padrao


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Valida conexão com Supabase e garante dados iniciais na inicialização."""
    client = get_supabase()
    client.table("turmas").select("id").limit(1).execute()
    try:
        organizacao_id = garantir_organizacao_padrao()
        turma_id = garantir_turma_padrao(organizacao_id=organizacao_id)
        if settings.ENVIRONMENT.lower() not in ("production", "prod"):
            garantir_usuarios_demo(turma_id=turma_id, organizacao_id=organizacao_id)
    except Exception:
        pass
    yield


app = FastAPI(
    title="Plataforma Talentos",
    description="API da plataforma de gestão e avaliação de talentos.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

registrar_exception_handlers(app)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(avaliacoes_router)
app.include_router(gestor_router)
app.include_router(matchmaking_router)
app.include_router(talentos_router)
