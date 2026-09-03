"use client";

import { useEffect, useMemo, useState } from "react";

import AbaAreas from "./AbaAreas";
import AbaCargos from "./AbaCargos";
import Card from "./Card";
import ListaTalentos from "./ListaTalentos";
import type { PerfilTalentoData } from "./PerfilTalento";
import {
  LIMIAR_ADERENCIA,
  calcularFitPercentual,
  type CargoRankingResumo,
  type CargoReferencia,
  type RankingCandidato,
} from "./matchmakingUtils";
import { apiFetch } from "../lib/api";

type AbaAtiva = "cargos" | "areas" | "talentos";

interface MetricasConsolidadas {
  media_tecnica: number;
  media_socioemocional: number;
  media_competencias: number;
  total_horas_dedicadas: number;
  quantidade_avaliacoes: number;
}

interface ResultadosPlanilhaProps {
  arquivo: string;
  linhas_processadas: number;
  linhas_com_erro: number;
  erros: string[];
  metricas: MetricasConsolidadas;
  perfis: PerfilTalentoData[];
}

function formatarNota(valor: number): string {
  return valor.toFixed(2);
}

function montarRankings(
  cargos: CargoReferencia[],
  perfis: PerfilTalentoData[],
): CargoRankingResumo[] {
  return cargos.map((cargo) => {
    const porTalento = new Map<string, RankingCandidato>();

    for (const perfil of perfis) {
      const fit = calcularFitPercentual(
        perfil.hard_skills,
        perfil.soft_skills,
        cargo.pesos,
      );
      const atual = porTalento.get(perfil.talento_id);
      if (!atual || fit > atual.fit_percentual) {
        porTalento.set(perfil.talento_id, {
          talento_id: perfil.talento_id,
          nome: perfil.nome ?? null,
          email: perfil.email ?? null,
          semana_numero: perfil.semana_numero,
          fit_percentual: fit,
          hard_skills: perfil.hard_skills,
          soft_skills: perfil.soft_skills,
          media_tecnica: perfil.media_tecnica,
          media_socioemocional: perfil.media_socioemocional,
          feedback_case: perfil.feedback_case,
          interdependencias: perfil.interdependencias,
          ajustes_rota: perfil.ajustes_rota,
          rituais_mentoria: perfil.rituais_mentoria,
          link_projeto: perfil.link_projeto,
          link_linkedin: perfil.link_linkedin,
        });
      }
    }

    const ranking = [...porTalento.values()].sort(
      (a, b) => b.fit_percentual - a.fit_percentual,
    );

    const aderentes = ranking.filter(
      (item) => item.fit_percentual >= LIMIAR_ADERENCIA,
    );
    const fitMedio =
      ranking.length === 0
        ? 0
        : ranking.reduce((acc, item) => acc + item.fit_percentual, 0) /
          ranking.length;

    return {
      cargo: cargo.cargo,
      area: cargo.area,
      talentos_aderentes: aderentes.length,
      fit_medio: Math.round(fitMedio * 100) / 100,
      fit_topo: ranking[0]?.fit_percentual ?? 0,
      ranking,
    };
  });
}

