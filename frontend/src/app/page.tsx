"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Card from "../components/Card";
import FormularioAvaliacao, {
  type AvaliacaoFormPayload,
} from "../components/FormularioAvaliacao";
import UploadPlanilha from "../components/UploadPlanilha";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";
import { labelPapel, podeFazerUpload } from "../lib/auth";

type AbaAtiva = "upload" | "formulario";

interface MetricasIndividuais {
  tipo: "individual";
  media_tecnica: number;
  media_socioemocional: number;
  media_competencias: number;
}

interface MetricasAgregadas {
  tipo: "agregada";
  media_tecnica: number;
  media_socioemocional: number;
  media_competencias: number;
  total_horas_dedicadas: number;
  quantidade_avaliacoes: number;
}

type MetricasResult = MetricasIndividuais | MetricasAgregadas;

function formatarNota(valor: number): string {
  return valor.toFixed(2);
}

export default function HomePage() {
  const { usuario, logout } = useAuth();
  const router = useRouter();
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>("formulario");
  const [metricas, setMetricas] = useState<MetricasResult | null>(null);

  const exibeUpload = usuario ? podeFazerUpload(usuario.papel) : false;

  useEffect(() => {
    if (exibeUpload) {
      setAbaAtiva("upload");
    } else {
      setAbaAtiva("formulario");
    }
  }, [exibeUpload]);

  async function handleSubmit(payload: AvaliacaoFormPayload): Promise<void> {
    const data = await apiFetch<MetricasResult>("/avaliacoes/metricas", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setMetricas(data);
  }

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="text-center">
          <div className="mb-4 flex items-center justify-end gap-3">
            {usuario && (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-zinc-400">
                  {usuario.nome} · {labelPapel(usuario.papel)}
                  {usuario.organizacao_nome ? ` · ${usuario.organizacao_nome}` : ""}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg border border-card-elevated px-3 py-1.5 text-zinc-300 transition-colors hover:border-primary/40 hover:text-primary"
                >
                  Sair
                </button>
              </div>
            )}
          </div>
          <h1 className="text-3xl font-bold text-primary sm:text-4xl">
            Plataforma Talentos
          </h1>
          <p className="mt-2 text-sm text-zinc-400 sm:text-base">
            {exibeUpload
              ? "Avalie talentos em lote por planilha ou registre uma autoavaliação individual."
              : "Registre sua autoavaliação semanal."}
          </p>
        </header>

        {exibeUpload ? (
          <nav
            aria-label="Modos de avaliação"
            className="mx-auto flex w-full max-w-2xl rounded-xl border border-card-elevated bg-card p-1"
          >
            <button
              type="button"
              onClick={() => setAbaAtiva("upload")}
              className={[
                "flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors sm:px-4",
                abaAtiva === "upload"
                  ? "bg-primary text-white shadow-sm shadow-primary/30"
                  : "text-zinc-400 hover:bg-surface-muted hover:text-zinc-100",
              ].join(" ")}
              aria-pressed={abaAtiva === "upload"}
            >
              Upload de Planilha (Lote)
            </button>
            <button
              type="button"
              onClick={() => setAbaAtiva("formulario")}
              className={[
                "flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors sm:px-4",
                abaAtiva === "formulario"
                  ? "bg-primary text-white shadow-sm shadow-primary/30"
                  : "text-zinc-400 hover:bg-surface-muted hover:text-zinc-100",
              ].join(" ")}
              aria-pressed={abaAtiva === "formulario"}
            >
              Formulário Manual (Individual)
            </button>
          </nav>
        ) : null}

        <section className="w-full">
          {abaAtiva === "upload" && exibeUpload ? (
            <UploadPlanilha />
          ) : (
            <div className="flex flex-col gap-6">
              <FormularioAvaliacao onSubmit={handleSubmit} />

              {metricas && (
                <Card accent className="mx-auto w-full max-w-2xl">
                  <h2 className="text-lg font-semibold text-primary">
                    Métricas calculadas
                  </h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    Resultado retornado pelo backend após o envio da avaliação.
                  </p>

                  <dl className="mt-6 grid gap-4 sm:grid-cols-3">
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

                    <div className="rounded-lg border border-primary/30 bg-primary/10 p-4">
                      <dt className="text-xs uppercase tracking-wide text-primary/80">
                        Média de competências
                      </dt>
                      <dd className="mt-2 text-2xl font-bold text-primary">
                        {formatarNota(metricas.media_competencias)}
                      </dd>
                    </div>
                  </dl>

                  {metricas.tipo === "agregada" && (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-lg border border-card-elevated bg-surface-muted p-4">
                        <dt className="text-xs uppercase tracking-wide text-zinc-500">
                          Total de horas
                        </dt>
                        <dd className="mt-2 text-xl font-semibold text-white">
                          {formatarNota(metricas.total_horas_dedicadas)} h
                        </dd>
                      </div>

                      <div className="rounded-lg border border-card-elevated bg-surface-muted p-4">
                        <dt className="text-xs uppercase tracking-wide text-zinc-500">
                          Avaliações processadas
                        </dt>
                        <dd className="mt-2 text-xl font-semibold text-white">
                          {metricas.quantidade_avaliacoes}
                        </dd>
                      </div>
                    </div>
                  )}
                </Card>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
