"use client";

import Card from "./Card";
import type { SkillScore } from "./skillTypes";

interface SoftSkillsRadarProps {
  skills: SkillScore[];
  className?: string;
  titulo?: string;
  descricao?: string;
}

const MAX_SCORE = 5;
const PRIMARY = "#e11d48";
const SIZE = 320;
const CENTER = SIZE / 2;
const RADIUS = 110;

function polarToCartesian(angleRad: number, radius: number): { x: number; y: number } {
  return {
    x: CENTER + radius * Math.cos(angleRad),
    y: CENTER + radius * Math.sin(angleRad),
  };
}

function buildPolygonPoints(values: number[], maxValue: number): string {
  const count = values.length;
  if (count === 0) {
    return "";
  }

  return values
    .map((value, index) => {
      const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
      const radius = (Math.max(0, Math.min(value, maxValue)) / maxValue) * RADIUS;
      const point = polarToCartesian(angle, radius);
      return `${point.x},${point.y}`;
    })
    .join(" ");
}

export function SoftSkillsRadar({
  skills,
  className = "",
  titulo = "Competências Socioemocionais (Soft Skills)",
  descricao = "Skill Matrix na escala 1–5, convertida das respostas textuais da planilha.",
}: SoftSkillsRadarProps) {
  const count = skills.length;
  const levels = [1, 2, 3, 4, 5];

  if (count === 0) {
    return (
      <Card className={`bg-surface ${className}`.trim()}>
        <h3 className="text-lg font-semibold text-primary">{titulo}</h3>
        <p className="mt-2 text-sm text-zinc-400">Sem dados para exibir no radar.</p>
      </Card>
    );
  }

  const values = skills.map((skill) => skill.valor);
  const polygon = buildPolygonPoints(values, MAX_SCORE);
  const listaId = `radar-lista-${titulo.replace(/\s+/g, "-").toLowerCase()}`;
  const resumoAria = skills
    .map((skill) => `${skill.nome}: ${skill.valor.toFixed(1)}`)
    .join("; ");

  return (
    <Card className={`bg-surface ${className}`.trim()}>
      <header className="mb-5">
        <h3 className="text-lg font-semibold text-primary">{titulo}</h3>
        <p className="mt-1 text-sm text-zinc-400">{descricao}</p>
      </header>

      <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-start">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="mx-auto h-auto w-full max-w-sm"
          role="img"
          aria-label={`${titulo}. ${resumoAria}`}
          aria-describedby={listaId}
        >
          {levels.map((level) => {
            const radius = (level / MAX_SCORE) * RADIUS;
            const ring = Array.from({ length: count }, (_, index) => {
              const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
              return polarToCartesian(angle, radius);
            });
            const points = ring.map((point) => `${point.x},${point.y}`).join(" ");
            return (
              <polygon
                key={level}
                points={points}
                fill="none"
                stroke="#3f3f46"
                strokeWidth={level === 3 ? 1.5 : 1}
                strokeDasharray={level === 3 ? "4 3" : undefined}
              />
            );
          })}

          {skills.map((skill, index) => {
            const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
            const edge = polarToCartesian(angle, RADIUS);
            const label = polarToCartesian(angle, RADIUS + 28);
            const shortLabel =
              skill.nome.length > 22 ? `${skill.nome.slice(0, 20)}…` : skill.nome;

            return (
              <g key={skill.nome}>
                <line
                  x1={CENTER}
                  y1={CENTER}
                  x2={edge.x}
                  y2={edge.y}
                  stroke="#27272a"
                  strokeWidth={1}
                />
                <text
                  x={label.x}
                  y={label.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-zinc-400"
                  fontSize={10}
                >
                  {shortLabel}
                </text>
              </g>
            );
          })}

          <polygon
            points={polygon}
            fill={`${PRIMARY}33`}
            stroke={PRIMARY}
            strokeWidth={2}
          />

          {skills.map((skill, index) => {
            const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
            const point = polarToCartesian(
              angle,
              (skill.valor / MAX_SCORE) * RADIUS,
            );
            return (
              <circle
                key={`${skill.nome}-dot`}
                cx={point.x}
                cy={point.y}
                r={3.5}
                fill={PRIMARY}
              />
            );
          })}
        </svg>

        <ul
          id={listaId}
          className="w-full space-y-2 lg:max-w-xs"
          aria-label={`Valores numéricos: ${titulo}`}
        >
          {skills.map((skill) => (
            <li
              key={skill.nome}
              className="flex items-center justify-between gap-3 rounded-lg border border-card-elevated bg-card-muted px-3 py-2 text-sm"
            >
              <span className="text-zinc-300">{skill.nome}</span>
              <span className="font-semibold tabular-nums text-primary">
                {skill.valor.toFixed(1)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

export default SoftSkillsRadar;
