import type { Metadata } from "next";

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
      <body>{children}</body>
    </html>
  );
}
