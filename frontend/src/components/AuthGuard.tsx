"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "../context/AuthContext";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { usuario, carregando } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (carregando) {
      return;
    }
    if (!usuario && pathname !== "/login") {
      router.replace("/login");
    }
    if (usuario && pathname === "/login") {
      router.replace("/");
    }
  }, [usuario, carregando, pathname, router]);

  if (carregando) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background"
        aria-busy="true"
        role="status"
      >
        <p className="text-sm text-zinc-400">Carregando sessão…</p>
      </div>
    );
  }

  if (!usuario && pathname !== "/login") {
    return null;
  }

  return <>{children}</>;
}

export default AuthGuard;
