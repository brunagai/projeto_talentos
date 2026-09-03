# Auditoria Técnica — Plataforma Talentos

**Data da revalidação:** 2 de setembro de 2026  
**Escopo:** backend (FastAPI + Supabase) e frontend (Next.js 15)  
**Critério:** 6 pilares de engenharia corporativa  
**Baseline:** `docs/AUDITORIA_TECNICA.md` (auditoria original, nota 6,0/10)  
**Código analisado:** branch `fix/auditoria-p0-p1` @ `b3a6b41`

---

## Resumo executivo

O roadmap **P0–P3 foi em grande parte executado**. Os bloqueadores originais (JWT no `localStorage`, upsert N+1, ausência de `/health`, `requirements.txt` sem pin, página 100% client) **não são mais o estado do código**.

O sistema **atinge a meta corporativa de 7/10 na média**, mas **não está pronto para produção multi-tenant externa**. A defesa em profundidade continua ilusória: RLS existe no SQL, porém o backend usa `service_role` (bypass). Middleware de cookie não valida o JWT. Credenciais demo seguem no repositório e na UI.

| Pilar | Nota original | Nota atual | Delta |
|-------|---------------|------------|-------|
| Segurança | 5 | 7 | +2 |
| Escalabilidade | 6 | 7 | +1 |
| Resiliência | 6 | 7 | +1 |
| Clean Code | 7 | 8 | +1 |
| A11y / UX | 6 | 7 | +1 |
| Performance | 6 | 7 | +1 |

**Nota média:** 7,2/10 (antes 6,0) · **Meta:** 7/10 em todos os pilares — **atingida na média; nenhum pilar ficou abaixo de 7**

### Roadmap original × status

| Item | Status |
|------|--------|
| P0 Seed demo gateado | Parcial — não cria em `production`, senhas ainda no código |
| P0 Cookie HttpOnly | Resolvido |
| P0 RLS no Supabase | Parcial — políticas existem; API não as usa |
| P1 Batch upsert | Resolvido |
| P1 Rate limit + limite de upload | Parcial — existe, com lacunas |
| P1 Focus trap + `role="alert"` | Parcial |
| P2 `talento ∈ turma` | Resolvido |
| P2 Exceções tipadas | Parcial |
| P2 `useCargos()` | Parcial — cache em módulo, sem SWR e sem invalidação no logout |
| P3 Server Components + CSP | Parcial — shell RSC ok; CSP com `'unsafe-inline'` |
| P3 Pin `requirements.txt` | Resolvido |
| P3 `GET /health` | Resolvido |

---

## 1. Segurança

### O que está bom

- Cookie de sessão `HttpOnly` + `SameSite=Lax`; frontend usa `credentials: "include"` e **não** guarda JWT em `localStorage`
- Papel recarregado do banco a cada request (`obter_usuario_atual` → `buscar_usuario_por_id`)
- JWT com `algorithms=["HS256"]` (sem `alg=none`)
- Login com mensagem uniforme, bcrypt, throttle por IP
- PostgREST parametrizado — sem SQL concatenado
- Upload: extensão, arquivo vazio, teto de 10 MB (lógico)
- Validação `talento ∈ turma` no gestor e no upload
- Headers: CSP, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy, HSTS em produção
- Zero `dangerouslySetInnerHTML`

### Achados originais

| ID | Status | Evidência |
|----|--------|-----------|
| SEC-01 RLS | Parcial | `006_row_level_security.sql`; backend ainda usa `service_role` |
| SEC-02 Demo | Parcial | Gate em `main.py`; senhas em `auth_store.py` |
| SEC-03 localStorage | **Resolvido** | Cookie HttpOnly em `api/auth.py` |
| SEC-04 Middleware JWT | **Aberto** | Só testa presença do cookie |
| SEC-05 Limite upload | Parcial | Check **depois** de `arquivo.read()` |
| SEC-06 Rate limit | Parcial | In-memory, por IP, não compartilhado entre workers |
| SEC-07 `gestor_nome` | **Aberto** | Continua vindo do payload |
| SEC-08 CSP | Parcial | Headers existem; `script-src 'unsafe-inline'` em prod |
| SEC-09 Credenciais na UI | **Aberto** | Login ainda exibe `admin123` |

