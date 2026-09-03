"""Repositório Supabase para talentos e avaliações semanais.

Substitui o cache em memória por persistência relacional no Supabase.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from postgrest.exceptions import APIError

from app.core.database import DatabaseError, get_supabase

DEFAULT_TURMA_NOME = "Turma Padrão"


class TalentosStoreError(RuntimeError):
    """Erro ao persistir ou consultar talentos no Supabase."""


def _validar_uuid(valor: str, campo: str = "id") -> str:
    try:
        return str(UUID(str(valor)))
    except (ValueError, TypeError) as exc:
        raise TalentosStoreError(f"{campo} inválido: {valor}") from exc


def _executar(operacao: str, callback: Any) -> Any:
    try:
        return callback()
    except APIError as exc:
        raise TalentosStoreError(
            f"Erro Supabase ao {operacao}: {getattr(exc, 'message', exc)}"
        ) from exc
    except DatabaseError:
        raise
    except Exception as exc:
        raise TalentosStoreError(f"Erro inesperado ao {operacao}: {exc}") from exc


def _obter_turma_id(
    turma_id: str | None = None,
    organizacao_id: str | None = None,
) -> str:
    if turma_id is not None:
        return _validar_uuid(turma_id, "turma_id")

    from app.services.auth_store import garantir_organizacao_padrao

    org_resolvida = organizacao_id or garantir_organizacao_padrao()
    client = get_supabase()
    existente = _executar(
        "buscar turma padrão",
        lambda: client.table("turmas")
        .select("id")
        .eq("nome", DEFAULT_TURMA_NOME)
        .eq("organizacao_id", org_resolvida)
        .limit(1)
        .execute(),
    )
    if existente.data:
        return existente.data[0]["id"]

    criada = _executar(
        "criar turma padrão",
        lambda: client.table("turmas")
        .insert(
            {
                "nome": DEFAULT_TURMA_NOME,
                "descricao": "Turma criada automaticamente para uploads sem cohort definido",
                "organizacao_id": org_resolvida,
            }
        )
        .execute(),
    )
    return criada.data[0]["id"]


def garantir_turma_padrao(organizacao_id: str | None = None) -> str:
    """Garante que a turma padrão existe e retorna seu ID."""
    return _obter_turma_id(organizacao_id=organizacao_id)


def _talento_para_resposta(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "talento_id": str(row["id"]),
        "email": row.get("email"),
        "nome": row.get("nome"),
        "hard_skills": row.get("hard_skills") or {},
        "soft_skills": row.get("soft_skills") or {},
        "turma_id": str(row["turma_id"]) if row.get("turma_id") else None,
    }


def _avaliacao_para_resposta(row: dict[str, Any], talento: dict[str, Any]) -> dict[str, Any]:
    return {
        "talento_id": str(row["talento_id"]),
        "email": talento.get("email"),
        "nome": talento.get("nome"),
        "semana_numero": row["semana_numero"],
        "horas_dedicadas": row.get("horas_dedicadas"),
        "hard_skills": row.get("hard_skills") or {},
        "soft_skills": row.get("soft_skills") or {},
        "media_tecnica": row.get("media_tecnica"),
        "media_socioemocional": row.get("media_socioemocional"),
        "fit_vaga": row.get("fit_vaga"),
        "feedback_case": row.get("feedback_case"),
        "interdependencias": row.get("interdependencias"),
        "ajustes_rota": row.get("ajustes_rota"),
        "rituais_mentoria": row.get("rituais_mentoria"),
        "link_projeto": row.get("link_projeto"),
        "link_linkedin": row.get("link_linkedin"),
        "turma_id": str(row["turma_id"]) if row.get("turma_id") else None,
    }


def salvar_talentos(
    talentos: list[dict[str, Any]],
    turma_id: str | None = None,
    semana_numero: int | None = None,
) -> None:
    """Persiste talentos e, quando disponível, avaliações semanais completas."""
    if not talentos:
        return

    client = get_supabase()
    turma_resolvida = _obter_turma_id(turma_id)

    for item in talentos:
        talento_id = _validar_uuid(str(item["talento_id"]), "talento_id")
        hard_skills = item.get("hard_skills") or {}
        soft_skills = item.get("soft_skills") or {}

        registro_talento = {
            "id": talento_id,
            "turma_id": turma_resolvida,
            "email": item.get("email"),
            "nome": item.get("nome"),
            "hard_skills": hard_skills,
            "soft_skills": soft_skills,
        }
        _executar(
            "salvar talento",
            lambda payload=registro_talento: client.table("talentos")
            .upsert(payload, on_conflict="id")
            .execute(),
        )

        semana = item.get("semana_numero", semana_numero)
        if semana is None:
            continue

        registro_avaliacao: dict[str, Any] = {
            "turma_id": turma_resolvida,
            "talento_id": talento_id,
            "semana_numero": int(semana),
            "horas_dedicadas": float(item.get("horas_dedicadas") or 0),
            "hard_skills": hard_skills,
            "soft_skills": soft_skills,
            "feedback_case": item.get("feedback_case"),
            "interdependencias": item.get("interdependencias"),
            "ajustes_rota": item.get("ajustes_rota"),
            "rituais_mentoria": item.get("rituais_mentoria"),
            "link_projeto": item.get("link_projeto"),
            "link_linkedin": item.get("link_linkedin"),
        }

        if item.get("autoavaliacao_tecnica") is not None:
            registro_avaliacao["autoavaliacao_tecnica"] = item["autoavaliacao_tecnica"]
        if item.get("autoavaliacao_socioemocional") is not None:
            registro_avaliacao["autoavaliacao_socioemocional"] = item[
                "autoavaliacao_socioemocional"
            ]
        if item.get("media_tecnica") is not None:
            registro_avaliacao["media_tecnica"] = item["media_tecnica"]
        if item.get("media_socioemocional") is not None:
            registro_avaliacao["media_socioemocional"] = item["media_socioemocional"]
        if item.get("fit_vaga") is not None:
            registro_avaliacao["fit_vaga"] = item["fit_vaga"]

        _executar(
            "salvar avaliação semanal",
            lambda payload=registro_avaliacao: client.table("avaliacoes_semanais")
            .upsert(payload, on_conflict="talento_id,semana_numero")
            .execute(),
        )


def listar_talentos(
    turma_id: str | None = None,
    semana_numero: int | None = None,
) -> list[dict[str, Any]]:
    """Lista talentos da turma. Com semana, retorna perfis da avaliação correspondente."""
    client = get_supabase()
    turma_resolvida = _obter_turma_id(turma_id)

    if semana_numero is not None:
        avaliacoes = _executar(
            "listar avaliações por turma e semana",
            lambda: client.table("avaliacoes_semanais")
            .select("*, talentos(email, nome)")
            .eq("turma_id", turma_resolvida)
            .eq("semana_numero", semana_numero)
            .execute(),
        )
        resultado: list[dict[str, Any]] = []
        for row in avaliacoes.data or []:
            talento_info = row.get("talentos") or {}
            perfil = _avaliacao_para_resposta(row, talento_info)
            resultado.append(perfil)
        return resultado

    talentos = _executar(
        "listar talentos por turma",
        lambda: client.table("talentos")
        .select("*")
        .eq("turma_id", turma_resolvida)
        .execute(),
    )
    return [_talento_para_resposta(row) for row in talentos.data or []]


def listar_historico_talento(
    talento_id: str,
    turma_id: str | None = None,
) -> dict[str, Any] | None:
    """Lista todas as avaliações semanais de um talento, em ordem cronológica."""
    client = get_supabase()
    talento_uuid = _validar_uuid(talento_id, "talento_id")
    turma_resolvida = _obter_turma_id(turma_id)

    talento = _executar(
        "buscar talento para histórico",
        lambda: client.table("talentos")
        .select("*")
        .eq("id", talento_uuid)
        .eq("turma_id", turma_resolvida)
        .limit(1)
        .execute(),
    )
    if not talento.data:
        return None

    registro_talento = talento.data[0]
    avaliacoes = _executar(
        "listar histórico de avaliações",
        lambda: client.table("avaliacoes_semanais")
        .select("*")
        .eq("talento_id", talento_uuid)
        .eq("turma_id", turma_resolvida)
        .order("semana_numero")
        .execute(),
    )

    series = [
        _avaliacao_para_resposta(row, registro_talento)
        for row in avaliacoes.data or []
    ]

    return {
        "talento_id": str(registro_talento["id"]),
        "nome": registro_talento.get("nome"),
        "email": registro_talento.get("email"),
        "turma_id": str(registro_talento["turma_id"]),
        "total_semanas": len(series),
        "series": series,
    }


def buscar_talento_por_id(
    talento_id: str,
    turma_id: str | None = None,
    semana_numero: int | None = None,
) -> dict[str, Any] | None:
    """Busca um talento pelo ID, opcionalmente com avaliação de uma semana específica."""
    client = get_supabase()
    talento_uuid = _validar_uuid(talento_id, "talento_id")
    turma_resolvida = _obter_turma_id(turma_id)

    talento = _executar(
        "buscar talento por id",
        lambda: client.table("talentos")
        .select("*")
        .eq("id", talento_uuid)
        .eq("turma_id", turma_resolvida)
        .limit(1)
        .execute(),
    )
    if not talento.data:
        return None

    registro_talento = talento.data[0]
    if semana_numero is None:
        return _talento_para_resposta(registro_talento)

    avaliacao = _executar(
        "buscar avaliação do talento",
        lambda: client.table("avaliacoes_semanais")
        .select("*")
        .eq("talento_id", talento_uuid)
        .eq("semana_numero", semana_numero)
        .limit(1)
        .execute(),
    )
    if not avaliacao.data:
        return _talento_para_resposta(registro_talento)

    return _avaliacao_para_resposta(avaliacao.data[0], registro_talento)


def limpar_talentos(turma_id: str | None = None) -> None:
    """Remove talentos (e avaliações em cascata) de uma turma."""
    client = get_supabase()
    turma_resolvida = _obter_turma_id(turma_id)
    _executar(
        "limpar talentos da turma",
        lambda: client.table("talentos").delete().eq("turma_id", turma_resolvida).execute(),
    )
