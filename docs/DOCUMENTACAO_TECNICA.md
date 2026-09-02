# Documentação Técnica — Plataforma Talentos

**Versão:** 0.1.0  
**Última atualização:** setembro/2026

---

## Sumário

1. [Visão geral](#1-visão-geral)
2. [Arquitetura do sistema](#2-arquitetura-do-sistema)
3. [Stack tecnológica](#3-stack-tecnológica)
4. [Estrutura do repositório](#4-estrutura-do-repositório)
5. [Backend (API)](#5-backend-api)
6. [Frontend (interface web)](#6-frontend-interface-web)
7. [Modelos de dados](#7-modelos-de-dados)
8. [Motor de matchmaking](#8-motor-de-matchmaking)
9. [Processamento de planilhas](#9-processamento-de-planilhas)
10. [Configuração e variáveis de ambiente](#10-configuração-e-variáveis-de-ambiente)
11. [Como executar localmente](#11-como-executar-localmente)
12. [Limitações atuais e roadmap implícito](#12-limitações-atuais-e-roadmap-implícito)

---

## 1. Visão geral

A **Plataforma Talentos** é um sistema modular para **gestão e avaliação de talentos** em programas de formação (bootcamps, academias, programas corporativos). Ela permite:

- Receber **autoavaliações semanais** de participantes (individual ou em lote via planilha)
- Calcular **métricas sintéticas** de desempenho técnico e socioemocional
- Realizar **matchmaking** entre perfis de talentos e **16 cargos de referência** do mercado
- Visualizar rankings, áreas de atuação e perfis detalhados com gráficos radar

O sistema é composto por dois módulos independentes:

| Módulo    | Tecnologia        | Porta padrão |
|-----------|-------------------|--------------|
| Backend   | FastAPI (Python)  | 8000         |
| Frontend  | Next.js (React)   | 3000         |

---

## 2. Arquitetura do sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    Navegador (usuário)                       │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP
┌──────────────────────────▼──────────────────────────────────┐
│              Frontend — Next.js 15 (porta 3000)              │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │ Upload CSV  │  │ Formulário   │  │ Matchmaking (client)│ │
│  │ / XLSX      │  │ manual       │  │ + visualizações     │ │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬──────────┘ │
└─────────┼────────────────┼───────────────────────┼───────────┘
          │                │                       │
          │ POST /upload   │ POST /metricas        │ GET /cargos
          ▼                ▼                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend — FastAPI (porta 8000)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ planilha_    │  │ metricas_    │  │ matchmaking_      │  │
│  │ service      │  │ service      │  │ service           │  │
│  └──────┬───────┘  └──────────────┘  └─────────┬─────────┘  │
│         │                                       │            │
│         ▼                                       ▼            │
│  ┌──────────────┐                    ┌───────────────────┐  │
│  │ talentos_    │                    │ cargos_referencia │  │
│  │ store (RAM)  │                    │ (16 cargos)       │  │
│  └──────────────┘                    └───────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Fluxos principais

| Fluxo | Descrição |
|-------|-----------|
| **A — Métricas diretas** | Formulário manual → `POST /avaliacoes/metricas` → retorna médias calculadas (sem persistência) |
| **B — Upload de planilha** | Arquivo CSV/XLSX → `POST /avaliacoes/upload` → parse, métricas agregadas, perfis por talento, salva em memória |
| **C — Ranking por cargo** | Talentos em memória + cargo alvo → cálculo de Fit % → ranking ordenado |
| **D — Recomendação de cargos** | Perfil de um talento → compara com os 16 cargos → retorna top N |
| **E — Listagem de cargos** | `GET /matchmaking/cargos` → matriz de referência com pesos por competência |

---

## 3. Stack tecnológica

### Backend

| Pacote | Versão (aprox.) | Uso |
|--------|-----------------|-----|
| `fastapi` | 0.141+ | Framework web, rotas, validação |
| `uvicorn` | 0.52+ | Servidor ASGI |
| `pydantic` | 2.13+ | Modelos de request/response |
| `pydantic-settings` | 2.15+ | Carregamento de `.env` (config preparada, ainda não usada) |
| `pandas` | 3.0+ | Leitura de CSV e XLSX |
| `openpyxl` | 3.1+ | Engine Excel para pandas |
| `python-multipart` | — | Upload de arquivos |
| `supabase` | 2.31+ | **Listado, mas ainda não integrado** |

### Frontend

| Pacote | Versão (aprox.) | Uso |
|--------|-----------------|-----|
| `next` | 15.5+ | Framework React com App Router |
| `react` | 19+ | Interface de usuário |
| `typescript` | 5.7+ | Tipagem estática |
| `tailwindcss` | 3.4+ | Estilização utility-first |

---

## 4. Estrutura do repositório

```
projeto_talentos/
├── backend/
│   ├── app/
│   │   ├── main.py                  # Entrada FastAPI, CORS, registro de routers
│   │   ├── api/
│   │   │   ├── avaliacoes.py        # Endpoints de métricas e upload
│   │   │   └── matchmaking.py       # Endpoints de cargos, ranking e recomendação
│   │   ├── core/
│   │   │   └── config.py            # Settings Pydantic (não importado ainda)
│   │   ├── models/
│   │   │   └── avaliacao.py         # Modelo AvaliacaoSemanalCreate
│   │   └── services/
│   │       ├── cargos_referencia.py # Matriz de 16 cargos × 20 competências
│   │       ├── matchmaking_service.py
│   │       ├── metricas_service.py
│   │       ├── planilha_service.py
│   │       └── talentos_store.py    # Cache em memória (thread-safe)
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx           # Layout raiz, dark mode, metadata
│   │   │   └── page.tsx             # Página única (/)
│   │   ├── components/              # 12 arquivos (componentes + utils)
│   │   └── styles/
│   │       └── globals.css
│   ├── package.json
│   ├── tailwind.config.js
│   └── next.config.js
├── docs/
│   ├── DOCUMENTACAO_TECNICA.md      # Este arquivo
│   └── GUIA_DA_PLATAFORMA.md        # Guia para usuários não técnicos
└── README.md
```

---

## 5. Backend (API)

### 5.1 Configuração CORS

Permitidos apenas:
- `http://localhost:3000`
- `http://127.0.0.1:3000`

### 5.2 Endpoints

#### `POST /avaliacoes/metricas`

Calcula métricas sintéticas a partir de uma ou mais autoavaliações semanais.

**Request body:** `AvaliacaoSemanalCreate` ou `list[AvaliacaoSemanalCreate]`

**Response — individual (`tipo: "individual"`):**

```json
{
  "tipo": "individual",
  "media_tecnica": 3.5,
  "media_socioemocional": 4.0,
  "media_competencias": 3.75
}
```

**Response — agregada (`tipo: "agregada"`):**

```json
{
  "tipo": "agregada",
  "media_tecnica": 3.2,
  "media_socioemocional": 3.8,
  "media_competencias": 3.5,
  "total_horas_dedicadas": 120.0,
  "quantidade_avaliacoes": 15
}
```

**Erros:** `400` com mensagem de `MetricasCalculationError`

---

#### `POST /avaliacoes/upload`

Processa planilha CSV ou XLSX com autoavaliações semanais.

**Request:** `multipart/form-data`, campo `arquivo`

**Formatos aceitos:** `.csv`, `.xlsx`

**Response (`UploadMetricasResponse`):**

```json
{
  "arquivo": "avaliacoes_semana1.xlsx",
  "linhas_processadas": 25,
  "linhas_com_erro": 2,
  "erros": ["Linha 7: semana_numero inválida"],
  "metricas": { "tipo": "agregada", "..." : "..." },
  "perfis": [
    {
      "talento_id": "uuid",
      "email": "talento@email.com",
      "nome": "Maria Silva",
      "semana_numero": 1,
      "hard_skills": { "Python": 4, "SQL": 3 },
      "soft_skills": { "Ética": 5 },
      "media_tecnica": 3.5,
      "media_socioemocional": 4.0,
      "fit_vaga": 3.75,
      "feedback_case": "...",
      "interdependencias": "...",
      "ajustes_rota": "...",
      "rituais_mentoria": "..."
    }
  ]
}
```

**Comportamento:**
- Linhas inválidas são registradas em `erros`; o processamento continua se houver ao menos uma linha válida
- Perfis processados substituem o cache em memória (`talentos_store`)
- `fit_vaga` = média simples de `media_tecnica` e `media_socioemocional` (não é o Fit % do matchmaking)

**Erros:** `400` para extensão inválida, arquivo vazio ou erro de processamento

---

#### `GET /matchmaking/cargos`

**Sem query param:** retorna lista de todos os 16 cargos de referência.

```json
[
  {
    "cargo": "Cientista de Dados",
    "area": "Ciência de Dados e IA",
    "pesos": { "Python": 5, "SQL": 5, "..." : "..." }
  }
]
```

**Com `?cargo_alvo=Nome do Cargo`:** rankeia talentos em memória para o cargo informado.

```json
{
  "cargo_alvo": "Cientista de Dados",
  "area": "Ciência de Dados e IA",
  "total_candidatos": 10,
  "ranking": [
    {
      "talento_id": "uuid",
      "nome": "Maria Silva",
      "email": "maria@email.com",
      "cargo_alvo": "Cientista de Dados",
      "area": "Ciência de Dados e IA",
      "fit_percentual": 78.5,
      "similaridade_cosseno": 0.92,
      "competencias_atendem": ["Python", "SQL"],
      "competencias_desenvolvimento": [
        {
          "competencia": "Machine Learning",
          "tipo": "hard",
          "nota_candidato": 2,
          "peso_exigido": 5,
          "atende_corte": false,
          "gap": 3
        }
      ]
    }
  ]
}
```

**Erros:** `400` se não houver talentos em memória ou cargo não encontrado

---

#### `POST /matchmaking/rankear?cargo_alvo=...`

Aceita talentos no body, persiste em memória e retorna ranking para o cargo.

**Request body:**

```json
{
  "talentos": [
    {
      "talento_id": "uuid",
      "email": "talento@email.com",
      "nome": "João",
      "hard_skills": { "Python": 4 },
      "soft_skills": { "Ética": 5 }
    }
  ]
}
```

**Response:** `RankingCargoResponse` (mesmo formato do GET com `cargo_alvo`)

---

#### `POST /matchmaking/recomendar-cargos?top_n=3`

Recomenda os N cargos com maior Fit % para um talento.

**Query param:** `top_n` (padrão: 3, range: 1–16)

**Request body:** `TalentoMatchInput` (mesmo formato de um item em `RankearRequest.talentos`)

**Response:** `list[MatchCandidatoResponse]`

---

### 5.3 Serviços

#### `talentos_store.py`

Cache em memória thread-safe (`threading.Lock`):

| Função | Descrição |
|--------|-----------|
| `salvar_talentos(talentos)` | Substitui todo o cache |
| `listar_talentos()` | Retorna cópia da lista |
| `limpar_talentos()` | Limpa o cache (não exposto via API) |

> **Atenção:** dados são perdidos ao reiniciar o servidor.

#### `metricas_service.py`

| Tipo | Cálculo |
|------|---------|
| Individual | `media_tecnica` = `autoavaliacao_tecnica`; `media_socioemocional` = `autoavaliacao_socioemocional`; `media_competencias` = média das duas |
| Agregada | Médias das métricas individuais + `total_horas_dedicadas` (soma) + `quantidade_avaliacoes` (contagem) |

#### `planilha_service.py`

Responsável por:
1. Ler CSV/XLSX com pandas
2. Mapear colunas via aliases em português (`FIELD_ALIASES`)
3. Resolver 12 hard skills e 8 soft skills por nome normalizado
4. Gerar `talento_id` via UUID explícito ou `uuid5(NAMESPACE_DNS, email.lower())`
5. Converter notas numéricas (0–5) ou textuais para escala 1–5

**Mapeamento de notas textuais:**

| Texto na planilha | Nota |
|-------------------|------|
| desconheço totalmente | 1 |
| conheço um pouco | 2 |
| conheço consideravelmente, mas ainda não domino | 3 |
| conheço bem / tenho bom domínio | 4 |
| domino o assunto | 5 |

#### `matchmaking_service.py`

Motor de aderência a cargos. Ver [seção 8](#8-motor-de-matchmaking).

#### `cargos_referencia.py`

Matriz embutida em código com 16 cargos × 20 competências (pesos de 1 a 5).

---

## 6. Frontend (interface web)

### 6.1 Rotas

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/` | `src/app/page.tsx` | Página única com todas as funcionalidades |

Navegação interna por abas locais (`useState`), sem rotas adicionais.

### 6.2 Componentes

| Componente | Responsabilidade |
|------------|------------------|
| `UploadPlanilha` | Drag-and-drop de CSV/XLSX, envio para API, exibição de resultado |
| `FormularioAvaliacao` | Formulário manual de autoavaliação individual |
| `ResultadosPlanilha` | Dashboard pós-upload com abas Cargos / Áreas / Talentos |
| `AbaCargos` | Cards de cargos com ranking de candidatos |
| `AbaAreas` | Agrupamento por área de negócio |
| `ListaTalentos` | Grid paginado (12 por página) de perfis |
| `ModalDetalheTalento` | Modal com métricas, gráficos radar e insights qualitativos |
| `SoftSkillsRadar` | Gráfico radar SVG (hard e soft skills) |
| `Card` | Container reutilizável com borda e sombra |
| `matchmakingUtils.ts` | Cálculo de Fit % no cliente (espelha lógica do backend) |

### 6.3 Integração com a API

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
```

| Método | Endpoint | Componente |
|--------|----------|------------|
| POST | `/avaliacoes/metricas` | `page.tsx` |
| POST | `/avaliacoes/upload` | `UploadPlanilha.tsx` |
| GET | `/matchmaking/cargos` | `ResultadosPlanilha.tsx` |

O matchmaking após upload é calculado **no cliente** usando os pesos retornados pela API.

### 6.4 Estado

Sem biblioteca de estado global. Tudo via `useState` / `useMemo` local em cada componente. Sem persistência em `localStorage`.

### 6.5 Tema visual

- Dark mode forçado (`class="dark"` no `<html>`)
- Cor primária: `#e11d48` (vermelho/rosa)
- Background: `#0a0a0a`
- Tailwind CSS utility-first, sem biblioteca de componentes externa

---

## 7. Modelos de dados

### `AvaliacaoSemanalCreate`

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `talento_id` | UUID | sim | Identificador único do participante |
| `semana_numero` | int | sim | Número da semana do programa |
| `horas_dedicadas` | float | sim | Horas dedicadas na semana |
| `autoavaliacao_tecnica` | int (0–5) | sim | Média das hard skills |
| `autoavaliacao_socioemocional` | int (0–5) | sim | Média das soft skills |
| `feedback_case` | string | não | Feedback sobre case/desafio |
| `interdependencias` | string | não | Observações sobre trabalho em equipe |
| `ajustes_rota` | string | não | Ajustes de rota de aprendizado |
| `rituais_mentoria` | string | não | Participação em rituais de mentoria |

### Competências avaliadas (20 no total)

**Hard skills (12):**

1. Aprendizagem autodirigida e contínua
2. Gestão de Processos
3. Metodologia Ágil
4. Gestão de projetos
5. Excel
6. SQL
7. Databricks
8. Python
9. Machine Learning
10. Postgree
11. IA Gen
12. Prompt engineering

**Soft skills (8):**

13. Ética
14. Pensamento crítico
15. Relacionamento interpessoal
16. Comunicação (escuta ativa e oratória)
17. Resolução de problemas
18. Gestão de tempo
19. Inteligência Emocional
20. Empatia

### Cargos de referência (16)

| Cargo | Área |
|-------|------|
| Engenheiro(a) de Software | Engenharia de Software |
| Cientista de Dados | Ciência de Dados e IA |
| Engenheiro(a) de Dados | Engenharia de Dados |
| Gerente de Projetos / Project Manager | Gestão de Projetos |
| Analista de Processos e Operações | Gestão de Processos e Operações |
| Analista de Dados / BI | Análise de Dados e BI |
| Analista de Negócios (Business Analyst) | Análise de Negócios |
| Scrum Master / Agile Coach | Agilidade e Facilitação |
| Especialista em People Operations / HRBP | Desenvolvimento Organizacional |
| DevRel / Mentor(a) Técnico(a) | Suporte Técnico e Mentoria |
| Analista Administrativo / Financeiro | Operações Administrativas |
| Administrador(a) de Banco de Dados (DBA) | Infraestrutura de Dados |
| Analista de Segurança e Compliance | Segurança e Compliance |
| Engenheiro(a) de Prompts / Especialista em LLMs | Inteligência Artificial |
| Especialista em Gestão de Mudança | Gestão de Mudança |
| Analista de Treinamento e Desenvolvimento (L&D) | Educação Corporativa |

Cada cargo possui um vetor de 20 pesos (1–5) indicando o nível ideal exigido em cada competência.

---

## 8. Motor de matchmaking

### Fórmula de Fit %

Para cada talento × cargo:

```
fit = (Σ min(nota_candidato / peso_exigido, 1) × peso_exigido) / (Σ pesos) × 100
```

- Competências com `peso <= 0` são ignoradas
- Resultado entre 0% e 100%
- **Limiar de aderência no frontend:** 50% (`LIMIAR_ADERENCIA`)

### Similaridade de cosseno

Complementar ao Fit %, mede a proximidade vetorial entre o perfil do candidato e o perfil ideal do cargo (escala 0–1).

### Análise de gaps

Para cada competência:
- `atende_corte` = `nota_candidato >= peso_exigido`
- `gap` = `max(0, peso_exigido - nota_candidato)`

Competências em desenvolvimento são ordenadas por `gap` decrescente.

### Resolução de cargo

Busca fuzzy por nome normalizado (match exato ou por substring) em `CARGOS_REFERENCIA`.

---

## 9. Processamento de planilhas

### Formatos suportados

- `.csv` (qualquer encoding detectável pelo pandas)
- `.xlsx` (via openpyxl)

### Colunas esperadas

O serviço mapeia colunas por aliases em português (texto das perguntas do formulário original). Exemplos:

- Identificação: email, nome, talento_id
- Contexto: semana, horas dedicadas
- 12 colunas de hard skills (nomes exatos da matriz)
- 8 colunas de soft skills (nomes exatos da matriz)
- Campos qualitativos: feedback_case, interdependencias, ajustes_rota, rituais_mentoria

### Geração de ID

1. Se a planilha tiver coluna `talento_id` com UUID válido → usa diretamente
2. Caso contrário → `uuid5(NAMESPACE_DNS, email.lower())`

### Tratamento de erros

- Linhas com dados inválidos são listadas em `erros` com número da linha
- Upload é bem-sucedido se ao menos uma linha for válida

---

## 10. Configuração e variáveis de ambiente

### Backend (`backend/.env`)

| Variável | Obrigatória* | Descrição |
|----------|--------------|-----------|
| `DATABASE_URL` | sim* | URL de conexão com banco de dados |
| `SUPABASE_URL` | sim* | URL do projeto Supabase |
| `SUPABASE_KEY` | sim* | Chave de API do Supabase |
| `SECRET_KEY` | sim* | Chave secreta da aplicação |

> \* Obrigatórias apenas se `app.core.config` for importado. Atualmente **não é usado** — a API roda sem `.env`.

### Frontend

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | URL base da API |

Criar `frontend/.env.local` para ambientes diferentes:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 11. Como executar localmente

### Pré-requisitos

- Python 3.11+
- Node.js 18+
- npm

### Backend

```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate
# Linux/macOS
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Documentação interativa da API: http://127.0.0.1:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Interface: http://localhost:3000

---

## 12. Limitações atuais e roadmap implícito

| Item | Status atual |
|------|--------------|
| Persistência de dados | Apenas em memória (perdidos ao reiniciar) |
| Autenticação | Não implementada |
| Integração Supabase | Preparada em `config.py` e `requirements.txt`, mas não conectada |
| Banco de dados | Não utilizado |
| Formulário manual vs planilha | Formulário usa 7 skills simplificadas; planilha usa as 20 completas |
| `fit_vaga` vs `fit_percentual` | Métricas diferentes (média simples vs aderência ponderada por cargo) |
| Testes automatizados | Não existem |
| CI/CD | Não configurado |
| Endpoint de health check | Não existe (`GET /` retorna 404) |

### Diferenças entre formulário manual e upload

O **formulário manual** avalia 4 hard skills (Python, SQL, Git, APIs) e 3 soft skills (Comunicação, Colaboração, Proatividade), calculando médias que são enviadas como `autoavaliacao_tecnica` e `autoavaliacao_socioemocional`. Não participa do matchmaking por cargo.

O **upload de planilha** processa as 20 competências completas e alimenta o motor de matchmaking.

---

## Referência rápida de endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/avaliacoes/metricas` | Calcular métricas de autoavaliação(ões) |
| POST | `/avaliacoes/upload` | Upload e processamento de planilha |
| GET | `/matchmaking/cargos` | Listar cargos ou rankear talentos por cargo |
| POST | `/matchmaking/rankear` | Rankear talentos enviados no body |
| POST | `/matchmaking/recomendar-cargos` | Recomendar cargos para um talento |
