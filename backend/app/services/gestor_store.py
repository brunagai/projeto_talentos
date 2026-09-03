"""Repositório Supabase para avaliações do gestor e cruzamento de perspectivas."""

from __future__ import annotations

from typing import Any

from app.services.cargos_referencia import HARD_SKILL_KEYS, SKILL_KEYS, SOFT_SKILL_KEYS
from app.services.talentos_store import (
    TalentosStoreError,
    _executar,
    _obter_turma_id,
    _validar_uuid,
)
from app.core.database import get_supabase


class GestorStoreError(RuntimeError):
    """Erro ao persistir ou consultar avaliações do gestor."""


def _calcular_medias(
    hard_skills: dict[str, int],
    soft_skills: dict[str, int],
) -> tuple[float, float]:
    hard_vals = list(hard_skills.values())
    soft_vals = list(soft_skills.values())
    media_tecnica = sum(hard_vals) / len(hard_vals) if hard_vals else 0.0
    media_socio = sum(soft_vals) / len(soft_vals) if soft_vals else 0.0
    return round(media_tecnica, 2), round(media_socio, 2)


def _gestor_para_resposta(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(row["id"]),
        "talento_id": str(row["talento_id"]),
        "semana_numero": row["semana_numero"],
        "gestor_nome": row.get("gestor_nome"),
        "hard_skills": row.get("hard_skills") or {},
        "soft_skills": row.get("soft_skills") or {},
        "media_tecnica": row.get("media_tecnica"),
        "media_socioemocional": row.get("media_socioemocional"),
        "feedback_performance": row.get("feedback_performance"),
        "alinhamento_cultural": row.get("alinhamento_cultural"),
        "pontos_desenvolvimento": row.get("pontos_desenvolvimento"),
        "pontos_fortes": row.get("pontos_fortes"),
    }


def _buscar_avaliacao_semanal_id(
    talento_id: str,
    semana_numero: int,
    turma_id: str,
) -> str | None:
    client = get_supabase()
    resultado = _executar(
        "buscar avaliação semanal vinculada",
        lambda: client.table("avaliacoes_semanais")
        .select("id")
        .eq("talento_id", talento_id)
        .eq("turma_id", turma_id)
        .eq("semana_numero", semana_numero)
        .limit(1)
        .execute(),
    )
    if not resultado.data:
        return None
    return str(resultado.data[0]["id"])


def salvar_avaliacao_gestor(
    payload: dict[str, Any],
    turma_id: str | None = None,
) -> dict[str, Any]:
    """Cria ou atualiza a avaliação do gestor para um talento/semana."""
    client = get_supabase()
    turma_resolvida = _obter_turma_id(turma_id)
    talento_uuid = _validar_uuid(str(payload["talento_id"]), "talento_id")
    semana_numero = int(payload["semana_numero"])

    hard_skills = payload.get("hard_skills") or {}
    soft_skills = payload.get("soft_skills") or {}
    media_tecnica, media_socio = _calcular_medias(hard_skills, soft_skills)

    avaliacao_semanal_id = _buscar_avaliacao_semanal_id(
        talento_uuid, semana_numero, turma_resolvida
    )

    registro: dict[str, Any] = {
        "turma_id": turma_resolvida,
        "talento_id": talento_uuid,
        "semana_numero": semana_numero,
        "gestor_nome": payload.get("gestor_nome"),
        "hard_skills": hard_skills,
        "soft_skills": soft_skills,
        "media_tecnica": media_tecnica,
        "media_socioemocional": media_socio,
        "feedback_performance": payload.get("feedback_performance"),
        "alinhamento_cultural": payload.get("alinhamento_cultural"),
        "pontos_desenvolvimento": payload.get("pontos_desenvolvimento"),
        "pontos_fortes": payload.get("pontos_fortes"),
        "avaliacao_semanal_id": avaliacao_semanal_id,
    }

    try:
        salvo = _executar(
            "salvar avaliação do gestor",
            lambda: client.table("avaliacoes_gestor")
            .upsert(registro, on_conflict="talento_id,semana_numero")
            .execute(),
        )
    except TalentosStoreError as exc:
        raise GestorStoreError(str(exc)) from exc

    if not salvo.data:
        raise GestorStoreError("Falha ao salvar avaliação do gestor.")
    return _gestor_para_resposta(salvo.data[0])


def buscar_avaliacao_gestor(
    talento_id: str,
    semana_numero: int,
    turma_id: str | None = None,
) -> dict[str, Any] | None:
    """Retorna a avaliação do gestor para talento/semana, se existir."""
    client = get_supabase()
    turma_resolvida = _obter_turma_id(turma_id)
    talento_uuid = _validar_uuid(talento_id, "talento_id")

    try:
        resultado = _executar(
            "buscar avaliação do gestor",
            lambda: client.table("avaliacoes_gestor")
            .select("*")
            .eq("talento_id", talento_uuid)
            .eq("turma_id", turma_resolvida)
            .eq("semana_numero", semana_numero)
            .limit(1)
            .execute(),
        )
    except TalentosStoreError as exc:
        raise GestorStoreError(str(exc)) from exc

    if not resultado.data:
        return None
    return _gestor_para_resposta(resultado.data[0])


def _nota_skill(
    skills: dict[str, int],
    competencia: str,
) -> int:
    return int(skills.get(competencia, 0))


