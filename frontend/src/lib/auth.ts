export type PapelUsuario = "admin" | "recrutador" | "mentor" | "talento";

export interface UsuarioAuth {
  id: string;
  email: string;
  nome: string;
  papel: PapelUsuario;
  organizacao_id: string;
  organizacao_nome: string | null;
  turma_id: string | null;
  talento_id: string | null;
}

export interface LoginResponse {
  usuario: UsuarioAuth;
}

export function podeFazerUpload(papel: PapelUsuario): boolean {
  return papel === "admin" || papel === "recrutador" || papel === "mentor";
}

export function podeVerMatchmaking(papel: PapelUsuario): boolean {
  return papel === "admin" || papel === "recrutador";
}

export function podeVerGestor(papel: PapelUsuario): boolean {
  return (
    papel === "admin" ||
    papel === "recrutador" ||
    papel === "mentor" ||
    papel === "talento"
  );
}

export function podeEditarGestor(papel: PapelUsuario): boolean {
  return papel === "admin" || papel === "mentor";
}

export function labelPapel(papel: PapelUsuario): string {
  const mapa: Record<PapelUsuario, string> = {
    admin: "Administrador",
    recrutador: "Recrutador",
    mentor: "Mentor",
    talento: "Talento",
  };
  return mapa[papel];
}
