import type { Metadata } from "next";

import { AuthProvider } from "../context/AuthContext";
import { AuthGuard } from "../components/AuthGuard";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Plataforma Talentos",
  description: "Avaliação semanal de talentos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body>
        <AuthProvider>
          <AuthGuard>{children}</AuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
