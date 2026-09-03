# Auditoria Técnica — Plataforma Talentos

**Data da revalidação:** 3 de setembro de 2026  
**Escopo:** backend (FastAPI + Supabase) e frontend (Next.js 15)  
**Critério:** 6 pilares de engenharia corporativa  
**Baseline original:** nota 6,0/10 · pós-P3: 7,2/10 · pós-hardening: 8,0/10  
**Código analisado:** branch `main` (fechamento do residual da auditoria)

---

## Resumo executivo

O roadmap **P0–P3**, os ciclos de polish/hardening e o **residual da auditoria** (incluindo Fase F de RLS no request path) foram executados.

A plataforma atinge patamar corporativo pleno na média dos pilares. Produção multi-tenant exige configurar `SUPABASE_ANON_KEY` (obrigatória quando `ENVIRONMENT=production`) e alinhar `SECRET_KEY` ao JWT Secret do Supabase — ver `docs/TENANCY_E_SERVICE_ROLE.md`.

| Pilar | Original | Pós-P3 | Hardening | Atual |
|-------|----------|--------|-----------|-------|
| Segurança | 5 | 7 | 8 | **9** |
| Escalabilidade | 6 | 7 | 8 | **8** |
| Resiliência | 6 | 7 | 8 | **9** |
| Clean Code | 7 | 8 | 8 | **9** |
| A11y / UX | 6 | 7 | 8 | **9** |
| Performance | 6 | 7 | 8 | **8** |

**Nota média:** 8,7/10 · **Meta 7/10:** atingida em todos os pilares

### Roadmap × status final

| Item | Status |
|------|--------|
| P0 Seed demo gateado | **Resolvido** — CLI + env; bloqueado em prod |
| P0 Cookie HttpOnly | **Resolvido** |
| P0 / Fase F RLS | **Resolvido** — anon + JWT no request; service_role só admin |
| P1 Batch upsert | **Resolvido** |
| P1 Rate limit + upload | **Resolvido** — chunks + Redis opcional |
| P1 Focus trap + alerts | **Resolvido** |
| P2 `talento ∈ turma` | **Resolvido** |
| P2 Exceções tipadas | **Resolvido** |
| P2 `useCargos()` | **Resolvido** — cache + invalidação no logout |
| P3 RSC + CSP | **Resolvido** (CSP: `script-src-attr 'none'`; Next ainda injeta bootstrap inline) |
| P3 Pin deps + `/health` | **Resolvido** |
| OpenAPI em prod | **Resolvido** — `/docs` desligado em production |
| Migration `007` DROP | **Resolvido** — movida para `supabase/manual/` |
| Tabs WAI-ARIA | **Resolvido** — componente `Tabs` |
| PDI 404 vs 503 | **Resolvido** |
| ESLint Next | **Resolvido** |

### Residual aceito (não bloqueante)

| Item | Nota |
|------|------|
| CSP `script-src 'unsafe-inline'` | Limitação do bootstrap do Next.js; mitigado com `script-src-attr 'none'` |
| Cache TTL de usuário | Opcional; papel já é revalidado no banco a cada request |
| Extrair `_executar` para `app/db` | Refatoração cosmética |

---

## 1. Segurança — o que está bom

- Cookie HttpOnly; middleware valida JWT (`jose` + `AUTH_SECRET`)
- Request path com RLS quando `SUPABASE_ANON_KEY` está setada (obrigatória em prod)
- Login/seed/health usam `get_supabase_admin()` (service_role)
- Upload em chunks; `gestor_nome` do servidor; talento não ranqueia turma
- `/docs`/`/redoc`/`openapi.json` desligados em production
- Seed sem senhas commitadas como única fonte; env `DEMO_PASSWORD_*`
- Rate limit com Redis opcional (`REDIS_URL`)
- Fail-fast no lifespan em production

---

## 2–6. Demais pilares (estado)

- **Escalabilidade:** batch upsert, `to_thread`, paginação `.range()`, Redis rate limit
- **Resiliência:** health, erros tipados, PDI distingue 404/503, lifespan com log + fail-fast prod
- **Clean Code:** `formatarNota` único, `DATABASE_URL` removido da Settings, Tabs compartilhado
- **A11y:** cards com botão explícito, modal com focus trap, tabs `tablist`/`tab`/`tabpanel`
- **Performance:** RSC shell, `dynamic()`, cache de cargos invalidado no logout

---

## Conclusão

A auditoria está **fechada** para os itens acionáveis do roadmap. Go-live multi-tenant: definir `SUPABASE_ANON_KEY`, alinhar `SECRET_KEY` ao JWT Secret do Supabase, aplicar migrations `006`+`008`, e **não** rodar `manual/007` em pipeline automático.
