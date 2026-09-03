"""Seed manual de usuários demo (não roda no boot da API).

Uso (a partir da pasta backend, com .env carregado):

    python -m scripts.seed_demo

Senhas vêm de variáveis de ambiente (nunca commitadas como segredo de produção):

    DEMO_PASSWORD_ADMIN
    DEMO_PASSWORD_RECRUTADOR
    DEMO_PASSWORD_MENTOR
    DEMO_PASSWORD_TALENTO

Se omitidas em development, usam defaults locais fracos.
Em production o script só roda com SEED_ALLOW_PRODUCTION=1.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

# Garante import de `app` ao executar como script.
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.config import settings  # noqa: E402
from app.services.auth_store import (  # noqa: E402
    garantir_organizacao_padrao,
    garantir_usuarios_demo,
)
from app.services.talentos_store import garantir_turma_padrao  # noqa: E402


def _senha(env_key: str, default_dev: str) -> str:
    valor = os.environ.get(env_key, "").strip()
    if valor:
        return valor
    if settings.is_production:
        raise SystemExit(
            f"{env_key} é obrigatória para seed em production."
        )
    return default_dev


def _usuarios_demo() -> list[dict[str, str]]:
    return [
        {
            "email": "admin@cobra-coral.com",
            "senha": _senha("DEMO_PASSWORD_ADMIN", "admin123"),
            "nome": "Administrador",
            "papel": "admin",
        },
        {
            "email": "recrutador@cobra-coral.com",
            "senha": _senha("DEMO_PASSWORD_RECRUTADOR", "recrutador123"),
            "nome": "Recrutador Demo",
            "papel": "recrutador",
        },
        {
            "email": "mentor@cobra-coral.com",
            "senha": _senha("DEMO_PASSWORD_MENTOR", "mentor123"),
            "nome": "Mentor Demo",
            "papel": "mentor",
        },
        {
            "email": "talento@cobra-coral.com",
            "senha": _senha("DEMO_PASSWORD_TALENTO", "talento123"),
            "nome": "Talento Demo",
            "papel": "talento",
        },
    ]


def main() -> None:
    if settings.is_production and os.environ.get("SEED_ALLOW_PRODUCTION", "").strip() != "1":
        raise SystemExit(
            "Seed recusado em production. Defina SEED_ALLOW_PRODUCTION=1 "
            "e as variáveis DEMO_PASSWORD_* se realmente necessário."
        )

    usuarios = _usuarios_demo()
    organizacao_id = garantir_organizacao_padrao()
    turma_id = garantir_turma_padrao(organizacao_id=organizacao_id)
    garantir_usuarios_demo(
        turma_id=turma_id,
        organizacao_id=organizacao_id,
        usuarios=usuarios,
    )
    print("Seed demo concluído. Contas (senha não exibida):")
    for item in usuarios:
        print(f"  - {item['email']} ({item['papel']})")


if __name__ == "__main__":
    main()
