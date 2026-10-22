"use client";

import { useTranslation } from "@/hooks/use-translation";
import { AlertTriangle, CircleCheck } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ConfirmVariant = "danger" | "default";

export type ConfirmOptions = {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
};

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmDialogContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const settle = useCallback((value: boolean) => {
    const resolve = resolveRef.current;
    resolveRef.current = null;
    setOptions(null);
    resolve?.(value);
  }, []);

  const confirm = useCallback((next: ConfirmOptions) => {
    resolveRef.current?.(false);

    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setOptions(next);
    });
  }, []);

  useEffect(() => {
    return () => {
      resolveRef.current?.(false);
      resolveRef.current = null;
    };
  }, []);

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}
      {options ? (
        <ConfirmDialog options={options} onCancel={() => settle(false)} onConfirm={() => settle(true)} />
      ) : null}
    </ConfirmDialogContext.Provider>
  );
}

function ConfirmDialog({
  options,
  onCancel,
  onConfirm,
}: {
  options: ConfirmOptions;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const isDanger = (options.variant ?? "default") === "danger";

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    (isDanger ? cancelRef.current : confirmRef.current)?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [isDanger, onCancel]);

  const Icon = isDanger ? AlertTriangle : CircleCheck;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-emerald-500/20 bg-[#06140e]/90 p-6 shadow-2xl shadow-black/80 backdrop-blur-xl ring-1 ring-emerald-500/10"
      >
        <div className="pointer-events-none absolute -top-12 -left-12 h-32 w-32 rounded-full bg-emerald-500/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -right-12 h-32 w-32 rounded-full bg-emerald-900/20 blur-2xl" />

        <div className="relative z-10">
          <div className="flex items-start gap-4">
            <div
              className={
                isDanger
                  ? "flex size-11 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-400 ring-1 ring-red-500/30"
                  : "flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30"
              }
            >
              <Icon className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg font-semibold tracking-tight text-zinc-50">
                {options.title}
              </h2>
              <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-zinc-400">
                {options.description}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              ref={cancelRef}
              type="button"
              onClick={onCancel}
              className="h-11 rounded-xl bg-zinc-800 px-4 text-sm font-semibold text-zinc-300 transition-colors duration-200 hover:bg-zinc-700"
            >
              {options.cancelText ?? t("common.cancel")}
            </button>
            <button
              ref={confirmRef}
              type="button"
              onClick={onConfirm}
              className={
                isDanger
                  ? "h-11 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-red-500"
                  : "h-11 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-emerald-500"
              }
            >
              {options.confirmText ?? t("common.confirm")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmDialogContext);

  if (!context) {
    throw new Error("useConfirm deve ser usado dentro de ConfirmDialogProvider.");
  }

  return context;
}
