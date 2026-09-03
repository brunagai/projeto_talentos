# Auditoria Técnica — Plataforma Talentos

**Data:** setembro/2026  
**Escopo:** backend (FastAPI + Supabase) e frontend (Next.js 15)  
**Critério:** padrões corporativos de engenharia de software (6 pilares)  
**Versão analisada:** Pilares 1–6 implementados (persistência, histórico, links, gestor, PDI, auth multi-tenant)

---

## Resumo executivo

A base do projeto demonstra **maturidade arquitetural acima da média para um MVP**: camadas bem definidas (`api` → `services` → `stores`), validação Pydantic, RBAC explícito e cliente HTTP centralizado no frontend (`apiFetch`).

Para **produção multi-tenant corporativa**, os bloqueadores principais são:

1. **Defesa em profundidade** — autorização só na aplicação; banco sem RLS; tokens acessíveis via JavaScript
2. **Escalabilidade de persistência** — upserts sequenciais (N+1) em uploads de planilha
3. **Resiliência observável** — falhas silenciosas no bootstrap e mapeamento frágil de erros HTTP
4. **Acessibilidade** — modal sem focus trap; erros assíncronos sem live regions

| Pilar | Nota (0–10) | Situação |
|-------|-------------|----------|
| Segurança | 5 | Auth na app ok; RLS e storage de token críticos |
| Escalabilidade | 6 | Boa arquitetura; gargalo em I/O de upload |
| Resiliência | 6 | Exceções de domínio; falhas silenciosas pontuais |
| Clean Code | 7 | Separação clara; duplicação e código morto leve |
| A11y / UX | 6 | Base semântica; modal e feedback incompletos |
| Performance | 6 | Adequado para cohorts pequenas; sem cache de API |

**Nota média:** 6,0/10 · **Meta corporativa sugerida:** 7/10 em todos os pilares

---

## 1. Segurança

### Pontos fortes

- **bcrypt** com salt por senha (`auth_store.py`)
- **JWT** com algoritmo fixo (`HS256` whitelist)
- **Papel carregado do banco** em cada request — não confia apenas no token
- **`RoleChecker` / `exigir_papeis`** reutilizável nas rotas
- **`verificar_acesso_talento`** restringe o papel `talento` ao próprio `talento_id`
- **PostgREST/Supabase** — sem SQL concatenado (risco de injection baixo)
- **Pydantic** com `extra="forbid"` nos modelos críticos
- **CORS** restrito a `localhost:3000` em desenvolvimento
- **Login** com mensagem uniforme (sem enumeração de usuários)

### Achados críticos

| ID | Achado | Local | Risco | Refatoração sugerida |
|----|--------|-------|-------|-------------------|
| SEC-01 | Sem RLS no Supabase + `service_role` | `backend/.env.example`, migrations | Chave vazada = acesso total a todos os tenants | Políticas RLS por `organizacao_id`/`turma_id`; reduzir escopo da chave |
| SEC-02 | Usuários demo com senhas fracas no startup | `backend/app/main.py` L21–26 | Backdoor em produção | Gatear com `ENV=development`; fail-fast em prod |
| SEC-03 | JWT em `localStorage` | `frontend/src/lib/auth.ts` | Roubo de sessão via XSS | Cookie `HttpOnly; Secure`; remover token do JS |

### Achados altos

| ID | Achado | Local | Refatoração sugerida |
|----|--------|-------|---------------------|
| SEC-04 | Middleware não valida JWT | `frontend/src/middleware.ts` | Validar assinatura/expiração com `jose` |
| SEC-05 | Upload sem limite de tamanho | `backend/app/api/avaliacoes.py` | `MAX_UPLOAD_BYTES` + HTTP 413 |
| SEC-06 | Sem rate limiting no login | `backend/app/api/auth.py` | `slowapi` ou throttle por IP |

### Achados médios

| ID | Achado | Local | Refatoração sugerida |
|----|--------|-------|---------------------|
| SEC-07 | `gestor_nome` vem do payload | `gestor_store.py` L92 | Usar `usuario.nome` no router |
| SEC-08 | Sem CSP / security headers | `frontend/next.config.js` | Headers em `next.config.js` |
| SEC-09 | Credenciais demo na UI de login | `frontend/src/app/login/page.tsx` | Remover ou condicionar a `NODE_ENV` |

