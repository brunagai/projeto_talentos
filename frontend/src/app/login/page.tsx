"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import Card from "../../components/Card";
import { AlertErro } from "../../components/AlertErro";
import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../lib/api";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEnviando(true);
    setErro(null);

    try {
      await login(email.trim(), senha);
      router.replace("/");
    } catch (error) {
      setErro(
        error instanceof ApiError
          ? error.message
          : "Não foi possível entrar. Tente novamente.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <header className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 text-lg font-bold text-primary"
            aria-hidden="true"
          >
            CC
          </div>
          <h1 className="text-3xl font-bold text-primary">Plataforma Talentos</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Acesse com sua conta da consultoria
          </p>
        </header>

        <Card accent className="bg-card">
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="login-email"
                className="mb-1 block text-sm font-medium text-zinc-300"
              >
                E-mail
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-card-elevated bg-surface-muted px-3 py-2 text-zinc-100 placeholder:text-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="voce@cobra-coral.com"
              />
            </div>

            <div>
              <label
                htmlFor="login-senha"
                className="mb-1 block text-sm font-medium text-zinc-300"
              >
                Senha
              </label>
              <input
                id="login-senha"
                type="password"
                autoComplete="current-password"
                required
                minLength={6}
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                className="w-full rounded-lg border border-card-elevated bg-surface-muted px-3 py-2 text-zinc-100 placeholder:text-zinc-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="••••••••"
              />
            </div>

            {erro && <AlertErro>{erro}</AlertErro>}

            <button
              type="submit"
              disabled={enviando}
              className="mt-2 w-full rounded-lg bg-primary px-4 py-2.5 font-semibold text-white transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              {enviando ? "Entrando…" : "Entrar"}
            </button>
          </form>
        </Card>

        <p className="mt-6 text-center text-xs text-zinc-500">
          Demo: admin@cobra-coral.com / admin123
        </p>
      </div>
    </main>
  );
}
