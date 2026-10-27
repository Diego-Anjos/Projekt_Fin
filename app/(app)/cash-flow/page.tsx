"use client";

import { SpendingHeatmap } from "@/components/spending-heatmap";
import { AppSelect } from "@/components/ui/app-select";
import { CategoryBubbleChart, type CategoryBubble } from "@/components/ui/category-bubble-chart";
import { useSession } from "@/components/require-session";
import { usePreferences } from "@/contexts/preferences-context";
import { useQuantumIaScreenContext } from "@/contexts/quantum-ia-context";
import {
  getAllTransactions,
  getSubscriptions,
  type SubscriptionDocument,
  type TransactionDocument,
} from "@/lib/appwrite/database";
import {
  dailyExpenses,
  expenseCategories,
  monthOptions,
  monthValue,
  monthlyExpensesForYear,
  subscriptionExpensesForMonth,
  subscriptionExpensesForYear,
  sumByType,
  topMovements,
  yearOptions,
  type CashFlowViewMode,
  type CashTransaction,
} from "@/lib/cash-flow";
import { generateCashFlowContext } from "@/lib/chat/generate-cash-flow-context";
import type { FinancialContextPayload } from "@/lib/chat/financial-context";
import { getCategoryIcon, normalizeCategoryName } from "@/lib/category-utils";
import { useTranslation } from "@/hooks/use-translation";
import { localeToBcp47 } from "@/locales/dictionaries";
import { cn, formatCurrency } from "@/lib/utils";
import { ArrowDown, ArrowUp, Scale } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const CATEGORY_PALETTE = ["#f97316", "#8b5cf6", "#eab308", "#0ea5e9", "#10b981", "#f472b6", "#22d3ee", "#a3e635"];

const CATEGORY_COLORS: Record<string, string> = {
  transporte: "#f97316",
  lazer: "#8b5cf6",
  outros: "#a3e635",
  alimentacao: "#0ea5e9",
  moradia: "#10b981",
  saude: "#14b8a6",
  assinaturas: "#7c3aed",
  salario: "#eab308",
};

function toCashTransaction(document: TransactionDocument): CashTransaction {
  return {
    id: document.$id,
    type: document.type === "income" ? "income" : "expense",
    category: document.category ?? "",
    date: document.date,
    amount: Number(document.amount),
    description: document.description?.trim() || document.category || "—",
  };
}

