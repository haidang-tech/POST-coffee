"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useEffect } from "react";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        aria-label="Đóng"
        className="absolute inset-0 bg-coffee-900/40 backdrop-blur-[2px]"
        onClick={onClose}
        tabIndex={-1}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative z-10 w-full rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl",
          "max-h-[92vh] overflow-y-auto",
          widths[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-cream-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-coffee-900">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-xs text-mocha-400">{description}</p>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-mocha-400 transition-colors hover:bg-cream-100 hover:text-coffee-700"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
