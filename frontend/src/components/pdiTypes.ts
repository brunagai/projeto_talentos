export interface AcaoPdi {
  tipo: string;
  descricao: string;
}

export interface MetaPdi {
  competencia: string;
  tipo: string;
  nota_atual: number;
  nota_autopercepcao: number;
  nota_gestor: number | null;
  nota_meta: number;
  peso_exigido_cargo: number;
  gap_cargo: number;
  motivos: string[];
  prioridade: "alta" | "media" | "baixa";
  prazo_semanas: number;
  prazo_descricao: string;
  acoes: AcaoPdi[];
}

export interface PdiTalento {
  talento_id: string;
  nome: string | null;
  email: string | null;
  semana_referencia: number;
  cargo_alvo: string;
  area: string;
  fit_percentual_atual: number;
  limiar_nota: number;
  total_metas: number;
  tem_avaliacao_gestor: boolean;
  resumo: {
    focos_abaixo_limiar: number;
    focos_gap_cargo: number;
    focos_desalinhamento_gestor: number;
    prazo_medio_semanas: number;
  };
  metas: MetaPdi[];
}

export interface CargoOpcao {
  cargo: string;
  area: string;
}
