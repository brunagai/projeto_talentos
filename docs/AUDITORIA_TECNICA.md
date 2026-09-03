# Auditoria Técnica — Plataforma Talentos

**Data da revalidação:** 3 de setembro de 2026  
**Escopo:** backend (FastAPI + Supabase) e frontend (Next.js 15)  
**Critério:** 6 pilares de engenharia corporativa  
**Baseline original:** nota 6,0/10 · revalidação pós-P3: 7,2/10  
**Código analisado:** branch `main` @ `e7f96c6` (hardening gestor/upload/sessão)

---

## Resumo executivo

O roadmap **P0–P3** e dois ciclos posteriores (polish + hardening) **foram executados**. Os bloqueadores originais (JWT no `localStorage`, upsert N+1, ausência de `/health`, deps sem pin, página 100% client, middleware só checando presença de cookie, `gestor_nome` do payload, upload lido inteiro antes do 413, cards com `<a>` aninhado) **não são mais o estado do código**.

A plataforma **ultrapassa a meta corporativa de 7/10 na média**, mas **ainda não está pronta para produção multi-tenant externa**. A defesa em profundidade continua incompleta: RLS existe no SQL, porém o backend usa `service_role` (bypass). Senhas demo ainda vivem no código-fonte do seed.

| Pilar | Original | Pós-P3 | Atual | Delta vs original |
|-------|----------|--------|-------|-------------------|
| Segurança | 5 | 7 | **8** | +3 |
| Escalabilidade | 6 | 7 | **8** | +2 |
| Resiliência | 6 | 7 | **8** | +2 |
| Clean Code | 7 | 8 | **8** | +1 |
| A11y / UX | 6 | 7 | **8** | +2 |
| Performance | 6 | 7 | **8** | +2 |

**Nota média:** 8,0/10 (antes 6,0 · pós-P3 7,2) · **Meta 7/10:** atingida em todos os pilares

### Roadmap original × status

| Item | Status |
|------|--------|
| P0 Seed demo gateado | **Resolvido** — fora do boot; só via `python -m scripts.seed_demo` |
| P0 Cookie HttpOnly | **Resolvido** |
| P0 RLS no Supabase | **Parcial** — políticas existem; API ainda usa `service_role` (Fase F) |
| P1 Batch upsert | **Resolvido** |
| P1 Rate limit + limite de upload | **Parcial** — teto em chunks ok; rate limit ainda in-memory |
| P1 Focus trap + `role="alert"` | **Resolvido** no modal e `AlertErro`; tabs WAI-ARIA ainda abertas |
| P2 `talento ∈ turma` | **Resolvido** |
| P2 Exceções tipadas | **Resolvido** na maior parte (`status_code` / `public_message`) |
| P2 `useCargos()` | **Parcial** — cache + invalidação no logout; sem SWR/TTL |
| P3 Server Components + CSP | **Parcial** — shell RSC + CSP reforçado; ainda `'unsafe-inline'` em scripts |
| P3 Pin `requirements.txt` | **Resolvido** |
| P3 `GET /health` | **Resolvido** |

### Ciclos pós-P3 (commits recentes)

| Commit | Entrega |
|--------|---------|
| `a0f769f` | Seed fora do boot, JWT no middleware, a11y cards, `to_thread` no upload, erros tipados |
| `5b6a470` | Paginação PostgREST, demo só em UI de development, login fresco, mensagem de senha inválida |
| `62ffec7` | Lazy load Home/modal, CSP (`script-src-attr 'none'`), RBAC talento no matchmaking |
| `e7f96c6` | `gestor_nome` do usuário autenticado, upload em chunks, logout no 401, invalidação de `useCargos` |

---

## 1. Segurança

### O que está bom

- Cookie de sessão `HttpOnly` + `SameSite=Lax`; frontend usa `credentials: "include"` e **não** guarda JWT em `localStorage`
- Middleware Next.js valida assinatura e expiração com `jose` + `AUTH_SECRET` (mesmo valor de `SECRET_KEY`)
- `/login` sempre acessível; cookie inválido é limpo no redirect
- Em 401 (fora de login/logout), `apiFetch` chama `POST /auth/logout` antes de redirecionar
- `COOKIE_SECURE` acompanha `ENVIRONMENT=production` quando não sobrescrito
- Papel recarregado do banco a cada request
- JWT com `algorithms=["HS256"]` (sem `alg=none`)
- Login com mensagem uniforme, bcrypt, throttle por IP
- Upload: extensão, vazio, **leitura em chunks** com aborto ao ultrapassar `MAX_UPLOAD_BYTES`
- `gestor_nome` definido no servidor (`usuario.nome`); campo removido do body/UI
- Talento **não** pode ranquear a turma inteira via matchmaking
- Credenciais demo na UI **somente** em `NODE_ENV === "development"`
- Headers: CSP, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy, HSTS em produção
- Zero `dangerouslySetInnerHTML`