---

## 2. Escalabilidade

### Pontos fortes

- Arquitetura **desacoplada** (routers finos, services com lógica de negócio)
- **Matchmaking em memória** — sem I/O no cálculo de fit
- **Join embutido** em `listar_talentos` por semana evita N+1 na leitura

### Achados altos

| ID | Achado | Local | Impacto | Refatoração sugerida |
|----|--------|-------|---------|---------------------|
| ESC-01 | N+1 upserts em `salvar_talentos` | `talentos_store.py` L130–187 | 200 linhas ≈ 400 req HTTP | Batch `.upsert([...])` por tabela |
| ESC-02 | I/O síncrono em handler `async` | `avaliacoes.py` upload | Bloqueia event loop | `run_in_executor` ou cliente async |

### Achados médios

| ID | Achado | Refatoração sugerida |
|----|--------|---------------------|
| ESC-03 | DB hit em toda request autenticada | Cache TTL 30–60s por `user_id` |
| ESC-04 | Listagens sem paginação | `limit`/`offset` na API de talentos |

---

## 3. Resiliência e tratamento de falhas

### Pontos fortes

- Exceções de domínio: `AuthStoreError`, `TalentosStoreError`, `GestorStoreError`, `PdiServiceError`
- Wrapper `_executar` centraliza erros do PostgREST
- Upload valida extensão e arquivo vazio
- Planilha coleta erros por linha (não falha o lote inteiro)

### Achados altos

| ID | Achado | Local | Refatoração sugerida |
|----|--------|-------|---------------------|
| RES-01 | `except Exception: pass` no lifespan | `main.py` L25–26 | `logger.exception` + raise em produção |
| RES-02 | Status HTTP por string de erro | `talentos.py`, `pdi_service` | Hierarquia de exceções tipadas → 404/400 |

### Achados médios

| ID | Achado | Refatoração sugerida |
|----|--------|---------------------|
| RES-03 | PDI ignora `GestorStoreError` silenciosamente | Log + distinguir 404 de erro de infra |
| RES-04 | `semana_numero` sem `ge=1`; skills sem bound 0–5 | Validadores Pydantic compartilhados |

### Lacunas

- Sem endpoint `/health` para orquestradores
- Sem exception handler global com schema de erro padronizado

---

## 4. Clean Code e manutenibilidade

### Pontos fortes

- Routers com response models Pydantic na fronteira
- Lógica pura em `matchmaking_service`, `metricas_service`, `pdi_service`
- Tipagem Python 3.10+ e TypeScript com interfaces dedicadas
- `apiFetch<T>` centralizado no frontend

### Achados médios

| ID | Achado | Refatoração sugerida |
|----|--------|---------------------|
| CC-01 | Imports privados entre stores (`_executar`, `_obter_turma_id`) | Extrair `app/db/utils.py` |
| CC-02 | `DATABASE_URL` obrigatório mas não usado; JWT_EXPIRE duplicado | Limpar config; usar `settings.JWT_EXPIRE_MINUTES` |
| CC-03 | `podeVerMatchmaking` não usado; `formatarNota` duplicado | DRY em `src/lib/` |

### Código morto identificado

- `verificar_token_supabase()` — nunca chamado
- `limpar_talentos()` — sem referência
- `listar_cargos()` em matchmaking — sem uso

### Dependências

- `requirements.txt` sem pin de versão — risco de builds não reproduzíveis

---

## 5. Acessibilidade e usabilidade (A11y / UX)

### Pontos fortes

- `lang="pt-BR"` no layout
- Login com `htmlFor`/`id`, `autoComplete`, `<main>`
- Modal com `role="dialog"`, `aria-modal`, `aria-labelledby`
- Tecla **Escape** fecha o modal
- SVGs com `role="img"` e `aria-label` (`EvolucaoTemporal`, `SoftSkillsRadar`)
- Paginação com `aria-current="page"` (`ListaTalentos`)
- Links externos com `rel="noopener noreferrer"`

### Achados altos

| ID | Achado | Local | Refatoração sugerida |
|----|--------|-------|---------------------|
| A11Y-01 | Modal sem focus trap | `ModalDetalheTalento.tsx` L76–88 | `@focus-trap/react`; restore focus ao fechar |