def _buscar_autopercepcao_semana(
    talento_id: str,
    semana_numero: int,
    turma_id: str,
) -> dict[str, Any]:
    """Busca a autoavaliação semanal; retorna estrutura vazia se não houver registro."""
    client = get_supabase()
    talento = _executar(
        "buscar talento",
        lambda: client.table("talentos")
        .select("nome, email")
        .eq("id", talento_id)
        .eq("turma_id", turma_id)
        .limit(1)
        .execute(),
    )
    if not talento.data:
        raise GestorStoreError("Talento não encontrado.")

    talento_info = talento.data[0]
    avaliacao = _executar(
        "buscar autopercepção da semana",
        lambda: client.table("avaliacoes_semanais")
        .select("*")
        .eq("talento_id", talento_id)
        .eq("turma_id", turma_id)
        .eq("semana_numero", semana_numero)
        .limit(1)
        .execute(),
    )

    if not avaliacao.data:
        return {
            "nome": talento_info.get("nome"),
            "email": talento_info.get("email"),
            "hard_skills": {},
            "soft_skills": {},
            "media_tecnica": 0.0,
            "media_socioemocional": 0.0,
            "feedback_case": None,
            "interdependencias": None,
            "ajustes_rota": None,
            "rituais_mentoria": None,
        }

    row = avaliacao.data[0]
    return {
        "nome": talento_info.get("nome"),
        "email": talento_info.get("email"),
        "hard_skills": row.get("hard_skills") or {},
        "soft_skills": row.get("soft_skills") or {},
        "media_tecnica": row.get("media_tecnica"),
        "media_socioemocional": row.get("media_socioemocional"),
        "feedback_case": row.get("feedback_case"),
        "interdependencias": row.get("interdependencias"),
        "ajustes_rota": row.get("ajustes_rota"),
        "rituais_mentoria": row.get("rituais_mentoria"),
    }


def obter_comparativo_gestor(
    talento_id: str,
    semana_numero: int,
    turma_id: str | None = None,
) -> dict[str, Any]:
    """Cruza autopercepção semanal com avaliação do gestor e calcula deltas."""
    turma_resolvida = _obter_turma_id(turma_id)
    talento_uuid = _validar_uuid(talento_id, "talento_id")

    autopercepcao = _buscar_autopercepcao_semana(
        talento_uuid, semana_numero, turma_resolvida
    )

    avaliacao_gestor = buscar_avaliacao_gestor(
        talento_uuid,
        semana_numero,
        turma_id=turma_resolvida,
    )

    auto_hard = autopercepcao.get("hard_skills") or {}
    auto_soft = autopercepcao.get("soft_skills") or {}
    gestor_hard = (avaliacao_gestor or {}).get("hard_skills") or {}
    gestor_soft = (avaliacao_gestor or {}).get("soft_skills") or {}

    competencias: list[dict[str, Any]] = []
    convergentes = 0
    total_com_gestor = 0

    for competencia in HARD_SKILL_KEYS:
        nota_auto = _nota_skill(auto_hard, competencia)
        nota_gestor = _nota_skill(gestor_hard, competencia) if avaliacao_gestor else None
        delta = None
        if nota_gestor is not None:
            delta = nota_gestor - nota_auto
            total_com_gestor += 1
            if abs(delta) <= 1:
                convergentes += 1
        competencias.append(
            {
                "competencia": competencia,
                "tipo": "hard",
                "nota_autopercepcao": nota_auto,
                "nota_gestor": nota_gestor,
                "delta": delta,
            }
        )

    for competencia in SOFT_SKILL_KEYS:
        nota_auto = _nota_skill(auto_soft, competencia)
        nota_gestor = _nota_skill(gestor_soft, competencia) if avaliacao_gestor else None
        delta = None
        if nota_gestor is not None:
            delta = nota_gestor - nota_auto
            total_com_gestor += 1
            if abs(delta) <= 1:
                convergentes += 1
        competencias.append(
            {
                "competencia": competencia,
                "tipo": "soft",
                "nota_autopercepcao": nota_auto,
                "nota_gestor": nota_gestor,
                "delta": delta,
            }
        )

    media_auto_tec = float(autopercepcao.get("media_tecnica") or _calcular_medias(auto_hard, {})[0])
    media_auto_soc = float(
        autopercepcao.get("media_socioemocional") or _calcular_medias({}, auto_soft)[1]
    )

    media_gestor_tec = avaliacao_gestor.get("media_tecnica") if avaliacao_gestor else None
    media_gestor_soc = (
        avaliacao_gestor.get("media_socioemocional") if avaliacao_gestor else None
    )

    taxa_convergencia = (
        round((convergentes / total_com_gestor) * 100, 1) if total_com_gestor > 0 else None
    )

    return {
        "talento_id": talento_uuid,
        "nome": autopercepcao.get("nome"),
        "email": autopercepcao.get("email"),
        "semana_numero": semana_numero,
        "autopercepcao": {
            "hard_skills": auto_hard,
            "soft_skills": auto_soft,
            "media_tecnica": media_auto_tec,
            "media_socioemocional": media_auto_soc,
            "feedback_case": autopercepcao.get("feedback_case"),
            "interdependencias": autopercepcao.get("interdependencias"),
            "ajustes_rota": autopercepcao.get("ajustes_rota"),
            "rituais_mentoria": autopercepcao.get("rituais_mentoria"),
        },
        "avaliacao_gestor": avaliacao_gestor,
        "competencias": competencias,
        "resumo": {
            "media_tecnica_autopercepcao": media_auto_tec,
            "media_socioemocional_autopercepcao": media_auto_soc,
            "media_tecnica_gestor": media_gestor_tec,
            "media_socioemocional_gestor": media_gestor_soc,
            "delta_media_tecnica": (
                round(float(media_gestor_tec) - media_auto_tec, 2)
                if media_gestor_tec is not None
                else None
            ),
            "delta_media_socioemocional": (
                round(float(media_gestor_soc) - media_auto_soc, 2)
                if media_gestor_soc is not None
                else None
            ),
            "taxa_convergencia_percentual": taxa_convergencia,
            "total_competencias": len(SKILL_KEYS),
        },
    }
