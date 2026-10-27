import type {
  SubscriptionDocument,
  TransactionDocument,
} from "@/lib/appwrite/database";
import type { GoalDocument } from "@/lib/appwrite/goals";
import { isCurrentMonthTransaction } from "@/lib/transaction-timing";

/** Gasto mínimo na top categoria para sugerir redução a favor de uma meta. */
const MIN_TOP_CATEGORY_SPEND = 50;

/** Janela de alerta de assinaturas (próximos N dias, incluindo hoje). */
export const TIP_SUBSCRIPTION_WINDOW_DAYS = 3;

/** Limiar de alerta: despesas ≥ 90% das receitas do mês. */
const SPENDING_ALERT_RATIO = 0.9;

function startOfLocalDay(value = new Date()) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

/** Converte `nextDue` (YYYY-MM-DD ou ISO) em meia-noite local. */
function parseDueDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function daysUntilDue(dueDate: string, today = startOfLocalDay()): number | null {
  const due = parseDueDate(dueDate);
  if (!due) return null;
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

export type DynamicTipInsight =
  | {
      kind: "goalFocus";
      category: string;
      amount: number;
      goalName: string;
    }
  | {
      kind: "subscriptionDue";
      name: string;
      daysUntil: number;
      amount: number;
    }
  | {
      kind: "positiveBalance";
      surplus: number;
    }
  | {
      kind: "spendingAlert";
      percent: number;
    }
  | {
      kind: "fallback";
    };

export type MonthCashFlowSummary = {
  income: number;
  expense: number;
  net: number;
  /** Categoria → total gasto no mês corrente. */
  expensesByCategory: Record<string, number>;
  topCategory: string | null;
  topCategoryAmount: number;
};

function isActiveSubscription(document: SubscriptionDocument) {
  const status = (document.status ?? "active").trim().toLowerCase();
  return status === "" || status === "active" || status === "ativa";
}

function isActiveGoal(goal: GoalDocument) {
  if (goal.isCompleted) return false;
  const target = Number(goal.targetAmount) || 0;
  const current = Number(goal.currentAmount) || 0;
  return !(target > 0 && current >= target);
}

/**
 * Resume receitas/despesas e top categorias do mês civil actual.
 * Valores de despesa são sempre positivos (magnitude).
 */
export function summarizeMonthCashFlow(
  transactions: TransactionDocument[],
  now = new Date(),
): MonthCashFlowSummary {
  let income = 0;
  let expense = 0;
  const expensesByCategory: Record<string, number> = {};

  for (const document of transactions) {
    if (!isCurrentMonthTransaction(document.date, now)) continue;

    const amount = Number(document.amount) || 0;
    if (amount <= 0) continue;

    if (document.type === "income") {
      income += amount;
      continue;
    }

    if (document.type !== "expense") continue;

    expense += amount;
    const category = document.category.trim() || "Sem categoria";
    expensesByCategory[category] = (expensesByCategory[category] ?? 0) + amount;
  }

  const ranked = Object.entries(expensesByCategory).sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "pt-BR"),
  );
  const [topCategory, topCategoryAmount] = ranked[0] ?? [null, 0];

  return {
    income: Math.round(income * 100) / 100,
    expense: Math.round(expense * 100) / 100,
    net: Math.round((income - expense) * 100) / 100,
    expensesByCategory,
    topCategory,
    topCategoryAmount: Math.round((topCategoryAmount ?? 0) * 100) / 100,
  };
}

function pickPrimaryGoal(goals: GoalDocument[], now = new Date()): GoalDocument | null {
  const active = goals.filter(isActiveGoal);
  if (active.length === 0) return null;

  return [...active].sort((left, right) => {
    const leftDue = Date.parse(left.targetDate) || Number.POSITIVE_INFINITY;
    const rightDue = Date.parse(right.targetDate) || Number.POSITIVE_INFINITY;
    if (leftDue !== rightDue) return leftDue - rightDue;

    const leftRemaining =
      Math.max(0, (Number(left.targetAmount) || 0) - (Number(left.currentAmount) || 0));
    const rightRemaining =
      Math.max(0, (Number(right.targetAmount) || 0) - (Number(right.currentAmount) || 0));
    return rightRemaining - leftRemaining;
  })[0] ?? null;
}

function pickUpcomingSubscription(
  subscriptions: SubscriptionDocument[],
  now = new Date(),
): { subscription: SubscriptionDocument; daysUntil: number } | null {
  let best: { subscription: SubscriptionDocument; daysUntil: number } | null = null;

  for (const subscription of subscriptions) {
    if (!isActiveSubscription(subscription)) continue;
    const days = daysUntilDue(subscription.nextDue, startOfLocalDay(now));
    if (days === null || days < 0 || days > TIP_SUBSCRIPTION_WINDOW_DAYS) continue;
    if (!best || days < best.daysUntil) {
      best = { subscription, daysUntil: days };
    }
  }

  return best;
}

/**
 * Motor local da "Dica do dia".
 * Prioridade: metas+top gasto → assinatura a vencer → saldo positivo → alerta 90% → fallback.
 */
export function generateDynamicTip(
  transactions: TransactionDocument[],
  goals: GoalDocument[],
  subscriptions: SubscriptionDocument[],
  now = new Date(),
): DynamicTipInsight {
  const cashFlow = summarizeMonthCashFlow(transactions, now);
  const primaryGoal = pickPrimaryGoal(goals, now);

  // 1. Foco em metas + categoria com maior gasto
  if (
    primaryGoal &&
    cashFlow.topCategory &&
    cashFlow.topCategoryAmount >= MIN_TOP_CATEGORY_SPEND
  ) {
    return {
      kind: "goalFocus",
      category: cashFlow.topCategory,
      amount: cashFlow.topCategoryAmount,
      goalName: primaryGoal.title.trim() || "meta",
    };
  }

  // 2. Assinatura a vencer nos próximos 3 dias
  const upcoming = pickUpcomingSubscription(subscriptions, now);
  if (upcoming) {
    return {
      kind: "subscriptionDue",
      name: upcoming.subscription.name.trim() || "Assinatura",
      daysUntil: upcoming.daysUntil,
      amount: Number(upcoming.subscription.amount) || 0,
    };
  }

  // 3. Saldo positivo no mês
  if (cashFlow.net > 0 && cashFlow.income > 0) {
    return {
      kind: "positiveBalance",
      surplus: cashFlow.net,
    };
  }

  // 4. Despesas ≥ 90% das receitas
  if (cashFlow.income > 0 && cashFlow.expense / cashFlow.income >= SPENDING_ALERT_RATIO) {
    const percent = Math.min(
      100,
      Math.round((cashFlow.expense / cashFlow.income) * 100),
    );
    return {
      kind: "spendingAlert",
      percent,
    };
  }

  // 5. Fallback genérico
  return { kind: "fallback" };
}
