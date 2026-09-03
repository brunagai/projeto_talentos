"""Repositório Supabase para talentos e avaliações semanais.

Substitui o cache em memória por persistência relacional no Supabase.
"""

from __future__ import annotations

import logging
from typing import Any
from uuid import NAMESPACE_DNS, UUID, uuid5

from postgrest.exceptions import APIError

from app.core.database import DatabaseError, get_supabase
from app.exceptions.business import TalentoNotFoundError, TalentoTurmaMismatchError

DEFAULT_TURMA_NOME = "Turma Padrão"
logger = logging.getLogger(__name__)


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


def validar_talento_na_turma(talento_id: str, turma_id: str) -> None:
    """Garante que o talento existe e pertence à turma informada."""
    client = get_supabase()
    talento_uuid = _validar_uuid(talento_id, "talento_id")
    turma_uuid = _validar_uuid(turma_id, "turma_id")

    resultado = _executar(
        "validar talento na turma",
        lambda: client.table("talentos")
        .select("id")
        .eq("id", talento_uuid)
        .eq("turma_id", turma_uuid)
        .limit(1)
        .execute(),
    )
    if not resultado.data:
        raise TalentoNotFoundError(
            "Talento não encontrado nesta turma.",
            details={"talento_id": talento_uuid, "turma_id": turma_uuid},
        )


def validar_talentos_pertencem_turma(talento_ids: list[str], turma_id: str) -> None:
    """Impede reatribuição de talentos existentes para outra turma."""
    if not talento_ids:
        return

    client = get_supabase()
    turma_uuid = _validar_uuid(turma_id, "turma_id")
    ids_unicos = [_validar_uuid(talento_id, "talento_id") for talento_id in set(talento_ids)]

    existentes = _executar(
        "buscar talentos existentes para validação de turma",
        lambda: client.table("talentos")
        .select("id, turma_id")
        .in_("id", ids_unicos)
        .execute(),
    )

    for registro in existentes.data or []:
        if str(registro["turma_id"]) != turma_uuid:
            raise TalentoTurmaMismatchError(
                "Talento pertence a outra turma e não pode ser salvo neste contexto.",
                details={
                    "talento_id": str(registro["id"]),
                    "turma_id": turma_uuid,
                    "turma_id_atual": str(registro["turma_id"]),
                },
            )


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


def _normalizar_email(email: Any) -> str | None:
    if email is None:
        return None
    texto = str(email).strip().lower()
    return texto or None


def _buscar_ids_por_emails(turma_id: str, emails: list[str]) -> dict[str, str]:
    unicos = sorted({email for email in emails if email})
    if not unicos:
        return {}

    client = get_supabase()
    encontrados: dict[str, str] = {}
    for inicio in range(0, len(unicos), 100):
        lote = unicos[inicio : inicio + 100]
        resultado = _executar(
            "buscar talentos por e-mail",
            lambda lote=lote: client.table("talentos")
            .select("id, email")
            .eq("turma_id", turma_id)
            .in_("email", lote)
            .execute(),
        )
        for row in resultado.data or []:
            email = _normalizar_email(row.get("email"))
            if email:
                encontrados[email] = str(row["id"])
    return encontrados


def _deduplicar_registros_talentos(
    registros: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], dict[str, str]]:
    """Um registro por e-mail (unique turma+email) e por id. Devolve aliases de IDs."""
    por_email: dict[str, dict[str, Any]] = {}
    sem_email: list[dict[str, Any]] = []

    for registro in registros:
        talento_id = str(registro["id"]).lower()
        email = _normalizar_email(registro.get("email"))
        atualizado = {**registro, "id": talento_id, "email": email}
        if email:
            por_email[email] = atualizado
        else:
            sem_email.append(atualizado)

    por_id: dict[str, dict[str, Any]] = {}
    for registro in list(por_email.values()) + sem_email:
        por_id[str(registro["id"]).lower()] = registro

    aliases: dict[str, str] = {}
    for registro in registros:
        original = str(registro["id"]).lower()
        email = _normalizar_email(registro.get("email"))
        if email and email in por_email:
            aliases[original] = str(por_email[email]["id"]).lower()
        else:
            aliases[original] = original

    for email, registro in por_email.items():
        canonico = str(registro["id"]).lower()
        aliases[canonico] = canonico
        aliases[str(uuid5(NAMESPACE_DNS, email)).lower()] = canonico

    return list(por_id.values()), aliases


def _deduplicar_registros_avaliacoes(
    registros: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    por_chave: dict[tuple[str, int], dict[str, Any]] = {}
    for registro in registros:
        chave = (str(registro["talento_id"]).lower(), int(registro["semana_numero"]))
        por_chave[chave] = registro
    return list(por_chave.values())


def _resolver_ids_talentos_existentes(
    turma_id: str,
    registros: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], dict[str, str]]:
    """Alinha IDs da planilha com talentos já persistidos pelo mesmo e-mail."""
    emails = [
        email
        for email in (_normalizar_email(registro.get("email")) for registro in registros)
        if email
    ]
    existentes = _buscar_ids_por_emails(turma_id, emails)

    alinhados: list[dict[str, Any]] = []
    for registro in registros:
        atualizado = dict(registro)
        email = _normalizar_email(registro.get("email"))
        if email:
            atualizado["email"] = email
            if email in existentes:
                atualizado["id"] = existentes[email]
        alinhados.append(atualizado)

    return _deduplicar_registros_talentos(alinhados)


