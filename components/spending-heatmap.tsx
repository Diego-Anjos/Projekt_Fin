import type { DailyExpense } from "@/lib/cash-flow";
import { formatCurrency } from "@/lib/utils";

export function getHeatmapColor(amount: number, maxAmount: number) {
  if (amount === 0) return "bg-white/5";
  if (amount < maxAmount * 0.33) return "bg-emerald-900";
  if (amount < maxAmount * 0.66) return "bg-emerald-600";
  return "bg-[#a3e635] shadow-[0_0_10px_rgba(163,230,53,0.5)]";
}

type SpendingHeatmapProps = {
  monthLabel: string;
  total: number;
  days: DailyExpense[];
  currency: string;
  privacyMode: boolean;
  loading: boolean;
};

export function SpendingHeatmap({
  monthLabel,
  total,
  days,
  currency,
  privacyMode,
  loading,
}: SpendingHeatmapProps) {
  const maxDailySpend = days.reduce((max, day) => Math.max(max, day.amount), 0);

  return (
    <article className="rounded-xl border border-zinc-700/50 bg-[#0a0f0d] p-5">
      <h2 className="text-xs text-slate-400">Gastos em {monthLabel}</h2>
      {loading ? (
        <>
          <span className="mt-3 block h-8 w-40 animate-pulse rounded bg-white/5" />
          <div className="mt-4 flex flex-wrap gap-1.5" aria-hidden="true">
            {Array.from({ length: 31 }, (_, index) => (
              <span key={index} className="h-5 w-5 animate-pulse rounded-sm bg-white/5" />
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 text-2xl font-bold text-white">
            {formatCurrency(total, currency, privacyMode)}
          </p>
          <div
            className="mt-4 flex flex-wrap gap-1.5"
            role="img"
            aria-label={`Mapa de calor dos gastos diários em ${monthLabel}`}
          >
            {days.map((day) => (
              <div
                key={day.day}
                className={`h-5 w-5 rounded-sm transition-colors ${getHeatmapColor(day.amount, maxDailySpend)}`}
                title={`Dia ${day.day}: ${formatCurrency(day.amount, currency, privacyMode)}`}
                aria-label={`Dia ${day.day}: ${formatCurrency(day.amount, currency, privacyMode)}`}
              />
            ))}
          </div>
        </>
      )}
    </article>
  );
}
