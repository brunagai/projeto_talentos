export interface SemanaHistorico {
  semana_numero: number;
  horas_dedicadas: number;
  media_tecnica: number | null;
  media_socioemocional: number | null;
  fit_vaga: number | null;
  hard_skills: Record<string, number>;
  soft_skills: Record<string, number>;
  feedback_case: string | null;
  interdependencias: string | null;
  ajustes_rota: string | null;
  rituais_mentoria: string | null;
  link_projeto: string | null;
  link_linkedin: string | null;
}

export interface HistoricoTalento {
  talento_id: string;
  nome: string | null;
  email: string | null;
  turma_id: string | null;
  total_semanas: number;
  series: SemanaHistorico[];
}

export interface VariacaoCompetencia {
  nome: string;
  tipo: "hard" | "soft";
  nota_inicial: number;
  nota_final: number;
  delta: number;
}
