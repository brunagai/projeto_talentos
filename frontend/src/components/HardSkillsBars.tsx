"use client";

import Card from "./Card";

export interface SkillScore {
  nome: string;
  valor: number;
}

interface HardSkillsBarsProps {
  skills: SkillScore[];
  /** Limiar de corte do mercado na escala 1–5. */
  limiarMercado?: number;
  className?: string;
}

const MAX_SCORE = 5;
const HIGHLIGHT_THRESHOLD = 4;

export function HardSkillsBars({
  skills,
  limiarMercado = 3,
  className = "",
}: HardSkillsBarsProps) {
  const limiarPercentual = Math.min(
    100,
    Math.max(0, ((limiarMercado - 0) / MAX_SCORE) * 100),
  );

  return (
    <Card className={`bg-surface ${className}`.trim()}>
      <header className="mb-5">
        <h3 className="text-lg font-semibold text-primary">
          Competências Técnicas (Hard Skills)
        </h3>
        <p className="mt-1 text-sm text-zinc-400">
          Escala 1–5 com limiar de mercado em {limiarMercado.toFixed(1)}. Barras
          em vermelho destacam notas ≥ {HIGHLIGHT_THRESHOLD}.
        </p>
      </header>

      <ul className="space-y-4">
        {skills.map((skill) => {
          const percentual = Math.min(100, Math.max(0, (skill.valor / MAX_SCORE) * 100));
          const destaque = skill.valor >= HIGHLIGHT_THRESHOLD;

          return (
            <li key={skill.nome}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className="text-sm text-zinc-200">{skill.nome}</span>
                <span
                  className={[
                    "shrink-0 text-sm font-semibold tabular-nums",
                    destaque ? "text-primary" : "text-zinc-400",
                  ].join(" ")}
                >
                  {skill.valor.toFixed(1)}
                </span>
              </div>

              <div className="relative h-3 overflow-hidden rounded-full bg-card-muted">
                <div
                  className={[
                    "absolute inset-y-0 left-0 rounded-full transition-all",
                    destaque ? "bg-primary" : "bg-card-elevated",
                  ].join(" ")}
                  style={{ width: `${percentual}%` }}
                />
                <div
                  className="pointer-events-none absolute inset-y-0 z-10 w-0 border-l border-dashed border-zinc-400/80"
                  style={{ left: `${limiarPercentual}%` }}
                  title={`Limiar de mercado: ${limiarMercado}`}
                  aria-hidden="true"
                />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 flex items-center gap-2 text-xs text-zinc-500">
        <span
          className="inline-block h-3 w-0 border-l border-dashed border-zinc-400"
          aria-hidden="true"
        />
        Linha tracejada = limiar de corte do mercado ({limiarMercado.toFixed(1)})
      </div>
    </Card>
  );
}

export default HardSkillsBars;
