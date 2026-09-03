# plataforma-talentos

Plataforma modular de gestão e avaliação de talentos — FastAPI + Supabase (backend) e Next.js 15 (frontend).

## Documentação

| Documento | Público | Descrição |
|-----------|---------|-----------|
| [Guia da Plataforma](docs/GUIA_DA_PLATAFORMA.md) | Gestores, mentores, RH | O que é, para que serve e como usar (sem jargão técnico) |
| [Documentação Técnica](docs/DOCUMENTACAO_TECNICA.md) | Desenvolvedores | Arquitetura, API, modelos, matchmaking e setup local |
| [Auditoria Técnica](docs/AUDITORIA_TECNICA.md) | Arquitetos / tech leads | Revisão de segurança, escalabilidade, resiliência, a11y e performance |
| [Tenancy e service_role](docs/TENANCY_E_SERVICE_ROLE.md) | Desenvolvedores / segurança | RLS no request path e uso de service_role |

## Estrutura

```
plataforma-talentos/
├── backend/          # API FastAPI e serviços
├── frontend/         # Interface Next.js
└── docs/             # Documentação
```

## Estado da remediação

A auditoria P0–P3 e o residual (incluindo **Fase F / RLS no request path**) estão aplicados na `main`.

- Sessão HttpOnly; middleware valida JWT
- Com `SUPABASE_ANON_KEY`, o PostgREST aplica RLS; `service_role` só em login/seed/health/boot
- Seed fora do boot; senhas via `DEMO_PASSWORD_*`
- Upload em chunks; rate limit com Redis opcional
- `/docs` desligado em production
- `007_repair_usuarios.sql` em `backend/supabase/manual/` (one-shot)

Detalhes: [docs/AUDITORIA_TECNICA.md](docs/AUDITORIA_TECNICA.md).

## Setup rápido (dev)

### Backend

1. Copie `backend/.env.example` → `backend/.env` e preencha Supabase + `SECRET_KEY`.
2. (Recomendado) Defina `SUPABASE_ANON_KEY` e use o **JWT Secret** do Supabase como `SECRET_KEY` para testar RLS.
3. Instale e suba:

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

4. Seed de contas locais:

```bash
cd backend
python -m scripts.seed_demo
```

Senhas: variáveis `DEMO_PASSWORD_ADMIN` (etc.) ou defaults só em development. O script **não imprime** senhas.

| Papel | E-mail |
|-------|--------|
| Admin | `admin@cobra-coral.com` |
| Recrutador | `recrutador@cobra-coral.com` |
| Mentor | `mentor@cobra-coral.com` |
| Talento | `talento@cobra-coral.com` |

Health: `GET http://127.0.0.1:8000/health`

### Frontend

1. Copie `frontend/.env.example` → `frontend/.env.local`.
2. `AUTH_SECRET` = mesmo valor de `SECRET_KEY` do backend.
3. Em HTTP local, `COOKIE_SECURE=false` (ou omita).

```bash
cd frontend
npm install
npm run dev
```

Abra http://localhost:3000.

## Produção (checklist)

- `ENVIRONMENT=production` (exige `SUPABASE_ANON_KEY`; cookie Secure; sem `/docs`)
- `SECRET_KEY` = JWT Secret do Supabase
- Migrations `001`–`006` + `008` aplicadas; **não** aplicar `manual/007` automaticamente
- `REDIS_URL` recomendado se houver vários workers
- Contas demo: não usar seed em prod (ou `SEED_ALLOW_PRODUCTION=1` + senhas fortes via env)
