"use client";

import { useSession } from "@/components/require-session";
import { getAllTransactions, type TransactionDocument } from "@/lib/appwrite/database";
import {
  expenseCategories,
  monthOptions,
  monthValue,
  sixMonthSeries,
  sumByType,
  type CashTransaction,
} from "@/lib/cash-flow";
import { ArrowDown, ArrowUp, Scale } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const axisFormatter = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
});

const CATEGORY_COLORS: Record<string, string> = {
  Moradia: "#10b981",
  Alimentação: "#3b82f6",
  Lazer: "#a855f7",
  Transporte: "#f97316",
  Assinaturas: "#ef4444",
  Saúde: "#14b8a6",
  Salário: "#eab308",
  Outros: "#71717a",
};

const EXTRA_COLORS = ["#22d3ee", "#f472b6", "#818cf8", "#84cc16", "#fb923c"];

const tooltipStyle = {
  backgroundColor: "#18181b",
  border: "1px solid #27272a",
  borderRadius: 8,
  fontSize: 12,
};

function toCashTransaction(document: TransactionDocument): CashTransaction {
  return {
    type: document.type === "income" ? "income" : "expense",
    category: document.category ?? "",
    date: document.date,
    amount: Number(document.amount),
  };
}

function formatMonthYear(year: number, month: number) {
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month, 1));

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatSignedCurrency(value: number) {
  const formatted = currencyFormatter.format(Math.abs(value));
  if (value > 0) return `+ ${formatted}`;
  if (value < 0) return `- ${formatted}`;
  return formatted;
}

function categoryColor(name: string, index: number) {
  return CATEGORY_COLORS[name] ?? EXTRA_COLORS[index % EXTRA_COLORS.length];
}

