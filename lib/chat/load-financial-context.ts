"use client";

import {
  getAllTransactions,
  getSubscriptions,
  type SubscriptionDocument,
  type TransactionDocument,
} from "@/lib/appwrite/database";
import { getGoals, type GoalDocument } from "@/lib/appwrite/goals";
import type { FinancialContextPayload } from "@/lib/chat/financial-context";
import {
  isCurrentMonthTransaction,
  isFuturePendingTransaction,
} from "@/lib/transaction-timing";

function computeTotalWealth(transactions: TransactionDocument[], now = new Date()) {
  let total = 0;
  for (const document of transactions) {
    if (isFuturePendingTransaction(document.date, document.status, now)) continue;
    const amount = Number(document.amount) || 0;
    total += document.type === "income" ? amount : -amount;
  }
  return total;
}

function computeMonthExpenseSummary(transactions: TransactionDocument[], now = new Date()) {
  let despesasMes = 0;
  const byCategory = new Map<string, number>();

  for (const document of transactions) {
    if (document.type !== "expense") continue;
    if (!isCurrentMonthTransaction(document.date, now)) continue;

    const amount = Number(document.amount) || 0;
    if (amount <= 0) continue;

    despesasMes += amount;
    const name = document.category.trim() || "Sem categoria";
    byCategory.set(name, (byCategory.get(name) ?? 0) + amount);
  }

  const topCategoriasMes = [...byCategory.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "pt-BR"))
    .slice(0, 5)
    .map(([name, value]) => `${name}: ${Math.round(value * 100) / 100}`);

  return {
    despesasMes: Math.round(despesasMes * 100) / 100,
    topCategoriasMes,
  };
}

function summarizeSubscriptions(documents: SubscriptionDocument[]) {
  return documents.map((item) => {
    const cycle = item.cycle === "yearly" ? "/ano" : "/mês";
    return `${item.name}: ${item.amount}${cycle}`;
  });
}

function summarizeGoals(documents: GoalDocument[]) {
  return documents.map(
    (item) => `${item.title}: ${item.currentAmount}/${item.targetAmount}`,
  );
}

/**
 * Carrega saldo (transações), despesas do mês, assinaturas e metas do utilizador logado.
 * Falhas parciais não derrubam o chat — devolvem listas vazias / saldo 0.
 */
export async function loadFinancialContext(
  userId: string,
): Promise<FinancialContextPayload> {
  if (!userId) {
    return { saldo: 0, assinaturas: [], metas: [], despesasMes: 0, topCategoriasMes: [] };
  }

  const [transactions, subscriptionsResult, goalsResult] = await Promise.all([
    getAllTransactions(userId).catch((error) => {
      console.warn("[financial-context] transações indisponíveis:", error);
      return [] as TransactionDocument[];
    }),
    getSubscriptions(userId, 50).catch((error) => {
      console.warn("[financial-context] assinaturas indisponíveis:", error);
      return { documents: [] as SubscriptionDocument[] };
    }),
    getGoals(userId, 50).catch((error) => {
      console.warn("[financial-context] metas indisponíveis:", error);
      return { documents: [] as GoalDocument[] };
    }),
  ]);

  const monthSummary = computeMonthExpenseSummary(transactions);

  return {
    saldo: computeTotalWealth(transactions),
    despesasMes: monthSummary.despesasMes,
    topCategoriasMes: monthSummary.topCategoriasMes,
    assinaturas: summarizeSubscriptions(subscriptionsResult.documents),
    metas: summarizeGoals(goalsResult.documents),
  };
}
