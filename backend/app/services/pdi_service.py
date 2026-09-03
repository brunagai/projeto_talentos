"""Geração automática de Plano de Desenvolvimento Individual (PDI)."""

from __future__ import annotations

from typing import Any

from app.services.cargos_referencia import HARD_SKILL_KEYS, SKILL_KEYS, SOFT_SKILL_KEYS
from app.services.gestor_store import GestorStoreError, buscar_avaliacao_gestor
from app.services.matchmaking_service import MatchmakingError, calcular_fit_cargo, resolver_cargo
from app.services.talentos_store import (
    TalentosStoreError,
    _obter_turma_id,
    _validar_uuid,
    buscar_perfil_semana_talento,
    listar_historico_talento,
)

LIMIAR_NOTA = 4.0
NOTA_META_PADRAO = 4.0


class PdiServiceError(RuntimeError):
    """Erro ao gerar PDI."""

    status_code: int = 400
    code: str = "pdi_error"
    public_message: str = "Não foi possível gerar o PDI."

    def __init__(
        self,
        message: str,
        *,
        public_message: str | None = None,
        status_code: int | None = None,
    ) -> None:
        super().__init__(message)
        if public_message is not None:
            self.public_message = public_message
        if status_code is not None:
            self.status_code = status_code


class PdiNotFoundError(PdiServiceError):
    status_code = 404
    code = "not_found"
    public_message = "Talento não encontrado."


ACOES_POR_COMPETENCIA: dict[str, list[dict[str, str]]] = {
    "Python": [
        {"tipo": "curso", "descricao": "Módulo prático de Python (scripts, APIs ou automação)."},
        {"tipo": "projeto", "descricao": "Entregar script ou feature aplicada ao case da semana."},
        {"tipo": "mentoria", "descricao": "Code review semanal com mentor técnico."},
    ],
    "SQL": [
        {"tipo": "curso", "descricao": "Exercícios de consultas, joins e agregações em SQL."},
        {"tipo": "projeto", "descricao": "Modelar e consultar dataset real do programa."},
        {"tipo": "mentoria", "descricao": "Revisão de queries com especialista em dados."},
    ],
    "Machine Learning": [
        {"tipo": "curso", "descricao": "Trilha introdutória de ML com projeto guiado."},
        {"tipo": "projeto", "descricao": "Prototipar modelo simples com métricas documentadas."},
        {"tipo": "mentoria", "descricao": "Sessão sobre validação e interpretação de resultados."},
    ],
    "Metodologia Ágil": [
        {"tipo": "curso", "descricao": "Fundamentos de Scrum/Kanban com simulação."},
        {"tipo": "projeto", "descricao": "Participar ativamente das cerimônias do squad."},
        {"tipo": "mentoria", "descricao": "Feedback do Scrum Master sobre participação."},
    ],
    "Comunicação (escuta ativa e oratória)": [
        {"tipo": "curso", "descricao": "Workshop de comunicação e apresentação de resultados."},
        {"tipo": "projeto", "descricao": "Apresentar case semanal para o time."},
        {"tipo": "mentoria", "descricao": "Mentoria de oratória com foco em clareza e objetividade."},
    ],
}

ACOES_PADRAO_HARD = [
    {"tipo": "curso", "descricao": "Curso ou tutorial focado na competência técnica."},
    {"tipo": "projeto", "descricao": "Aplicar a competência em entrega real da semana."},
    {"tipo": "mentoria", "descricao": "Sessão de mentoria técnica para revisão de progresso."},
]

ACOES_PADRAO_SOFT = [
    {"tipo": "curso", "descricao": "Conteúdo de desenvolvimento comportamental."},
    {"tipo": "projeto", "descricao": "Praticar a competência em dinâmica de equipe."},
    {"tipo": "mentoria", "descricao": "Feedback estruturado com gestor ou mentor."},
]


