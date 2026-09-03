"""Seed manual de usuários demo (não roda no boot da API).

Uso (a partir da pasta backend, com .env carregado):

    python -m scripts.seed_demo

Crie usuários apenas em ambientes locais/de demonstração.
Em produção, provisione contas por processo operacional seguro.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Garante import de `app` ao executar como script.
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.services.auth_store import (  # noqa: E402
    garantir_organizacao_padrao,
    garantir_usuarios_demo,
)
from app.services.talentos_store import garantir_turma_padrao  # noqa: E402

# Credenciais apenas neste script CLI — não no caminho de boot da API.
USUARIOS_DEMO = [
    {
        "email": "admin@cobra-coral.com",
        "senha": "admin123",
        "nome": "Administrador",
        "papel": "admin",
    },
    {
        "email": "recrutador@cobra-coral.com",
        "senha": "recrutador123",
        "nome": "Recrutador Demo",
        "papel": "recrutador",
    },
    {
        "email": "mentor@cobra-coral.com",
        "senha": "mentor123",
        "nome": "Mentor Demo",
        "papel": "mentor",
    },
    {
        "email": "talento@cobra-coral.com",
        "senha": "talento123",
        "nome": "Talento Demo",
        "papel": "talento",
    },
]


def main() -> None:
    organizacao_id = garantir_organizacao_padrao()
    turma_id = garantir_turma_padrao(organizacao_id=organizacao_id)
    garantir_usuarios_demo(
        turma_id=turma_id,
        organizacao_id=organizacao_id,
        usuarios=USUARIOS_DEMO,
    )
    print("Seed demo concluído.")
    for item in USUARIOS_DEMO:
        print(f"  - {item['email']} ({item['papel']})")


if __name__ == "__main__":
    main()
