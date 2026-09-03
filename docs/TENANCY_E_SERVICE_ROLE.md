# Tenancy e service_role

## Situação atual (Fase F)

O backend separa dois clientes Supabase:

| Cliente | Chave | Quando |
|---------|-------|--------|
| **Admin** (`get_supabase_admin`) | `SUPABASE_KEY` (service_role) | Login, seed, health, lifespan |
| **Request** (`get_supabase` com JWT) | `SUPABASE_ANON_KEY` + JWT da sessão | Rotas autenticadas |

Quando `SUPABASE_ANON_KEY` está definida, o JWT emitido no login inclui `role`/`aud` = `authenticated` e claims `organizacao_id`, `turma_id`, `papel`, `talento_id`. O PostgREST aplica as políticas de `006_row_level_security.sql` (+ `008_rls_talento_self_write.sql`).

**Em `ENVIRONMENT=production`, `SUPABASE_ANON_KEY` é obrigatória.**

Para o JWT ser aceito pelo PostgREST, `SECRET_KEY` deve ser o **JWT Secret** do projeto Supabase (o mesmo usado pelo Auth/API do projeto).

## Isolamento

1. JWT contém `organizacao_id` e `turma_id`
2. `obter_usuario_atual` revalida o usuário no banco e faz bind do cliente RLS
3. Rotas chamam `resolver_turma_id` / `validar_turma_na_organizacao` / `garantir_talento_na_turma`
4. Com ANON_KEY, o banco aplica a segunda linha de defesa (RLS)

## Dev sem ANON_KEY

Sem `SUPABASE_ANON_KEY`, o request path continua no service_role (comportamento anterior). Use só em desenvolvimento local.

## Seed e migrações

- Seed: `python -m scripts.seed_demo` (senhas via `DEMO_PASSWORD_*`; bloqueado em prod sem `SEED_ALLOW_PRODUCTION=1`)
- `007_repair_usuarios.sql` vive em `backend/supabase/manual/` (one-shot; **não** é migração automática)
