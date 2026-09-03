import { HomeDashboard } from "../components/HomeDashboard";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="text-center">
          <h1 className="text-3xl font-bold text-primary sm:text-4xl">
            Plataforma Talentos
          </h1>
        </header>
        <HomeDashboard />
      </div>
    </main>
  );
}
