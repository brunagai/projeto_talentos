"use client";

export interface CargoReferencia {
  cargo: string;
  area: string;
  pesos: Record<string, number>;
}

export interface RankingCandidato {
  talento_id: string;
  nome: string | null;
  email: string | null;
  semana_numero: number;
  fit_percentual: number;
  hard_skills: Record<string, number>;
  soft_skills: Record<string, number>;
  media_tecnica?: number;
  media_socioemocional?: number;
  feedback_case?: string | null;
  interdependencias?: string | null;
  ajustes_rota?: string | null;
  rituais_mentoria?: string | null;
  link_projeto?: string | null;
  link_linkedin?: string | null;
}

export interface CargoRankingResumo {
  cargo: string;
  area: string;
  talentos_aderentes: number;
  fit_medio: number;
  fit_topo: number;
  ranking: RankingCandidato[];
}

export const LIMIAR_ADERENCIA = 50;

export function notaSkill(
  hardSkills: Record<string, number>,
  softSkills: Record<string, number>,
  competencia: string,
): number {
  if (competencia in hardSkills) {
    return hardSkills[competencia] ?? 0;
  }
  if (competencia in softSkills) {
    return softSkills[competencia] ?? 0;
  }
  return 0;
}

/** Aderência percentual ponderada (mesma lógica do backend). */
export function calcularFitPercentual(
  hardSkills: Record<string, number>,
  softSkills: Record<string, number>,
  pesos: Record<string, number>,
): number {
  let numerador = 0;
  let denominador = 0;

  for (const [competencia, peso] of Object.entries(pesos)) {
    if (peso <= 0) {
      continue;
    }
    const nota = notaSkill(hardSkills, softSkills, competencia);
    numerador += Math.min(nota / peso, 1) * peso;
    denominador += peso;
  }

  if (denominador <= 0) {
    return 0;
  }
  return Math.round((numerador / denominador) * 10000) / 100;
}

export function nomeExibicao(candidato: {
  nome?: string | null;
  email?: string | null;
}): string {
  return candidato.nome?.trim() || candidato.email?.trim() || "Talento";
}

export function candidatoParaPerfil(
  candidato: RankingCandidato,
): import("./PerfilTalento").PerfilTalentoData {
  const notasHard = Object.values(candidato.hard_skills);
  const notasSoft = Object.values(candidato.soft_skills);
  const mediaTecnica =
    candidato.media_tecnica ??
    (notasHard.length
      ? notasHard.reduce((a, b) => a + b, 0) / notasHard.length
      : 0);
  const mediaSocio =
    candidato.media_socioemocional ??
    (notasSoft.length
      ? notasSoft.reduce((a, b) => a + b, 0) / notasSoft.length
      : 0);

  return {
    talento_id: candidato.talento_id,
    nome: candidato.nome,
    email: candidato.email,
    semana_numero: candidato.semana_numero,
    hard_skills: candidato.hard_skills,
    soft_skills: candidato.soft_skills,
    media_tecnica: mediaTecnica,
    media_socioemocional: mediaSocio,
    fit_vaga: (mediaTecnica + mediaSocio) / 2,
    feedback_case: candidato.feedback_case,
    interdependencias: candidato.interdependencias,
    ajustes_rota: candidato.ajustes_rota,
    rituais_mentoria: candidato.rituais_mentoria,
    link_projeto: candidato.link_projeto,
    link_linkedin: candidato.link_linkedin,
  };
}
