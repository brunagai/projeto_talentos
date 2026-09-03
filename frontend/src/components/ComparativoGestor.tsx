"use client";

import { useCallback, useEffect, useState } from "react";

import Card from "./Card";
import FormularioGestor from "./FormularioGestor";
import RadarComparativo from "./RadarComparativo";
import type { ComparativoGestorData } from "./comparativoTypes";
import { HARD_SKILL_KEYS, SOFT_SKILL_KEYS } from "./competencias";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ComparativoGestorProps {
  talentoId: string;
  semanaNumero: number;
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) {
    return <span className="text-xs text-zinc-500">—</span>;
  }
  if (delta > 0) {
    return (
      <span className="text-xs font-medium text-sky-400">
        +{delta} (gestor &gt; auto)
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="text-xs font-medium text-amber-400">
        {delta} (auto &gt; gestor)
      </span>
    );
  }
  return <span className="text-xs font-medium text-green-400">Alinhado</span>;
}

export function ComparativoGestor({
  talentoId,
  semanaNumero,
}: ComparativoGestorProps) {
  const [dados, setDados] = useState<ComparativoGestorData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/talentos/${encodeURIComponent(talentoId)}/comparativo-gestor?semana_numero=${semanaNumero}`,
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          detail?: string;
        } | null;
        throw new Error(body?.detail ?? "Falha ao carregar comparativo.");
      }
      const json = (await response.json()) as ComparativoGestorData;
      setDados(json);
      setMostrarFormulario(!json.avaliacao_gestor);
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro ao carregar comparativo.",
      );
    } finally {
      setCarregando(false);
    }
  }, [talentoId, semanaNumero]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  if (carregando) {
    return (
      <p className="rounded-lg border border-card-elevated bg-surface-muted p-6 text-center text-sm text-zinc-400">
        Carregando cruzamento de perspectivas…
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

  if (!dados) {
    return null;
  }

  const temAutopercepcao =
    Object.keys(dados.autopercepcao.hard_skills).length > 0 ||
    Object.keys(dados.autopercepcao.soft_skills).length > 0;

  const maioresDesvios = [...dados.competencias]
    .filter((item) => item.delta !== null)
    .sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0))
    .slice(0, 8);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-300">
          Semana <span className="font-medium text-white">{semanaNumero}</span>
          {dados.resumo.taxa_convergencia_percentual !== null && (
            <span className="text-zinc-400">
              {" "}
              · Convergência:{" "}
              <span className="text-primary">
                {dados.resumo.taxa_convergencia_percentual}%
              </span>{" "}
              (notas dentro de ±1 ponto)
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={() => setMostrarFormulario((atual) => !atual)}
          className="rounded-lg border border-card-elevated px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:border-primary/40 hover:text-primary"
        >
          {mostrarFormulario ? "Ocultar formulário" : "Avaliar como gestor"}
        </button>
      </div>

      {mostrarFormulario && (
        <FormularioGestor
          talentoId={talentoId}
          semanaNumero={semanaNumero}
          valoresIniciais={dados.avaliacao_gestor ?? undefined}
          onSalvo={() => void carregar()}
        />
      )}

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-card-elevated bg-surface-muted p-3">
          <dt className="text-xs text-zinc-500">Média técnica (auto)</dt>
          <dd className="mt-1 text-lg font-bold text-primary">
            {dados.resumo.media_tecnica_autopercepcao.toFixed(2)}
          </dd>
        </div>
        <div className="rounded-lg border border-card-elevated bg-surface-muted p-3">
          <dt className="text-xs text-zinc-500">Média técnica (gestor)</dt>
          <dd className="mt-1 text-lg font-bold text-sky-400">
            {dados.resumo.media_tecnica_gestor?.toFixed(2) ?? "—"}
          </dd>
        </div>
        <div className="rounded-lg border border-card-elevated bg-surface-muted p-3">
          <dt className="text-xs text-zinc-500">Média soft (auto)</dt>
          <dd className="mt-1 text-lg font-bold text-primary">
            {dados.resumo.media_socioemocional_autopercepcao.toFixed(2)}
          </dd>
        </div>
        <div className="rounded-lg border border-card-elevated bg-surface-muted p-3">
          <dt className="text-xs text-zinc-500">Média soft (gestor)</dt>
          <dd className="mt-1 text-lg font-bold text-sky-400">
            {dados.resumo.media_socioemocional_gestor?.toFixed(2) ?? "—"}
          </dd>
        </div>
      </dl>

      {!dados.avaliacao_gestor ? (
        <p className="rounded-lg border border-card-elevated bg-surface-muted p-4 text-sm text-zinc-400">
          Nenhuma avaliação do gestor registrada para esta semana. Use o
          formulário acima para registrar a visão da liderança e habilitar o
          comparativo.
        </p>
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-2">
            <RadarComparativo
              competencias={[...HARD_SKILL_KEYS]}
              auto={dados.autopercepcao.hard_skills}
              gestor={dados.avaliacao_gestor.hard_skills}
              titulo="Hard skills · Autopercepção vs. Gestor"
              descricao="Sobreposição dos radares: vermelho (estagiário) e azul (gestor)."
            />
            <RadarComparativo
              competencias={[...SOFT_SKILL_KEYS]}
              auto={dados.autopercepcao.soft_skills}
              gestor={dados.avaliacao_gestor.soft_skills}
              titulo="Soft skills · Autopercepção vs. Gestor"
              descricao="Áreas de convergência e desalinhamento comportamental."
            />
          </div>

          <Card className="bg-surface">
            <h4 className="text-sm font-semibold text-primary">
              Barras comparativas por competência
            </h4>
            <p className="mt-1 text-xs text-zinc-400">
              Comparação lado a lado das notas atribuídas.
            </p>
            <ul className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
              {dados.competencias.map((item) => (
                <li key={item.competencia} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-zinc-300">{item.competencia}</span>
                    <DeltaBadge delta={item.delta} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="mb-0.5 text-[10px] text-primary">Auto</div>
                      <div className="h-2 rounded-full bg-card">
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{
                            width: `${(item.nota_autopercepcao / 5) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="mb-0.5 text-[10px] text-sky-400">Gestor</div>
                      <div className="h-2 rounded-full bg-card">
                        <div
                          className="h-2 rounded-full bg-sky-400"
                          style={{
                            width: `${((item.nota_gestor ?? 0) / 5) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {maioresDesvios.length > 0 && (
            <Card className="bg-surface">
              <h4 className="text-sm font-semibold text-primary">
                Maiores desalinhamentos
              </h4>
              <ul className="mt-3 space-y-2">
                {maioresDesvios.map((item) => (
                  <li
                    key={item.competencia}
                    className="flex items-center justify-between rounded-lg border border-card-elevated bg-surface-muted px-3 py-2 text-sm"
                  >
                    <span className="truncate text-zinc-200">{item.competencia}</span>
                    <span className="shrink-0 tabular-nums text-zinc-400">
                      {item.nota_autopercepcao} → {item.nota_gestor}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {(dados.avaliacao_gestor.feedback_performance ||
            dados.avaliacao_gestor.pontos_fortes ||
            dados.avaliacao_gestor.pontos_desenvolvimento) && (
            <Card className="bg-surface">
              <h4 className="text-sm font-semibold text-primary">
                Feedbacks do gestor
                {dados.avaliacao_gestor.gestor_nome && (
                  <span className="font-normal text-zinc-400">
                    {" "}
                    · {dados.avaliacao_gestor.gestor_nome}
                  </span>
                )}
              </h4>
              <div className="mt-3 space-y-2 text-sm text-zinc-300">
                {dados.avaliacao_gestor.feedback_performance && (
                  <p>
                    <span className="font-medium text-zinc-400">Performance: </span>
                    {dados.avaliacao_gestor.feedback_performance}
                  </p>
                )}
                {dados.avaliacao_gestor.alinhamento_cultural && (
                  <p>
                    <span className="font-medium text-zinc-400">Cultura: </span>
                    {dados.avaliacao_gestor.alinhamento_cultural}
                  </p>
                )}
                {dados.avaliacao_gestor.pontos_fortes && (
                  <p>
                    <span className="font-medium text-zinc-400">Pontos fortes: </span>
                    {dados.avaliacao_gestor.pontos_fortes}
                  </p>
                )}
                {dados.avaliacao_gestor.pontos_desenvolvimento && (
                  <p>
                    <span className="font-medium text-zinc-400">
                      Desenvolvimento:{" "}
                    </span>
                    {dados.avaliacao_gestor.pontos_desenvolvimento}
                  </p>
                )}
              </div>
            </Card>
          )}
        </>
      )}

      {!temAutopercepcao && (
          <p className="text-xs text-amber-400">
            Aviso: não há autoavaliação registrada para esta semana. O comparativo
            ficará incompleto até o estagiário enviar a planilha.
          </p>
        )}
    </div>
  );
}

export default ComparativoGestor;
