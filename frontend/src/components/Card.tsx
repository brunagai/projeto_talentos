import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  /** Ativa detalhes visuais em vermelho cobra-coral (`primary`). */
  accent?: boolean;
}

export function Card({
  children,
  className = "",
  accent = false,
  ...props
}: CardProps) {
  const classes = [
    "rounded-xl border bg-card p-6 text-zinc-100 shadow-lg shadow-black/20",
    accent ? "border-primary/40" : "border-card-elevated",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...props}>
      {accent && (
        <div
          className="mb-4 h-1 w-12 rounded-full bg-primary"
          aria-hidden="true"
        />
      )}
      {children}
    </div>
  );
}

export default Card;
