import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink active:opacity-85",
  secondary: "bg-surface text-ink border border-line active:bg-surface-2",
  ghost: "text-muted active:bg-surface-2",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`min-h-12 rounded-2xl px-5 text-base font-semibold transition disabled:opacity-40 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl border border-line bg-surface p-5 ${className}`}>{children}</section>;
}

export function Chip({
  selected,
  children,
  onClick,
}: {
  selected: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-10 rounded-full border px-4 text-sm transition ${
        selected ? "border-accent bg-accent-soft font-semibold text-accent" : "border-line bg-surface text-ink"
      }`}
    >
      {children}
    </button>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <header className="mb-5 mt-2">
      <h1 className="text-2xl font-bold tracking-tight">{children}</h1>
      {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
    </header>
  );
}

/** 레벨(1~5 연속값)을 막대로 */
export function LevelBar({ level }: { level: number }) {
  const pct = ((level - 1) / 4) * 100;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2" role="meter" aria-valuemin={1} aria-valuemax={5} aria-valuenow={level}>
      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.max(4, pct)}%` }} />
    </div>
  );
}

export function Loading() {
  return <div className="py-20 text-center text-sm text-muted">불러오는 중…</div>;
}
