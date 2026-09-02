from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.avaliacoes import router as avaliacoes_router
from app.api.matchmaking import router as matchmaking_router

app = FastAPI(
    title="Plataforma Talentos",
    description="API da plataforma de gestão e avaliação de talentos.",
    version="0.1.0",
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

app.include_router(avaliacoes_router)
app.include_router(matchmaking_router)
