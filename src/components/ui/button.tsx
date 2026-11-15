import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-coffee-700 text-cream-50 hover:bg-coffee-800 active:bg-coffee-900 shadow-sm",
  secondary:
    "bg-cream-100 text-coffee-800 hover:bg-cream-200 border border-cream-200",
  outline:
    "border border-coffee-700/20 bg-transparent text-coffee-800 hover:bg-cream-100",
  ghost: "bg-transparent text-coffee-700 hover:bg-cream-100",
  danger: "bg-danger-500 text-white hover:bg-danger-500/90 shadow-sm",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-[15px] gap-2 rounded-xl",
  icon: "h-9 w-9 rounded-lg justify-center",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-cream-50",
        "disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
