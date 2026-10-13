import type { MonthlyComparisonPoint } from "@/types/dashboard";

const monthLabels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export type CashflowEntry = {
  type: "income" | "expense";
  date: string;
  amount: number;
};

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function readMonth(dateValue: string) {
  const match = /^(\d{4})-(\d{2})/.exec(dateValue);
  if (match) {
    return { year: Number(match[1]), month: Number(match[2]) - 1 };
  }

  const parsed = new Date(dateValue);
  return { year: parsed.getFullYear(), month: parsed.getMonth() };
}

export function buildMonthlyComparison(
  entries: CashflowEntry[],
  monthCount = 6,
  now = new Date(),
): MonthlyComparisonPoint[] {
  const buckets = new Map<string, { gastos: number; receitas: number }>();
  const months: { key: string; mes: string }[] = [];

  for (let offset = monthCount - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    buckets.set(key, { gastos: 0, receitas: 0 });
    months.push({ key, mes: monthLabels[date.getMonth()] });
  }

  for (const entry of entries) {
    const { year, month } = readMonth(entry.date);
    const bucket = buckets.get(`${year}-${month}`);
    if (!bucket) continue;

    const amount = Number(entry.amount);
    if (!Number.isFinite(amount)) continue;

    if (entry.type === "expense") bucket.gastos += amount;
    if (entry.type === "income") bucket.receitas += amount;
  }

  return months.map(({ key, mes }) => {
    const bucket = buckets.get(key) ?? { gastos: 0, receitas: 0 };
    return {
      mes,
      gastos: roundCurrency(bucket.gastos),
      economia: roundCurrency(bucket.receitas - bucket.gastos),
    };
  });
}
