export type CashTransaction = {
  type: "income" | "expense";
  category: string;
  date: string;
  amount: number;
};

export type MonthPoint = {
  year: number;
  month: number;
};

export type CashFlowBar = {
  mes: string;
  Entrada: number;
  Saída: number;
};

export type CategoryTotal = {
  name: string;
  value: number;
  percent: number;
};

export type DailyExpense = {
  day: number;
  amount: number;
};

const shortMonths = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export function readMonth(dateValue: string): MonthPoint | null {
  const match = /^(\d{4})-(\d{2})/.exec(dateValue);
  if (match) {
    const month = Number(match[2]) - 1;
    if (month >= 0 && month <= 11) {
      return { year: Number(match[1]), month };
    }
  }

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return null;
  return { year: parsed.getFullYear(), month: parsed.getMonth() };
}

export function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function readCalendarDay(dateValue: string): (MonthPoint & { day: number }) | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateValue);
  if (!match) return null;

  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;

  return { year: Number(match[1]), month, day };
}

export function addMonths(year: number, month: number, delta: number): MonthPoint {
  const date = new Date(year, month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

export function compareMonths(left: MonthPoint, right: MonthPoint) {
  return left.year - right.year || left.month - right.month;
}

export function monthValue(point: MonthPoint) {
  return `${point.year}-${point.month}`;
}

function finiteAmount(value: number) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

export function sumByType(
  transactions: CashTransaction[],
  year: number,
  month: number,
  type: CashTransaction["type"],
) {
  let total = 0;

  for (const transaction of transactions) {
    if (transaction.type !== type) continue;
    const point = readMonth(transaction.date);
    if (!point || point.year !== year || point.month !== month) continue;
    total += finiteAmount(transaction.amount);
  }

  return roundCurrency(total);
}

export function expenseCategories(
  transactions: CashTransaction[],
  year: number,
  month: number,
): CategoryTotal[] {
  const totals = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.type !== "expense") continue;
    const point = readMonth(transaction.date);
    if (!point || point.year !== year || point.month !== month) continue;

    const amount = finiteAmount(transaction.amount);
    if (amount === 0) continue;

    const name = transaction.category.trim() || "Sem categoria";
    totals.set(name, (totals.get(name) ?? 0) + amount);
  }

  const entries = [...totals.entries()]
    .map(([name, value]) => ({ name, value: roundCurrency(value) }))
    .sort((left, right) => right.value - left.value || left.name.localeCompare(right.name, "pt-BR"));

  const total = entries.reduce((sum, entry) => sum + entry.value, 0);

  return entries.map((entry) => ({
    ...entry,
    percent: total > 0 ? (entry.value / total) * 100 : 0,
  }));
}

export function dailyExpenses(
  transactions: CashTransaction[],
  year: number,
  month: number,
): DailyExpense[] {
  const length = daysInMonth(year, month);
  const totals = Array.from({ length }, () => 0);

  for (const transaction of transactions) {
    if (transaction.type !== "expense") continue;

    const point = readCalendarDay(transaction.date);
    if (!point || point.year !== year || point.month !== month || point.day > length) continue;

    totals[point.day - 1] += finiteAmount(transaction.amount);
  }

  return totals.map((amount, index) => ({
    day: index + 1,
    amount: roundCurrency(amount),
  }));
}

export function sixMonthSeries(
  transactions: CashTransaction[],
  year: number,
  month: number,
): CashFlowBar[] {
  const series: CashFlowBar[] = [];

  for (let offset = 5; offset >= 0; offset -= 1) {
    const point = addMonths(year, month, -offset);
    series.push({
      mes: shortMonths[point.month],
      Entrada: sumByType(transactions, point.year, point.month, "income"),
      Saída: sumByType(transactions, point.year, point.month, "expense"),
    });
  }

  return series;
}

export function monthOptions(transactions: CashTransaction[], now = new Date()): MonthPoint[] {
  const current = { year: now.getFullYear(), month: now.getMonth() };
  let start = addMonths(current.year, current.month, -11);
  let end = current;
  const floor = addMonths(current.year, current.month, -36);

  for (const transaction of transactions) {
    const point = readMonth(transaction.date);
    if (!point || compareMonths(point, floor) < 0) continue;
    if (compareMonths(point, start) < 0) start = point;
    if (compareMonths(point, end) > 0) end = point;
  }

  const options: MonthPoint[] = [];
  for (let cursor = end; compareMonths(cursor, start) >= 0; cursor = addMonths(cursor.year, cursor.month, -1)) {
    options.push(cursor);
  }

  return options;
}
