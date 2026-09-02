"use client";

import type { MouseEvent } from "react";

export function normalizarUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return "";
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

interface LinksTalentoProps {
  linkProjeto?: string | null;
  linkLinkedin?: string | null;
  tamanho?: "sm" | "md";
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}

function IconeLinkedIn({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function IconeProjeto({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 3S18.73 2.5 17 2.5c-2.5 0-4.5 2-4.5 4.5 0 1.5.5 2.5 1 3.5" />
      <path d="M12 22V12" />
    </svg>
  );
}

export function LinksTalento({
  linkProjeto,
  linkLinkedin,
  tamanho = "md",
  onClick,
}: LinksTalentoProps) {
  const projeto = linkProjeto?.trim();
  const linkedin = linkLinkedin?.trim();

  if (!projeto && !linkedin) {
    return null;
  }

  const sizeClass = tamanho === "sm" ? "h-4 w-4" : "h-5 w-5";
  const buttonClass =
    tamanho === "sm"
      ? "inline-flex items-center justify-center rounded-md border border-card-elevated p-1.5 text-zinc-400 transition-colors hover:border-primary/40 hover:text-primary"
      : "inline-flex items-center gap-2 rounded-lg border border-card-elevated bg-surface-muted px-3 py-2 text-sm text-zinc-300 transition-colors hover:border-primary/40 hover:text-primary";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {linkedin && (
        <a
          href={normalizarUrl(linkedin)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClick}
          className={buttonClass}
          aria-label="Abrir perfil no LinkedIn"
          title="LinkedIn"
        >
          <IconeLinkedIn className={sizeClass} />
          {tamanho === "md" && <span>LinkedIn</span>}
        </a>
      )}
      {projeto && (
        <a
          href={normalizarUrl(projeto)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClick}
          className={buttonClass}
          aria-label="Abrir projeto ou repositório"
          title="Projeto / Portfólio"
        >
          <IconeProjeto className={sizeClass} />
          {tamanho === "md" && <span>Projeto</span>}
        </a>
      )}
    </div>
  );
}

export default LinksTalento;
