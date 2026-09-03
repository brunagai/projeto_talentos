"use client";

import { FormEvent, useState } from "react";

import Card from "./Card";
import {
  ALL_SKILL_KEYS,
  HARD_SKILL_KEYS,
  SOFT_SKILL_KEYS,
  separarSkills,
  skillsVazias,
} from "./competencias";
import { apiFetch } from "../lib/api";

const inputClassName =
  "w-full rounded-lg border border-card-elevated bg-surface-muted px-3 py-2 text-zinc-100 placeholder:text-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";

const labelClassName = "mb-1 block text-sm font-medium text-zinc-300";

export interface FormularioGestorProps {
  talentoId: string;
  semanaNumero: number;
  valoresIniciais?: {
    gestor_nome?: string | null;
    hard_skills?: Record<string, number>;
    soft_skills?: Record<string, number>;
    feedback_performance?: string | null;
    alinhamento_cultural?: string | null;
    pontos_desenvolvimento?: string | null;
    pontos_fortes?: string | null;
  };
  onSalvo?: () => void;
}

function montarEstadoInicial(
  valoresIniciais?: FormularioGestorProps["valoresIniciais"],
): Record<string, string | number> {
  const skills = skillsVazias();
  if (valoresIniciais?.hard_skills) {
    Object.assign(skills, valoresIniciais.hard_skills);
  }
  if (valoresIniciais?.soft_skills) {
    Object.assign(skills, valoresIniciais.soft_skills);
  }

  const estado: Record<string, string | number> = {
    gestor_nome: valoresIniciais?.gestor_nome ?? "",
    feedback_performance: valoresIniciais?.feedback_performance ?? "",
    alinhamento_cultural: valoresIniciais?.alinhamento_cultural ?? "",
    pontos_desenvolvimento: valoresIniciais?.pontos_desenvolvimento ?? "",
    pontos_fortes: valoresIniciais?.pontos_fortes ?? "",
  };

  for (const nome of ALL_SKILL_KEYS) {
    estado[`skill_${nome}`] = skills[nome];
  }

  return estado;
}

export function FormularioGestor({
  talentoId,
  semanaNumero,
  valoresIniciais,
  onSalvo,
}: FormularioGestorProps) {
  const [form, setForm] = useState(() => montarEstadoInicial(valoresIniciais));
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  function atualizarCampo(campo: string, valor: string) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
    setSucesso(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setSucesso(false);

    const skills: Record<string, number> = {};
    for (const nome of ALL_SKILL_KEYS) {
      const nota = Number(form[`skill_${nome}`]);
      if (!Number.isInteger(nota) || nota < 0 || nota > 5) {
        setErro(`Nota inválida para "${nome}". Use valores de 0 a 5.`);
        return;
      }
      skills[nome] = nota;
    }

    const { hard_skills, soft_skills } = separarSkills(skills);

    const payload = {
      talento_id: talentoId,
      semana_numero: semanaNumero,
      gestor_nome: String(form.gestor_nome).trim() || undefined,
      hard_skills,
      soft_skills,
      feedback_performance: String(form.feedback_performance).trim() || undefined,
      alinhamento_cultural: String(form.alinhamento_cultural).trim() || undefined,
      pontos_desenvolvimento: String(form.pontos_desenvolvimento).trim() || undefined,
      pontos_fortes: String(form.pontos_fortes).trim() || undefined,
    };

    setEnviando(true);
    try {
      await apiFetch("/gestor/avaliacoes", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setSucesso(true);
      onSalvo?.();
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro ao salvar avaliação.",
      );
    } finally {
      setEnviando(false);
    }
  }

  function renderGrupo(
    titulo: string,
    chaves: readonly string[],
  ) {
    return (
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {titulo}
        </h4>
        <div className="grid gap-3 sm:grid-cols-2">
          {chaves.map((nome) => {
            const campo = `skill_${nome}`;
            return (
              <div key={nome}>
                <label htmlFor={campo} className={labelClassName}>
                  {nome}
                </label>
                <input
                  id={campo}
                  type="number"
                  min={0}
                  max={5}
                  value={form[campo]}
                  onChange={(event) => atualizarCampo(campo, event.target.value)}
                  className={inputClassName}
                  required
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <Card className="bg-surface">
      <header className="mb-4">
        <h3 className="text-lg font-semibold text-primary">
          Avaliação do gestor
        </h3>
        <p className="mt-1 text-sm text-zinc-400">
          Semana {semanaNumero} · atribua notas de 0 a 5 nas 20 competências.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="gestor_nome" className={labelClassName}>
            Nome do gestor
          </label>
          <input
            id="gestor_nome"
            value={String(form.gestor_nome)}
            onChange={(event) => atualizarCampo("gestor_nome", event.target.value)}
            className={inputClassName}
            placeholder="Opcional"
          />
        </div>

        {renderGrupo("Competências técnicas", HARD_SKILL_KEYS)}
        {renderGrupo("Competências socioemocionais", SOFT_SKILL_KEYS)}

        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Feedbacks qualitativos
          </h4>
          {[
            { id: "feedback_performance", label: "Feedback de performance" },
            { id: "alinhamento_cultural", label: "Alinhamento cultural" },
            { id: "pontos_fortes", label: "Pontos fortes observados" },
            { id: "pontos_desenvolvimento", label: "Pontos de desenvolvimento" },
          ].map(({ id, label }) => (
            <div key={id}>
              <label htmlFor={id} className={labelClassName}>
                {label}
              </label>
              <textarea
                id={id}
                rows={2}
                value={String(form[id])}
                onChange={(event) => atualizarCampo(id, event.target.value)}
                className={inputClassName}
                placeholder="Opcional"
              />
            </div>
          ))}
        </div>

        {erro && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {erro}
          </p>
        )}
        {sucesso && (
          <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300">
            Avaliação do gestor salva com sucesso.
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-lg bg-primary px-4 py-2.5 font-semibold text-white transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {enviando ? "Salvando..." : "Salvar avaliação do gestor"}
        </button>
      </form>
    </Card>
  );
}

export default FormularioGestor;