### Críticos / altos restantes

**SEC-01 / defesa em profundidade — RLS não protege a API**

O comentário da migração admite o bypass. Qualquer `.eq("turma_id")` esquecido vaza tenant.

```1:3:backend/supabase/migrations/006_row_level_security.sql
-- Pilar 6 / Auditoria P0: Row Level Security por organização e turma
-- O backend usa service_role (bypass de RLS). Estas políticas protegem acesso direto
-- via chave anon/authenticated do Supabase, usando claims JWT customizados.
```

Refatoração: emitir JWT do Supabase (ou `set_config` com claims) **ou** chave com RLS efetivo; nunca tratar `service_role` como defesa.

**SEC-04 + loop de sessão — cookie inválido**

```11:22:frontend/src/middleware.ts
  const token = request.cookies.get("access_token")?.value;

  if (pathname.startsWith("/login")) {
    if (token) {
      return NextResponse.redirect(new URL("/", request.url));
    }
```

`apiFetch` redireciona para `/login` em 401 **sem** chamar logout. O cookie HttpOnly permanece → middleware manda de volta para `/`.

Refatoração: em 401, `POST /auth/logout` e só então navegar; no middleware, não redirecionar `/login` só porque o cookie existe (deixar o AuthGuard confirmar a sessão) **ou** validar JWT com `jose`.

**SEC-05 — teto depois da leitura**

```116:126:backend/app/api/avaliacoes.py
    conteudo = await arquivo.read()
    ...
    if len(conteudo) > settings.MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, ...)
```

Refatoração: ler em chunks e abortar ao ultrapassar o limite (Starlette `SpooledTemporaryFile` + teto no proxy).

**SEC-02 / SEC-09 — senhas demo**

```16:22:backend/app/services/auth_store.py
USUARIOS_DEMO = [
    {
        "email": "admin@cobra-coral.com",
        "senha": "admin123",
```

```25:27:frontend/src/app/login/page.tsx
        <p className="mt-6 text-center text-xs text-zinc-500">
          Demo: admin@cobra-coral.com / admin123
        </p>
```

Refatoração: não commitar senhas; UI só em `NODE_ENV !== "production"`; em prod, desativar contas demo se existirem.

**SEC-07 — nome do gestor controlado pelo cliente**

```90:94:backend/app/services/gestor_store.py
        "gestor_nome": payload.get("gestor_nome"),
```

Refatoração: `gestor_nome=usuario.nome` no router; ignorar o campo do body.

**COOKIE_SECURE default false** — forçar `True` quando `ENVIRONMENT` for `production`.

**NEW:** `007_repair_usuarios.sql` começa com `DROP TABLE IF EXISTS usuarios CASCADE` — não deve entrar em pipeline automático de migração.

---

## 2. Escalabilidade

### O que está bom

- Arquitetura em camadas (`api` → `services` → stores)
- Matchmaking em memória
- Join embutido em listagens por semana
- **ESC-01 resolvido:** `_upsert_lote` em chunks de 80 + lookup de e-mails em lote de 100

### Restantes

| ID | Status | Notas |
|----|--------|-------|
| ESC-01 N+1 upsert | **Resolvido** | `talentos_store.py` `_upsert_lote` |
| ESC-02 I/O no event loop | **Aberto** | `processar_planilha` + `salvar_talentos` síncronos dentro de `async def` |
| ESC-03 DB a cada auth | **Aberto** | Sem cache TTL de usuário |
| ESC-04 Paginação API | **Aberto** | `listar_talentos` é `select("*")` unbounded |

**ESC-02 — bloquear o event loop no upload**

