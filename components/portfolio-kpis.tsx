"use client";

import { usePreferences } from "@/contexts/preferences-context";
import type { DashboardKpis } from "@/types/dashboard";

function valueTone(value: number) {
  if (value > 0) return "text-emerald-500";
  if (value < 0) return "text-red-500";
  return "text-zinc-400";
}

function growthBadgeTone(growth: string) {
  if (growth.trim().startsWith("-")) return "bg-red-500/15 text-red-500";
  if (growth.trim().startsWith("+")) return "bg-emerald-500/15 text-emerald-500";
  return "bg-zinc-500/15 text-zinc-400";
}

export function PortfolioKPIs({
  kpis,
  formatCurrency,
}: {
  kpis: DashboardKpis;
  formatCurrency: (value: number) => string;
}) {
  const { privacyMode } = usePreferences();

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <article className="flex h-full flex-col rounded-xl border border-zinc-700/50 bg-black p-4">
        <p className="text-xs font-medium text-zinc-400">Total Wealth</p>
        <div className="mt-4 flex items-end justify-between gap-3">
          <p className="text-2xl font-semibold tracking-tight text-zinc-100">
            {formatCurrency(kpis.totalWealth)}
          </p>
          <span
            className={`rounded-full px-2 py-1 text-xs font-semibold ${
              privacyMode ? "bg-zinc-500/15 text-zinc-400" : growthBadgeTone(kpis.wealthGrowth)
            }`}
          >
            {privacyMode ? "••••" : kpis.wealthGrowth}
          </span>
        </div>
      </article>

      <article className="flex h-full flex-col rounded-xl border border-zinc-700/50 bg-black p-4">
        <p className="text-xs font-medium text-zinc-400">Monthly Cash Flow</p>
        <p
          className={`mt-4 text-3xl font-semibold tracking-tight ${
            privacyMode ? "text-zinc-100" : valueTone(kpis.monthlyCashFlow)
          }`}
        >
          {privacyMode ? "" : "+"}
          {formatCurrency(kpis.monthlyCashFlow)}
        </p>
      </article>

      <article className="flex h-full flex-col rounded-xl border border-zinc-700/50 bg-black p-4">
        <p className="text-xs font-medium text-zinc-400">Gastos do Mês Atual</p>
        <p
          className={`mt-4 text-3xl font-semibold tracking-tight ${
            privacyMode ? "text-zinc-100" : "text-red-500"
          }`}
        >
          {formatCurrency(kpis.monthlyExpenses)}
        </p>
      </article>
    </div>
  );
}