def _nota_skill(
    hard_skills: dict[str, int],
    soft_skills: dict[str, int],
    competencia: str,
) -> float:
    if competencia in hard_skills:
        return float(hard_skills[competencia])
    if competencia in soft_skills:
        return float(soft_skills[competencia])
    return 0.0


def _prazo_semanas(gap: float, prioridade_score: float) -> int:
    if gap >= 3 or prioridade_score >= 8:
        return 12
    if gap >= 2 or prioridade_score >= 5:
        return 8
    return 4


def _prioridade_label(score: float) -> str:
    if score >= 7:
        return "alta"
    if score >= 4:
        return "media"
    return "baixa"


def _acoes_para_competencia(competencia: str, tipo: str) -> list[dict[str, str]]:
    if competencia in ACOES_POR_COMPETENCIA:
        return list(ACOES_POR_COMPETENCIA[competencia])
    padrao = ACOES_PADRAO_SOFT if tipo == "soft" else ACOES_PADRAO_HARD
    return [
        {
            "tipo": item["tipo"],
            "descricao": f"{item['descricao']} ({competencia})",
        }
        for item in padrao
    ]


def _ultima_semana(series: list[dict[str, Any]]) -> int | None:
    if not series:
        return None
    return max(item["semana_numero"] for item in series)


