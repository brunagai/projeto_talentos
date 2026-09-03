"use client";

import { useMemo, useState } from "react";

import Card from "./Card";
import LinksTalento from "./LinksTalento";
import ModalDetalheTalento from "./ModalDetalheTalento";
import type { PerfilTalentoData } from "./PerfilTalento";
import {
  LIMIAR_ADERENCIA,
  type CargoRankingResumo,
  candidatoParaPerfil,
  nomeExibicao,
  type RankingCandidato,
} from "./matchmakingUtils";

interface AbaCargosProps {
  rankings: CargoRankingResumo[];
}

export function AbaCargos({ rankings }: AbaCargosProps) {
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});
  const [selecionado, setSelecionado] = useState<PerfilTalentoData | null>(null);

  const ordenados = useMemo(
    () =>
      [...rankings].sort((a, b) => {
        if (b.talentos_aderentes !== a.talentos_aderentes) {
          return b.talentos_aderentes - a.talentos_aderentes;
        }
        if (b.fit_medio !== a.fit_medio) {
          return b.fit_medio - a.fit_medio;
        }
        return b.fit_topo - a.fit_topo;
      }),
    [rankings],
  );

  function toggleExpandido(cargo: string) {
    setExpandidos((atual) => ({ ...atual, [cargo]: !atual[cargo] }));
  }

  function abrirDetalhe(candidato: RankingCandidato) {
    setSelecionado(candidatoParaPerfil(candidato));
  }

  if (ordenados.length === 0) {
    return (
      <Card className="w-full">
        <p className="text-sm text-zinc-400">
          Nenhum cargo disponível para ranking.
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ordenados.map((item) => {
          const preview = item.ranking.slice(0, 3);
          const expandido = Boolean(expandidos[item.cargo]);
          const listaCompleta = expandido ? item.ranking : preview;

          return (
            <Card key={item.cargo} className="flex flex-col bg-card">
              <header className="mb-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  {item.area}
                </p>
                <h3 className="mt-1 text-base font-semibold text-white">
                  {item.cargo}
                </h3>
              </header>

              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    Talentos aderentes
                  </p>
                  <p className="mt-1 text-2xl font-bold text-primary">
                    {item.talentos_aderentes}
                  </p>
                  <p className="text-xs text-zinc-500">
                    limiar ≥ {LIMIAR_ADERENCIA}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    Fit médio
                  </p>
                  <p className="mt-1 text-lg font-semibold text-zinc-100">
                    {item.fit_medio.toFixed(0)}%
                  </p>
                </div>
              </div>

              <ol className="space-y-2 border-t border-card-elevated pt-3">
                {listaCompleta.length === 0 && (
                  <li className="text-sm text-zinc-500">
                    Nenhum talento ranqueado.
                  </li>
                )}
                {listaCompleta.map((candidato, index) => (
                  <li
                    key={`${item.cargo}-${candidato.talento_id}-${candidato.semana_numero}`}
                    className="relative"
                  >
                    <button
                      type="button"
                      onClick={() => abrirDetalhe(candidato)}
                      className="absolute inset-0 z-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      aria-label={`Ver detalhes de ${nomeExibicao(candidato)}`}
                    />
                    <div className="pointer-events-none relative z-10 flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm">
                      <span className="min-w-0 truncate text-zinc-200">
                        <span className="font-medium text-primary">
                          {index + 1}.
                        </span>{" "}
                        {nomeExibicao(candidato)}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="pointer-events-auto">
                          <LinksTalento
                            linkLinkedin={candidato.link_linkedin}
                            linkProjeto={candidato.link_projeto}
                            tamanho="sm"
                          />
                        </span>
                        <span className="font-semibold tabular-nums text-primary">
                          {candidato.fit_percentual.toFixed(0)}%
                        </span>
                      </span>
                    </div>
                  </li>
                ))}
              </ol>

              {item.ranking.length > 3 && (
                <button
                  type="button"
                  onClick={() => toggleExpandido(item.cargo)}
                  aria-expanded={expandido}
                  className="mt-4 rounded-lg border border-card-elevated px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {expandido
                    ? "Recolher lista"
                    : `Ver lista completa (${item.ranking.length})`}
                </button>
              )}
            </Card>
          );
        })}
      </div>

      {selecionado && (
        <ModalDetalheTalento
          perfil={selecionado}
          aberto={Boolean(selecionado)}
          onClose={() => setSelecionado(null)}
          apenasDestaques
          notaMinima={4}
        />
      )}
    </>
  );
}

export default AbaCargos;