```107:129:backend/app/api/avaliacoes.py
async def upload_avaliacoes(...):
    conteudo = await arquivo.read()
    resultado = processar_planilha(...)
    ...
    salvar_talentos(...)
```

Refatoração: `await asyncio.to_thread(processar_planilha, ...)` e o mesmo para `salvar_talentos`.

**ESC-04:** `limit`/`offset` (ou cursor) em `GET /talentos` e matchmaking.

---

## 3. Resiliência

### O que está bom

- `/health` (Supabase) e `/health/live` (processo)
- Hierarquia `AppError` + handlers de store
- Planilha acumula erros por linha
- Deduplicação antes do upsert evita o `ON CONFLICT ... second time`

### Restantes

| ID | Status |
|----|--------|
| RES-01 `except: pass` no lifespan | **Aberto** |
| RES-02 HTTP por substring | Parcial — `AppError` existe; stores ainda mapeiam mensagem |
| RES-03 PDI engole `GestorStoreError` | **Aberto** |
| RES-04 `semana_numero` / notas 0–5 | Parcial — gestor ok; `AvaliacaoSemanalCreate.semana_numero` sem `ge=1` |
| `/health` | **Resolvido** |

**RES-01**

```24:30:backend/app/main.py
    try:
        organizacao_id = garantir_organizacao_padrao()
        ...
    except Exception:
        pass
```

Refatoração: `logger.exception`; em produção, `raise`.

**RES-03**

```148:156:backend/app/services/pdi_service.py
    except GestorStoreError:
        avaliacao_gestor = None
```

Refatoração: logar; 404 → seguir sem gestor; erro de infra → 503.

Falta handler global de `Exception` → 500 sanitizado (hoje stack pode vazar no default do FastAPI).

---

## 4. Clean Code

### O que está bom

- Routers com response models
- Lógica pura em matchmaking / métricas / PDI
- `apiFetch<T>` centralizado
- `DATABASE_URL` deixou de ser obrigatório
- `requirements.txt` com pin direto + transitivo
- Módulo `exceptions/` e hook `useCargos`

### Restantes

| ID | Status |
|----|--------|
| CC-01 Imports `_executar` entre stores | **Aberto** |
| CC-02 Config morta | Parcial — `DATABASE_URL` ainda declarado e não usado |
| CC-03 `formatarNota` / `podeVerMatchmaking` | **Aberto** |
| Pin de deps | **Resolvido** |

Código morto ainda presente: `verificar_token_supabase`, `limpar_talentos`, `listar_cargos`, componente `HardSkillsBars` (só o tipo é importado), `limiarMercado` no modal.

---

## 5. Acessibilidade e UX

### O que está bom

- `lang="pt-BR"`, `<main>` em home e login
- Login com `htmlFor`/`id`, `autoComplete`
- Modal: `role="dialog"`, Escape, restore de foco, trap manual de Tab
- `AlertErro` com `role="alert"` `aria-live="assertive"` (login, upload, formulários)
- Paginação `aria-current`; SVGs com `aria-label`; `rel="noopener noreferrer"`

### Restantes

| ID | Status |
|----|--------|
| A11Y-01 Focus trap | Parcial — manual, listener só no container |
| A11Y-02 Tabs WAI-ARIA | **Aberto** — `aria-pressed` em vez de `tablist`/`tab` |
| A11Y-03 Live regions | Parcial — faltam EvolucaoTemporal, PDI, comparativo |
| A11Y-04 Drop zone | Parcial — teclado ok, sem `aria-label` no input file |

**Alto novo — `<a>` dentro de `<button>`** em `ListaTalentos`, `AbaCargos`, `AbaAreas` (`LinksTalento` filho do card clicável). Inválido para teclado e leitores de tela.

Refatoração: card como `article`; botão “Ver detalhes” separado dos links.

Tabs: `role="tablist"` / `tab` / `tabpanel`, setas, `aria-controls` — HomeDashboard, modal e ResultadosPlanilha.

---

## 6. Performance

### O que está bom

