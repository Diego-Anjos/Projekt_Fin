import type { PortfolioKPIs as PortfolioKpiData } from "@/types/dashboard";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const signedCurrencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  signDisplay: "exceptZero",
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

const allocationFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
});

function valueTone(value: number) {
  if (value > 0) return "text-emerald-500";
  if (value < 0) return "text-red-500";
  return "text-zinc-400";
}

function valueBadgeTone(value: number) {
  if (value > 0) return "bg-emerald-500/15 text-emerald-500";
  if (value < 0) return "bg-red-500/15 text-red-500";
  return "bg-zinc-500/15 text-zinc-400";
}

export function PortfolioKPIs({
  totalWealth,
  wealthChangePercent,
  monthlyCashFlow,
  allocation,
}: PortfolioKpiData) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <article className="flex h-full flex-col rounded-xl border border-zinc-700/50 bg-black p-4">
        <p className="text-xs font-medium text-zinc-400">Total Wealth</p>
        <div className="mt-4 flex items-end justify-between gap-3">
          <p className="text-2xl font-semibold tracking-tight text-zinc-100">
            {currencyFormatter.format(totalWealth)}
          </p>
          <span
            className={`rounded-full px-2 py-1 text-xs font-semibold ${valueBadgeTone(wealthChangePercent)}`}
          >
            {percentFormatter.format(wealthChangePercent)}%
          </span>
        </div>
      </article>

      <article className="flex h-full flex-col rounded-xl border border-zinc-700/50 bg-black p-4">
        <p className="text-xs font-medium text-zinc-400">Monthly Cash Flow</p>
        <p className={`mt-4 text-3xl font-semibold tracking-tight ${valueTone(monthlyCashFlow)}`}>
          {signedCurrencyFormatter.format(monthlyCashFlow)}
        </p>
      </article>

      <article className="flex h-full flex-col rounded-xl border border-zinc-700/50 bg-black p-4">
        <p className="text-xs font-medium text-zinc-400">Investment Allocation</p>
        <div className="mt-4 flex flex-1 items-center gap-3">
          <AllocationDonut allocation={allocation} />
          <ul className="flex flex-col justify-center gap-1.5">
            {allocation.map((item) => (
              <li key={item.type} className="flex items-center gap-1.5 text-xs">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-zinc-100">{item.type}</span>
                <span className="text-zinc-400">{allocationFormatter.format(item.percentage)}%</span>
              </li>
            ))}
          </ul>
        </div>
      </article>
    </div>
  );
}

function AllocationDonut({ allocation }: { allocation: PortfolioKpiData["allocation"] }) {
  const size = 52;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = allocation.reduce((sum, item) => sum + item.percentage, 0);
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
        ? allocation.map((segment) => {
            const length = circumference * (segment.percentage / total);
            const dashOffset = -consumed;
            consumed += length;

            return (
              <circle
                key={segment.type}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={segment.color}
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
