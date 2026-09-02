import { FormEvent, useState } from "react";

import Card from "./Card";

export interface AvaliacaoFormPayload {
  talento_id: string;
  semana_numero: number;
  horas_dedicadas: number;
  autoavaliacao_tecnica: number;
  autoavaliacao_socioemocional: number;
  feedback_case?: string;
  interdependencias?: string;
  ajustes_rota?: string;
}

interface FormularioAvaliacaoProps {
  onSubmit?: (payload: AvaliacaoFormPayload) => void | Promise<void>;
}

interface FormState {
  talento_id: string;
  semana_numero: string;
  horas_dedicadas: string;
  tech_python: string;
  tech_sql: string;
  tech_git: string;
  tech_api: string;
  soft_comunicacao: string;
  soft_colaboracao: string;
  soft_proatividade: string;
  feedback_case: string;
  interdependencias: string;
  ajustes_rota: string;
}

const initialState: FormState = {
  talento_id: "",
  semana_numero: "",
  horas_dedicadas: "",
  tech_python: "",
  tech_sql: "",
  tech_git: "",
  tech_api: "",
  soft_comunicacao: "",
  soft_colaboracao: "",
  soft_proatividade: "",
  feedback_case: "",
  interdependencias: "",
  ajustes_rota: "",
};

const inputClassName =
  "w-full rounded-lg border border-card-elevated bg-surface-muted px-3 py-2 text-zinc-100 placeholder:text-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";

const labelClassName = "mb-1 block text-sm font-medium text-zinc-300";

function calcularMedia(valores: number[]): number {
  if (valores.length === 0) {
    return 0;
  }
  return valores.reduce((total, valor) => total + valor, 0) / valores.length;
}

function parseNota(value: string, label: string): number {
  const nota = Number(value);
  if (!Number.isInteger(nota) || nota < 1 || nota > 5) {
    throw new Error(`${label} deve ser um número inteiro entre 1 e 5.`);
  }
  return nota;
}

