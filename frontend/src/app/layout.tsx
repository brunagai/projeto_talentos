import type { Metadata } from "next";

import { Providers } from "../components/Providers";
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
