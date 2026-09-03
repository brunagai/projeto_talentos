# Tenancy e service_role

## Situação atual

O backend conecta ao Supabase com a chave **service_role**, que **bypassa Row Level Security (RLS)**.

As migrations em `backend/supabase/migrations/006_row_level_security.sql` definem políticas RLS, mas elas **não protegem** o request path da API enquanto o cliente Python usar service_role.

O isolamento entre organizações e turmas é **aplicação-first**:

1. JWT contém `organizacao_id` e `turma_id`
2. `obter_usuario_atual` revalida o usuário no banco
3. Rotas chamam `resolver_turma_id` / `validar_turma_na_organizacao` / `garantir_talento_na_turma`

## Risco residual

Um bug em filtro de `turma_id` / `organizacao_id` no código Python pode vazar dados entre tenants, porque o banco não aplica a segunda linha de defesa (RLS) nessas chamadas.

## Mitigações neste ciclo

- Remoção do seed automático de usuários demo no boot
- Seed demo apenas via `python -m scripts.seed_demo`
- Validação de JWT no middleware do Next.js (assinatura + exp)
- Cookie Secure alinhado ao ambiente
- CORS configurável por env
- Função destrutiva `limpar_talentos` isolada (somente script interno)

## Fase futura (RLS real)

1. Emitir/propagar JWT do usuário para o PostgREST (ou impersonation controlada)
2. Usar chave `anon`/`authenticated` no request path com RLS ativa
3. Reservar service_role a jobs administrativos auditados