export function FormularioAvaliacao({ onSubmit }: FormularioAvaliacaoProps) {
  const [form, setForm] = useState<FormState>(initialState);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function atualizarCampo(campo: keyof FormState, valor: string) {
    setForm((estadoAtual) => ({ ...estadoAtual, [campo]: valor }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);

    try {
      const notasTecnicas = [
        parseNota(form.tech_python, "Python"),
        parseNota(form.tech_sql, "SQL"),
        parseNota(form.tech_git, "Git"),
        parseNota(form.tech_api, "APIs"),
      ];

      const notasSocioemocionais = [
        parseNota(form.soft_comunicacao, "Comunicação"),
        parseNota(form.soft_colaboracao, "Colaboração"),
        parseNota(form.soft_proatividade, "Proatividade"),
      ];

      const semanaNumero = Number(form.semana_numero);
      const horasDedicadas = Number(form.horas_dedicadas);

      if (!form.talento_id.trim()) {
        throw new Error("Informe o ID do talento.");
      }
      if (!Number.isInteger(semanaNumero) || semanaNumero < 1) {
        throw new Error("O número da semana deve ser um inteiro maior que zero.");
      }
      if (Number.isNaN(horasDedicadas) || horasDedicadas < 0) {
        throw new Error("As horas dedicadas devem ser um número válido.");
      }

      const payload: AvaliacaoFormPayload = {
        talento_id: form.talento_id.trim(),
        semana_numero: semanaNumero,
        horas_dedicadas: horasDedicadas,
        autoavaliacao_tecnica: Math.round(calcularMedia(notasTecnicas)),
        autoavaliacao_socioemocional: Math.round(calcularMedia(notasSocioemocionais)),
      };

      if (form.feedback_case.trim()) {
        payload.feedback_case = form.feedback_case.trim();
      }
      if (form.interdependencias.trim()) {
        payload.interdependencias = form.interdependencias.trim();
      }
      if (form.ajustes_rota.trim()) {
        payload.ajustes_rota = form.ajustes_rota.trim();
      }

      setEnviando(true);
      await onSubmit?.(payload);
      setForm(initialState);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao enviar avaliação.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card accent className="mx-auto w-full max-w-2xl">
      <header className="mb-6">
        <h2 className="text-xl font-semibold text-primary">Avaliação Semanal</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Preencha os dados da semana e atribua notas de 1 a 5.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Dados gerais
          </h3>

          <div>
            <label htmlFor="talento_id" className={labelClassName}>
              ID do talento
            </label>
            <input
              id="talento_id"
              name="talento_id"
              type="text"
              value={form.talento_id}
              onChange={(event) => atualizarCampo("talento_id", event.target.value)}
              className={inputClassName}
              placeholder="UUID do talento"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="semana_numero" className={labelClassName}>
                Semana
              </label>
              <input
                id="semana_numero"
                name="semana_numero"
                type="number"
                min={1}
                value={form.semana_numero}
                onChange={(event) => atualizarCampo("semana_numero", event.target.value)}
                className={inputClassName}
                required
              />
            </div>

            <div>
              <label htmlFor="horas_dedicadas" className={labelClassName}>
                Horas dedicadas
              </label>
              <input
                id="horas_dedicadas"
                name="horas_dedicadas"
                type="number"
                min={0}
                step={0.5}
                value={form.horas_dedicadas}
                onChange={(event) => atualizarCampo("horas_dedicadas", event.target.value)}
                className={inputClassName}
                required
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Autoavaliação técnica
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { id: "tech_python", label: "Python" },
              { id: "tech_sql", label: "SQL" },
              { id: "tech_git", label: "Git" },
              { id: "tech_api", label: "APIs" },
            ].map(({ id, label }) => (
              <div key={id}>
                <label htmlFor={id} className={labelClassName}>
                  {label}
                </label>
                <input
                  id={id}
                  name={id}
                  type="number"
                  min={1}
                  max={5}
                  value={form[id as keyof FormState]}
                  onChange={(event) =>
                    atualizarCampo(id as keyof FormState, event.target.value)
                  }
                  className={inputClassName}
                  required
                />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Autoavaliação socioemocional
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { id: "soft_comunicacao", label: "Comunicação" },
              { id: "soft_colaboracao", label: "Colaboração" },
              { id: "soft_proatividade", label: "Proatividade" },
            ].map(({ id, label }) => (
              <div key={id}>
                <label htmlFor={id} className={labelClassName}>
                  {label}
                </label>
                <input
                  id={id}
                  name={id}
                  type="number"
                  min={1}
                  max={5}
                  value={form[id as keyof FormState]}
                  onChange={(event) =>
                    atualizarCampo(id as keyof FormState, event.target.value)
                  }
                  className={inputClassName}
                  required
                />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Feedback qualitativo
          </h3>

          <div>
            <label htmlFor="feedback_case" className={labelClassName}>
              Feedback do case
            </label>
            <textarea
              id="feedback_case"
              name="feedback_case"
              rows={3}
              value={form.feedback_case}
              onChange={(event) => atualizarCampo("feedback_case", event.target.value)}
              className={inputClassName}
              placeholder="Opcional"
            />
          </div>

          <div>
            <label htmlFor="interdependencias" className={labelClassName}>
              Interdependências
            </label>
            <textarea
              id="interdependencias"
              name="interdependencias"
              rows={3}
              value={form.interdependencias}
              onChange={(event) => atualizarCampo("interdependencias", event.target.value)}
              className={inputClassName}
              placeholder="Opcional"
            />
          </div>

          <div>
            <label htmlFor="ajustes_rota" className={labelClassName}>
              Ajustes de rota
            </label>
            <textarea
              id="ajustes_rota"
              name="ajustes_rota"
              rows={3}
              value={form.ajustes_rota}
              onChange={(event) => atualizarCampo("ajustes_rota", event.target.value)}
              className={inputClassName}
              placeholder="Opcional"
            />
          </div>
        </section>

        {erro && (
          <p className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-lg bg-primary px-4 py-2.5 font-semibold text-white transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {enviando ? "Enviando..." : "Enviar avaliação"}
        </button>
      </form>
    </Card>
  );
}

export default FormularioAvaliacao;
