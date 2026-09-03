"use client";

import { useCallback, useEffect, useState } from "react";

import Card from "./Card";
import type { PdiTalento } from "./pdiTypes";
import { useCargos } from "../hooks/useCargos";
import { apiFetch } from "../lib/api";

interface PainelPDIProps {
  talentoId: string;
  semanaNumero?: number;
}

const PRIORIDADE_ESTILO: Record<string, string> = {
  alta: "bg-red-500/15 text-red-300 border-red-500/30",
  media: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  baixa: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
};

const ACAO_ICONE: Record<string, string> = {
  curso: "📚",
  projeto: "🛠️",
  mentoria: "🤝",
};

function labelMotivo(motivo: string): string {
  const mapa: Record<string, string> = {
    abaixo_limiar: "Abaixo do limiar",
    gap_cargo: "Gap para o cargo",
    desalinhamento_gestor: "Desalinhamento com gestor",
  };
  return mapa[motivo] ?? motivo;
}

export function PainelPDI({ talentoId, semanaNumero }: PainelPDIProps) {
  const {
    cargos,
    carregando: carregandoCargos,
    erro: erroCargos,
    cargoInicial,
  } = useCargos({ selecionarPrimeiro: true });
  const [cargoSelecionado, setCargoSelecionado] = useState("");
  const [pdi, setPdi] = useState<PdiTalento | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (cargoInicial) {
      setCargoSelecionado(cargoInicial);
    }
  }, [cargoInicial]);

  const carregarPdi = useCallback(async () => {
    if (!cargoSelecionado) {
      return;
    }

    setCarregando(true);
    setErro(null);

    const params = new URLSearchParams({ cargo_alvo: cargoSelecionado });
    if (semanaNumero) {
      params.set("semana_numero", String(semanaNumero));
    }

    try {
      const data = await apiFetch<PdiTalento>(
        `/talentos/${encodeURIComponent(talentoId)}/pdi?${params}`,
      );
      setPdi(data);
    } catch (error) {
      setPdi(null);
      setErro(error instanceof Error ? error.message : "Erro ao gerar PDI.");
    } finally {
      setCarregando(false);
    }
  }, [talentoId, cargoSelecionado, semanaNumero]);

  useEffect(() => {
    if (cargoSelecionado) {
      void carregarPdi();
    }
  }, [cargoSelecionado, carregarPdi]);

  if ((erroCargos || erro) && !pdi) {
    return (
      <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
        {erroCargos ?? erro}
      </p>
    );
  }

  if (carregandoCargos && !cargoSelecionado) {
    return (
      <p className="rounded-lg border border-card-elevated bg-surface-muted p-6 text-center text-sm text-zinc-400">
        Carregando cargos de referência…
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1">
          <label
            htmlFor="pdi-cargo-alvo"
            className="mb-1 block text-sm font-medium text-zinc-300"
          >
            Cargo alvo do PDI
          </label>
          <select
            id="pdi-cargo-alvo"
            value={cargoSelecionado}
            onChange={(event) => setCargoSelecionado(event.target.value)}
            className="w-full rounded-lg border border-card-elevated bg-surface-muted px-3 py-2 text-sm text-zinc-100 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {cargos.map((cargo) => (
              <option key={cargo.cargo} value={cargo.cargo}>
                {cargo.cargo} · {cargo.area}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => void carregarPdi()}
          disabled={carregando || !cargoSelecionado}
          className="rounded-lg border border-card-elevated px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
        >
          Atualizar PDI
        </button>
      </div>

      {carregando && (
        <p className="rounded-lg border border-card-elevated bg-surface-muted p-6 text-center text-sm text-zinc-400">
          Gerando plano de desenvolvimento…
        </p>
      )}

      {!carregando && pdi && (
        <>
          <div className="rounded-lg border border-card-elevated bg-surface-muted px-4 py-3 text-sm text-zinc-300">
            Semana de referência:{" "}
            <span className="font-medium text-white">{pdi.semana_referencia}</span>
            {" · "}
            Fit atual para <span className="text-primary">{pdi.cargo_alvo}</span>:{" "}
            <span className="font-semibold text-primary">
              {pdi.fit_percentual_atual.toFixed(1)}%
            </span>
            {pdi.tem_avaliacao_gestor && (
              <span className="text-zinc-400"> · com visão do gestor</span>
            )}
          </div>

          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-card-elevated bg-surface-muted p-3">
              <dt className="text-xs text-zinc-500">Metas geradas</dt>
              <dd className="mt-1 text-2xl font-bold text-white">{pdi.total_metas}</dd>
            </div>
            <div className="rounded-lg border border-card-elevated bg-surface-muted p-3">
              <dt className="text-xs text-zinc-500">Abaixo do limiar ({pdi.limiar_nota})</dt>
              <dd className="mt-1 text-2xl font-bold text-primary">
                {pdi.resumo.focos_abaixo_limiar}
              </dd>
            </div>
            <div className="rounded-lg border border-card-elevated bg-surface-muted p-3">
              <dt className="text-xs text-zinc-500">Gaps para o cargo</dt>
              <dd className="mt-1 text-2xl font-bold text-amber-400">
                {pdi.resumo.focos_gap_cargo}
              </dd>
            </div>
            <div className="rounded-lg border border-card-elevated bg-surface-muted p-3">
              <dt className="text-xs text-zinc-500">Prazo médio</dt>
              <dd className="mt-1 text-2xl font-bold text-sky-400">
                {pdi.resumo.prazo_medio_semanas.toFixed(0)} sem.
              </dd>
            </div>
          </dl>

          {pdi.metas.length === 0 ? (
            <Card className="bg-surface">
              <p className="text-sm text-zinc-400">
                Nenhuma meta de desenvolvimento identificada. O perfil está alinhado
                ao cargo e acima do limiar mínimo nas competências avaliadas.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {pdi.metas.map((meta) => (
                <Card key={meta.competencia} className="bg-surface">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs uppercase tracking-wide text-zinc-500">
                        {meta.tipo === "hard" ? "Técnica" : "Socioemocional"}
                      </p>
                      <h4 className="mt-1 text-base font-semibold text-white">
                        {meta.competencia}
                      </h4>
                      <p className="mt-1 text-sm text-zinc-400">
                        Nota atual {meta.nota_atual.toFixed(1)} → meta{" "}
                        {meta.nota_meta.toFixed(1)}
                        {meta.gap_cargo > 0 && (
                          <span> · gap cargo: {meta.gap_cargo}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={[
                          "rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
                          PRIORIDADE_ESTILO[meta.prioridade],
                        ].join(" ")}
                      >
                        {meta.prioridade}
                      </span>
                      <span className="rounded-full border border-card-elevated bg-surface-muted px-2 py-0.5 text-xs text-zinc-300">
                        {meta.prazo_descricao}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {meta.motivos.map((motivo) => (
                      <span
                        key={motivo}
                        className="rounded-md bg-card px-2 py-1 text-[11px] text-zinc-400"
                      >
                        {labelMotivo(motivo)}
                      </span>
                    ))}
                  </div>

                  <ul className="mt-4 space-y-2">
                    {meta.acoes.map((acao) => (
                      <li
                        key={`${meta.competencia}-${acao.tipo}`}
                        className="flex items-start gap-3 rounded-lg border border-card-elevated bg-surface-muted px-3 py-2"
                      >
                        <span className="text-lg" aria-hidden="true">
                          {ACAO_ICONE[acao.tipo] ?? "•"}
                        </span>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                            {acao.tipo}
                          </p>
                          <p className="text-sm text-zinc-300">{acao.descricao}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default PainelPDI;