def _sincronizar_talento_id_avaliacoes(
    registros_avaliacoes: list[dict[str, Any]],
    mapa_ids: dict[str, str],
) -> list[dict[str, Any]]:
    sincronizados: list[dict[str, Any]] = []
    for registro in registros_avaliacoes:
        atualizado = dict(registro)
        email = _normalizar_email(atualizado.pop("_email_ref", None))
        if email:
            email_id = str(uuid5(NAMESPACE_DNS, email)).lower()
            if email_id in mapa_ids:
                atualizado["talento_id"] = mapa_ids[email_id]
        else:
            talento_id = str(atualizado["talento_id"]).lower()
            if talento_id in mapa_ids:
                atualizado["talento_id"] = mapa_ids[talento_id]
        sincronizados.append(atualizado)
    return sincronizados


def _validar_registros_sem_duplicatas(
    registros_talentos: list[dict[str, Any]],
    registros_avaliacoes: list[dict[str, Any]],
) -> None:
    """Garante que não restaram chaves duplicadas antes do upsert."""
    ids_vistos: set[str] = set()
    emails_vistos: dict[str, str] = {}

    for registro in registros_talentos:
        talento_id = str(registro["id"]).lower()
        if talento_id in ids_vistos:
            raise TalentosStoreError(
                "Planilha contém IDs duplicados para o mesmo talento após normalização."
            )
        ids_vistos.add(talento_id)

        email = _normalizar_email(registro.get("email"))
        if not email:
            continue
        if email in emails_vistos and emails_vistos[email] != talento_id:
            raise TalentosStoreError(
                "Planilha contém o mesmo e-mail associado a talentos diferentes "
                f"({emails_vistos[email]} e {talento_id}). "
                "Corrija as linhas duplicadas e tente novamente."
            )
        emails_vistos[email] = talento_id

    avaliacoes_vistas: set[tuple[str, int]] = set()
    for registro in registros_avaliacoes:
        chave = (str(registro["talento_id"]).lower(), int(registro["semana_numero"]))
        if chave in avaliacoes_vistas:
            raise TalentosStoreError(
                "Planilha contém avaliações duplicadas para o mesmo talento e semana. "
                "Remova as linhas repetidas e tente novamente."
            )
        avaliacoes_vistas.add(chave)


def _upsert_lote(
    tabela: str,
    registros: list[dict[str, Any]],
    on_conflict: str,
    operacao: str,
    tamanho: int = 80,
) -> None:
    if not registros:
        return
    client = get_supabase()
    for inicio in range(0, len(registros), tamanho):
        lote = registros[inicio : inicio + tamanho]
        _executar(
            operacao,
            lambda lote=lote: client.table(tabela)
            .upsert(lote, on_conflict=on_conflict)
            .execute(),
        )


def _resolver_talento_id_item(item: dict[str, Any]) -> str:
    email = _normalizar_email(item.get("email"))
    if email:
        return str(uuid5(NAMESPACE_DNS, email))
    return _validar_uuid(str(item["talento_id"]), "talento_id")


def salvar_talentos(
    talentos: list[dict[str, Any]],
    turma_id: str | None = None,
    semana_numero: int | None = None,
) -> None:
    """Persiste talentos e, quando disponível, avaliações semanais completas."""
    if not talentos:
        return

    turma_resolvida = _obter_turma_id(turma_id)

    registros_talentos: list[dict[str, Any]] = []
    registros_avaliacoes: list[dict[str, Any]] = []

    for item in talentos:
        talento_id = _resolver_talento_id_item(item)
        hard_skills = item.get("hard_skills") or {}
        soft_skills = item.get("soft_skills") or {}

        registros_talentos.append(
            {
                "id": talento_id,
                "turma_id": turma_resolvida,
                "email": _normalizar_email(item.get("email")),
                "nome": item.get("nome"),
                "hard_skills": hard_skills,
                "soft_skills": soft_skills,
            }
        )

        semana = item.get("semana_numero", semana_numero)
        if semana is None:
            continue

        registro_avaliacao: dict[str, Any] = {
            "turma_id": turma_resolvida,
            "talento_id": talento_id,
            "semana_numero": int(semana),
            "_email_ref": _normalizar_email(item.get("email")),
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

        registros_avaliacoes.append(registro_avaliacao)

    registros_talentos, mapa_ids = _resolver_ids_talentos_existentes(
        turma_resolvida,
        registros_talentos,
    )
    registros_avaliacoes = _sincronizar_talento_id_avaliacoes(
        registros_avaliacoes,
        mapa_ids,
    )
    registros_avaliacoes = _deduplicar_registros_avaliacoes(registros_avaliacoes)

    _validar_registros_sem_duplicatas(registros_talentos, registros_avaliacoes)

    talento_ids = [str(registro["id"]) for registro in registros_talentos]

    validar_talentos_pertencem_turma(talento_ids, turma_resolvida)

    logger.info(
        "salvar_talentos: upsert em lote de %s talentos e %s avaliações",
        len(registros_talentos),
        len(registros_avaliacoes),
    )

    _upsert_lote("talentos", registros_talentos, "id", "salvar talentos")
    _upsert_lote(
        "avaliacoes_semanais",
        registros_avaliacoes,
        "talento_id,semana_numero",
        "salvar avaliações semanais",
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
