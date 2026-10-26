"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

/**
 * Checkbox leve (API próxima do shadcn/ui), alinhado ao tema dark do Projekt Fin.
 * Compatível com react-hook-form via `register` / `ref`.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox({ className, ...props }, ref) {
    return (
      <input
        type="checkbox"
        ref={ref}
        className={cn(
          "mt-0.5 size-4 shrink-0 cursor-pointer rounded border border-white/20 bg-[#050f0c]",
          "text-[#10B981] accent-[#10B981]",
          "transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