export function ResultadosPlanilha({
  arquivo,
  linhas_processadas,
  linhas_com_erro,
  erros,
  metricas,
  perfis,
}: ResultadosPlanilhaProps) {
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>("cargos");
  const [cargos, setCargos] = useState<CargoReferencia[]>([]);
  const [carregandoCargos, setCarregandoCargos] = useState(true);
  const [erroCargos, setErroCargos] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function carregarCargos() {
      setCarregandoCargos(true);
      setErroCargos(null);
      try {
        const data = await apiFetch<CargoReferencia[]>("/matchmaking/cargos");
        if (!cancelado) {
          setCargos(data);
        }
      } catch (error) {
        if (!cancelado) {
          setErroCargos(
            error instanceof Error
              ? error.message
              : "Erro ao carregar cargos de referência.",
          );
        }
      } finally {
        if (!cancelado) {
          setCarregandoCargos(false);
        }
      }
    }

    void carregarCargos();
    return () => {
      cancelado = true;
    };
  }, []);

  const rankings = useMemo(
    () => montarRankings(cargos, perfis),
    [cargos, perfis],
  );

  const abas: Array<{ id: AbaAtiva; label: string }> = [
    { id: "cargos", label: "Cargos" },
    { id: "areas", label: "Áreas" },
    { id: "talentos", label: "Talentos" },
  ];

  return (
    <div className="flex w-full flex-col gap-6">
      <Card accent className="mx-auto w-full max-w-2xl">
        <h3 className="text-lg font-semibold text-primary">
          Resultado consolidado
        </h3>
        <p className="mt-1 text-sm text-zinc-400">
          Arquivo processado: {arquivo}
        </p>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-card-elevated bg-surface-muted p-4">
            <dt className="text-xs uppercase tracking-wide text-zinc-500">
              Linhas processadas
            </dt>
            <dd className="mt-2 text-2xl font-bold text-white">
              {linhas_processadas}
            </dd>
          </div>
          <div className="rounded-lg border border-card-elevated bg-surface-muted p-4">
            <dt className="text-xs uppercase tracking-wide text-zinc-500">
              Linhas com erro
            </dt>
            <dd className="mt-2 text-2xl font-bold text-white">
              {linhas_com_erro}
            </dd>
          </div>
          <div className="rounded-lg border border-card-elevated bg-surface-muted p-4">
            <dt className="text-xs uppercase tracking-wide text-zinc-500">
              Média técnica
            </dt>
            <dd className="mt-2 text-2xl font-bold text-white">
              {formatarNota(metricas.media_tecnica)}
            </dd>
          </div>
          <div className="rounded-lg border border-card-elevated bg-surface-muted p-4">
            <dt className="text-xs uppercase tracking-wide text-zinc-500">
              Média socioemocional
            </dt>
            <dd className="mt-2 text-2xl font-bold text-white">
              {formatarNota(metricas.media_socioemocional)}
            </dd>
          </div>
          <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 sm:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-primary/80">
              Média de competências
            </dt>
            <dd className="mt-2 text-2xl font-bold text-primary">
              {formatarNota(metricas.media_competencias)}
            </dd>
          </div>
        </dl>

        {erros.length > 0 && (
          <details className="mt-4 rounded-lg border border-card-elevated bg-surface-muted p-4">
            <summary className="cursor-pointer text-xs uppercase tracking-wide text-zinc-500">
              Erros por linha ({erros.length})
            </summary>
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-sm text-zinc-300">
              {erros.map((mensagem) => (
                <li key={mensagem}>{mensagem}</li>
              ))}
            </ul>
          </details>
        )}
      </Card>

      <nav
        aria-label="Navegação de resultados"
        className="mx-auto flex w-full max-w-2xl rounded-xl border border-card-elevated bg-card p-1"
      >
        {abas.map((aba) => (
          <button
            key={aba.id}
            type="button"
            onClick={() => setAbaAtiva(aba.id)}
            className={[
              "flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
              abaAtiva === aba.id
                ? "bg-primary text-white shadow-sm shadow-primary/30"
                : "text-zinc-400 hover:bg-surface-muted hover:text-zinc-100",
            ].join(" ")}
            aria-pressed={abaAtiva === aba.id}
          >
            {aba.label}
          </button>
        ))}
      </nav>

      <section className="w-full">
        {abaAtiva === "cargos" && (
          <>
            {carregandoCargos && (
              <Card className="w-full">
                <p className="text-sm text-zinc-400">
                  Calculando ranking de fit por cargo…
                </p>
              </Card>
            )}
            {erroCargos && (
              <Card className="w-full border-primary/40">
                <p className="text-sm text-primary">{erroCargos}</p>
              </Card>
            )}
            {!carregandoCargos && !erroCargos && (
              <AbaCargos rankings={rankings} />
            )}
          </>
        )}

        {abaAtiva === "areas" && (
          <>
            {carregandoCargos && (
              <Card className="w-full">
                <p className="text-sm text-zinc-400">Carregando áreas…</p>
              </Card>
            )}
            {!carregandoCargos && !erroCargos && (
              <AbaAreas rankings={rankings} />
            )}
            {erroCargos && (
              <Card className="w-full border-primary/40">
                <p className="text-sm text-primary">{erroCargos}</p>
              </Card>
            )}
          </>
        )}

        {abaAtiva === "talentos" && (
          <ListaTalentos perfis={perfis} itensPorPagina={12} />
        )}
      </section>
    </div>
  );
}

export default ResultadosPlanilha;
