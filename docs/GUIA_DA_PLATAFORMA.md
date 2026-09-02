# Guia da Plataforma Talentos

**Para quem é este guia?**  
Para gestores de programas, coordenadores pedagógicos, mentores, RH e qualquer pessoa que precise entender **o que a plataforma faz**, **para que serve** e **como usar** — sem precisar de conhecimento técnico.

---

## Sumário

1. [O que é a Plataforma Talentos?](#1-o-que-é-a-plataforma-talentos)
2. [Para que serve?](#2-para-que-serve)
3. [Quem usa e como?](#3-quem-usa-e-como)
4. [Como acessar](#4-como-acessar)
5. [As duas formas de avaliar](#5-as-duas-formas-de-avaliar)
6. [Entendendo os resultados](#6-entendendo-os-resultados)
7. [O matchmaking: conectando talentos a cargos](#7-o-matchmaking-conectando-talentos-a-cargos)
8. [As competências avaliadas](#8-as-competências-avaliadas)
9. [Os cargos de referência](#9-os-cargos-de-referência)
10. [Perguntas frequentes](#10-perguntas-frequentes)
11. [Glossário](#11-glossário)

---

## 1. O que é a Plataforma Talentos?

A **Plataforma Talentos** é uma ferramenta digital criada para **acompanhar o desenvolvimento de participantes** em programas de formação — como bootcamps, academias de tecnologia e programas corporativos de capacitação.

Ela funciona como um **painel central** onde é possível:

- Coletar **autoavaliações semanais** dos participantes
- Visualizar o **desempenho técnico e comportamental** de cada um
- Descobrir **quais cargos do mercado** cada participante tem maior afinidade
- Apoiar decisões de **mentoria, rota de aprendizado e encaminhamento profissional**

Pense nela como um "espelho inteligente" que mostra não só como cada pessoa se avalia, mas também **onde ela pode chegar no mercado de trabalho**.

---

## 2. Para que serve?

### Problema que resolve

Em programas de formação com dezenas ou centenas de participantes, é difícil:

- Acompanhar individualmente o progresso de cada um
- Identificar quem está pronto para qual tipo de vaga
- Direcionar mentoria de forma personalizada
- Tomar decisões baseadas em dados, e não em impressões

### O que a plataforma entrega

| Necessidade | Como a plataforma ajuda |
|-------------|-------------------------|
| "Quero ver o panorama geral da turma" | Upload de planilha com todas as avaliações → métricas consolidadas |
| "Quero saber quem se encaixa em qual vaga" | Matchmaking automático com 16 cargos de referência |
| "Quero entender os pontos fortes e fracos de alguém" | Perfil detalhado com gráficos radar e análise de gaps |
| "Quero registrar uma avaliação avulsa" | Formulário manual individual |
| "Quero organizar por área de atuação" | Visão por áreas (Dados, Engenharia, Gestão, etc.) |

---

## 3. Quem usa e como?

### Coordenador(a) pedagógico(a)

- Faz upload da planilha semanal com as respostas dos participantes
- Analisa métricas agregadas da turma
- Identifica participantes que precisam de apoio extra
- Usa a aba **Áreas** para entender distribuição de perfis

### Mentor(a) / Tutor(a)

- Consulta o perfil individual de cada participante
- Vê quais competências estão abaixo do esperado para o cargo desejado
- Lê os campos qualitativos (feedback de cases, ajustes de rota, rituais de mentoria)
- Usa os dados para personalizar a mentoria

### Gestor(a) de RH / People

- Usa a aba **Cargos** para ver quais participantes têm maior aderência a cada vaga
- Compara candidatos para posições abertas
- Identifica talentos com fit acima de 50% (limiar de aderência)
- Apoia decisões de encaminhamento para processos seletivos

### Participante / Talento

- Preenche a autoavaliação semanal (via formulário externo que gera a planilha, ou pelo formulário manual na plataforma)
- Pode consultar seus resultados quando compartilhados pelo coordenador

---

## 4. Como acessar

1. Abra o navegador (Chrome, Firefox, Edge)
2. Acesse o endereço da plataforma (em ambiente local: **http://localhost:3000**)
3. A tela inicial mostra duas opções no topo:
   - **Upload de Planilha (Lote)** — para processar muitos participantes de uma vez
   - **Formulário Manual (Individual)** — para registrar uma avaliação por vez

A interface é em **português** e funciona em computador, tablet e celular.

---

## 5. As duas formas de avaliar

### Opção A — Upload de Planilha (recomendado para turmas)

**Quando usar:** quando você tem as respostas de vários participantes em um arquivo.

**Como funciona:**

1. Clique na aba **"Upload de Planilha (Lote)"**
2. Arraste o arquivo para a área indicada, ou clique para selecionar
3. Formatos aceitos: **.csv** ou **.xlsx** (Excel)
4. Clique em **"Enviar planilha"**
5. Aguarde o processamento (alguns segundos)

**O que a planilha deve conter:**

- Uma linha por participante por semana
- Colunas com as notas de cada competência (de 1 a 5, ou em texto como "domino o assunto")
- Informações como email, nome, semana, horas dedicadas
- Campos opcionais de texto: feedback sobre cases, interdependências, ajustes de rota

**Escala de notas textuais (se a planilha usar texto em vez de números):**

| Resposta do participante | Nota equivalente |
|--------------------------|------------------|
| Desconheço totalmente | 1 |
| Conheço um pouco | 2 |
| Conheço consideravelmente, mas ainda não domino | 3 |
| Conheço bem / Tenho bom domínio | 4 |
| Domino o assunto | 5 |

**Após o upload, você verá:**

- Quantas linhas foram processadas e quantas tiveram erro
- Métricas consolidadas da turma (médias técnicas, socioemocionais, horas totais)
- Três abas de análise: **Cargos**, **Áreas** e **Talentos**

---

### Opção B — Formulário Manual (para avaliações avulsas)

**Quando usar:** para registrar a autoavaliação de um único participante, sem planilha.

**Como funciona:**

1. Clique na aba **"Formulário Manual (Individual)"**
2. Preencha os campos:
   - **ID do talento** (identificador único)
   - **Semana** (número da semana do programa)
   - **Horas dedicadas** na semana
   - **4 competências técnicas:** Python, SQL, Git, APIs (nota de 1 a 5)
   - **3 competências comportamentais:** Comunicação, Colaboração, Proatividade (nota de 1 a 5)
   - Campos opcionais de texto livre
3. Clique em **"Enviar avaliação"**
4. As métricas calculadas aparecem na tela

> **Nota:** o formulário manual calcula médias, mas **não participa do matchmaking por cargo**. Para análise de aderência a vagas, use o upload de planilha com as 20 competências completas.

---

## 6. Entendendo os resultados

### Resultado consolidado (após upload)

Após processar a planilha, um card mostra:

| Informação | O que significa |
|------------|-----------------|
| **Linhas processadas** | Quantos participantes foram lidos com sucesso |
| **Linhas com erro** | Quantas linhas tinham dados inválidos (detalhes expandíveis) |
| **Média técnica** | Média geral das competências técnicas da turma |
| **Média socioemocional** | Média geral das competências comportamentais |
| **Média de competências** | Média geral entre técnica e socioemocional |
| **Total de horas** | Soma das horas dedicadas por todos os participantes |
| **Quantidade de avaliações** | Total de registros processados |

### As três abas de análise

#### Aba "Cargos"

Mostra os **16 cargos de referência** do mercado, cada um em um card com:

- Nome do cargo e área de atuação
- Quantos participantes têm aderência ≥ 50% àquele cargo
- Fit médio e fit do melhor candidato
- Lista dos candidatos ranqueados (clique para expandir)
- Clique em um candidato para ver o perfil detalhado

**Como interpretar:** cargos com muitos participantes aderentes indicam áreas onde a turma tem força. Cargos com poucos aderentes podem indicar lacunas de formação.

#### Aba "Áreas"

Agrupa os cargos por **área de negócio** (ex.: Ciência de Dados e IA, Gestão de Projetos, Engenharia de Software).

Para cada participante, mostra o cargo com maior fit dentro da área.

**Como interpretar:** útil para ver a distribuição de perfis da turma e identificar concentrações (ex.: "70% da turma tem perfil para área de Dados").

#### Aba "Talentos"

Lista todos os participantes processados em cards paginados (12 por página), mostrando:

- Nome e email
- Média técnica, socioemocional e fit geral
- Clique no card para abrir o **perfil completo**

### Perfil detalhado do participante

Ao clicar em um participante, abre um painel com:

| Seção | Conteúdo |
|-------|----------|
| **Métricas** | Médias técnicas, socioemocionais e fit |
| **Gráfico radar — Hard skills** | Visualização das 12 competências técnicas |
| **Gráfico radar — Soft skills** | Visualização das 8 competências comportamentais |
| **Destaques** | Competências com nota ≥ 4 (em modo recrutador) |
| **Insights qualitativos** | Feedback de cases, interdependências, ajustes de rota, rituais de mentoria |

---

## 7. O matchmaking: conectando talentos a cargos

### O que é?

O **matchmaking** é o processo automático que compara o perfil de cada participante com 16 cargos reais do mercado de trabalho e calcula um **percentual de aderência (Fit %)**.

### Como funciona (em linguagem simples)

1. Cada cargo tem um **perfil ideal** com 20 competências e um peso (de 1 a 5) indicando o quão importante cada competência é para aquela vaga
2. O participante tem suas **notas reais** em cada competência
3. A plataforma compara: para cada competência, verifica se a nota do participante atinge o nível exigido pelo cargo
4. O resultado é um **Fit %** de 0% a 100%

**Exemplo prático:**

> Maria tem nota 5 em Python e o cargo "Cientista de Dados" exige peso 5 em Python → ela atende plenamente.  
> Maria tem nota 2 em Machine Learning e o cargo exige peso 5 → há um gap de 3 pontos.  
> Considerando todas as 20 competências com seus pesos, o Fit % de Maria para "Cientista de Dados" é calculado.

### O que significa o Fit %?

| Faixa | Interpretação |
|-------|---------------|
| **70% – 100%** | Alta aderência — perfil muito compatível com o cargo |
| **50% – 69%** | Aderência moderada — potencial com pontos a desenvolver |
| **Abaixo de 50%** | Baixa aderência — cargo exige competências que o participante ainda não domina |

O limiar de **50%** é usado para classificar um participante como "aderente" a um cargo.

### Competências atendidas vs. em desenvolvimento

No perfil detalhado (e nos resultados de ranking), cada competência é classificada como:

- **Atende** — a nota do participante é igual ou superior ao exigido pelo cargo
- **Em desenvolvimento** — a nota está abaixo do exigido, com indicação do "gap" (quanto falta)

Isso ajuda mentores e gestores a criar **planos de desenvolvimento personalizados**.

---

## 8. As competências avaliadas

A plataforma avalia **20 competências** divididas em dois grupos:

### Competências técnicas (Hard Skills) — 12 itens

| # | Competência | O que avalia |
|---|-------------|--------------|
| 1 | Aprendizagem autodirigida e contínua | Capacidade de aprender por conta própria |
| 2 | Gestão de Processos | Organização e otimização de processos |
| 3 | Metodologia Ágil | Conhecimento de Scrum, Kanban, etc. |
| 4 | Gestão de projetos | Planejamento e execução de projetos |
| 5 | Excel | Planilhas, fórmulas, análise de dados |
| 6 | SQL | Consultas e manipulação de banco de dados |
| 7 | Databricks | Plataforma de engenharia de dados |
| 8 | Python | Linguagem de programação |
| 9 | Machine Learning | Modelos preditivos e algoritmos |
| 10 | Postgree | Banco de dados PostgreSQL |
| 11 | IA Gen | Inteligência Artificial Generativa |
| 12 | Prompt engineering | Engenharia de prompts para IA |

### Competências comportamentais (Soft Skills) — 8 itens

| # | Competência | O que avalia |
|---|-------------|--------------|
| 13 | Ética | Conduta profissional e integridade |
| 14 | Pensamento crítico | Análise e questionamento fundamentado |
| 15 | Relacionamento interpessoal | Trabalho em equipe e networking |
| 16 | Comunicação | Escuta ativa e capacidade de apresentação |
| 17 | Resolução de problemas | Abordagem estruturada para desafios |
| 18 | Gestão de tempo | Organização e cumprimento de prazos |
| 19 | Inteligência Emocional | Autoconhecimento e regulação emocional |
| 20 | Empatia | Compreensão da perspectiva do outro |

Todas são avaliadas numa escala de **1 a 5**, onde:
- **1** = Desconheço totalmente
- **5** = Domino o assunto

---

## 9. Os cargos de referência

A plataforma compara os participantes com **16 cargos reais do mercado**, organizados em **12 áreas de atuação**:

| Área | Cargos |
|------|--------|
| **Engenharia de Software** | Engenheiro(a) de Software |
| **Ciência de Dados e IA** | Cientista de Dados |
| **Engenharia de Dados** | Engenheiro(a) de Dados |
| **Gestão de Projetos** | Gerente de Projetos / Project Manager |
| **Gestão de Processos e Operações** | Analista de Processos e Operações |
| **Análise de Dados e BI** | Analista de Dados / BI |
| **Análise de Negócios** | Analista de Negócios (Business Analyst) |
| **Agilidade e Facilitação** | Scrum Master / Agile Coach |
| **Desenvolvimento Organizacional** | Especialista em People Operations / HRBP |
| **Suporte Técnico e Mentoria** | DevRel / Mentor(a) Técnico(a) |
| **Operações Administrativas** | Analista Administrativo / Financeiro |
| **Infraestrutura de Dados** | Administrador(a) de Banco de Dados (DBA) |
| **Segurança e Compliance** | Analista de Segurança e Compliance |
| **Inteligência Artificial** | Engenheiro(a) de Prompts / Especialista em LLMs |
| **Gestão de Mudança** | Especialista em Gestão de Mudança |
| **Educação Corporativa** | Analista de Treinamento e Desenvolvimento (L&D) |

Cada cargo tem um perfil com pesos diferentes para cada competência. Por exemplo:
- **Cientista de Dados** valoriza muito Python (5), Machine Learning (5) e SQL (5)
- **Gerente de Projetos** valoriza muito Gestão de projetos (5), Metodologia Ágil (5) e Comunicação (5), mas exige pouco em Python (1)

Isso significa que um participante forte em programação pode ter alto fit para cargos técnicos, enquanto alguém forte em comunicação e gestão pode ter alto fit para cargos de liderança — **sem que um perfil seja "melhor" que o outro**.

---

## 10. Perguntas frequentes

### Os dados ficam salvos?

Atualmente, os dados ficam **apenas na memória do servidor** enquanto ele está ligado. Se o servidor for reiniciado, os dados do último upload são perdidos. É necessário fazer o upload novamente.

### Preciso de login e senha?

Não. A versão atual não possui autenticação. Qualquer pessoa com acesso ao endereço da plataforma pode usá-la.

### Posso usar no celular?

Sim. A interface é responsiva e se adapta a telas menores.

### O que acontece se a planilha tiver erros?

Linhas com problemas (dados faltando, formato inválido) são listadas com o número da linha e a descrição do erro. As linhas válidas são processadas normalmente.

### Qual a diferença entre "fit_vaga" e "Fit %"?

- **Fit geral (fit_vaga):** média simples entre desempenho técnico e comportamental — uma visão geral, sem considerar um cargo específico
- **Fit % (matchmaking):** aderência ponderada a um cargo específico, considerando quais competências são mais importantes para aquela vaga

### O formulário manual serve para matchmaking?

Não diretamente. O formulário manual calcula médias gerais, mas o matchmaking por cargo requer as 20 competências completas, que vêm pelo upload de planilha.

### Quantos participantes posso processar de uma vez?

Não há limite definido no sistema. O limite prático depende do tamanho do arquivo e da capacidade do servidor.

### Posso exportar os resultados?

A versão atual não possui exportação integrada. Os resultados são visualizados na tela. Para exportar, pode-se usar a documentação da API (acessível em `/docs` no endereço do backend).

---

## 11. Glossário

| Termo | Significado |
|-------|-------------|
| **Autoavaliação** | Avaliação que o próprio participante faz sobre suas competências |
| **Bootcamp** | Programa intensivo de formação em tecnologia |
| **Competência** | Habilidade ou conhecimento avaliado (técnico ou comportamental) |
| **Fit %** | Percentual de aderência de um participante a um cargo específico |
| **Gap** | Diferença entre o nível exigido e o nível atual do participante em uma competência |
| **Hard skills** | Competências técnicas (programação, ferramentas, métodos) |
| **Matchmaking** | Processo de comparar perfis com cargos e calcular aderência |
| **Métricas agregadas** | Médias e totais calculados para um grupo de participantes |
| **Perfil** | Conjunto de notas e informações de um participante |
| **Soft skills** | Competências comportamentais (comunicação, ética, empatia) |
| **Upload** | Envio de arquivo (planilha) para a plataforma processar |

---

## Resumo visual do fluxo

```
Participantes preenchem autoavaliação semanal
            │
            ▼
   Planilha CSV/XLSX é gerada
            │
            ▼
   Coordenador faz upload na plataforma
            │
            ▼
   ┌────────┴────────┐
   │                 │
   ▼                 ▼
Métricas da      Matchmaking
turma (médias)   (Fit % por cargo)
   │                 │
   ▼                 ▼
Visão geral      Rankings, áreas
do desempenho    e perfis individuais
                       │
                       ▼
              Decisões de mentoria,
              rota e encaminhamento
```

---

*Este guia descreve a versão 0.1.0 da Plataforma Talentos. Para detalhes técnicos de instalação, API e arquitetura, consulte a [Documentação Técnica](./DOCUMENTACAO_TECNICA.md).*
