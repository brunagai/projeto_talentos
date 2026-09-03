# plataforma-talentos

Plataforma modular de talentos — backend e frontend.

## Documentação

| Documento | Público | Descrição |
|-----------|---------|-----------|
| [Guia da Plataforma](docs/GUIA_DA_PLATAFORMA.md) | Gestores, mentores, RH | O que é, para que serve e como usar (sem jargão técnico) |
| [Documentação Técnica](docs/DOCUMENTACAO_TECNICA.md) | Desenvolvedores | Arquitetura, API, modelos, matchmaking e setup local |
| [Auditoria Técnica](docs/AUDITORIA_TECNICA.md) | Arquitetos / tech leads | Revisão de segurança, escalabilidade, resiliência, a11y e performance |
| [Tenancy e service_role](docs/TENANCY_E_SERVICE_ROLE.md) | Desenvolvedores / segurança | Isolamento multi-tenant e risco do bypass de RLS |

## Estrutura

```
plataforma-talentos/
├── backend/          # API e serviços
├── frontend/         # Interface web
└── docs/             # Documentação
```

## Setup rápido (dev)

### Backend

1. Copie `backend/.env.example` → `backend/.env` e preencha Supabase + `SECRET_KEY`.
2. Instale dependências e suba a API.
3. **Usuários demo não são criados no boot.** Para popular contas locais:

```bash
cd backend
python -m scripts.seed_demo
```

### Frontend

1. Copie `frontend/.env.example` → `frontend/.env.local`.
2. Defina `AUTH_SECRET` com **o mesmo valor** de `SECRET_KEY` do backend (obrigatório para o middleware validar o JWT).
3. `npm install` e `npm run dev`.
