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
  access_token: string;
  token_type: string;
  usuario: UsuarioAuth;
}

const TOKEN_KEY = "plataforma_talentos_token";
const USER_KEY = "plataforma_talentos_user";

export function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): UsuarioAuth | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as UsuarioAuth;
  } catch {
    return null;
  }
}

export function saveSession(token: string, usuario: UsuarioAuth): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(usuario));
  document.cookie = `auth_token=${token}; path=/; max-age=${60 * 60 * 12}; SameSite=Lax`;
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  document.cookie = "auth_token=; path=/; max-age=0; SameSite=Lax";
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
