"use client";

import { useTranslation } from "@/hooks/use-translation";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

export const DELETE_ACCOUNT_CONFIRMATION = "APAGAR-MINHA-CONTA";

const fieldClassName =
  "h-12 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none transition-colors duration-200 placeholder:text-zinc-500 focus:border-red-500 focus:ring-1 focus:ring-red-500";

type DeleteAccountModalProps = {
  open: boolean;
  onClose: () => void;
  /** Apaga os dados e encerra a sessão. Deve lançar em caso de falha. */
  onConfirm: () => Promise<void>;
};

export function DeleteAccountModal({ open, onClose, onConfirm }: DeleteAccountModalProps) {
  if (!open) return null;

  // Remontar o formulário a cada abertura limpa o texto de confirmação.
  return <DeleteAccountModalForm onClose={onClose} onConfirm={onConfirm} />;
}

function DeleteAccountModalForm({
  onClose,
  onConfirm,
}: Omit<DeleteAccountModalProps, "open">) {
  const { t } = useTranslation();
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const isConfirmed = confirmText === DELETE_ACCOUNT_CONFIRMATION;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isDeleting) onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, isDeleting]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isConfirmed || isDeleting) return;

    setError("");
    setIsDeleting(true);

    try {
      await onConfirm();
      // Sucesso: a página de Configurações já redirecionou para o Login.
    } catch (submitError) {
      console.error("Falha ao apagar a conta:", submitError);
      const message =
        submitError instanceof Error
          ? submitError.message
          : t("deleteAccount.errorFallback");
      setError(message);
      toast.error(message);
      setIsDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isDeleting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        aria-describedby="delete-account-warning"
        className="relative w-full max-w-md rounded-2xl border border-red-900/50 bg-zinc-950 p-6 md:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          aria-label={t("common.close")}
          className="absolute top-4 right-4 rounded-lg p-2 text-zinc-400 transition-colors duration-200 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50"
        >
          <X className="size-5" aria-hidden="true" />
        </button>

        <h2 id="delete-account-title" className="pr-10 text-xl font-semibold text-zinc-50">
          {t("deleteAccount.title")}
        </h2>

        <div
          id="delete-account-warning"
          className="mt-4 flex gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4"
        >
          <AlertTriangle className="size-5 shrink-0 text-red-400" aria-hidden="true" />
          <p className="text-sm font-medium text-red-300">
            {t("deleteAccount.warning")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-300">
              {t("deleteAccount.confirmInstruction", { phrase: DELETE_ACCOUNT_CONFIRMATION })}
            </span>
            <input
              type="text"
              name="confirmDeleteAccount"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              placeholder={DELETE_ACCOUNT_CONFIRMATION}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              disabled={isDeleting}
              aria-invalid={confirmText.length > 0 && !isConfirmed}
              className={fieldClassName}
            />
          </label>

          {error ? (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="h-12 rounded-xl border border-zinc-800 px-5 text-sm font-semibold text-zinc-300 transition-colors duration-200 hover:bg-zinc-900 disabled:opacity-60"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={!isConfirmed || isDeleting}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDeleting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              {isDeleting ? t("deleteAccount.deleting") : t("deleteAccount.confirm")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