### Achados médios

| ID | Achado | Refatoração sugerida |
|----|--------|---------------------|
| A11Y-02 | Tabs sem padrão WAI-ARIA completo | `role="tablist"`, `aria-selected`, `aria-controls` |
| A11Y-03 | Erros sem `role="alert"` / `aria-live` | Anunciar falhas de login e formulários |
| A11Y-04 | Drop zone de upload sem `aria-label` | Nome acessível na zona de arrastar |

---

## 6. Performance e otimização

### Pontos fortes

- **Lazy mount** de abas no modal (PDI, gestor, evolução só montam quando ativas)
- `useMemo` em rankings, filtros e séries temporais
- `useCallback` em fetches com dependências estáveis
- Cancelamento de fetch via flag em `useEffect`
- Paginação em `ListaTalentos`

### Achados médios

| ID | Achado | Refatoração sugerida |
|----|--------|---------------------|
| PERF-01 | Página inteira como Client Component | Server Components para shell estático |
| PERF-02 | `/matchmaking/cargos` buscado múltiplas vezes | Hook `useCargos()` com SWR/React Query |
| PERF-03 | Componentes monolíticos (`EvolucaoTemporal` ~568 linhas) | Extrair subcomponentes; code-split |

---

## Roadmap de remediação

### P0 — Bloqueadores de produção

- [ ] Remover ou gatear seed de usuários demo (`garantir_usuarios_demo`)
- [ ] Cookie `HttpOnly` + remover JWT do `localStorage`
- [ ] Implementar RLS no Supabase por organização/turma

### P1 — Alto impacto

- [ ] Batch upsert em `salvar_talentos`
- [ ] Rate limit em `POST /auth/login` + limite de tamanho de upload
- [ ] Focus trap no modal + `role="alert"` em mensagens de erro

### P2 — Qualidade

- [ ] Validar `talento ∈ turma` antes de writes do gestor
- [ ] Exceções tipadas com status HTTP explícitos
- [ ] Hook `useCargos()` com cache (SWR/React Query)

### P3 — Hardening

- [ ] Server Components + security headers (CSP, X-Frame-Options)
- [ ] Pin de dependências em `requirements.txt`
- [ ] Endpoint `GET /health` para probes de orquestração

---

## Arquivos revisados (referência)

### Backend

| Arquivo | Foco |
|---------|------|
| `app/main.py` | Bootstrap, CORS, lifespan |
| `app/core/auth.py` | JWT, papéis, tenant |
| `app/core/config.py` | Secrets e settings |
| `app/services/auth_store.py` | Autenticação e demo users |
| `app/services/talentos_store.py` | Persistência e N+1 |
| `app/services/gestor_store.py` | Avaliações do gestor |
| `app/services/pdi_service.py` | Geração de PDI |
| `app/api/auth.py` | Login e `/me` |
| `app/api/avaliacoes.py` | Upload e métricas |
| `app/api/talentos.py` | Histórico, comparativo, PDI |
| `app/api/gestor.py` | CRUD gestor |
| `app/api/matchmaking.py` | Ranking |
| `supabase/migrations/*.sql` | Schema (sem RLS) |

### Frontend

| Arquivo | Foco |
|---------|------|
| `src/lib/auth.ts` | Storage de token |
| `src/lib/api.ts` | Cliente HTTP |
| `src/middleware.ts` | Proteção de rotas |
| `src/context/AuthContext.tsx` | Sessão |
| `src/app/login/page.tsx` | Login |
| `src/app/page.tsx` | Dashboard e RBAC |
| `src/components/ModalDetalheTalento.tsx` | Modal e abas |
| `src/components/EvolucaoTemporal.tsx` | Gráficos e fetch |
| `next.config.js` | Security headers |

---

## Conclusão

O **projeto_talentos** está bem posicionado como **MVP funcional** com pilares de produto implementados de ponta a ponta. A evolução para **ambiente corporativo multi-tenant** exige investimento concentrado em segurança em profundidade (RLS + cookies HttpOnly), performance de persistência (batch writes) e observabilidade (sem falhas silenciosas, health checks).

Recomenda-se tratar os itens **P0** antes de expor a plataforma a clientes externos; os itens **P1–P2** podem ser entregues em sprints incrementais sem bloquear homologação interna.
