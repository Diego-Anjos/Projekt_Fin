export type CashTransaction = {
  type: "income" | "expense";
  category: string;
  date: string;
  amount: number;
  description?: string;
  id?: string;
};

export type CashFlowViewMode = "mensal" | "anual";

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

function matchesPeriod(
  point: MonthPoint,
  year: number,
  month: number | null,
) {
  if (point.year !== year) return false;
  if (month === null) return true;
  return point.month === month;
}

export function sumByType(
  transactions: CashTransaction[],
  year: number,
  month: number | null,
  type: CashTransaction["type"],
) {
  let total = 0;

  for (const transaction of transactions) {
    if (transaction.type !== type) continue;
    const point = readMonth(transaction.date);
    if (!point || !matchesPeriod(point, year, month)) continue;
    total += finiteAmount(transaction.amount);
  }

  return roundCurrency(total);
}

export function expenseCategories(
  transactions: CashTransaction[],
  year: number,
  month: number | null,
): CategoryTotal[] {
  const totals = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.type !== "expense") continue;
    const point = readMonth(transaction.date);
    if (!point || !matchesPeriod(point, year, month)) continue;

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

/** Maiores movimentações do período (mês ou ano), por valor absoluto. */
export function topMovements(
  transactions: CashTransaction[],
  year: number,
  month: number | null,
  limit = 5,
): CashTransaction[] {
  return transactions
    .filter((transaction) => {
      const point = readMonth(transaction.date);
      return point ? matchesPeriod(point, year, month) : false;
    })
    .sort((left, right) => Math.abs(right.amount) - Math.abs(left.amount))
    .slice(0, limit);
}

/** Gastos mensais do ano (dias 1–12 = Jan–Dez) para o heatmap em visão anual. */
export function monthlyExpensesForYear(
  transactions: CashTransaction[],
  year: number,
): DailyExpense[] {
  const totals = Array.from({ length: 12 }, () => 0);

  for (const transaction of transactions) {
    if (transaction.type !== "expense") continue;
    const point = readMonth(transaction.date);
    if (!point || point.year !== year) continue;
    totals[point.month] += finiteAmount(transaction.amount);
  }

  return totals.map((amount, index) => ({
    day: index + 1,
    amount: roundCurrency(amount),
  }));
}

export function yearOptions(transactions: CashTransaction[], now = new Date()): number[] {
  const currentYear = now.getFullYear();
  const years = new Set<number>([currentYear]);

  for (const transaction of transactions) {
    const point = readMonth(transaction.date);
    if (!point) continue;
    if (point.year >= currentYear - 10 && point.year <= currentYear + 2) {
      years.add(point.year);
    }
  }

  return [...years].sort((left, right) => right - left);
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

/**
 * Histórico: do mês atual até o mais antigo (sem meses futuros vazios).
 * Projeção: só meses futuros que já tenham lançamentos (ex.: parcelas),
 * listados no fim do seletor para não empurrarem 2027 para o topo.
 */
export function monthOptions(transactions: CashTransaction[], now = new Date()): MonthPoint[] {
  const current = { year: now.getFullYear(), month: now.getMonth() };
  let start = addMonths(current.year, current.month, -11);
  const floor = addMonths(current.year, current.month, -36);
  const futureByKey = new Map<string, MonthPoint>();

  for (const transaction of transactions) {
    const point = readMonth(transaction.date);
    if (!point || compareMonths(point, floor) < 0) continue;

    if (compareMonths(point, current) > 0) {
      futureByKey.set(monthValue(point), point);
      continue;
    }

    if (compareMonths(point, start) < 0) start = point;
  }

  const options: MonthPoint[] = [];
  for (
    let cursor = current;
    compareMonths(cursor, start) >= 0;
    cursor = addMonths(cursor.year, cursor.month, -1)
  ) {
    options.push(cursor);
  }

  const futureMonths = [...futureByKey.values()].sort(compareMonths);
  return [...options, ...futureMonths];
}

export const SUBSCRIPTIONS_CATEGORY = "Assinaturas";

export type SubscriptionCashSource = {
  amount: number;
  cycle: string;
  status: string;
  subscribedAt: string;
  nextDue: string;
  name?: string;
};

function isActiveSubscription(status: string) {
  return status.trim().toLowerCase() === "active";
}

function isMonthlyCycle(cycle: string) {
  return cycle.trim().toLowerCase() === "monthly";
}

function subscriptionStartedByMonth(
  subscribedAt: string,
  year: number,
  month: number,
) {
  const start = readMonth(subscribedAt);
  if (!start) return true;
  return compareMonths(start, { year, month }) <= 0;
}

function billingDayInMonth(dateValue: string, year: number, month: number) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateValue);
  const rawDay = match ? Number(match[3]) : 1;
  const maxDay = daysInMonth(year, month);
  const day = Number.isFinite(rawDay) ? Math.min(Math.max(rawDay, 1), maxDay) : 1;
  return day;
}

function isoDateInMonth(year: number, month: number, day: number) {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/** Converte assinaturas mensais ativas em despesas virtuais do mês selecionado. */
export function subscriptionExpensesForMonth(
  subscriptions: SubscriptionCashSource[],
  year: number,
  month: number,
): CashTransaction[] {
  const expenses: CashTransaction[] = [];

  for (const subscription of subscriptions) {
    if (!isActiveSubscription(subscription.status)) continue;
    if (!isMonthlyCycle(subscription.cycle)) continue;
    if (!subscriptionStartedByMonth(subscription.subscribedAt, year, month)) continue;

    const amount = finiteAmount(subscription.amount);
    if (amount <= 0) continue;

    const day = billingDayInMonth(
      subscription.nextDue || subscription.subscribedAt,
      year,
      month,
    );

    expenses.push({
      type: "expense",
      category: SUBSCRIPTIONS_CATEGORY,
      date: isoDateInMonth(year, month, day),
      amount: roundCurrency(amount),
      description: subscription.name?.trim() || SUBSCRIPTIONS_CATEGORY,
    });
  }

  return expenses;
}

/** Despesas virtuais de assinaturas em todos os meses do ano. */
export function subscriptionExpensesForYear(
  subscriptions: SubscriptionCashSource[],
  year: number,
): CashTransaction[] {
  const expenses: CashTransaction[] = [];
  for (let month = 0; month < 12; month += 1) {
    expenses.push(...subscriptionExpensesForMonth(subscriptions, year, month));
  }
  return expenses;
}

export function sumActiveMonthlySubscriptions(
  subscriptions: SubscriptionCashSource[],
  year: number,
  month: number,
) {
  return roundCurrency(
    subscriptionExpensesForMonth(subscriptions, year, month).reduce(
      (total, item) => total + item.amount,
      0,
    ),
  );
}
