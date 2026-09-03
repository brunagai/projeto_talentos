from __future__ import annotations

import io
import re
import unicodedata
from collections.abc import Iterable
from dataclasses import dataclass
from typing import Any
from uuid import NAMESPACE_DNS, UUID, uuid5

import pandas as pd
from pydantic import ValidationError

from app.models.avaliacao import AvaliacaoSemanalCreate

SUPPORTED_EXTENSIONS = {".csv", ".xlsx"}

# Escala textual da planilha real → nota 1–5
SCORE_LABEL_MAP: dict[str, int] = {
    "desconheco totalmente": 1,
    "conheco um pouco": 2,
    "conheco consideravelmente, mas ainda nao domino": 3,
    "conheco bem": 4,
    "tenho bom dominio": 4,
    "domino o assunto": 5,
}

DEFAULT_HORAS_DEDICADAS = 0.0
FALLBACK_SKILL_SCORE = 0

# Textos tratados como ausência de nota (fallback numérico).
INVALID_SCORE_LABELS = {
    "n/a",
    "na",
    "n.a.",
    "n.a",
    "nao se aplica",
    "não se aplica",
    "sem resposta",
    "nao informado",
    "não informado",
    "-",
    "--",
    ".",
    "null",
    "none",
}

FIELD_ALIASES: dict[str, tuple[str, ...]] = {
    "email": ("qual o seu email?", "email", "e-mail"),
    "talento_id": ("talento_id", "id_talento", "id do talento"),
    "semana_numero": (
        "qual semana voce esta avaliando?",
        "qual semana você está avaliando?",
        "semana_numero",
        "semana",
    ),
    "horas_dedicadas": (
        "quantas horas voce dedicou nesta semana?",
        "quantas horas você dedicou nesta semana?",
        "horas dedicadas",
        "horas_dedicadas",
        "horas",
    ),
    "motivos_autoavaliacao": (
        "por quais motivos voce se autoavaliou desta forma?",
        "por quais motivos você se autoavaliou desta forma?",
    ),
    "feedback_case": (
        "sobre o desenvolvimento da sua case, como voce avalia sua evolucao nele esta semana?",
        "sobre o desenvolvimento da sua case, como você avalia sua evolução nele está semana?",
        "sobre o desenvolvimento da sua case, como você avalia sua evolução nele esta semana?",
    ),
    "interdependencias": (
        "por que voce se deu essa nota? tem alguma interdependencia? algum ajuste de rota? conta aqui para poder te ajudar ;)",
        "por que você se deu essa nota? tem alguma interdependência? algum ajuste de rota? conta aqui para poder te ajudar ;)",
    ),
    "ajustes_rota": (
        "quer deixar consideracoes sobre essa semana? como voce se sentiu e tudo mais.",
        "quer deixar considerações sobre essa semana? como você se sentiu e tudo mais.",
    ),
    "rituais_mentoria": (
        "voce participou dos rituais com seus mentores nesta semana?",
        "você participou dos rituais com seus mentores nesta semana?",
    ),
    "link_projeto": (
        "link do projeto desenvolvido na semana",
        "link do projeto",
        "link projeto",
        "link_projeto",
        "portfolio",
        "link do portfolio",
        "link do portfólio",
        "repositorio",
        "repositório",
        "github",
        "url do projeto",
    ),
    "link_linkedin": (
        "linkedin",
        "link linkedin",
        "link do linkedin",
        "link_linkedin",
        "perfil linkedin",
        "url linkedin",
    ),
}

TECH_COLUMN_NAMES: tuple[str, ...] = (
    "Aprendizagem autodirigida e contínua",
    "Gestão de Processos",
    "Metodologia Ágil",
    "Gestão de projetos",
    "Excel",
    "SQL",
    "Databricks",
    "Python",
    "Machine Learning",
    "Postgree",
    "IA Gen",
    "Prompt engineering",
)

SOFT_COLUMN_NAMES: tuple[str, ...] = (
    "Ética",
    "Pensamento crítico",
    "Relacionamento interpessoal",
    "Comunicação (escuta ativa e oratória)",
    "Resolução de problemas",
    "Gestão de tempo",
    "Inteligência Emocional",
    "Empatia",
)


class PlanilhaProcessingError(ValueError):
    """Erro ao ler ou interpretar a planilha enviada."""


