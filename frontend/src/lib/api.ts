export const API_BASE_URL =
  typeof window !== "undefined"
    ? "/api"
    : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000");

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

let encerrandoSessao = false;

async function encerrarSessaoNoServidor(): Promise<void> {
  if (encerrandoSessao) {
    return;
  }
  encerrandoSessao = true;
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Ignora falha de rede ao limpar cookie HttpOnly.
  } finally {
    encerrandoSessao = false;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (response.status === 401) {
    const body = (await response.json().catch(() => null)) as {
      detail?: string;
      message?: string;
    } | null;
    const mensagem =
      body?.message ??
      body?.detail ??
      "Sessão expirada. Faça login novamente.";

    const isAuthEndpoint =
      path.startsWith("/auth/login") ||
      path.startsWith("/auth/logout") ||
      path.startsWith("/auth/me");

    if (
      !isAuthEndpoint &&
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login")
    ) {
      await encerrarSessaoNoServidor();
      window.location.href = "/login";
    }

    throw new ApiError(mensagem, 401);
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      detail?: string;
      message?: string;
    } | null;
    throw new ApiError(
      body?.message ?? body?.detail ?? `Falha na requisição (${response.status}).`,
      response.status,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
