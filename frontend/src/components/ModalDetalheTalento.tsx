"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import LinksTalento from "./LinksTalento";
import SoftSkillsRadar from "./SoftSkillsRadar";
import { Tab, TabList, TabPanel, Tabs } from "./Tabs";
import type { SkillScore } from "./skillTypes";
import type { PerfilTalentoData } from "./PerfilTalento";

const EvolucaoTemporal = dynamic(() => import("./EvolucaoTemporal"), {
  loading: () => (
    <p className="text-sm text-zinc-400" aria-busy="true">
      Carregando evolução temporal…
    </p>
  ),
});

const ComparativoGestor = dynamic(() => import("./ComparativoGestor"), {
  loading: () => (
    <p className="text-sm text-zinc-400" aria-busy="true">
      Carregando comparativo…
    </p>
  ),
});

const PainelPDI = dynamic(() => import("./PainelPDI"), {
  loading: () => (
    <p className="text-sm text-zinc-400" aria-busy="true">
      Carregando PDI…
    </p>
  ),
});

type AbaModal = "perfil" | "evolucao" | "gestor" | "pdi";

interface ModalDetalheTalentoProps {
  perfil: PerfilTalentoData;
  aberto: boolean;
  onClose: () => void;
  limiarMercado?: number;
  /** Quando true, exibe só competências com nota >= notaMinima (visão recrutador). */
  apenasDestaques?: boolean;
  notaMinima?: number;
}

function toSkillList(
  skills: Record<string, number>,
  notaMinima?: number,
): SkillScore[] {
  return Object.entries(skills)
    .filter(([, valor]) =>
      typeof notaMinima === "number" ? valor >= notaMinima : true,
    )
    .map(([nome, valor]) => ({ nome, valor }));
}

function InsightBlock({ titulo, texto }: { titulo: string; texto?: string | null }) {
  if (!texto?.trim()) {
    return null;
  }

  return (
    <div className="rounded-lg border border-card-elevated bg-surface-muted p-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {titulo}
      </h4>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
        {texto}
      </p>
    </div>
  );
}

function iniciais(perfil: PerfilTalentoData): string {
  const base = (perfil.nome || perfil.email || "T").trim();
  const partes = base.split(/\s+/).filter(Boolean);
  if (partes.length >= 2) {
    return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
  }
  return base.slice(0, 2).toUpperCase();
}

