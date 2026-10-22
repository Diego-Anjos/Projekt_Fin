"use client";

import { SpendingHeatmap } from "@/components/spending-heatmap";
import { AppSelect } from "@/components/ui/app-select";
import { CategoryBubbleChart, type CategoryBubble } from "@/components/ui/category-bubble-chart";
import { useSession } from "@/components/require-session";
import { usePreferences } from "@/contexts/preferences-context";
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
  subscriptionExpensesForMonth,
  sumByType,
  type CashTransaction,
} from "@/lib/cash-flow";
import { getCategoryIcon, normalizeCategoryName } from "@/lib/category-utils";
import { useTranslation } from "@/hooks/use-translation";
import { localeToBcp47 } from "@/locales/dictionaries";
import { formatCurrency } from "@/lib/utils";
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
    type: document.type === "income" ? "income" : "expense",
    category: document.category ?? "",
    date: document.date,
    amount: Number(document.amount),
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
  const bcp47 = localeToBcp47[locale];
  const [today] = useState(() => new Date());
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

  const options = useMemo(() => monthOptions(transactions, today), [transactions, today]);

  const subscriptionExpenses = useMemo(
    () => subscriptionExpensesForMonth(subscriptions, year, month),
    [subscriptions, year, month],
  );

  const flowTransactions = useMemo(
    () => [...transactions, ...subscriptionExpenses],
    [transactions, subscriptionExpenses],
  );

  const income = useMemo(
    () => sumByType(transactions, year, month, "income"),
    [transactions, year, month],
  );
  const expense = useMemo(
    () => sumByType(flowTransactions, year, month, "expense"),
    [flowTransactions, year, month],
  );
  const balance = useMemo(() => {
    const net = Math.round((income - expense) * 100) / 100;
    return Object.is(net, -0) ? 0 : net;
  }, [income, expense]);

  const heatmapDays = useMemo(
    () => dailyExpenses(flowTransactions, year, month),
    [flowTransactions, year, month],
  );
  const bubbleData = useMemo<CategoryBubble[]>(
    () =>
      expenseCategories(flowTransactions, year, month).map((category, index) => ({
        id: category.name,
        name: category.name,
        value: category.value,
        icon: getCategoryIcon(category.name),
        color: categoryColor(category.name, index),
      })),
    [flowTransactions, year, month],
  );

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

  const selectedValue = monthValue({ year, month });
  const monthChoices = options.some((option) => monthValue(option) === selectedValue)
    ? options
    : [{ year, month }, ...options];

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
        <div className="flex shrink-0 flex-col gap-1.5 text-xs font-medium text-emerald-100/70">
          <span id="cash-flow-month-label">{t("cashFlow.month")}</span>
          <AppSelect
            value={selectedValue}
            onChange={selectMonth}
            ariaLabelledBy="cash-flow-month-label"
            options={monthChoices.map((option) => ({
              value: monthValue(option),
              label: formatMonthYear(option.year, option.month, bcp47),
            }))}
            className="w-full sm:w-auto"
            buttonClassName="flex h-11 w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-lg border border-emerald-800/50 bg-[#041610] px-3 text-left text-sm text-zinc-100 outline-none transition-colors duration-200 hover:border-emerald-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-44"
            menuClassName="right-0 w-52 sm:left-0 sm:right-auto"
          />
        </div>
      </header>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <section aria-label={t("cashFlow.summaryAria")} aria-busy={loading} className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
        <article className="rounded-xl border border-zinc-700/50 bg-black p-5">
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

        <article className="rounded-xl border border-zinc-700/50 bg-black p-5">
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

        <article className="rounded-xl border border-zinc-700/50 bg-black p-5">
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

      <section aria-label={t("cashFlow.chartsAria")} className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
        <SpendingHeatmap
          monthLabel={formatMonthName(year, month, bcp47)}
          total={expense}
          days={heatmapDays}
          currency={currency}
          privacyMode={privacyMode}
          loading={loading}
        />

        <article aria-label={t("cashFlow.expensesByCategory")} className="rounded-xl border border-zinc-700/50 bg-black p-5">
          {loading ? (
            <div className="flex flex-col items-center">
              <div className="size-[300px] max-w-full animate-pulse rounded-full bg-zinc-900" />
              <div className="mt-6 h-4 w-44 animate-pulse rounded bg-zinc-900" />
              <div className="mt-3 h-9 w-40 animate-pulse rounded bg-zinc-900" />
            </div>
          ) : bubbleData.length === 0 ? (
            <p className="flex h-64 items-center justify-center text-center text-sm text-zinc-400">
              {t("cashFlow.noExpensesMonth")}
            </p>
          ) : (
            <div className="flex flex-col items-center">
              <div className="mx-auto w-full max-w-[300px]">
                <CategoryBubbleChart data={bubbleData} />
              </div>
              <p className="mt-6 text-center text-slate-400">
                {t("cashFlow.expensesInMonth", { month: formatMonthName(year, month, bcp47) })}
              </p>
              <p className="mt-2 text-center text-3xl font-bold text-white">
                {formatCurrency(expense, currency, privacyMode)}
              </p>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