- Shell RSC (`layout.tsx`, `page.tsx`, `login/page.tsx`)
- Lazy *mount* de abas no modal
- `useCargos` com cache de módulo + coalescência de in-flight
- `useMemo` pontual em rankings e séries
- Paginação em `ListaTalentos`

### Restantes

| ID | Status |
|----|--------|
| PERF-01 Página 100% client | **Resolvido** (Providers client ainda envolve todas as rotas) |
| PERF-02 Cache de cargos | Parcial — sem TTL, **não limpa no logout** (risco cross-org na mesma aba) |
| PERF-03 `EvolucaoTemporal` ~568 linhas | **Aberto** — sem `next/dynamic` |

`HomeDashboard` importa `UploadPlanilha` estaticamente: o grafo resultados → modal → gráficos entra no bundle inicial **mesmo para papel talento**.

Refatoração: `dynamic(() => import("./UploadPlanilha"))` e o mesmo para Evolucao/PDI/Gestor; `limparCacheCargos()` no logout.

---

## Novos achados (pós-P3)

| ID | Sev | Achado |
|----|-----|--------|
| NEW-01 | Crítico | `007_repair_usuarios.sql` dá `DROP TABLE usuarios CASCADE` |
| NEW-02 | Alto | Upload lê o arquivo inteiro antes do 413 |
| NEW-03 | Alto | Loop 401 ↔ middleware por cookie stale |
| NEW-04 | Alto | `COOKIE_SECURE` não acompanha `ENVIRONMENT=production` |
| NEW-05 | Médio | Papel `talento` pode rankear a turma inteira via `/matchmaking/cargos` |
| NEW-06 | Médio | Cache de cargos sobrevive ao logout |
| NEW-07 | Médio | `<button>` aninha `<a>` nas listas |
| NEW-08 | Médio | OpenAPI `/docs` aberto em qualquer ambiente |
| NEW-09 | Baixo | Sem `eslint-config-next` apesar do script `lint` |

---

## Roadmap residual (prioridade)

### Ainda bloqueia produção externa

- [ ] Não aplicar `007` como migração automática; tratar como script one-shot
- [ ] Isolamento real de tenant (RLS efetivo **ou** revisão sistemática de todo `.eq("turma_id")`)
- [ ] Logout no 401 + middleware que não assume cookie válido
- [ ] Forçar `COOKIE_SECURE` em produção
- [ ] Remover senhas demo do git e da UI de produção
- [ ] Log + fail-fast no lifespan (`RES-01`)

### Alto impacto, sprint seguinte

- [ ] `asyncio.to_thread` no upload
- [ ] Stream/cap do body antes de alocar
- [ ] `gestor_nome` do usuário autenticado
- [ ] Tabs WAI-ARIA + desaninhar links dos cards
- [ ] `dynamic()` no grafo de planilha/gráficos
- [ ] Invalidar `useCargos` no logout
- [ ] Distinguir 404 vs 503 no PDI

### Qualidade

- [ ] Paginação na API de talentos
- [ ] Cache TTL de `buscar_usuario_por_id`
- [ ] Extrair `_executar` / UUID para `app/db`
- [ ] Remover código morto
- [ ] `formatarNota` único; usar ou apagar `podeVerMatchmaking`
- [ ] CSP com nonce (remover `'unsafe-inline'` em prod)
- [ ] Desligar `/docs` em produção

---

## Conclusão

A plataforma **saiu de MVP frágil (6,0) para um patamar corporativo inicial (7,2)**. P0 de sessão (HttpOnly), P1 de persistência (batch upsert), P2 de invariante de turma e P3 de health/pin/RSC **estão entregues**.

O que ainda impede “produção com clientes externos” não é falta de features: é **confiança no isolamento de dados** (`service_role`), **higiene de credenciais demo**, **sessão inválida** e **falhas silenciosas no boot**. Com esses itens, a nota de Segurança sobe de 7 para 8+ e o go-live deixa de ser um risco de tenant leak.
