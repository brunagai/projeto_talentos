export interface PerfilTalentoData {
  talento_id: string;
  email?: string | null;
  nome?: string | null;
  semana_numero: number;
  hard_skills: Record<string, number>;
  soft_skills: Record<string, number>;
  media_tecnica?: number;
  media_socioemocional?: number;
  fit_vaga?: number;
  feedback_case?: string | null;
  interdependencias?: string | null;
  ajustes_rota?: string | null;
  rituais_mentoria?: string | null;
}
