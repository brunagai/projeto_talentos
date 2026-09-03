export interface CompetenciaComparativo {
  competencia: string;
  tipo: "hard" | "soft";
  nota_autopercepcao: number;
  nota_gestor: number | null;
  delta: number | null;
}

export interface ComparativoGestorData {
  talento_id: string;
  nome: string | null;
  email: string | null;
  semana_numero: number;
  autopercepcao: {
    hard_skills: Record<string, number>;
    soft_skills: Record<string, number>;
    media_tecnica: number | null;
    media_socioemocional: number | null;
    feedback_case?: string | null;
    interdependencias?: string | null;
    ajustes_rota?: string | null;
    rituais_mentoria?: string | null;
  };
  avaliacao_gestor: {
    id?: string | null;
    gestor_nome?: string | null;
    hard_skills: Record<string, number>;
    soft_skills: Record<string, number>;
    media_tecnica: number | null;
    media_socioemocional: number | null;
    feedback_performance?: string | null;
    alinhamento_cultural?: string | null;
    pontos_desenvolvimento?: string | null;
    pontos_fortes?: string | null;
  } | null;
  competencias: CompetenciaComparativo[];
  resumo: {
    media_tecnica_autopercepcao: number;
    media_socioemocional_autopercepcao: number;
    media_tecnica_gestor: number | null;
    media_socioemocional_gestor: number | null;
    delta_media_tecnica: number | null;
    delta_media_socioemocional: number | null;
    taxa_convergencia_percentual: number | null;
    total_competencias: number;
  };
}