### Achados × status atual

| ID | Status | Evidência |
|----|--------|-----------|
| SEC-01 RLS | **Parcial** | `006_row_level_security.sql`; backend ainda usa `service_role` — ver `docs/TENANCY_E_SERVICE_ROLE.md` |
| SEC-02 Demo | **Parcial** | Seed manual; senhas ainda em `auth_store` / script de seed |
| SEC-03 localStorage | **Resolvido** | Cookie HttpOnly |
| SEC-04 Middleware JWT | **Resolvido** | `frontend/src/middleware.ts` + `jose` |
| SEC-05 Limite upload | **Resolvido** | `_ler_upload_com_limite` em `avaliacoes.py` |
| SEC-06 Rate limit | **Parcial** | In-memory, por IP, não compartilhado entre workers |
| SEC-07 `gestor_nome` | **Resolvido** | `gestor.py` passa `usuario.nome` |
| SEC-08 CSP | **Parcial** | CSP reforçado; `script-src` ainda com `'unsafe-inline'` (Next.js) |
| SEC-09 Credenciais na UI | **Resolvido** (prod) | Hint só em development |

### Críticos / altos restantes

**SEC-01 / defesa em profundidade — RLS não protege a API (Fase F)**

Qualquer `.eq("turma_id")` esquecido no Python pode vazar tenant, porque `service_role` bypassa RLS.

Refatoração: JWT do usuário no PostgREST (ou impersonation); `anon`/`authenticated` no request path; `service_role` só em jobs admin auditados.

**SEC-02 — senhas demo no código**

`USUARIOS_DEMO` / seed ainda embute senhas. Em produção: não commitar senhas; desativar contas demo se existirem no banco.

**SEC-06 — rate limit**

Substituir por store compartilhado (Redis) se houver múltiplos workers.

**NEW-01 — `007_repair_usuarios.sql`**

Começa com `DROP TABLE IF EXISTS usuarios CASCADE` — tratar como script one-shot, nunca migração automática.

**NEW-08 — OpenAPI `/docs`**

Ainda aberto em qualquer ambiente; desligar em produção.

---

## 2. Escalabilidade

### O que está bom

- Arquitetura em camadas (`api` → `services` → stores)
- Matchmaking em memória
- **ESC-01 resolvido:** `_upsert_lote` em chunks + lookup de e-mails em lote
- **ESC-02 mitigado:** `asyncio.to_thread` no upload, histórico/comparativo/PDI e rotas de gestor
- **ESC-04 mitigado:** `listar_talentos` / matchmaking usam `.range()` PostgREST

### Restantes

| ID | Status | Notas |
|----|--------|-------|
| ESC-01 N+1 upsert | **Resolvido** | |
| ESC-02 I/O no event loop | **Parcial** | auth, matchmaking e health ainda sync no event loop |
| ESC-03 DB a cada auth | **Aberto** | Sem cache TTL de usuário |
| ESC-04 Paginação API | **Resolvido** | `.range()` com page/page_size |

---

## 3. Resiliência

### O que está bom

- `/health` (Supabase) e `/health/live` (processo)
- Hierarquia de erros tipados com `status_code` / `public_message` + handlers
- Planilha acumula erros por linha
- Lifespan loga falha com `logger.exception` (não engole em silêncio)

### Restantes

| ID | Status |
|----|--------|
| RES-01 lifespan silencioso | **Resolvido** (log); fail-fast em prod ainda opcional |
| RES-02 HTTP por substring | **Resolvido** na maior parte |
| RES-03 PDI engole `GestorStoreError` | **Parcial** — ainda `except GestorStoreError` sem distinguir 404 vs 503 |
| RES-04 validação de notas/semana | **Parcial** |
| `/health` | **Resolvido** |

---

## 4. Clean Code

### O que está bom

- Routers com response models
- Lógica pura em matchmaking / métricas / PDI
- `apiFetch<T>` centralizado; logout no 401
- `requirements.txt` com pin
- Módulo `exceptions/`; `useCargos` + `invalidarCacheCargos`
- Removidos helpers vazios (`podeVerMatchmaking` / `podeVerGestor`) e componentes mortos associados

### Restantes

| ID | Status |
|----|--------|
| CC-01 Imports `_executar` entre stores | **Aberto** |
| CC-02 Config morta | **Parcial** — `DATABASE_URL` declarado e não usado |
| CC-03 `formatarNota` duplicado | **Aberto** — Home / Lista / Resultados |
| Pin de deps | **Resolvido** |

