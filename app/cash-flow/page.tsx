"use client";

import { ArrowDown, ArrowUp, Scale } from "lucide-react";
import { useMemo, useState } from "react";
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

type CategoryExpense = {
  name: string;
  value: number;
  color: string;
};

type MonthSnapshot = {
  key: string;
  income: number;
  expense: number;
  categories: CategoryExpense[];
};

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

const CATEGORY_COLORS = {
  Moradia: "#10b981",
  Alimentação: "#3b82f6",
  Lazer: "#a855f7",
  Transporte: "#f97316",
  Assinaturas: "#ef4444",
} as const;

const months: MonthSnapshot[] = [
  {
    key: "2026-04",
    income: 6900,
    expense: 7500,
    categories: [
      { name: "Moradia", value: 2250, color: CATEGORY_COLORS.Moradia },
      { name: "Alimentação", value: 1875, color: CATEGORY_COLORS.Alimentação },
      { name: "Lazer", value: 1500, color: CATEGORY_COLORS.Lazer },
      { name: "Transporte", value: 1125, color: CATEGORY_COLORS.Transporte },
      { name: "Assinaturas", value: 750, color: CATEGORY_COLORS.Assinaturas },
    ],
  },
  {
    key: "2026-05",
    income: 7400,
    expense: 6800,
    categories: [
      { name: "Moradia", value: 2176, color: CATEGORY_COLORS.Moradia },
      { name: "Alimentação", value: 1496, color: CATEGORY_COLORS.Alimentação },
      { name: "Lazer", value: 1224, color: CATEGORY_COLORS.Lazer },
      { name: "Transporte", value: 1088, color: CATEGORY_COLORS.Transporte },
      { name: "Assinaturas", value: 816, color: CATEGORY_COLORS.Assinaturas },
    ],
  },
  {
    key: "2026-06",
    income: 7800,
    expense: 5400,
    categories: [
      { name: "Moradia", value: 1890, color: CATEGORY_COLORS.Moradia },
      { name: "Alimentação", value: 1350, color: CATEGORY_COLORS.Alimentação },
      { name: "Lazer", value: 810, color: CATEGORY_COLORS.Lazer },
      { name: "Transporte", value: 756, color: CATEGORY_COLORS.Transporte },
      { name: "Assinaturas", value: 594, color: CATEGORY_COLORS.Assinaturas },
    ],
  },
  {
    key: "2026-07",
    income: 8100,
    expense: 6900,
    categories: [
      { name: "Moradia", value: 2070, color: CATEGORY_COLORS.Moradia },
      { name: "Alimentação", value: 1725, color: CATEGORY_COLORS.Alimentação },
      { name: "Lazer", value: 1380, color: CATEGORY_COLORS.Lazer },
      { name: "Transporte", value: 1035, color: CATEGORY_COLORS.Transporte },
      { name: "Assinaturas", value: 690, color: CATEGORY_COLORS.Assinaturas },
    ],
  },
  {
    key: "2026-08",
    income: 7600,
    expense: 5800,
    categories: [
      { name: "Moradia", value: 1856, color: CATEGORY_COLORS.Moradia },
      { name: "Alimentação", value: 1392, color: CATEGORY_COLORS.Alimentação },
      { name: "Lazer", value: 1044, color: CATEGORY_COLORS.Lazer },
      { name: "Transporte", value: 870, color: CATEGORY_COLORS.Transporte },
      { name: "Assinaturas", value: 638, color: CATEGORY_COLORS.Assinaturas },
    ],
  },
  {
    key: "2026-09",
    income: 8300,
    expense: 6400,
    categories: [
      { name: "Moradia", value: 1920, color: CATEGORY_COLORS.Moradia },
      { name: "Alimentação", value: 1600, color: CATEGORY_COLORS.Alimentação },
      { name: "Lazer", value: 1280, color: CATEGORY_COLORS.Lazer },
      { name: "Transporte", value: 960, color: CATEGORY_COLORS.Transporte },
      { name: "Assinaturas", value: 640, color: CATEGORY_COLORS.Assinaturas },
    ],
  },
  {
    key: "2026-10",
    income: 8500,
    expense: 6200,
    categories: [
      { name: "Moradia", value: 1860, color: CATEGORY_COLORS.Moradia },
      { name: "Alimentação", value: 1550, color: CATEGORY_COLORS.Alimentação },
      { name: "Lazer", value: 1240, color: CATEGORY_COLORS.Lazer },
      { name: "Transporte", value: 930, color: CATEGORY_COLORS.Transporte },
      { name: "Assinaturas", value: 620, color: CATEGORY_COLORS.Assinaturas },
    ],
  },
];