@dataclass(frozen=True, slots=True)
class PerfilTalentoSkills:
    """Notas granulares de um talento após conversão da escala textual."""

    talento_id: str
    email: str | None
    nome: str | None
    semana_numero: int
    hard_skills: dict[str, int]
    soft_skills: dict[str, int]
    media_tecnica: float
    media_socioemocional: float
    fit_vaga: float
    feedback_case: str | None = None
    interdependencias: str | None = None
    ajustes_rota: str | None = None
    rituais_mentoria: str | None = None
    link_projeto: str | None = None
    link_linkedin: str | None = None


@dataclass(frozen=True, slots=True)
class PlanilhaProcessamentoResult:
    avaliacoes: list[AvaliacaoSemanalCreate]
    perfis: list[PerfilTalentoSkills]
    linhas_processadas: int
    linhas_com_erro: int
    erros: list[str]


def _normalize(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    without_accents = "".join(
        character for character in normalized if not unicodedata.combining(character)
    )
    return " ".join(without_accents.strip().lower().split())


def _resolve_column(columns: Iterable[str], aliases: tuple[str, ...]) -> str | None:
    normalized_columns = {_normalize(column): column for column in columns}
    for alias in aliases:
        match = normalized_columns.get(_normalize(alias))
        if match is not None:
            return match
    return None


def _resolve_exact_columns(
    columns: Iterable[str], expected_names: tuple[str, ...]
) -> list[str]:
    """Localiza colunas reais da planilha por nome normalizado."""
    normalized_columns = {_normalize(column): column for column in columns}
    resolved: list[str] = []
    for expected in expected_names:
        match = normalized_columns.get(_normalize(expected))
        if match is not None:
            resolved.append(match)
    return resolved


def _parse_score(value: Any) -> int | None:
    """Converte nota numérica ou rótulo textual da planilha para escala 1–5."""
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None

    if isinstance(value, (int, float)) and not isinstance(value, bool):
        nota = int(round(float(value)))
        return nota if 0 <= nota <= 5 else None

    text = str(value).strip()
    if not text:
        return None

    normalized = _normalize(text)
    if normalized in INVALID_SCORE_LABELS:
        return None

    try:
        nota = int(round(float(text.replace(",", "."))))
        if 0 <= nota <= 5:
            return nota
    except ValueError:
        pass

    if normalized in SCORE_LABEL_MAP:
        return SCORE_LABEL_MAP[normalized]

    # Match parcial para variações de escrita
    for label, nota in SCORE_LABEL_MAP.items():
        if label in normalized or normalized in label:
            return nota

    return None


def _score_or_fallback(value: Any) -> int:
    """Retorna a nota convertida ou o fallback (0) para vazio/inválido/não reconhecido."""
    parsed = _parse_score(value)
    return FALLBACK_SKILL_SCORE if parsed is None else parsed


def _parse_numeric(value: Any) -> float | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    if isinstance(value, str) and not value.strip():
        return None
    try:
        return float(str(value).strip().replace(",", "."))
    except (TypeError, ValueError):
        return None


def _parse_semana(value: Any) -> int | None:
    """Extrai o número da semana de valores como 'Semana 1 - 19 a 23/01 (Bootcamp)'."""
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None

    if isinstance(value, (int, float)) and not isinstance(value, bool):
        semana = int(round(float(value)))
        return semana if semana >= 1 else None

    text = str(value).strip()
    if not text:
        return None

    match = re.search(r"semana\s*(\d+)", text, flags=re.IGNORECASE)
    if match:
        return int(match.group(1))

    match = re.search(r"\d+", text)
    if match:
        semana = int(match.group(0))
        return semana if semana >= 1 else None

    return None


def _average_scores(row: pd.Series, columns: list[str]) -> int:
    """Média das competências; células vazias/inválidas entram como fallback (0)."""
    if not columns:
        return FALLBACK_SKILL_SCORE

    scores = [_score_or_fallback(row.get(column)) for column in columns]
    return max(0, min(5, round(sum(scores) / len(scores))))


def _extract_skill_scores(
    row: pd.Series,
    expected_names: tuple[str, ...],
    resolved_columns: list[str],
) -> dict[str, int]:
    """Extrai notas por competência; vazio/não reconhecido vira fallback (0)."""
    normalized_to_resolved = {_normalize(column): column for column in resolved_columns}
    scores: dict[str, int] = {}

    for expected in expected_names:
        resolved = normalized_to_resolved.get(_normalize(expected))
        if resolved is None:
            scores[expected] = FALLBACK_SKILL_SCORE
            continue
        scores[expected] = _score_or_fallback(row.get(resolved))

    return scores


def _resolve_talento_id(row: pd.Series, column_map: dict[str, str]) -> UUID | None:
    """Resolve ID estável: e-mail sempre gera o mesmo UUID (evita duplicatas na planilha)."""
    email_column = column_map.get("email")
    if email_column is not None:
        email = row.get(email_column)
        if email is not None and not (isinstance(email, float) and pd.isna(email)):
            email_text = str(email).strip().lower()
            if email_text:
                return uuid5(NAMESPACE_DNS, email_text)

    talento_column = column_map.get("talento_id")
    if talento_column is not None:
        raw_value = row.get(talento_column)
        if raw_value is not None and not (
            isinstance(raw_value, float) and pd.isna(raw_value)
        ):
            try:
                return UUID(str(raw_value).strip())
            except ValueError:
                return None

    return None


def _optional_text(row: pd.Series, column_map: dict[str, str], field: str) -> str | None:
    column = column_map.get(field)
    if column is None:
        return None

    value = row.get(column)
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None

    text = str(value).strip()
    return text or None


def _build_column_map(columns: Iterable[str]) -> dict[str, str]:
    column_map: dict[str, str] = {}
    for field, aliases in FIELD_ALIASES.items():
        resolved = _resolve_column(columns, aliases)
        if resolved is not None:
            column_map[field] = resolved
    return column_map


def _compose_feedback_case(
    row: pd.Series, column_map: dict[str, str]
) -> str | None:
    partes: list[str] = []

    motivos = _optional_text(row, column_map, "motivos_autoavaliacao")
    if motivos:
        partes.append(f"Motivos da autoavaliação: {motivos}")

    case = _optional_text(row, column_map, "feedback_case")
    if case:
        partes.append(f"Evolução da case: {case}")

    if not partes:
        return None
    return " | ".join(partes)


def _row_to_avaliacao_e_perfil(
    row: pd.Series,
    column_map: dict[str, str],
    tech_columns: list[str],
    soft_columns: list[str],
) -> tuple[AvaliacaoSemanalCreate, PerfilTalentoSkills]:
    talento_id = _resolve_talento_id(row, column_map)
    if talento_id is None:
        raise PlanilhaProcessingError(
            "Não foi possível identificar o talento (informe o email)."
        )

    semana_column = column_map.get("semana_numero")
    if semana_column is None:
        raise PlanilhaProcessingError(
            "Coluna de semana não encontrada ('Qual semana você está avaliando?')."
        )

    semana_numero = _parse_semana(row.get(semana_column))
    if semana_numero is None or semana_numero < 1:
        raise PlanilhaProcessingError("Semana inválida.")

    horas_column = column_map.get("horas_dedicadas")
    if horas_column is None:
        horas_dedicadas = DEFAULT_HORAS_DEDICADAS
    else:
        horas_dedicadas = _parse_numeric(row.get(horas_column))
        if horas_dedicadas is None or horas_dedicadas < 0:
            horas_dedicadas = DEFAULT_HORAS_DEDICADAS

    hard_skills = _extract_skill_scores(row, TECH_COLUMN_NAMES, tech_columns)
    soft_skills = _extract_skill_scores(row, SOFT_COLUMN_NAMES, soft_columns)

    autoavaliacao_tecnica = _average_scores(row, tech_columns)
    autoavaliacao_socioemocional = _average_scores(row, soft_columns)

    payload: dict[str, Any] = {
        "talento_id": talento_id,
        "semana_numero": semana_numero,
        "horas_dedicadas": horas_dedicadas,
        "autoavaliacao_tecnica": autoavaliacao_tecnica,
        "autoavaliacao_socioemocional": autoavaliacao_socioemocional,
    }

    feedback_case = _compose_feedback_case(row, column_map)
    if feedback_case is not None:
        payload["feedback_case"] = feedback_case

    for field in (
        "interdependencias",
        "ajustes_rota",
        "rituais_mentoria",
        "link_projeto",
        "link_linkedin",
    ):
        text = _optional_text(row, column_map, field)
        if text is not None:
            payload[field] = text

    avaliacao = AvaliacaoSemanalCreate.model_validate(payload)

    email = _optional_text(row, column_map, "email")
    if email is not None:
        email = email.strip().lower()
    nome_coluna = _resolve_column(row.index, ("nome", "name"))
    nome: str | None = None
    if nome_coluna is not None:
        raw_nome = row.get(nome_coluna)
        if raw_nome is not None and not (isinstance(raw_nome, float) and pd.isna(raw_nome)):
            nome_texto = str(raw_nome).strip()
            nome = nome_texto or None

    media_tecnica = float(autoavaliacao_tecnica)
    media_socioemocional = float(autoavaliacao_socioemocional)
    fit_vaga = round((media_tecnica + media_socioemocional) / 2, 2)

    perfil = PerfilTalentoSkills(
        talento_id=str(talento_id),
        email=email,
        nome=nome,
        semana_numero=semana_numero,
        hard_skills=hard_skills,
        soft_skills=soft_skills,
        media_tecnica=media_tecnica,
        media_socioemocional=media_socioemocional,
        fit_vaga=fit_vaga,
        feedback_case=payload.get("feedback_case"),
        interdependencias=payload.get("interdependencias"),
        ajustes_rota=payload.get("ajustes_rota"),
        rituais_mentoria=payload.get("rituais_mentoria"),
        link_projeto=payload.get("link_projeto"),
        link_linkedin=payload.get("link_linkedin"),
    )
    return avaliacao, perfil


def _read_dataframe(file_name: str, content: bytes) -> pd.DataFrame:
    extension = file_name.lower()[file_name.rfind(".") :]
    if extension not in SUPPORTED_EXTENSIONS:
        raise PlanilhaProcessingError(
            "Formato não suportado. Envie arquivos .csv ou .xlsx."
        )

    buffer = io.BytesIO(content)
    if extension == ".csv":
        dataframe = pd.read_csv(buffer)
    else:
        dataframe = pd.read_excel(buffer, engine="openpyxl")

    if dataframe.empty:
        raise PlanilhaProcessingError("A planilha enviada não contém linhas.")

    return dataframe


def processar_planilha(file_name: str, content: bytes) -> PlanilhaProcessamentoResult:
    """Lê CSV/XLSX da avaliação semanal, mapeia colunas reais e consolida notas."""
    dataframe = _read_dataframe(file_name, content)
    column_map = _build_column_map(dataframe.columns)
    tech_columns = _resolve_exact_columns(dataframe.columns, TECH_COLUMN_NAMES)
    soft_columns = _resolve_exact_columns(dataframe.columns, SOFT_COLUMN_NAMES)

    avaliacoes: list[AvaliacaoSemanalCreate] = []
    perfis: list[PerfilTalentoSkills] = []
    erros: list[str] = []
    chaves_vistas: dict[tuple[str, int], int] = {}

    for index, row in dataframe.iterrows():
        linha = int(index) + 2
        try:
            avaliacao, perfil = _row_to_avaliacao_e_perfil(
                row, column_map, tech_columns, soft_columns
            )
            email_norm = (perfil.email or "").strip().lower() or None
            chave = (
                email_norm or str(avaliacao.talento_id),
                int(avaliacao.semana_numero),
            )
            if chave in chaves_vistas:
                erros.append(
                    f"Linha {linha}: duplicata da linha {chaves_vistas[chave]} "
                    f"(mesmo talento/semana); a última linha prevalece."
                )
            chaves_vistas[chave] = linha

            avaliacoes.append(avaliacao)
            perfis.append(perfil)
        except (PlanilhaProcessingError, ValidationError) as exc:
            erros.append(f"Linha {linha}: {exc}")

    if not avaliacoes:
        detail = "; ".join(erros[:5]) if erros else "Nenhuma linha válida encontrada."
        raise PlanilhaProcessingError(detail)

    avaliacoes_por_chave: dict[tuple[str, int], AvaliacaoSemanalCreate] = {}
    perfis_por_chave: dict[tuple[str, int], PerfilTalentoSkills] = {}
    for avaliacao, perfil in zip(avaliacoes, perfis, strict=True):
        email_norm = (perfil.email or "").strip().lower() or None
        chave = (
            email_norm or str(avaliacao.talento_id),
            int(avaliacao.semana_numero),
        )
        avaliacoes_por_chave[chave] = avaliacao
        perfis_por_chave[chave] = perfil

    avaliacoes = list(avaliacoes_por_chave.values())
    perfis = list(perfis_por_chave.values())

    return PlanilhaProcessamentoResult(
        avaliacoes=avaliacoes,
        perfis=perfis,
        linhas_processadas=len(avaliacoes),
        linhas_com_erro=len(erros),
        erros=erros,
    )
