import { cn } from "@/lib/utils";
import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

const base =
  "w-full rounded-xl border border-cream-300 bg-white text-sm text-coffee-900 placeholder:text-mocha-400 transition-shadow focus:border-coffee-500 focus:ring-4 focus:ring-coffee-500/10 disabled:bg-cream-100 disabled:text-mocha-400";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(base, "h-11 px-3.5", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(base, "min-h-20 px-3.5 py-2.5", className)} {...props} />;
}

export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(base, "h-11 px-3 pr-8", className)} {...props} />;
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-xs font-semibold text-coffee-700", className)}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      {children}
      {hint ? <p className="mt-1 text-[11px] text-mocha-400">{hint}</p> : null}
    </div>
  );
}