const tooltipStyle = {
  backgroundColor: "#18181b",
  border: "1px solid #27272a",
  borderRadius: 8,
  fontSize: 12,
};

function formatMonthYear(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatShortMonth(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const label = new Intl.DateTimeFormat("pt-BR", { month: "short" })
    .format(new Date(year, month - 1, 1))
    .replace(".", "");

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatSignedCurrency(value: number) {
  const formatted = currencyFormatter.format(Math.abs(value));
  if (value > 0) return `+ ${formatted}`;
  if (value < 0) return `- ${formatted}`;
  return formatted;
}

export default function CashFlowPage() {
  const [selectedMonth, setSelectedMonth] = useState("2026-10");

  const selectedIndex = Math.max(
    0,
    months.findIndex((month) => month.key === selectedMonth),
  );
  const selected = months[selectedIndex];
  const balance = selected.income - selected.expense;
  const balanceTone = balance >= 0 ? "text-emerald-500" : "text-red-500";
  const balanceIconTone =
    balance >= 0 ? "bg-emerald-500/15 text-emerald-500" : "bg-red-500/15 text-red-500";

  const barData = useMemo(
    () =>
      months.slice(Math.max(0, selectedIndex - 5), selectedIndex + 1).map((month) => ({
        month: formatShortMonth(month.key),
        entrada: month.income,
        saida: month.expense,
      })),
    [selectedIndex],
  );

  const pieData = useMemo(
    () =>
      selected.categories.map((category) => ({
        ...category,
        percent: selected.expense > 0 ? (category.value / selected.expense) * 100 : 0,
      })),
    [selected],
  );

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
            value={selected.key}
            onChange={(event) => setSelectedMonth(event.target.value)}
            aria-label="Selecionar mês e ano"
            className="h-11 min-w-44 rounded-lg border border-emerald-800/50 bg-[#041610] px-3 text-sm text-zinc-100 outline-none transition-colors duration-200 [color-scheme:dark] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          >
            {months.map((month) => (
              <option key={month.key} value={month.key}>
                {formatMonthYear(month.key)}
              </option>
            ))}
          </select>
        </label>
      </header>

      <section aria-label="Resumo mensal" className="grid grid-cols-1 gap-6 md:grid-cols-3">
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
          <p className="mt-4 text-2xl font-semibold tracking-tight text-emerald-500">
            {currencyFormatter.format(selected.income)}
          </p>
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
          <p className="mt-4 text-2xl font-semibold tracking-tight text-red-500">
            {currencyFormatter.format(selected.expense)}
          </p>
        </article>

        <article className="rounded-xl border border-zinc-700/50 bg-black p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-zinc-400">Saldo Líquido</p>
            <span
              className={`flex size-10 items-center justify-center rounded-lg ${balanceIconTone}`}
            >
              <Scale className="size-5" aria-hidden="true" />
            </span>
          </div>
          <p className={`mt-4 text-2xl font-semibold tracking-tight ${balanceTone}`}>
            {formatSignedCurrency(balance)}
          </p>
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
          <div className="mt-4 h-72" role="img" aria-label="Gráfico de barras de entradas e saídas dos últimos meses">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={4}>
                <CartesianGrid vertical={false} stroke="#27272a" />
                <XAxis
                  dataKey="month"
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
                    name === "entrada" ? "Entrada" : "Saída",
                  ]}
                />
                <Bar dataKey="entrada" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="saida" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-xl border border-zinc-700/50 bg-black p-5">
          <h2 className="text-base font-semibold text-zinc-100">
            Despesas por Categoria (Neste mês)
          </h2>
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
        </article>
      </section>
    </div>
  );
}