def gerar_pdi(
    talento_id: str,
    cargo_alvo: str,
    semana_numero: int | None = None,
    turma_id: str | None = None,
) -> dict[str, Any]:
    """Gera PDI com base em gaps do cargo, limiar de nota e visão do gestor."""
    try:
        turma_resolvida = _obter_turma_id(turma_id)
        talento_uuid = _validar_uuid(talento_id, "talento_id")
        cargo = resolver_cargo(cargo_alvo)
    except (TalentosStoreError, MatchmakingError) as exc:
        raise PdiServiceError(
            str(exc),
            public_message=getattr(exc, "public_message", "Não foi possível gerar o PDI."),
            status_code=getattr(exc, "status_code", 400),
        ) from exc

    semana_ref = semana_numero
    if semana_ref is None:
        historico = listar_historico_talento(talento_uuid, turma_id=turma_resolvida)
        if historico is None:
            raise PdiNotFoundError(
                "Talento não encontrado.",
                public_message="Talento não encontrado.",
            )
        series = historico.get("series") or []
        semana_ref = _ultima_semana(series)
        if semana_ref is None:
            raise PdiServiceError(
                "Nenhuma avaliação semanal encontrada. Faça upload da planilha antes de gerar o PDI.",
                public_message=(
                    "Nenhuma avaliação semanal encontrada. "
                    "Faça upload da planilha antes de gerar o PDI."
                ),
            )
        nome = historico.get("nome")
        email = historico.get("email")
    else:
        nome = None
        email = None

    pacote = buscar_perfil_semana_talento(
        talento_uuid,
        semana_ref,
        turma_id=turma_resolvida,
    )
    if pacote is None:
        raise PdiNotFoundError(
            "Talento não encontrado.",
            public_message="Talento não encontrado.",
        )

    nome = nome or pacote.get("nome")
    email = email or pacote.get("email")
    perfil_semana = pacote.get("perfil_semana")
    if perfil_semana is None:
        raise PdiServiceError(
            f"Não há autoavaliação para a semana {semana_ref}.",
            public_message=f"Não há autoavaliação para a semana {semana_ref}.",
        )

    hard_auto = perfil_semana.get("hard_skills") or {}
    soft_auto = perfil_semana.get("soft_skills") or {}

    avaliacao_gestor: dict[str, Any] | None = None
    try:
        avaliacao_gestor = buscar_avaliacao_gestor(
            talento_uuid,
            semana_ref,
            turma_id=turma_resolvida,
        )
    except GestorStoreError:
        avaliacao_gestor = None

    hard_gestor = (avaliacao_gestor or {}).get("hard_skills") or {}
    soft_gestor = (avaliacao_gestor or {}).get("soft_skills") or {}

    match = calcular_fit_cargo(
        hard_auto,
        soft_auto,
        cargo,
        talento_id=talento_uuid,
        nome=nome,
        email=email,
    )

    gaps_por_competencia = {
        item.competencia: item for item in match.competencias_desenvolvimento
    }

    metas: list[dict[str, Any]] = []

    for competencia in SKILL_KEYS:
        tipo = "hard" if competencia in HARD_SKILL_KEYS else "soft"
        nota_auto = _nota_skill(hard_auto, soft_auto, competencia)
        nota_gestor = (
            _nota_skill(hard_gestor, soft_gestor, competencia)
            if avaliacao_gestor
            else None
        )

        nota_referencia = nota_auto
        if nota_gestor is not None:
            nota_referencia = min(nota_auto, nota_gestor)

        gap_item = gaps_por_competencia.get(competencia)
        gap_cargo = gap_item.gap if gap_item else 0
        peso_cargo = cargo.pesos.get(competencia, 0)

        abaixo_limiar = nota_referencia < LIMIAR_NOTA
        desalinhamento_gestor = (
            nota_gestor is not None
            and nota_gestor < nota_auto
            and (nota_auto - nota_gestor) >= 1
        )

        if not abaixo_limiar and gap_cargo <= 0 and not desalinhamento_gestor:
            continue

        motivos: list[str] = []
        if abaixo_limiar:
            motivos.append("abaixo_limiar")
        if gap_cargo > 0:
            motivos.append("gap_cargo")
        if desalinhamento_gestor:
            motivos.append("desalinhamento_gestor")

        prioridade_score = (
            gap_cargo * 2.0
            + max(0.0, LIMIAR_NOTA - nota_referencia) * 1.5
            + (nota_auto - (nota_gestor or nota_auto)) * 1.0
        )
        prazo = _prazo_semanas(max(gap_cargo, LIMIAR_NOTA - nota_referencia), prioridade_score)
        nota_meta = min(5.0, max(NOTA_META_PADRAO, nota_referencia + max(1, gap_cargo)))

        metas.append(
            {
                "competencia": competencia,
                "tipo": tipo,
                "nota_atual": round(nota_referencia, 2),
                "nota_autopercepcao": round(nota_auto, 2),
                "nota_gestor": round(nota_gestor, 2) if nota_gestor is not None else None,
                "nota_meta": round(nota_meta, 2),
                "peso_exigido_cargo": peso_cargo,
                "gap_cargo": gap_cargo,
                "motivos": motivos,
                "prioridade": _prioridade_label(prioridade_score),
                "prazo_semanas": prazo,
                "prazo_descricao": f"{prazo} semanas",
                "acoes": _acoes_para_competencia(competencia, tipo),
            }
        )

    metas.sort(
        key=lambda item: (
            {"alta": 0, "media": 1, "baixa": 2}[item["prioridade"]],
            -item["gap_cargo"],
            item["nota_atual"],
        )
    )

    return {
        "talento_id": talento_uuid,
        "nome": nome,
        "email": email,
        "semana_referencia": semana_ref,
        "cargo_alvo": cargo.cargo,
        "area": cargo.area,
        "fit_percentual_atual": match.fit_percentual,
        "limiar_nota": LIMIAR_NOTA,
        "total_metas": len(metas),
        "tem_avaliacao_gestor": avaliacao_gestor is not None,
        "resumo": {
            "focos_abaixo_limiar": sum(1 for m in metas if "abaixo_limiar" in m["motivos"]),
            "focos_gap_cargo": sum(1 for m in metas if "gap_cargo" in m["motivos"]),
            "focos_desalinhamento_gestor": sum(
                1 for m in metas if "desalinhamento_gestor" in m["motivos"]
            ),
            "prazo_medio_semanas": (
                round(sum(m["prazo_semanas"] for m in metas) / len(metas), 1)
                if metas
                else 0
            ),
        },
        "metas": metas,
    }
