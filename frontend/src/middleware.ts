import { jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "access_token";

function cookieSecure(): boolean {
  const raw = process.env.COOKIE_SECURE?.trim().toLowerCase();
  if (raw === "true" || raw === "1") {
    return true;
  }
  if (raw === "false" || raw === "0") {
    return false;
  }
  return process.env.NODE_ENV === "production";
}

function authSecret(): Uint8Array | null {
  const raw = process.env.AUTH_SECRET || process.env.JWT_SECRET;
  if (!raw || !raw.trim()) {
    return null;
  }
  return new TextEncoder().encode(raw.trim());
}

async function tokenValido(token: string): Promise<boolean> {
  const secret = authSecret();
  if (!secret) {
    // Sem segredo configurado, não libera rotas protegidas.
    return false;
  }
  try {
    // Aceita tokens com ou sem `aud` (RLS). Não apaga sessão por claim extra.
    await jwtVerify(token, secret, {
      algorithms: ["HS256"],
      audience: ["authenticated"],
      requiredClaims: ["sub", "exp"],
    });
    return true;
  } catch {
    try {
      await jwtVerify(token, secret, {
        algorithms: ["HS256"],
        requiredClaims: ["sub", "exp"],
      });
      return true;
    } catch {
      return false;
    }
  }
}

function redirecionarLogin(request: NextRequest): NextResponse {
  // Não apaga o cookie aqui: se AUTH_SECRET estiver desalinhado do backend,
  // limpar destruiria uma sessão ainda válida para a API.
  return NextResponse.redirect(new URL("/login", request.url));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const valido = token ? await tokenValido(token) : false;

  if (pathname.startsWith("/login")) {
    // Sempre permite a tela de login (não redireciona por cookie antigo).
    return NextResponse.next();
  }

  if (!valido) {
    return redirecionarLogin(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