function formatMonthYear(year: number, month: number, bcp47 = "pt-BR") {
  const label = new Intl.DateTimeFormat(bcp47, {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month, 1));

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatMonthName(year: number, month: number, bcp47 = "pt-BR") {
  const label = new Intl.DateTimeFormat(bcp47, { month: "long" }).format(new Date(year, month, 1));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatShortDate(dateValue: string, bcp47 = "pt-BR") {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateValue);
  if (match) {
    return new Intl.DateTimeFormat(bcp47, {
      day: "2-digit",
      month: "short",
    }).format(new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  }
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return dateValue;
  return new Intl.DateTimeFormat(bcp47, { day: "2-digit", month: "short" }).format(parsed);
}

function formatSignedCurrency(value: number, currency: string, privacyMode: boolean) {
  if (privacyMode) return formatCurrency(value, currency, true);
  const formatted = formatCurrency(Math.abs(value), currency, false);
  if (value > 0) return `+ ${formatted}`;
  if (value < 0) return `- ${formatted}`;
  return formatted;
}

function categoryColor(name: string, index: number) {
  return CATEGORY_COLORS[normalizeCategoryName(name)] ?? CATEGORY_PALETTE[index % CATEGORY_PALETTE.length];
}

export default function CashFlowPage() {
  const { user } = useSession();
  const { currency, privacyMode } = usePreferences();
  const { t, locale } = useTranslation();
  const { setScreenContext } = useQuantumIaScreenContext();
  const bcp47 = localeToBcp47[locale];
  const [today] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<CashFlowViewMode>("mensal");
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadCashFlowData() {
      setLoading(true);
      setError(null);

      try {
        const [transactionDocuments, subscriptionsResponse] = await Promise.all([
          getAllTransactions(user.$id),
          getSubscriptions(user.$id, 100),
        ]);
        if (!active) return;
        setTransactions(transactionDocuments.map(toCashTransaction));
        setSubscriptions(subscriptionsResponse.documents);
      } catch (caught) {
        console.error("Falha ao carregar o fluxo de caixa.", caught);
        if (!active) return;
        setTransactions([]);
        setSubscriptions([]);
        setError(t("cashFlow.loadError"));
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadCashFlowData();

    return () => {
      active = false;
    };
  }, [user.$id, t]);

  const periodMonth = viewMode === "mensal" ? month : null;

  const monthSelectOptions = useMemo(() => monthOptions(transactions, today), [transactions, today]);
  const yearSelectOptions = useMemo(() => yearOptions(transactions, today), [transactions, today]);

  const subscriptionExpenses = useMemo(
    () =>
      viewMode === "mensal"
        ? subscriptionExpensesForMonth(subscriptions, year, month)
        : subscriptionExpensesForYear(subscriptions, year),
    [subscriptions, viewMode, year, month],
  );

  const flowTransactions = useMemo(
    () => [...transactions, ...subscriptionExpenses],
    [transactions, subscriptionExpenses],
  );

  const income = useMemo(
    () => sumByType(transactions, year, periodMonth, "income"),
    [transactions, year, periodMonth],
  );
  const expense = useMemo(
    () => sumByType(flowTransactions, year, periodMonth, "expense"),
    [flowTransactions, year, periodMonth],
  );
  const balance = useMemo(() => {
    const net = Math.round((income - expense) * 100) / 100;
    return Object.is(net, -0) ? 0 : net;
  }, [income, expense]);

  const heatmapDays = useMemo(
    () =>
      viewMode === "mensal"
        ? dailyExpenses(flowTransactions, year, month)
        : monthlyExpensesForYear(flowTransactions, year),
    [flowTransactions, viewMode, year, month],
  );

  const categoryTotals = useMemo(
    () => expenseCategories(flowTransactions, year, periodMonth),
    [flowTransactions, year, periodMonth],
  );

  const bubbleData = useMemo<CategoryBubble[]>(
    () =>
      categoryTotals.map((category, index) => ({
        id: category.name,
        name: category.name,
        value: category.value,
        icon: getCategoryIcon(category.name),
        color: categoryColor(category.name, index),
      })),
    [categoryTotals],
  );

  const largestMoves = useMemo(
    () => topMovements(flowTransactions, year, periodMonth, 5),
    [flowTransactions, year, periodMonth],
  );

  const periodLabel =
    viewMode === "mensal" ? formatMonthName(year, month, bcp47) : String(year);

  /** Período legível completo para o contexto da Quantum.IA (ex: "Outubro de 2026"). */
  const periodLabelFull =
    viewMode === "mensal" ? formatMonthYear(year, month, bcp47) : String(year);

  /**
   * Snapshot live do Fluxo de Caixa para a Quantum.IA.
   * Recalcula quando o utilizador muda período, modo ou os dados carregam.
   */
  const iaContextData = useMemo((): Partial<FinancialContextPayload> => {
    return {
      fluxoCaixa: generateCashFlowContext({
        periodoAtual: periodLabelFull,
        modoVisualizacao: viewMode,
        entradas: income,
        saidas: expense,
        saldoLiquido: balance,
        categorias: categoryTotals,
        movimentacoes: largestMoves,
        limit: 5,
      }),
    };
  }, [periodLabelFull, viewMode, income, expense, balance, categoryTotals, largestMoves]);

  useEffect(() => {
    setScreenContext(iaContextData);
    return () => {
      setScreenContext(null);
    };
  }, [iaContextData, setScreenContext]);

  const balanceTone = privacyMode
    ? "text-zinc-100"
    : balance > 0
      ? "text-emerald-400"
      : balance < 0
        ? "text-rose-400"
        : "text-zinc-100";
  const balanceIconTone = privacyMode
    ? "bg-zinc-800 text-zinc-400"
    : balance > 0
      ? "bg-emerald-500/15 text-emerald-400"
      : balance < 0
        ? "bg-rose-500/15 text-rose-400"
        : "bg-zinc-800 text-zinc-400";

  function selectMonth(value: string) {
    const [nextYear, nextMonth] = value.split("-").map(Number);
    if (!Number.isInteger(nextYear) || !Number.isInteger(nextMonth)) return;
    setYear(nextYear);
    setMonth(nextMonth);
  }

  function selectYear(value: string) {
    const nextYear = Number(value);
    if (!Number.isInteger(nextYear)) return;
    setYear(nextYear);
  }

  const selectedMonthValue = monthValue({ year, month });
  const monthChoices = monthSelectOptions.some((option) => monthValue(option) === selectedMonthValue)
    ? monthSelectOptions
    : [{ year, month }, ...monthSelectOptions];

  const yearChoices = yearSelectOptions.includes(year)
    ? yearSelectOptions
    : [year, ...yearSelectOptions].sort((left, right) => right - left);

  return (
    <div className="flex w-full flex-col gap-4 md:gap-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-emerald-950/80 bg-gradient-to-r from-[#041610] to-[#0a241a] p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6 lg:p-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
            {t("cashFlow.title")}
          </h1>
          <p className="mt-2 text-sm text-emerald-100/70 sm:text-base">
            {t("cashFlow.subtitle")}
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
          <div
            role="tablist"
            aria-label={t("cashFlow.viewModeAria")}
            className="relative flex h-11 w-full rounded-full border border-emerald-900/40 bg-[#070C09] p-1 sm:w-auto"
          >
            <span
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-[#10B981] shadow-[0_0_16px_rgba(16,185,129,0.35)] transition-all duration-300 ease-out",
                viewMode === "mensal" ? "left-1" : "left-[calc(50%+0px)]",
              )}
            />
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "mensal"}
              onClick={() => setViewMode("mensal")}
              className={cn(
                "relative z-10 flex-1 rounded-full px-4 text-sm font-semibold transition-colors duration-300 sm:min-w-24",
                viewMode === "mensal" ? "text-[#041610]" : "text-zinc-400 hover:text-zinc-200",
              )}
            >
              {t("cashFlow.viewMonthly")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "anual"}
              onClick={() => setViewMode("anual")}
              className={cn(
                "relative z-10 flex-1 rounded-full px-4 text-sm font-semibold transition-colors duration-300 sm:min-w-24",
                viewMode === "anual" ? "text-[#041610]" : "text-zinc-400 hover:text-zinc-200",
              )}
            >
              {t("cashFlow.viewAnnual")}
            </button>
          </div>

          <div className="flex w-full flex-col gap-1.5 text-xs font-medium text-emerald-100/70 transition-all duration-300 sm:w-auto">
            <span id="cash-flow-period-label">
              {viewMode === "mensal" ? t("cashFlow.month") : t("cashFlow.year")}
            </span>
            {viewMode === "mensal" ? (
              <AppSelect
                value={selectedMonthValue}
                onChange={selectMonth}
                ariaLabelledBy="cash-flow-period-label"
                options={monthChoices.map((option) => ({
                  value: monthValue(option),
                  label: formatMonthYear(option.year, option.month, bcp47),
                }))}
                className="w-full sm:w-auto"
                buttonClassName="flex h-11 w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-lg border border-emerald-800/50 bg-[#041610] px-3 text-left text-sm text-zinc-100 outline-none transition-all duration-300 hover:border-emerald-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-44"
                menuClassName="right-0 w-52 sm:left-0 sm:right-auto"
              />
            ) : (
              <AppSelect
                value={String(year)}
                onChange={selectYear}
                ariaLabelledBy="cash-flow-period-label"
                options={yearChoices.map((optionYear) => ({
                  value: String(optionYear),
                  label: String(optionYear),
                }))}
                className="w-full sm:w-auto"
                buttonClassName="flex h-11 w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-lg border border-emerald-800/50 bg-[#041610] px-3 text-left text-sm text-zinc-100 outline-none transition-all duration-300 hover:border-emerald-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-44"
                menuClassName="right-0 w-36 sm:left-0 sm:right-auto"
              />
            )}
          </div>
        </div>
      </header>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <section
        aria-label={t("cashFlow.summaryAria")}
        aria-busy={loading}
        data-view-mode={viewMode}
        data-period={viewMode === "mensal" ? selectedMonthValue : String(year)}
        className="grid grid-cols-1 gap-4 transition-all duration-300 md:grid-cols-2 md:gap-6 lg:grid-cols-3"
      >
        <article className="rounded-xl border border-zinc-700/50 bg-black p-5 transition-all duration-300">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-zinc-400">{t("cashFlow.income")}</p>
              <p className="text-xs text-zinc-500">{t("cashFlow.incomeDesc")}</p>
            </div>
            <span className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-500">
              <ArrowUp className="size-5" aria-hidden="true" />
            </span>
          </div>
          {loading ? (
            <span className="mt-4 block h-8 w-36 animate-pulse rounded bg-zinc-800" />
          ) : (
            <p className="mt-4 text-xl font-semibold tracking-tight break-words text-emerald-500 sm:text-2xl">
              {formatCurrency(income, currency, privacyMode)}
            </p>
          )}
        </article>

        <article className="rounded-xl border border-zinc-700/50 bg-black p-5 transition-all duration-300">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-zinc-400">{t("cashFlow.expenses")}</p>
              <p className="text-xs text-zinc-500">{t("cashFlow.expensesDesc")}</p>
            </div>
            <span className="flex size-10 items-center justify-center rounded-lg bg-red-500/15 text-red-500">
              <ArrowDown className="size-5" aria-hidden="true" />
            </span>
          </div>
          {loading ? (
            <span className="mt-4 block h-8 w-36 animate-pulse rounded bg-zinc-800" />
          ) : (
            <p className="mt-4 text-xl font-semibold tracking-tight break-words text-red-500 sm:text-2xl">
              {formatCurrency(expense, currency, privacyMode)}
            </p>
          )}
        </article>

        <article className="rounded-xl border border-zinc-700/50 bg-black p-5 transition-all duration-300">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-zinc-400">{t("cashFlow.netBalance")}</p>
            <span className={`flex size-10 items-center justify-center rounded-lg ${balanceIconTone}`}>
              <Scale className="size-5" aria-hidden="true" />
            </span>
          </div>
          {loading ? (
            <span className="mt-4 block h-8 w-36 animate-pulse rounded bg-zinc-800" />
          ) : (
            <p className={`mt-4 text-xl font-semibold tracking-tight break-words sm:text-2xl ${balanceTone}`}>
              {formatSignedCurrency(balance, currency, privacyMode)}
            </p>
          )}
        </article>
      </section>

      <section
        aria-label={t("cashFlow.chartsAria")}
        data-view-mode={viewMode}
        className="grid grid-cols-1 gap-4 transition-all duration-300 md:gap-6 lg:grid-cols-2"
      >
        <SpendingHeatmap
          monthLabel={periodLabel}
          total={expense}
          days={heatmapDays}
          currency={currency}
          privacyMode={privacyMode}
          loading={loading}
        />

        <article
          aria-label={t("cashFlow.expensesByCategory")}
          className="rounded-xl border border-zinc-700/50 bg-black p-5 transition-all duration-300"
        >
          {loading ? (
            <div className="flex flex-col items-center">
              <div className="size-[300px] max-w-full animate-pulse rounded-full bg-zinc-900" />
              <div className="mt-6 h-4 w-44 animate-pulse rounded bg-zinc-900" />
              <div className="mt-3 h-9 w-40 animate-pulse rounded bg-zinc-900" />
            </div>
          ) : bubbleData.length === 0 ? (
            <p className="flex h-64 items-center justify-center text-center text-sm text-zinc-400">
              {viewMode === "mensal" ? t("cashFlow.noExpensesMonth") : t("cashFlow.noExpensesYear")}
            </p>
          ) : (
            <div className="flex flex-col items-center">
              <div className="mx-auto w-full max-w-[300px]">
                <CategoryBubbleChart data={bubbleData} />
              </div>
              <p className="mt-6 text-center text-slate-400">
                {viewMode === "mensal"
                  ? t("cashFlow.expensesInMonth", { month: periodLabel })
                  : t("cashFlow.expensesInYear", { year: periodLabel })}
              </p>
              <p className="mt-2 text-center text-3xl font-bold text-white">
                {formatCurrency(expense, currency, privacyMode)}
              </p>
            </div>
          )}
        </article>
      </section>

      <section aria-label={t("cashFlow.xrayAria")} className="mt-2 transition-all duration-300 md:mt-0">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">{t("cashFlow.xrayTitle")}</h2>
            <p className="mt-1 text-sm text-zinc-500">{t("cashFlow.xraySubtitle", { period: periodLabel })}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-white/5 bg-[#070C09] p-5 transition-all duration-300">
            <h3 className="text-sm font-semibold text-zinc-100">{t("cashFlow.topCategories")}</h3>
            {loading ? (
              <ul className="mt-4 space-y-4" aria-hidden="true">
                {Array.from({ length: 4 }, (_, index) => (
                  <li key={index} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="h-4 w-28 animate-pulse rounded bg-zinc-800" />
                      <span className="h-4 w-16 animate-pulse rounded bg-zinc-800" />
                    </div>
                    <span className="block h-1.5 w-full animate-pulse rounded-full bg-zinc-800" />
                  </li>
                ))}
              </ul>
            ) : categoryTotals.length === 0 ? (
              <p className="mt-6 text-sm text-zinc-500">{t("cashFlow.xrayEmptyCategories")}</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {categoryTotals.slice(0, 6).map((category, index) => {
                  const Icon = getCategoryIcon(category.name);
                  return (
                    <li key={category.name} className="min-w-0">
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-black/40 text-[#10B981]"
                            style={{ color: categoryColor(category.name, index) }}
                          >
                            <Icon className="size-4" aria-hidden="true" />
                          </span>
                          <span className="truncate text-sm font-medium text-zinc-200">{category.name}</span>
                        </div>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-100">
                          {formatCurrency(category.value, currency, privacyMode)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
                        <div
                          className="h-full rounded-full bg-[#10B981] transition-all duration-300"
                          style={{ width: `${Math.min(100, category.percent)}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-zinc-500">
                        {category.percent.toLocaleString(bcp47, {
                          maximumFractionDigits: 1,
                        })}
                        %
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-white/5 bg-[#070C09] p-5 transition-all duration-300">
            <h3 className="text-sm font-semibold text-zinc-100">{t("cashFlow.topMovements")}</h3>
            {loading ? (
              <ul className="mt-4 space-y-3" aria-hidden="true">
                {Array.from({ length: 5 }, (_, index) => (
                  <li key={index} className="flex items-center justify-between gap-3 py-2">
                    <div className="space-y-2">
                      <span className="block h-4 w-36 animate-pulse rounded bg-zinc-800" />
                      <span className="block h-3 w-20 animate-pulse rounded bg-zinc-800" />
                    </div>
                    <span className="h-4 w-16 animate-pulse rounded bg-zinc-800" />
                  </li>
                ))}
              </ul>
            ) : largestMoves.length === 0 ? (
              <p className="mt-6 text-sm text-zinc-500">{t("cashFlow.xrayEmptyMovements")}</p>
            ) : (
              <ul className="mt-3 divide-y divide-white/5">
                {largestMoves.map((move, index) => {
                  const isIncome = move.type === "income";
                  return (
                    <li
                      key={move.id ?? `${move.date}-${move.description}-${index}`}
                      className="flex items-center justify-between gap-3 py-3 first:pt-1 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-100">
                          {move.description || move.category || "—"}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {formatShortDate(move.date, bcp47)}
                          {move.category ? ` · ${move.category}` : null}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 text-sm font-semibold tabular-nums",
                          isIncome ? "text-[#10B981]" : "text-red-500",
                        )}
                      >
                        {isIncome ? "+" : "−"}
                        {formatCurrency(Math.abs(move.amount), currency, privacyMode)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