export default function CashFlowPage() {
  const { user } = useSession();
  const [today] = useState(() => new Date());
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadTransactions() {
      setLoading(true);
      setError(null);

      try {
        const documents = await getAllTransactions(user.$id);
        if (!active) return;
        setTransactions(documents.map(toCashTransaction));
      } catch (caught) {
        console.error("Falha ao carregar o fluxo de caixa.", caught);
        if (!active) return;
        setTransactions([]);
        setError("Não foi possível carregar as transações.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadTransactions();

    return () => {
      active = false;
    };
  }, [user.$id]);

  const options = useMemo(() => monthOptions(transactions, today), [transactions, today]);

  const income = useMemo(
    () => sumByType(transactions, year, month, "income"),
    [transactions, year, month],
  );
  const expense = useMemo(
    () => sumByType(transactions, year, month, "expense"),
    [transactions, year, month],
  );
  const balance = useMemo(() => {
    const net = Math.round((income - expense) * 100) / 100;
    return Object.is(net, -0) ? 0 : net;
  }, [income, expense]);

  const barData = useMemo(
    () => sixMonthSeries(transactions, year, month),
    [transactions, year, month],
  );
  const pieData = useMemo(
    () =>
      expenseCategories(transactions, year, month).map((category, index) => ({
        ...category,
        color: categoryColor(category.name, index),
      })),
    [transactions, year, month],
  );

  const balanceTone =
    balance > 0 ? "text-emerald-400" : balance < 0 ? "text-rose-400" : "text-zinc-100";
  const balanceIconTone =
    balance > 0
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
    <div className="flex w-full flex-col gap-6 px-6 py-8">
      <header className="flex flex-col gap-6 rounded-2xl border border-emerald-950/80 bg-gradient-to-r from-[#041610] to-[#0a241a] p-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
            Fluxo de Caixa
          </h1>
          <p className="mt-2 text-sm text-emerald-100/70 sm:text-base">
            Análise de receitas, despesas e saldo do mês
          </p>
        </div>
        <label className="flex shrink-0 flex-col gap-1.5 text-xs font-medium text-emerald-100/70">
          Mês
          <select
            value={selectedValue}
            onChange={(event) => selectMonth(event.target.value)}
            aria-label="Selecionar mês e ano"
            className="h-11 min-w-44 rounded-lg border border-emerald-800/50 bg-[#041610] px-3 text-sm text-zinc-100 outline-none transition-colors duration-200 [color-scheme:dark] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          >
            {monthChoices.map((option) => (
              <option key={monthValue(option)} value={monthValue(option)}>
                {formatMonthYear(option.year, option.month)}
              </option>
            ))}
          </select>
        </label>
      </header>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <section aria-label="Resumo mensal" aria-busy={loading} className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <article className="rounded-xl border border-zinc-700/50 bg-black p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-zinc-400">Entradas</p>
              <p className="text-xs text-zinc-500">Receitas</p>
            </div>
            <span className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-500">
              <ArrowUp className="size-5" aria-hidden="true" />
            </span>
          </div>
          {loading ? (
            <span className="mt-4 block h-8 w-36 animate-pulse rounded bg-zinc-800" />
          ) : (
            <p className="mt-4 text-2xl font-semibold tracking-tight text-emerald-500">
              {currencyFormatter.format(income)}
            </p>
          )}
        </article>

        <article className="rounded-xl border border-zinc-700/50 bg-black p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-zinc-400">Saídas</p>
              <p className="text-xs text-zinc-500">Despesas</p>
            </div>
            <span className="flex size-10 items-center justify-center rounded-lg bg-red-500/15 text-red-500">
              <ArrowDown className="size-5" aria-hidden="true" />
            </span>
          </div>
          {loading ? (
            <span className="mt-4 block h-8 w-36 animate-pulse rounded bg-zinc-800" />
          ) : (
            <p className="mt-4 text-2xl font-semibold tracking-tight text-red-500">
              {currencyFormatter.format(expense)}
            </p>
          )}
        </article>

        <article className="rounded-xl border border-zinc-700/50 bg-black p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-zinc-400">Saldo Líquido</p>
            <span className={`flex size-10 items-center justify-center rounded-lg ${balanceIconTone}`}>
              <Scale className="size-5" aria-hidden="true" />
            </span>
          </div>
          {loading ? (
            <span className="mt-4 block h-8 w-36 animate-pulse rounded bg-zinc-800" />
          ) : (
            <p className={`mt-4 text-2xl font-semibold tracking-tight ${balanceTone}`}>
              {formatSignedCurrency(balance)}
            </p>
          )}
        </article>
      </section>

      <section aria-label="Análise gráfica" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <article className="rounded-xl border border-zinc-700/50 bg-black p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-zinc-100">
              Entradas vs Saídas (Últimos 6 meses)
            </h2>
            <ul className="flex items-center gap-4 text-xs text-zinc-400">
              <li className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-emerald-500" aria-hidden="true" />
                Entrada
              </li>
              <li className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-red-500" aria-hidden="true" />
                Saída
              </li>
            </ul>
          </div>
          {loading ? (
            <div className="mt-4 h-72 animate-pulse rounded-lg bg-zinc-900" />
          ) : (
            <div className="mt-4 h-72" role="img" aria-label="Gráfico de barras de entradas e saídas dos últimos meses">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={4}>
                  <CartesianGrid vertical={false} stroke="#27272a" />
                  <XAxis
                    dataKey="mes"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#a1a1aa", fontSize: 12 }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#a1a1aa", fontSize: 12 }}
                    width={48}
                    tickFormatter={(value: number) => axisFormatter.format(value)}
                  />
                  <Tooltip
                    cursor={{ fill: "#27272a" }}
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: "#a1a1aa" }}
                    formatter={(value, name) => [
                      currencyFormatter.format(Number(value)),
                      String(name),
                    ]}
                  />
                  <Bar dataKey="Entrada" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="Saída" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        <article className="rounded-xl border border-zinc-700/50 bg-black p-5">
          <h2 className="text-base font-semibold text-zinc-100">
            Despesas por Categoria (Neste mês)
          </h2>
          {loading ? (
            <div className="mt-4 h-64 animate-pulse rounded-lg bg-zinc-900" />
          ) : pieData.length === 0 ? (
            <p className="mt-4 flex h-64 items-center justify-center text-center text-sm text-zinc-400">
              Nenhuma despesa registrada neste mês
            </p>
          ) : (
            <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row">
              <div
                className="h-64 w-full sm:w-1/2"
                role="img"
                aria-label="Gráfico de pizza das despesas por categoria neste mês"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={3}
                      stroke="#18181b"
                    >
                      {pieData.map((slice) => (
                        <Cell key={slice.name} fill={slice.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      itemStyle={{ color: "#f4f4f5" }}
                      formatter={(value, name) => [currencyFormatter.format(Number(value)), String(name)]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex w-full flex-col gap-3 sm:w-1/2">
                {pieData.map((slice) => (
                  <li key={slice.name} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: slice.color }}
                        aria-hidden="true"
                      />
                      <span className="truncate text-zinc-200">{slice.name}</span>
                    </span>
                    <span className="shrink-0 font-medium text-zinc-400">
                      {percentFormatter.format(slice.percent)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
