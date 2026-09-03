import { jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "access_token";

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
    await jwtVerify(token, secret, { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

function limparCookieERedirecionarLogin(request: NextRequest): NextResponse {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const valido = token ? await tokenValido(token) : false;

  if (pathname.startsWith("/login")) {
    if (valido) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!valido) {
    return limparCookieERedirecionarLogin(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
