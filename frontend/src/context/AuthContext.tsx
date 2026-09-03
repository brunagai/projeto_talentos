"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { apiFetch } from "../lib/api";
import {
  type LoginResponse,
  type UsuarioAuth,
} from "../lib/auth";

interface AuthContextValue {
  usuario: UsuarioAuth | null;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
  atualizarPerfil: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioAuth | null>(null);
  const [carregando, setCarregando] = useState(true);

  const atualizarPerfil = useCallback(async () => {
    try {
      const perfil = await apiFetch<UsuarioAuth>("/auth/me");
      setUsuario(perfil);
    } catch {
      setUsuario(null);
    }
  }, []);

  useEffect(() => {
    // Sempre inicia na tela de login: encerra cookie/sessão anterior ao montar.
    async function iniciarSemSessao() {
      try {
        await apiFetch("/auth/logout", { method: "POST" });
      } catch {
        // Ignora falha de rede; o estado local já fica deslogado.
      } finally {
        setUsuario(null);
        setCarregando(false);
      }
    }
    void iniciarSemSessao();
  }, []);

  const login = useCallback(async (email: string, senha: string) => {
    const resposta = await apiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, senha }),
    });
    setUsuario(resposta.usuario);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // Ignora falha de rede no logout local.
    }
    setUsuario(null);
  }, []);

  const value = useMemo(
    () => ({ usuario, carregando, login, logout, atualizarPerfil }),
    [usuario, carregando, login, logout, atualizarPerfil],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  }
  return contexto;
}
