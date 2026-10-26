"use client";

import { useSession } from "@/components/require-session";
import { AppSelect } from "@/components/ui/app-select";
import { toCalendarIso } from "@/components/ui/custom-date-picker";
import { usePreferences } from "@/contexts/preferences-context";
import { useTranslation } from "@/hooks/use-translation";
import { createTransaction, getAllTransactions } from "@/lib/appwrite/database";
import {
  getGoalImageUrl,
  getGoals,
  updateGoal,
  type GoalDocument,
} from "@/lib/appwrite/goals";
import { isFuturePendingTransaction } from "@/lib/transaction-timing";
import {
  cn,
  formatCurrency,
  formatCurrencyInput,
  getCurrencySymbol,
  parseCurrencyToNumber,
} from "@/lib/utils";
import { Target, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

type AllocateGoalOption = {
  id: string;
  title: string;
  currentAmount: number;
  targetAmount: number;
  imageUrl?: string;
};

type AllocateToGoalModalProps = {
  open: boolean;
  onClose: () => void;
  /** Chamado após uma alocação bem-sucedida (para refrescar a lista de transações). */
  onAllocated?: () => void;
};

const fieldClassName =
  "h-12 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none transition-colors duration-200 placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";

function computeAvailableBalance(
  transactions: { type: string; amount: number; date: string; status?: string | null }[],
) {
  let total = 0;
  const now = new Date();

  for (const document of transactions) {
    if (isFuturePendingTransaction(document.date, document.status, now)) continue;
    const amount = Number(document.amount) || 0;
    total += document.type === "income" ? amount : -amount;
  }

  return Math.round(total * 100) / 100;
}

function toAllocateOption(document: GoalDocument): AllocateGoalOption {
  const imageId = document.imageId || undefined;

  return {
    id: document.$id,
    title: document.title,
    currentAmount: Number(document.currentAmount) || 0,
    targetAmount: Number(document.targetAmount) || 0,
    ...(imageId ? { imageUrl: getGoalImageUrl(imageId) } : {}),
  };
}

export function AllocateToGoalModal({ open, onClose, onAllocated }: AllocateToGoalModalProps) {
  if (!open) return null;

  return <AllocateToGoalModalForm onClose={onClose} onAllocated={onAllocated} />;
}

function AllocateToGoalModalForm({
  onClose,
  onAllocated,
}: Omit<AllocateToGoalModalProps, "open">) {
  const { user } = useSession();
  const { currency, privacyMode } = usePreferences();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [goals, setGoals] = useState<AllocateGoalOption[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedGoalData = useMemo(
    () => goals.find((goal) => goal.id === selectedGoalId) ?? null,
    [goals, selectedGoalId],
  );

  const remainingToGoal = selectedGoalData
    ? Math.max(
        0,
        Math.round((selectedGoalData.targetAmount - selectedGoalData.currentAmount) * 100) / 100,
      )
    : 0;

  const progressPercent =
    selectedGoalData && selectedGoalData.targetAmount > 0
      ? Math.min(
          100,
          Math.round((selectedGoalData.currentAmount / selectedGoalData.targetAmount) * 100),
        )
      : 0;

  const maxTransferable = Math.max(0, Math.min(availableBalance, remainingToGoal));

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setLoading(true);
        const [transactions, goalsResponse] = await Promise.all([
          getAllTransactions(user.$id),
          getGoals(user.$id, 100, 0),
        ]);
        if (!active) return;

        const balance = computeAvailableBalance(transactions);
        const activeGoals = goalsResponse.documents
          .filter((goal) => !goal.isCompleted)
          .map(toAllocateOption)
          .filter((goal) => goal.targetAmount > goal.currentAmount);

        setAvailableBalance(Math.max(0, balance));
        setGoals(activeGoals);
        setSelectedGoalId(activeGoals[0]?.id ?? "");
      } catch (loadError) {
        console.error("Falha ao carregar dados para alocação em metas.", loadError);
        if (active) {
          setAvailableBalance(0);
          setGoals([]);
          setSelectedGoalId("");
          toast.error(t("allocateGoalModal.loadError"));
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, [user.$id, t]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, isSubmitting]);

  function handleAmountChange(value: string) {
    setAmount(formatCurrencyInput(value, currency));
    setError("");
  }

  function handleUseFullAmount() {
    if (maxTransferable <= 0) return;
    setAmount(formatCurrencyInput(String(Math.round(maxTransferable * 100)), currency));
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!selectedGoalData) {
      setError(t("allocateGoalModal.goalRequired"));
      return;
    }

    const parsedAmount = parseCurrencyToNumber(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError(t("allocateGoalModal.amountError"));
      return;
    }

    if (availableBalance <= 0) {
      setError(t("allocateGoalModal.noBalance"));
      return;
    }

    if (parsedAmount > availableBalance + 0.001) {
      setError(t("allocateGoalModal.exceedsBalance"));
      return;
    }

    if (parsedAmount > remainingToGoal + 0.001) {
      setError(t("allocateGoalModal.exceedsRemaining"));
      return;
    }

    if (!user?.$id) {
      setError(t("allocateGoalModal.sessionMissing"));
      return;
    }

    try {
      setIsSubmitting(true);

      const nextCurrent =
        Math.round((selectedGoalData.currentAmount + parsedAmount) * 100) / 100;
      const isCompleted = nextCurrent >= selectedGoalData.targetAmount;

      await updateGoal(selectedGoalData.id, {
        currentAmount: nextCurrent,
        isCompleted,
      });

      try {
        await createTransaction({
          userId: user.$id,
          type: "expense",
          description: t("allocateGoalModal.transactionDescription", {
            goal: selectedGoalData.title,
          }),
          category: t("allocateGoalModal.transactionCategory"),
          date: toCalendarIso(new Date()),
          amount: parsedAmount,
          status: "Paid",
        });
      } catch (transactionError) {
        // Reverte o progresso da meta se a despesa correspondente não gravar.
        await updateGoal(selectedGoalData.id, {
          currentAmount: selectedGoalData.currentAmount,
          isCompleted: selectedGoalData.currentAmount >= selectedGoalData.targetAmount,
        }).catch((rollbackError) => {
          console.error("Falha ao reverter a meta após erro na transação:", rollbackError);
        });
        throw transactionError;
      }

      toast.success(
        t("allocateGoalModal.success", {
          amount: formatCurrency(parsedAmount, currency, false),
          goal: selectedGoalData.title,
        }),
      );
      onAllocated?.();
      onClose();
    } catch (submitError) {
      console.error("Falha ao alocar saldo na meta:", submitError);
      const message =
        submitError instanceof Error
          ? submitError.message
          : t("allocateGoalModal.submitError");
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const canTransfer =
    !loading &&
    !isSubmitting &&
    availableBalance > 0 &&
    goals.length > 0 &&
    Boolean(selectedGoalId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="allocate-goal-modal-title"
        className="relative max-h-[90vh] w-[95vw] max-w-md overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label={t("common.close")}
          className="absolute top-4 right-4 rounded-lg p-2 text-zinc-400 transition-colors duration-200 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50"
        >
          <X className="size-5" aria-hidden="true" />
        </button>

        <div className="mb-6 pr-10">
          <div className="mb-3 flex size-11 items-center justify-center rounded-xl border border-emerald-800/40 bg-emerald-500/10 text-emerald-400">
            <Target className="size-5" aria-hidden="true" />
          </div>
          <h2 id="allocate-goal-modal-title" className="text-xl font-semibold text-zinc-50">
            {t("allocateGoalModal.title")}
          </h2>
          <p className="mt-1 text-sm text-zinc-400">{t("allocateGoalModal.subtitle")}</p>
        </div>

        <div className="mb-6 rounded-xl border border-emerald-900/50 bg-gradient-to-br from-emerald-950/40 to-zinc-950 px-4 py-4">
          <p className="text-xs font-medium tracking-wide text-emerald-200/70 uppercase">
            {t("allocateGoalModal.availableBalance")}
          </p>
          <p
            className={cn(
              "mt-1 text-2xl font-bold tabular-nums",
              privacyMode
                ? "text-zinc-300"
                : availableBalance > 0
                  ? "text-green-500"
                  : "text-zinc-400",
            )}
          >
            {loading
              ? t("common.loading")
              : formatCurrency(availableBalance, currency, privacyMode)}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-300">
              {t("allocateGoalModal.selectGoal")}
            </span>
            {loading ? (
              <p className="text-sm text-zinc-500">{t("common.loading")}</p>
            ) : goals.length === 0 ? (
              <p className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-3 text-sm text-zinc-400">
                {t("allocateGoalModal.noGoals")}
              </p>
            ) : (
              <AppSelect
                value={selectedGoalId}
                onChange={setSelectedGoalId}
                ariaLabel={t("allocateGoalModal.selectGoal")}
                options={goals.map((goal) => ({
                  value: goal.id,
                  label: goal.title,
                }))}
                className="w-full"
                menuClassName="left-0 w-full max-h-56"
              />
            )}
            {selectedGoalData ? (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-green-900/30 bg-[#070C09]/50 p-3 transition-all md:gap-4">
                {selectedGoalData.imageUrl ? (
                  <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-white/5 md:h-14 md:w-20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedGoalData.imageUrl}
                      alt={selectedGoalData.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-gray-900 md:h-14 md:w-20">
                    <Target className="h-5 w-5 text-gray-500" aria-hidden="true" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="truncate pr-2 text-sm font-medium text-white">
                      {selectedGoalData.title}
                    </span>
                    <span className="shrink-0 rounded-full bg-green-500/10 px-1.5 py-0.5 text-[10px] font-bold text-green-400">
                      {progressPercent}%
                    </span>
                  </div>

                  <div className="mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
                    <div
                      className="h-full rounded-full bg-[#10B981] transition-[width] duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  <p className="truncate text-xs text-gray-400">
                    {t("allocateGoalModal.remainingLabel")}{" "}
                    <strong className="font-semibold text-gray-200 tabular-nums">
                      {formatCurrency(remainingToGoal, currency, privacyMode)}
                    </strong>
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-300">
              {t("allocateGoalModal.amount", { symbol: getCurrencySymbol(currency) })}
            </span>
            <span className="relative block">
              <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-medium text-emerald-400 select-none">
                {getCurrencySymbol(currency)}
              </span>
              <input
                type="text"
                name="amount"
                inputMode="numeric"
                value={amount}
                onChange={(event) => handleAmountChange(event.target.value)}
                placeholder={currency === "USD" ? "0.00" : "0,00"}
                disabled={loading || goals.length === 0 || availableBalance <= 0}
                className={`${fieldClassName} pl-12`}
              />
            </span>
            <button
              type="button"
              onClick={handleUseFullAmount}
              disabled={loading || maxTransferable <= 0 || isSubmitting}
              className="self-start text-xs font-medium text-emerald-400 transition-colors hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("allocateGoalModal.useFullAmount")}
            </button>
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
              disabled={isSubmitting}
              className="h-12 rounded-xl border border-zinc-800 px-5 text-sm font-semibold text-zinc-300 transition-colors duration-200 hover:bg-zinc-900 disabled:opacity-60"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={!canTransfer}
              className="h-12 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-emerald-500 disabled:opacity-60"
            >
              {isSubmitting
                ? t("allocateGoalModal.transferring")
                : t("allocateGoalModal.transfer")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
