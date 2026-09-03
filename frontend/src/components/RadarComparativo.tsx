"use client";

import Card from "./Card";

const MAX_SCORE = 5;
const SIZE = 320;
const CENTER = SIZE / 2;
const RADIUS = 100;
const COR_AUTO = "#e11d48";
const COR_GESTOR = "#38bdf8";

interface RadarComparativoProps {
  competencias: string[];
  auto: Record<string, number>;
  gestor: Record<string, number> | null;
  titulo: string;
  descricao?: string;
  className?: string;
}

function polarToCartesian(angleRad: number, radius: number): { x: number; y: number } {
  return {
    x: CENTER + radius * Math.cos(angleRad),
    y: CENTER + radius * Math.sin(angleRad),
  };
}

function buildPolygon(values: number[], count: number): string {
  if (count === 0) {
    return "";
  }
  return values
    .map((value, index) => {
      const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
      const radius = (Math.max(0, Math.min(value, MAX_SCORE)) / MAX_SCORE) * RADIUS;
      const point = polarToCartesian(angle, radius);
      return `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`;
    })
    .join(" ");
}

export function RadarComparativo({
  competencias,
  auto,
  gestor,
  titulo,
  descricao,
  className = "",
}: RadarComparativoProps) {
  const count = competencias.length;
  if (count === 0) {
    return null;
  }

  const valoresAuto = competencias.map((nome) => auto[nome] ?? 0);
  const valoresGestor = competencias.map((nome) => gestor?.[nome] ?? 0);
  const polyAuto = buildPolygon(valoresAuto, count);
  const polyGestor = gestor ? buildPolygon(valoresGestor, count) : "";

  return (
    <Card className={`bg-surface ${className}`.trim()}>
      <header className="mb-4">
        <h4 className="text-sm font-semibold text-primary">{titulo}</h4>
        {descricao && <p className="mt-1 text-xs text-zinc-400">{descricao}</p>}
      </header>

      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="mx-auto h-auto w-full max-w-sm"
        role="img"
        aria-label={`${titulo}. Autopercepção e gestor por competência: ${competencias
          .map(
            (nome) =>
              `${nome} auto ${Number(auto[nome] ?? 0).toFixed(1)}${
                gestor
                  ? `, gestor ${Number(gestor[nome] ?? 0).toFixed(1)}`
                  : ""
              }`,
          )
          .join("; ")}`}
      >
        {[1, 2, 3, 4, 5].map((level) => {
          const radius = (level / MAX_SCORE) * RADIUS;
          const ring = competencias
            .map((_, index) => {
              const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
              const point = polarToCartesian(angle, radius);
              return `${point.x},${point.y}`;
            })
            .join(" ");
          return (
            <polygon
              key={level}
              points={ring}
              fill="none"
              stroke="#3f3f46"
              strokeWidth="1"
            />
          );
        })}

        {gestor && polyGestor && (
          <path
            d={`${polyGestor} Z`}
            fill={`${COR_GESTOR}33`}
            stroke={COR_GESTOR}
            strokeWidth="2"
          />
        )}

        {polyAuto && (
          <path
            d={`${polyAuto} Z`}
            fill={`${COR_AUTO}33`}
            stroke={COR_AUTO}
            strokeWidth="2"
          />
        )}
      </svg>

      <ul className="mt-3 flex flex-wrap justify-center gap-4 text-xs text-zinc-300">
        <li className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: COR_AUTO }}
          />
          Autopercepção
        </li>
        {gestor && (
          <li className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: COR_GESTOR }}
            />
            Visão do gestor
          </li>
        )}
      </ul>
    </Card>
  );
}

export default RadarComparativo;