---

## 5. Acessibilidade e UX

### O que está bom

- `lang="pt-BR"`, `<main>` em home e login
- Login com `htmlFor`/`id`, `autoComplete`
- Modal: `role="dialog"`, Escape, restore de foco, trap de Tab
- `AlertErro` com `role="alert"` `aria-live="assertive"`
- Cards com botão explícito “Ver detalhes” (sem `<a>` dentro de `<button>`)
- Radars com `aria-label` e alternativa numérica
- Paginação `aria-current`; `rel="noopener noreferrer"`

### Restantes

| ID | Status |
|----|--------|
| A11Y-01 Focus trap | **Resolvido** no modal (manual) |
| A11Y-02 Tabs WAI-ARIA | **Aberto** — `aria-pressed` em vez de `tablist`/`tab` |
| A11Y-03 Live regions | **Parcial** |
| A11Y-04 Drop zone | **Parcial** |
| Cards aninhados inválidos | **Resolvido** |

---

## 6. Performance

### O que está bom

- Shell RSC (`layout.tsx`, `page.tsx`, `login/page.tsx`)
- `next/dynamic` no modal (Evolução / Comparativo / PDI) e no Home (upload / formulário)
- `useCargos` com cache + coalescência + **invalidação no logout**
- Paginação em listas e na API

### Restantes

| ID | Status |
|----|--------|
| PERF-01 Página 100% client | **Resolvido** (Providers client ainda envolve rotas) |
| PERF-02 Cache de cargos | **Parcial** — invalida no logout; sem TTL |
| PERF-03 gráficos pesados | **Resolvido** via `dynamic()` |

---

## Achados novos × status (pós-P3)

| ID | Sev | Status | Achado |
|----|-----|--------|--------|
| NEW-01 | Crítico | **Aberto** (processo) | `007_repair_usuarios.sql` com `DROP TABLE` |
| NEW-02 | Alto | **Resolvido** | Upload lia arquivo inteiro antes do 413 |
| NEW-03 | Alto | **Resolvido** | Loop 401 ↔ cookie stale |
| NEW-04 | Alto | **Resolvido** | `COOKIE_SECURE` alinhado a `ENVIRONMENT` |
| NEW-05 | Médio | **Resolvido** | Talento ranqueava turma via matchmaking |
| NEW-06 | Médio | **Resolvido** | Cache de cargos sobrevivia ao logout |
| NEW-07 | Médio | **Resolvido** | `<button>` aninhava `<a>` |
| NEW-08 | Médio | **Aberto** | OpenAPI `/docs` aberto |
| NEW-09 | Baixo | **Aberto** | Sem `eslint-config-next` apesar do script `lint` |

---

## Roadmap residual (prioridade)

### Ainda bloqueia produção externa (Fase F)

- [ ] Isolamento real de tenant: RLS efetivo no request path (ver `docs/TENANCY_E_SERVICE_ROLE.md`)
- [ ] Não aplicar `007` como migração automática
- [ ] Remover senhas demo do código-fonte; desativar contas demo em prod
- [ ] Desligar `/docs` (e `/redoc`) em produção
- [ ] (Opcional) Fail-fast no lifespan quando `ENVIRONMENT=production`

### Alto impacto / polish

- [ ] Rate limit distribuído (Redis)
- [ ] CSP com nonce (remover `'unsafe-inline'` de `script-src` em prod)
- [ ] Tabs WAI-ARIA (`tablist` / `tab` / `tabpanel`)
- [ ] Distinguir 404 vs 503 no PDI ao falhar busca do gestor
- [ ] `to_thread` (ou equivalente) em auth/matchmaking se o event loop saturar

### Qualidade

- [ ] Cache TTL de `buscar_usuario_por_id`
- [ ] Extrair `_executar` / UUID para `app/db`
- [ ] Unificar `formatarNota`
- [ ] Remover `DATABASE_URL` morto ou documentar uso futuro
- [ ] `eslint-config-next` alinhado ao script `lint`

---

## Conclusão

A plataforma **saiu de MVP frágil (6,0) para um patamar corporativo sólido (8,0)**. Sessão HttpOnly com JWT validado, seed controlado, upload limitado em chunks, RBAC de matchmaking, a11y dos cards, lazy load e erros tipados **estão entregues**.

O que ainda impede “produção com clientes externos” não é falta de features de produto: é **confiança no isolamento de dados** (`service_role` vs RLS) e **higiene de credenciais demo no repositório**. Com a Fase F e a remoção das senhas do código, a nota de Segurança sobe para 9 e o go-live deixa de ser um risco estrutural de tenant leak.
