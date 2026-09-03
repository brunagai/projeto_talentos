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
  clearSession,
  getStoredUser,
  getToken,
  saveSession,
  type LoginResponse,
  type UsuarioAuth,
} from "../lib/auth";

interface AuthContextValue {
  usuario: UsuarioAuth | null;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
  atualizarPerfil: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioAuth | null>(null);
  const [carregando, setCarregando] = useState(true);

  const atualizarPerfil = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUsuario(null);
      return;
    }
    try {
      const perfil = await apiFetch<UsuarioAuth>("/auth/me");
      setUsuario(perfil);
      saveSession(token, perfil);
    } catch {
      clearSession();
      setUsuario(null);
    }
  }, []);

  useEffect(() => {
    const stored = getStoredUser();
    if (stored && getToken()) {
      setUsuario(stored);
      void atualizarPerfil().finally(() => setCarregando(false));
      return;
    }
    setCarregando(false);
  }, [atualizarPerfil]);

  const login = useCallback(async (email: string, senha: string) => {
    const resposta = await apiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, senha }),
    });
    saveSession(resposta.access_token, resposta.usuario);
    setUsuario(resposta.usuario);
  }, []);

  const logout = useCallback(() => {
    clearSession();
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
