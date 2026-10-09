import type { Allocation, DashboardKpis } from "@/types/dashboard";

const allocationFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
});

const allocationStroke: Record<string, string> = {
  "bg-emerald-500": "#10b981",
  "bg-emerald-300": "#6ee7b7",
  "bg-gray-400": "#9ca3af",
};

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
  allocations,
  formatCurrency,
}: {
  kpis: DashboardKpis;
  allocations: Allocation[];
  formatCurrency: (value: number) => string;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <article className="flex h-full flex-col rounded-xl border border-zinc-700/50 bg-black p-4">
        <p className="text-xs font-medium text-zinc-400">Total Wealth</p>
        <div className="mt-4 flex items-end justify-between gap-3">
          <p className="text-2xl font-semibold tracking-tight text-zinc-100">
            {formatCurrency(kpis.totalWealth)}
          </p>
          <span
            className={`rounded-full px-2 py-1 text-xs font-semibold ${growthBadgeTone(kpis.wealthGrowth)}`}
          >
            {kpis.wealthGrowth}
          </span>
        </div>
      </article>

      <article className="flex h-full flex-col rounded-xl border border-zinc-700/50 bg-black p-4">
        <p className="text-xs font-medium text-zinc-400">Monthly Cash Flow</p>
        <p className={`mt-4 text-3xl font-semibold tracking-tight ${valueTone(kpis.monthlyCashFlow)}`}>
          +{formatCurrency(kpis.monthlyCashFlow)}
        </p>
      </article>

      <article className="flex h-full flex-col rounded-xl border border-zinc-700/50 bg-black p-4">
        <p className="text-xs font-medium text-zinc-400">Investment Allocation</p>
        <div className="mt-4 flex flex-1 items-center gap-3">
          <AllocationDonut allocations={allocations} />
          <ul className="flex flex-col justify-center gap-1.5">
            {allocations.map((item) => (
              <li key={item.id} className="flex items-center gap-1.5 text-xs">
                <span className={`size-2 shrink-0 rounded-full ${item.color}`} />
                <span className="text-zinc-100">{item.label}</span>
                <span className="text-zinc-400">{allocationFormatter.format(item.percentage)}%</span>
              </li>
            ))}
          </ul>
        </div>
      </article>
    </div>
  );
}

function AllocationDonut({ allocations }: { allocations: Allocation[] }) {
  const size = 52;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = allocations.reduce((sum, item) => sum + item.percentage, 0);
  let consumed = 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="-rotate-90"
      aria-hidden="true"
    >
      {total > 0
        ? allocations.map((segment) => {
            const length = circumference * (segment.percentage / total);
            const dashOffset = -consumed;
            consumed += length;

            return (
              <circle
                key={segment.id}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={allocationStroke[segment.color] ?? "#71717a"}
                strokeWidth={stroke}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={dashOffset}
              />
            );
          })
        : null}
    </svg>
  );
}
