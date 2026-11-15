import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-cream-200 bg-white shadow-[0_1px_2px_rgba(36,26,20,0.04)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-cream-200 px-5 py-4",
        className,
      )}
    >
      <div>
        <h2 className="text-[15px] font-semibold text-coffee-900">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs text-mocha-400">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-coffee-900">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-mocha-400">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "accent" | "coffee";
  className?: string;
}) {
  const tones = {
    neutral: "bg-cream-100 text-coffee-700 border-cream-200",
    success: "bg-success-500/10 text-success-500 border-success-500/20",
    warning: "bg-warning-500/10 text-[#9a6d12] border-warning-500/25",
    danger: "bg-danger-500/10 text-danger-500 border-danger-500/20",
    accent: "bg-accent-500/12 text-accent-600 border-accent-500/25",
    coffee: "bg-coffee-700 text-cream-50 border-coffee-700",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <p className="text-sm font-semibold text-coffee-700">{title}</p>
      {description ? (
        <p className="max-w-sm text-xs text-mocha-400">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
