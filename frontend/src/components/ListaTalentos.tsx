"use client";

import { useEffect, useMemo, useState } from "react";

import Card from "./Card";
import LinksTalento from "./LinksTalento";
import ModalDetalheTalento from "./ModalDetalheTalento";
import type { PerfilTalentoData } from "./PerfilTalento";

interface ListaTalentosProps {
  perfis: PerfilTalentoData[];
  itensPorPagina?: number;
}

function formatarNota(valor: number): string {
  return valor.toFixed(2);
}

function iniciais(perfil: PerfilTalentoData): string {
  const base = (perfil.nome || perfil.email || "T").trim();
  const partes = base.split(/\s+/).filter(Boolean);
  if (partes.length >= 2) {
    return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
  }
  return base.slice(0, 2).toUpperCase();
}

function mediaSegura(
  valor: number | undefined,
  skills: Record<string, number>,
): number {
  if (typeof valor === "number" && !Number.isNaN(valor)) {
    return valor;
  }
  const notas = Object.values(skills);
  if (notas.length === 0) {
    return 0;
  }
  return notas.reduce((acc, nota) => acc + nota, 0) / notas.length;
}

function enriquecerPerfil(perfil: PerfilTalentoData): PerfilTalentoData & {
  media_tecnica: number;
  media_socioemocional: number;
  fit_vaga: number;
} {
  const mediaTecnica = mediaSegura(perfil.media_tecnica, perfil.hard_skills);
  const mediaSocio = mediaSegura(
    perfil.media_socioemocional,
    perfil.soft_skills,
  );
  const fit =
    typeof perfil.fit_vaga === "number" && !Number.isNaN(perfil.fit_vaga)
      ? perfil.fit_vaga
      : (mediaTecnica + mediaSocio) / 2;

  return {
    ...perfil,
    media_tecnica: mediaTecnica,
    media_socioemocional: mediaSocio,
    fit_vaga: fit,
  };
}

export function ListaTalentos({
  perfis,
  itensPorPagina = 12,
}: ListaTalentosProps) {
  const [pagina, setPagina] = useState(1);
  const [selecionado, setSelecionado] = useState<
    | (PerfilTalentoData & {
        media_tecnica: number;
        media_socioemocional: number;
        fit_vaga: number;
      })
    | null
  >(null);

  const perfisNormalizados = useMemo(
    () => perfis.map(enriquecerPerfil),
    [perfis],
  );

  useEffect(() => {
    setPagina(1);
    setSelecionado(null);
  }, [perfis]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(perfisNormalizados.length / itensPorPagina),
  );
  const paginaAtual = Math.min(pagina, totalPaginas);

  const paginaItens = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    return perfisNormalizados.slice(inicio, inicio + itensPorPagina);
  }, [perfisNormalizados, paginaAtual, itensPorPagina]);

  if (perfisNormalizados.length === 0) {
    return (
      <Card className="w-full">
        <p className="text-sm text-zinc-400">
          Nenhum talento processado nesta planilha.
        </p>
      </Card>
    );
  }

  return (
    <>
      <Card accent className="w-full">
        <header className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-primary">
              Talentos processados
            </h3>
            <p className="mt-1 text-sm text-zinc-400">
              {perfisNormalizados.length} registro(s) · clique em um card para
              ver detalhes
            </p>
          </div>
          <p className="text-xs text-zinc-500">
            Página {paginaAtual} de {totalPaginas}
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {paginaItens.map((perfil) => {
            const nome = perfil.nome || "Sem nome";
            const cardKey = `${perfil.talento_id}-${perfil.semana_numero}-${perfil.email ?? ""}`;
            return (
              <article
                key={cardKey}
                className="relative rounded-xl border border-card-elevated bg-surface-muted p-4 transition-colors hover:border-primary/50 hover:bg-surface"
              >
                <button
                  type="button"
                  onClick={() => setSelecionado(perfil)}
                  className="absolute inset-0 z-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  aria-label={`Ver detalhes de ${nome}`}
                />
                <div className="pointer-events-none relative z-10 flex items-start gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary"
                    aria-hidden="true"
                  >
                    {iniciais(perfil)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white">{nome}</p>
                    <p className="truncate text-xs text-zinc-400">
                      {perfil.email || "E-mail não informado"}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Semana {perfil.semana_numero}
                    </p>
                  </div>
                </div>

                <div className="relative z-10 mt-2">
                  <LinksTalento
                    linkLinkedin={perfil.link_linkedin}
                    linkProjeto={perfil.link_projeto}
                    tamanho="sm"
                  />
                </div>

                <dl className="pointer-events-none relative z-10 mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-card px-2 py-2">
                    <dt className="text-[10px] uppercase tracking-wide text-zinc-500">
                      Técnica
                    </dt>
                    <dd className="mt-1 text-sm font-bold text-white">
                      {formatarNota(perfil.media_tecnica)}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-card px-2 py-2">
                    <dt className="text-[10px] uppercase tracking-wide text-zinc-500">
                      Soft
                    </dt>
                    <dd className="mt-1 text-sm font-bold text-white">
                      {formatarNota(perfil.media_socioemocional)}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-primary/10 px-2 py-2">
                    <dt className="text-[10px] uppercase tracking-wide text-primary/80">
                      Fit
                    </dt>
                    <dd className="mt-1 text-sm font-bold text-primary">
                      {formatarNota(perfil.fit_vaga)}
                    </dd>
                  </div>
                </dl>

                <span className="pointer-events-none relative z-10 mt-3 inline-flex text-xs font-medium text-primary">
                  Ver detalhes →
                </span>
              </article>
            );
          })}
        </div>

        {totalPaginas > 1 && (
          <nav
            aria-label="Paginação de talentos"
            className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-card-elevated pt-4"
          >
            <button
              type="button"
              onClick={() => setPagina((atual) => Math.max(1, atual - 1))}
              disabled={paginaAtual <= 1}
              className="rounded-lg border border-card-elevated px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>

            <div className="flex flex-wrap items-center gap-1">
              {Array.from({ length: totalPaginas }, (_, index) => index + 1)
                .filter((numero) => {
                  if (totalPaginas <= 7) {
                    return true;
                  }
                  return (
                    numero === 1 ||
                    numero === totalPaginas ||
                    Math.abs(numero - paginaAtual) <= 1
                  );
                })
                .map((numero, index, lista) => {
                  const anterior = lista[index - 1];
                  const mostrarEllipsis =
                    anterior !== undefined && numero - anterior > 1;

                  return (
                    <span key={numero} className="flex items-center gap-1">
                      {mostrarEllipsis && (
                        <span className="px-1 text-zinc-500">…</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setPagina(numero)}
                        className={[
                          "min-w-8 rounded-lg px-2 py-1 text-sm font-medium transition-colors",
                          numero === paginaAtual
                            ? "bg-primary text-white"
                            : "text-zinc-400 hover:bg-surface-muted hover:text-white",
                        ].join(" ")}
                        aria-current={
                          numero === paginaAtual ? "page" : undefined
                        }
                      >
                        {numero}
                      </button>
                    </span>
                  );
                })}
            </div>

            <button
              type="button"
              onClick={() =>
                setPagina((atual) => Math.min(totalPaginas, atual + 1))
              }
              disabled={paginaAtual >= totalPaginas}
              className="rounded-lg border border-card-elevated px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Próxima
            </button>
          </nav>
        )}
      </Card>

      {selecionado && (
        <ModalDetalheTalento
          perfil={selecionado}
          aberto={Boolean(selecionado)}
          onClose={() => setSelecionado(null)}
        />
      )}
    </>
  );
}

export default ListaTalentos;
