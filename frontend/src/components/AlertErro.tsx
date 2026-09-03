import type { ReactNode } from "react";

interface AlertErroProps {
  children: ReactNode;
  className?: string;
}

export function AlertErro({
  children,
  className = "rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary",
}: AlertErroProps) {
  return (
    <p role="alert" aria-live="assertive" className={className}>
      {children}
    </p>
  );
}