export function ModalDetalheTalento({
  perfil,
  aberto,
  onClose,
  apenasDestaques = false,
  notaMinima = 4,
}: ModalDetalheTalentoProps) {
  const [abaAtiva, setAbaAtiva] = useState<AbaModal>("perfil");
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto || !dialogRef.current) {
      return;
    }

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const container = dialogRef.current;

    function getFocusableElements(): HTMLElement[] {
      return Array.from(
        container.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = getFocusableElements();
      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    const focusable = getFocusableElements();
    focusable[0]?.focus();

    document.body.style.overflow = "hidden";
    container.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      container.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [aberto, onClose]);

  useEffect(() => {
    if (aberto) {
      setAbaAtiva("perfil");
    }
  }, [aberto, perfil.talento_id]);

  if (!aberto) {
    return null;
  }

  const titulo = perfil.nome || perfil.email || "Talento";
  const mediaTecnica =
    typeof perfil.media_tecnica === "number"
      ? perfil.media_tecnica
      : Object.values(perfil.hard_skills).reduce((a, b) => a + b, 0) /
          Math.max(Object.keys(perfil.hard_skills).length, 1) || 0;
  const mediaSocio =
    typeof perfil.media_socioemocional === "number"
      ? perfil.media_socioemocional
      : Object.values(perfil.soft_skills).reduce((a, b) => a + b, 0) /
          Math.max(Object.keys(perfil.soft_skills).length, 1) || 0;
  const fitVaga =
    typeof perfil.fit_vaga === "number"
      ? perfil.fit_vaga
      : (mediaTecnica + mediaSocio) / 2;

  const filtroNota = apenasDestaques ? notaMinima : undefined;
  const hardSkills = toSkillList(perfil.hard_skills, filtroNota);
  const softSkills = toSkillList(perfil.soft_skills, filtroNota);

  const insights = [
    { titulo: "Feedback / Case", texto: perfil.feedback_case },
    { titulo: "Interdependências", texto: perfil.interdependencias },
    { titulo: "Ajustes de rota", texto: perfil.ajustes_rota },
    { titulo: "Rituais de mentoria", texto: perfil.rituais_mentoria },
  ];
  const temInsights = insights.some((item) => item.texto?.trim());

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-talento-titulo"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl border border-card-elevated bg-background shadow-2xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-card-elevated bg-card px-5 py-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary"
              aria-hidden="true"
            >
              {iniciais(perfil)}
            </div>
            <div>
              <h2
                id="modal-talento-titulo"
                className="text-lg font-semibold text-white"
              >
                {titulo}
              </h2>
              <p className="text-sm text-zinc-400">
                Semana {perfil.semana_numero}
                {perfil.email ? ` · ${perfil.email}` : ""}
              </p>
              {apenasDestaques && abaAtiva === "perfil" && (
                <p className="mt-1 text-xs font-medium text-primary">
                  Destaques · competências com nota ≥ {notaMinima.toFixed(1)}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-card-elevated px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:border-primary/40 hover:text-primary"
          >
            Fechar
          </button>
        </header>

        {(perfil.link_linkedin || perfil.link_projeto) && abaAtiva === "perfil" && (
          <div className="border-b border-card-elevated bg-card px-5 py-3">
            <LinksTalento
              linkLinkedin={perfil.link_linkedin}
              linkProjeto={perfil.link_projeto}
            />
          </div>
        )}

        <Tabs
          value={abaAtiva}
          onValueChange={(v) => setAbaAtiva(v as AbaModal)}
        >
          <TabList
            aria-label="Seções do perfil"
            className="flex border-b border-card-elevated bg-card px-5"
          >
            {(
              [
                ["perfil", "Perfil atual"],
                ["evolucao", "Evolução temporal"],
                ["gestor", "Gestor & comparativo"],
                ["pdi", "PDI"],
              ] as const
            ).map(([id, label]) => (
              <Tab
                key={id}
                id={id}
                className={(ativo) =>
                  [
                    "border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                    ativo
                      ? "border-primary text-primary"
                      : "border-transparent text-zinc-400 hover:text-zinc-200",
                  ].join(" ")
                }
              >
                {label}
              </Tab>
            ))}
          </TabList>

          <div className="overflow-y-auto px-5 py-5">
            <TabPanel id="evolucao">
              <EvolucaoTemporal talentoId={perfil.talento_id} />
            </TabPanel>
            <TabPanel id="gestor">
              <ComparativoGestor
                talentoId={perfil.talento_id}
                semanaNumero={perfil.semana_numero}
              />
            </TabPanel>
            <TabPanel id="pdi">
              <PainelPDI
                talentoId={perfil.talento_id}
                semanaNumero={perfil.semana_numero}
              />
            </TabPanel>
            <TabPanel id="perfil">
              <dl className="mb-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-card-elevated bg-surface-muted p-3">
                  <dt className="text-xs uppercase tracking-wide text-zinc-500">
                    Média técnica
                  </dt>
                  <dd className="mt-1 text-xl font-bold text-white">
                    {mediaTecnica.toFixed(2)}
                  </dd>
                </div>
                <div className="rounded-lg border border-card-elevated bg-surface-muted p-3">
                  <dt className="text-xs uppercase tracking-wide text-zinc-500">
                    Média socioemocional
                  </dt>
                  <dd className="mt-1 text-xl font-bold text-white">
                    {mediaSocio.toFixed(2)}
                  </dd>
                </div>
                <div className="rounded-lg border border-primary/30 bg-primary/10 p-3">
                  <dt className="text-xs uppercase tracking-wide text-primary/80">
                    Fit com a vaga
                  </dt>
                  <dd className="mt-1 text-xl font-bold text-primary">
                    {fitVaga.toFixed(2)}
                  </dd>
                </div>
              </dl>

              {apenasDestaques && hardSkills.length === 0 && softSkills.length === 0 ? (
                <div className="rounded-xl border border-card-elevated bg-surface p-6 text-center">
                  <p className="text-sm text-zinc-300">
                    Nenhuma competência com nota ≥ {notaMinima.toFixed(1)} neste
                    registro.
                  </p>
                  <p className="mt-2 text-xs text-zinc-500">
                    Abra o perfil na aba Talentos para ver o detalhamento completo.
                  </p>
                </div>
              ) : (
                <div className="grid gap-6 xl:grid-cols-2">
                  <SoftSkillsRadar
                    skills={hardSkills}
                    titulo={
                      apenasDestaques
                        ? "Destaques Técnicos"
                        : "Radar de Competências Técnicas"
                    }
                    descricao={
                      apenasDestaques
                        ? `Hard skills com pontuação ≥ ${notaMinima.toFixed(1)}.`
                        : "Hard skills na escala 1–5 convertidas das respostas da planilha."
                    }
                    className="bg-surface"
                  />
                  <SoftSkillsRadar
                    skills={softSkills}
                    titulo={
                      apenasDestaques
                        ? "Destaques Socioemocionais"
                        : "Radar Socioemocional"
                    }
                    descricao={
                      apenasDestaques
                        ? `Soft skills com pontuação ≥ ${notaMinima.toFixed(1)}.`
                        : "Soft skills na escala 1–5 convertidas das respostas da planilha."
                    }
                    className="bg-surface"
                  />
                </div>
              )}

              <section className="mt-6">
                <h3 className="mb-3 text-lg font-semibold text-primary">
                  Insights qualitativos
                </h3>
                {temInsights ? (
                  <div className="grid gap-3">
                    {insights.map((item) => (
                      <InsightBlock
                        key={item.titulo}
                        titulo={item.titulo}
                        texto={item.texto}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-card-elevated bg-surface-muted p-4 text-sm text-zinc-400">
                    Nenhum insight qualitativo informado neste registro.
                  </p>
                )}
              </section>
            </TabPanel>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

export default ModalDetalheTalento;
