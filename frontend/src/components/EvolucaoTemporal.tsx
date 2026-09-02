"use client";

import { useEffect, useMemo, useState } from "react";

import Card from "./Card";
import LinksTalento from "./LinksTalento";
import type { HistoricoTalento, SemanaHistorico, VariacaoCompetencia } from "./historicoTypes";
import SoftSkillsRadar from "./SoftSkillsRadar";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const PRIMARY = "#e11d48";
const ACCENT = "#38bdf8";
const SUCCESS = "#22c55e";
const WARNING = "#f59e0b";

interface LineSeries {
  label: string;
  color: string;
  values: (number | null)[];
}

interface EvolucaoTemporalProps {
  talentoId: string;
}

function calcularVariacoes(series: SemanaHistorico[]): VariacaoCompetencia[] {
  if (series.length < 2) {
    return [];
  }

  const primeira = series[0];
  const ultima = series[series.length - 1];
  const variacoes: VariacaoCompetencia[] = [];

  for (const [nome, notaInicial] of Object.entries(primeira.hard_skills)) {
    const notaFinal = ultima.hard_skills[nome] ?? notaInicial;
    variacoes.push({
      nome,
      tipo: "hard",
      nota_inicial: notaInicial,
      nota_final: notaFinal,
      delta: notaFinal - notaInicial,
    });
  }

  for (const [nome, notaInicial] of Object.entries(primeira.soft_skills)) {
    const notaFinal = ultima.soft_skills[nome] ?? notaInicial;
    variacoes.push({
      nome,
      tipo: "soft",
      nota_inicial: notaInicial,
      nota_final: notaFinal,
      delta: notaFinal - notaInicial,
    });
  }

  return variacoes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

function GraficoLinhas({
  titulo,
  descricao,
  labels,
  series,
  yMax = 5,
  yMin = 0,
}: {
  titulo: string;
  descricao?: string;
  labels: string[];
  series: LineSeries[];
  yMax?: number;
  yMin?: number;
}) {
  const width = 640;
  const height = 220;
  const padding = { top: 16, right: 16, bottom: 32, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const count = labels.length;

  if (count === 0 || series.every((s) => s.values.every((v) => v === null))) {
    return (
      <Card className="bg-surface">
        <h4 className="text-sm font-semibold text-primary">{titulo}</h4>
        <p className="mt-2 text-sm text-zinc-400">Sem dados para exibir.</p>
      </Card>
    );
  }

  function xPos(index: number): number {
    if (count <= 1) {
      return padding.left + chartW / 2;
    }
    return padding.left + (index / (count - 1)) * chartW;
  }

  function yPos(value: number): number {
    const ratio = (value - yMin) / (yMax - yMin);
    return padding.top + chartH - ratio * chartH;
  }

  return (
    <Card className="bg-surface">
      <header className="mb-3">
        <h4 className="text-sm font-semibold text-primary">{titulo}</h4>
        {descricao && <p className="mt-1 text-xs text-zinc-400">{descricao}</p>}
      </header>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={titulo}
      >
        {[0, 1, 2, 3, 4, 5].filter((n) => n >= yMin && n <= yMax).map((tick) => (
          <g key={tick}>
            <line
              x1={padding.left}
              y1={yPos(tick)}
              x2={width - padding.right}
              y2={yPos(tick)}
              stroke="#3f3f46"
              strokeDasharray="4 4"
            />
            <text
              x={padding.left - 8}
              y={yPos(tick) + 4}
              textAnchor="end"
              fill="#a1a1aa"
              fontSize="10"
            >
              {tick}
            </text>
          </g>
        ))}

        {labels.map((label, index) => (
          <text
            key={label}
            x={xPos(index)}
            y={height - 8}
            textAnchor="middle"
            fill="#a1a1aa"
            fontSize="10"
          >
            {label}
          </text>
        ))}

        {series.map((item) => {
          const pontos = item.values
            .map((valor, index) =>
              valor === null ? null : { x: xPos(index), y: yPos(valor) },
            )
            .filter((p): p is { x: number; y: number } => p !== null);

          if (pontos.length === 0) {
            return null;
          }

          const path = pontos
            .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
            .join(" ");

          return (
            <g key={item.label}>
              <path
                d={path}
                fill="none"
                stroke={item.color}
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {pontos.map((p, i) => (
                <circle
                  key={`${item.label}-${i}`}
                  cx={p.x}
                  cy={p.y}
                  r="4"
                  fill={item.color}
                />
              ))}
            </g>
          );
        })}
      </svg>

      <ul className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-300">
        {series.map((item) => (
          <li key={item.label} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function VariacaoBadge({ delta }: { delta: number }) {
  if (delta > 0) {
    return (
      <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-400">
        +{delta.toFixed(1)}
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400">
        {delta.toFixed(1)}
      </span>
    );
  }
  return (
    <span className="rounded-full bg-zinc-500/15 px-2 py-0.5 text-xs font-medium text-zinc-400">
      0
    </span>
  );
}

export function EvolucaoTemporal({ talentoId }: EvolucaoTemporalProps) {
  const [historico, setHistorico] = useState<HistoricoTalento | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [competenciaSelecionada, setCompetenciaSelecionada] = useState<string>("");

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      setCarregando(true);
      setErro(null);

      try {
        const response = await fetch(
          `${API_BASE_URL}/talentos/${encodeURIComponent(talentoId)}/historico`,
        );
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            detail?: string;
          } | null;
          throw new Error(body?.detail ?? "Falha ao carregar histórico.");
        }
        const data = (await response.json()) as HistoricoTalento;
        if (!cancelado) {
          setHistorico(data);
        }
      } catch (error) {
        if (!cancelado) {
          setErro(
            error instanceof Error ? error.message : "Erro ao carregar histórico.",
          );
        }
      } finally {
        if (!cancelado) {
          setCarregando(false);
        }
      }
    }

    void carregar();
    return () => {
      cancelado = true;
    };
  }, [talentoId]);

  const variacoes = useMemo(
    () => (historico ? calcularVariacoes(historico.series) : []),
    [historico],
  );

  const labelsSemana = useMemo(
    () => historico?.series.map((s) => `S${s.semana_numero}`) ?? [],
    [historico],
  );

  const todasCompetencias = useMemo(() => {
    if (!historico || historico.series.length === 0) {
      return [];
    }
    const nomes = new Set<string>();
    for (const semana of historico.series) {
      Object.keys(semana.hard_skills).forEach((n) => nomes.add(n));
      Object.keys(semana.soft_skills).forEach((n) => nomes.add(n));
    }
    return Array.from(nomes).sort();
  }, [historico]);

  useEffect(() => {
    if (todasCompetencias.length > 0 && !competenciaSelecionada) {
      setCompetenciaSelecionada(
        variacoes[0]?.nome ?? todasCompetencias[0] ?? "",
      );
    }
  }, [todasCompetencias, variacoes, competenciaSelecionada]);

  if (carregando) {
    return (
      <p className="rounded-lg border border-card-elevated bg-surface-muted p-6 text-center text-sm text-zinc-400">
        Carregando evolução temporal…
      </p>
    );
  }

  if (erro) {
    return (
      <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
        {erro}
      </p>
    );
  }

  if (!historico || historico.series.length === 0) {
    return (
      <p className="rounded-lg border border-card-elevated bg-surface-muted p-6 text-center text-sm text-zinc-400">
        Nenhuma avaliação semanal registrada para este talento. O histórico será
        preenchido conforme novos uploads forem processados.
      </p>
    );
  }

  const series = historico.series;
  const primeira = series[0];
  const ultima = series[series.length - 1];

  const valoresCompetencia = series.map((semana) => {
    const valor =
      semana.hard_skills[competenciaSelecionada] ??
      semana.soft_skills[competenciaSelecionada];
    return valor ?? null;
  });

  const maxHoras = Math.max(...series.map((s) => s.horas_dedicadas), 1);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-card-elevated bg-surface-muted px-4 py-3 text-sm text-zinc-300">
        <span className="font-medium text-white">{historico.total_semanas}</span>{" "}
        {historico.total_semanas === 1 ? "semana registrada" : "semanas registradas"}
        {series.length >= 2 && variacoes[0] && (
          <span className="text-zinc-400">
            {" "}
            · maior variação:{" "}
            <span className="text-primary">{variacoes[0].nome}</span> (
            {variacoes[0].delta > 0 ? "+" : ""}
            {variacoes[0].delta.toFixed(1)})
          </span>
        )}
      </div>

      <GraficoLinhas
        titulo="Evolução das médias"
        descricao="Acompanhamento semanal das médias técnicas, socioemocionais e fit geral."
        labels={labelsSemana}
        series={[
          {
            label: "Média técnica",
            color: PRIMARY,
            values: series.map((s) => s.media_tecnica),
          },
          {
            label: "Média socioemocional",
            color: ACCENT,
            values: series.map((s) => s.media_socioemocional),
          },
          {
            label: "Fit geral",
            color: SUCCESS,
            values: series.map((s) => s.fit_vaga),
          },
        ]}
      />

      <GraficoLinhas
        titulo="Horas dedicadas por semana"
        labels={labelsSemana}
        series={[
          {
            label: "Horas",
            color: WARNING,
            values: series.map((s) => s.horas_dedicadas),
          },
        ]}
        yMax={Math.ceil(maxHoras * 1.2)}
        yMin={0}
      />

      {todasCompetencias.length > 0 && (
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-zinc-300">
            Evolução por competência
            <select
              value={competenciaSelecionada}
              onChange={(event) => setCompetenciaSelecionada(event.target.value)}
              className="mt-2 w-full rounded-lg border border-card-elevated bg-surface-muted px-3 py-2 text-sm text-zinc-100 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {todasCompetencias.map((nome) => (
                <option key={nome} value={nome}>
                  {nome}
                </option>
              ))}
            </select>
          </label>

          <GraficoLinhas
            titulo={competenciaSelecionada}
            descricao="Progressão da nota (1–5) ao longo das semanas."
            labels={labelsSemana}
            series={[
              {
                label: competenciaSelecionada,
                color: PRIMARY,
                values: valoresCompetencia,
              },
            ]}
          />
        </div>
      )}

      {variacoes.length > 0 && (
        <Card className="bg-surface">
          <h4 className="text-sm font-semibold text-primary">
            Maiores saltos e quedas
          </h4>
          <p className="mt-1 text-xs text-zinc-400">
            Comparação entre semana {primeira.semana_numero} e semana{" "}
            {ultima.semana_numero}.
          </p>
          <ul className="mt-4 space-y-2">
            {variacoes.slice(0, 8).map((item) => (
              <li
                key={item.nome}
                className="flex items-center justify-between gap-3 rounded-lg border border-card-elevated bg-surface-muted px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate text-zinc-200">{item.nome}</p>
                  <p className="text-xs text-zinc-500">
                    {item.tipo === "hard" ? "Técnica" : "Socioemocional"} ·{" "}
                    {item.nota_inicial.toFixed(1)} → {item.nota_final.toFixed(1)}
                  </p>
                </div>
                <VariacaoBadge delta={item.delta} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {series.length >= 2 && (
        <div className="grid gap-6 xl:grid-cols-2">
          <SoftSkillsRadar
            skills={Object.entries(primeira.hard_skills).map(([nome, valor]) => ({
              nome,
              valor,
            }))}
            titulo={`Hard skills · Semana ${primeira.semana_numero}`}
            descricao="Perfil técnico no início do acompanhamento."
            className="bg-surface"
          />
          <SoftSkillsRadar
            skills={Object.entries(ultima.hard_skills).map(([nome, valor]) => ({
              nome,
              valor,
            }))}
            titulo={`Hard skills · Semana ${ultima.semana_numero}`}
            descricao="Perfil técnico mais recente."
            className="bg-surface"
          />
          <SoftSkillsRadar
            skills={Object.entries(primeira.soft_skills).map(([nome, valor]) => ({
              nome,
              valor,
            }))}
            titulo={`Soft skills · Semana ${primeira.semana_numero}`}
            descricao="Perfil socioemocional no início do acompanhamento."
            className="bg-surface"
          />
          <SoftSkillsRadar
            skills={Object.entries(ultima.soft_skills).map(([nome, valor]) => ({
              nome,
              valor,
            }))}
            titulo={`Soft skills · Semana ${ultima.semana_numero}`}
            descricao="Perfil socioemocional mais recente."
            className="bg-surface"
          />
        </div>
      )}

      <section>
        <h4 className="mb-3 text-sm font-semibold text-primary">
          Linha do tempo qualitativa
        </h4>
        <div className="space-y-3">
          {series.map((semana) => {
            const temTexto =
              semana.feedback_case?.trim() ||
              semana.interdependencias?.trim() ||
              semana.ajustes_rota?.trim() ||
              semana.rituais_mentoria?.trim();
            const temLinks =
              semana.link_projeto?.trim() || semana.link_linkedin?.trim();

            return (
              <div
                key={semana.semana_numero}
                className="rounded-lg border border-card-elevated bg-surface-muted p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Semana {semana.semana_numero}
                </p>
                {temLinks && (
                  <div className="mt-2">
                    <LinksTalento
                      linkLinkedin={semana.link_linkedin}
                      linkProjeto={semana.link_projeto}
                      tamanho="sm"
                    />
                  </div>
                )}
                {temTexto ? (
                  <div className="mt-2 space-y-2 text-sm text-zinc-300">
                    {semana.feedback_case?.trim() && (
                      <p>
                        <span className="font-medium text-zinc-400">Case: </span>
                        {semana.feedback_case}
                      </p>
                    )}
                    {semana.interdependencias?.trim() && (
                      <p>
                        <span className="font-medium text-zinc-400">
                          Interdependências:{" "}
                        </span>
                        {semana.interdependencias}
                      </p>
                    )}
                    {semana.ajustes_rota?.trim() && (
                      <p>
                        <span className="font-medium text-zinc-400">
                          Ajustes de rota:{" "}
                        </span>
                        {semana.ajustes_rota}
                      </p>
                    )}
                    {semana.rituais_mentoria?.trim() && (
                      <p>
                        <span className="font-medium text-zinc-400">
                          Mentoria:{" "}
                        </span>
                        {semana.rituais_mentoria}
                      </p>
                    )}
                  </div>
                ) : !temLinks ? (
                  <p className="mt-2 text-sm text-zinc-500">
                    Sem registros qualitativos nesta semana.
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default EvolucaoTemporal;
