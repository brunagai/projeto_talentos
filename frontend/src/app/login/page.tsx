import Card from "../../components/Card";
import { LoginForm } from "../../components/LoginForm";

export default function LoginPage() {
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
          <LoginForm />
        </Card>

        {process.env.NODE_ENV === "development" && (
          <p className="mt-6 text-center text-xs text-zinc-500">
            Demo: admin@cobra-coral.com / admin123
          </p>
        )}
      </div>
    </main>
  );
}
