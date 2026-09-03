"use client";

import { useMemo, useState } from "react";

import Card from "./Card";
import LinksTalento from "./LinksTalento";
import ModalDetalheTalento from "./ModalDetalheTalento";
import type { PerfilTalentoData } from "./PerfilTalento";
import {
  type CargoRankingResumo,
  candidatoParaPerfil,
  nomeExibicao,
  type RankingCandidato,
} from "./matchmakingUtils";

interface AbaAreasProps {
  rankings: CargoRankingResumo[];
}

interface AreaResumo {
  area: string;
  cargos: string[];
  candidatos: RankingCandidato[];
}

export function AbaAreas({ rankings }: AbaAreasProps) {
  const [selecionado, setSelecionado] = useState<PerfilTalentoData | null>(null);

  const areas = useMemo(() => {
    const melhorPorTalento = new Map<string, RankingCandidato & { area: string }>();

    for (const ranking of rankings) {
      for (const candidato of ranking.ranking) {
        const atual = melhorPorTalento.get(candidato.talento_id);
        if (!atual || candidato.fit_percentual > atual.fit_percentual) {
          melhorPorTalento.set(candidato.talento_id, {
            ...candidato,
            area: ranking.area,
          });
        }
      }
    }

    const porArea = new Map<string, AreaResumo>();

    for (const ranking of rankings) {
      if (!porArea.has(ranking.area)) {
        porArea.set(ranking.area, {
          area: ranking.area,
          cargos: [],
          candidatos: [],
        });
      }
      const bucket = porArea.get(ranking.area)!;
      if (!bucket.cargos.includes(ranking.cargo)) {
        bucket.cargos.push(ranking.cargo);
      }
    }

    for (const info of melhorPorTalento.values()) {
      const bucket = porArea.get(info.area);
      if (!bucket) {
        continue;
      }
      bucket.candidatos.push(info);
    }

    for (const bucket of porArea.values()) {
      bucket.candidatos.sort((a, b) => b.fit_percentual - a.fit_percentual);
    }

    return [...porArea.values()].sort(
      (a, b) => b.candidatos.length - a.candidatos.length,
    );
  }, [rankings]);

  if (areas.length === 0) {
    return (
      <Card className="w-full">
        <p className="text-sm text-zinc-400">Nenhuma área disponível.</p>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        {areas.map((area) => (
          <Card key={area.area} className="bg-card">
            <header className="mb-4">
              <h3 className="text-lg font-semibold text-primary">{area.area}</h3>
              <p className="mt-1 text-sm text-zinc-400">
                {area.candidatos.length} talento(s) · {area.cargos.length}{" "}
                cargo(s)
              </p>
            </header>

            <p className="mb-3 text-xs uppercase tracking-wide text-zinc-500">
              Cargos da área
            </p>
            <div className="mb-4 flex flex-wrap gap-2">
              {area.cargos.map((cargo) => (
                <span
                  key={cargo}
                  className="rounded-md border border-card-elevated bg-surface-muted px-2 py-1 text-xs text-zinc-300"
                >
                  {cargo}
                </span>
              ))}
            </div>

            <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">
              Melhor encaixe por talento
            </p>
            <ul className="max-h-64 space-y-2 overflow-y-auto">
              {area.candidatos.length === 0 && (
                <li className="text-sm text-zinc-500">
                  Nenhum talento alocado nesta área.
                </li>
              )}
              {area.candidatos.map((candidato) => (
                <li
                  key={`${area.area}-${candidato.talento_id}-${candidato.semana_numero}`}
                  className="flex items-start justify-between gap-3 rounded-lg border border-card-elevated bg-surface-muted px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {nomeExibicao(candidato)}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      Semana {candidato.semana_numero}
                    </p>
                    <div className="mt-1">
                      <LinksTalento
                        linkLinkedin={candidato.link_linkedin}
                        linkProjeto={candidato.link_projeto}
                        tamanho="sm"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSelecionado(candidatoParaPerfil(candidato))
                      }
                      className="mt-2 text-xs font-medium text-primary transition-colors hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      Ver detalhes →
                    </button>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-primary">
                    {candidato.fit_percentual.toFixed(0)}%
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
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

export default AbaAreas;
