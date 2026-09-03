# plataforma-talentos

Plataforma modular de gestão e avaliação de talentos — FastAPI + Supabase (backend) e Next.js 15 (frontend).

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
├── backend/          # API FastAPI e serviços
├── frontend/         # Interface Next.js
└── docs/             # Documentação
```

## Estado da remediação

A auditoria P0–P3 e os ciclos de polish/hardening foram aplicados na `main`. Destaques:

- Sessão em cookie **HttpOnly**; middleware Next.js valida JWT (`jose` + `AUTH_SECRET`)
- Seed de usuários demo **fora do boot** (`python -m scripts.seed_demo`)
- Upload com teto em chunks; I/O pesado via `asyncio.to_thread`
- Cards com botão “Ver detalhes” (sem `<a>` aninhado em `<button>`)
- Isolamento multi-tenant ainda é **aplicação-first** (ver [tenancy](docs/TENANCY_E_SERVICE_ROLE.md)) — **não pronto** para produção multi-tenant externa sem a Fase F (RLS real)

Detalhes e notas por pilar: [docs/AUDITORIA_TECNICA.md](docs/AUDITORIA_TECNICA.md).

## Setup rápido (dev)

### Backend

1. Copie `backend/.env.example` → `backend/.env` e preencha Supabase + `SECRET_KEY`.
2. Instale dependências e suba a API:

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

3. **Usuários demo não são criados no boot.** Para popular contas locais:

```bash
cd backend
python -m scripts.seed_demo
```

Contas demo (após o seed), senha padrão `admin123`:

| Papel | E-mail |
|-------|--------|
| Admin | `admin@cobra-coral.com` |
| Recrutador | `recrutador@cobra-coral.com` |
| Mentor | `mentor@cobra-coral.com` |
| Talento | `talento@cobra-coral.com` |

Health: `GET http://127.0.0.1:8000/health` · `GET http://127.0.0.1:8000/health/live`

### Frontend

1. Copie `frontend/.env.example` → `frontend/.env.local`.
2. Defina `AUTH_SECRET` com **o mesmo valor** de `SECRET_KEY` do backend (obrigatório para o middleware validar o JWT).
3. Em HTTP local, mantenha `COOKIE_SECURE=false` (ou omita; o default em development é inseguro).
4. Instale e suba:

```bash
cd frontend
npm install
npm run dev
```

Abra http://localhost:3000 — a tela de login deve aparecer (credenciais demo só na UI em `NODE_ENV=development`).

## Observações de segurança (dev → prod)

- Não exponha `SUPABASE_KEY` (`service_role`) ao browser.
- Em produção, use `ENVIRONMENT=production` (força cookie Secure) e HTTPS.
- A migration `007_repair_usuarios.sql` contém `DROP TABLE` — **não** aplicar em pipeline automático; é script one-shot.
- Go-live multi-tenant externo depende da Fase F descrita em `docs/TENANCY_E_SERVICE_ROLE.md`.
