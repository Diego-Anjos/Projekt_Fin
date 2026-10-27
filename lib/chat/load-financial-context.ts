"use client";

import { getApiAuthHeaders, markAppSession } from "@/lib/appwrite/session";
import {
  getAllSubscriptions,
  getAllTransactions,
  type SubscriptionDocument,
  type TransactionDocument,
} from "@/lib/appwrite/database";
import { getGoals, type GoalDocument } from "@/lib/appwrite/goals";
import type {
  FinancialContextPayload,
  MarketHubQuotes,
  TransactionContextItem,
} from "@/lib/chat/financial-context";
import {
  emptyMetasContext,
  generateGoalsContext,
} from "@/lib/chat/generate-goals-context";
import {
  emptyAssinaturasContext,
  generateSubscriptionsContext,
} from "@/lib/chat/generate-subscriptions-context";
import { generateTransactionsContext } from "@/lib/chat/generate-transactions-context";
import { generateSystemContext } from "@/lib/chat/generate-system-context";
import {
  isCurrentMonthTransaction,
  isFuturePendingTransaction,
  isOnOrBeforeCurrentMonthEnd,
} from "@/lib/transaction-timing";

type MarketApiSnapshot = {
  dollar?: { buy?: number };
  euro?: { buy?: number };
  bitcoin?: { buy?: number };
  ibovespa?: { points?: number };
  selic?: { rate?: number };
  cdi?: { rate?: number };
};

function computeTotalWealth(transactions: TransactionDocument[], now = new Date()) {
  let total = 0;
  for (const document of transactions) {
    if (isFuturePendingTransaction(document.date, document.status, now)) continue;
    const amount = Number(document.amount) || 0;
    total += document.type === "income" ? amount : -amount;
  }
  return total;
}

function computeMonthCashSummary(transactions: TransactionDocument[], now = new Date()) {
  let despesasMes = 0;
  let cashFlowMensal = 0;
  const byCategory = new Map<string, number>();

  for (const document of transactions) {
    if (!isCurrentMonthTransaction(document.date, now)) continue;

    const amount = Number(document.amount) || 0;
    if (amount <= 0 && document.type === "expense") continue;

    const signed = document.type === "income" ? amount : -amount;
    cashFlowMensal += signed;

    if (document.type !== "expense" || amount <= 0) continue;

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
    cashFlowMensal: Math.round(cashFlowMensal * 100) / 100,
    topCategoriasMes,
  };
}

function summarizeRecentTransactions(
  documents: TransactionDocument[],
  now = new Date(),
  limit = 5,
): TransactionContextItem[] {
  return documents
    .filter((document) => isOnOrBeforeCurrentMonthEnd(document.date, now))
    .slice(0, limit)
    .map((document) => ({
      desc: document.description,
      valor: Number(document.amount) || 0,
      tipo: document.type,
    }));
}

function toMarketHubQuotes(payload: MarketApiSnapshot): MarketHubQuotes | undefined {
  const mercado: MarketHubQuotes = {};
  if (typeof payload.dollar?.buy === "number" && Number.isFinite(payload.dollar.buy)) {
    mercado.dolar = payload.dollar.buy;
  }
  if (typeof payload.euro?.buy === "number" && Number.isFinite(payload.euro.buy)) {
    mercado.euro = payload.euro.buy;
  }
  if (typeof payload.bitcoin?.buy === "number" && Number.isFinite(payload.bitcoin.buy)) {
    mercado.bitcoin = payload.bitcoin.buy;
  }
  if (
    typeof payload.ibovespa?.points === "number" &&
    Number.isFinite(payload.ibovespa.points)
  ) {
    mercado.ibovespa = payload.ibovespa.points;
  }
  if (typeof payload.selic?.rate === "number" && Number.isFinite(payload.selic.rate)) {
    mercado.selic = payload.selic.rate;
  }
  if (typeof payload.cdi?.rate === "number" && Number.isFinite(payload.cdi.rate)) {
    mercado.cdi = payload.cdi.rate;
  }
  return Object.keys(mercado).length > 0 ? mercado : undefined;
}

async function fetchMarketQuotes(): Promise<MarketHubQuotes | undefined> {
  try {
    await markAppSession();
    const authHeaders = await getApiAuthHeaders();
    const response = await fetch("/api/market", {
      credentials: "include",
      cache: "no-store",
      headers: authHeaders,
    });
    if (!response.ok) return undefined;
    const payload = (await response.json()) as MarketApiSnapshot;
    return toMarketHubQuotes(payload);
  } catch (error) {
    console.warn("[financial-context] cotações de mercado indisponíveis:", error);
    return undefined;
  }
}

/**
 * Carrega saldo, despesas do mês, assinaturas, metas, cotações e últimas transações.
 * Falhas parciais não derrubam o chat — devolvem listas vazias / saldo 0.
 */
export async function loadFinancialContext(
  userId: string,
): Promise<FinancialContextPayload> {
  if (!userId) {
    return {
      saldo: 0,
      assinaturas: emptyAssinaturasContext(),
      metas: emptyMetasContext(),
      despesasMes: 0,
      topCategoriasMes: [],
      ...generateSystemContext({ isAuthenticated: false, provider: "Email/Senha" }),
    };
  }

  const [transactions, subscriptions, goalsResult, mercado] = await Promise.all([
    getAllTransactions(userId).catch((error) => {
      console.warn("[financial-context] transações indisponíveis:", error);
      return [] as TransactionDocument[];
    }),
    getAllSubscriptions(userId).catch((error) => {
      console.warn("[financial-context] assinaturas indisponíveis:", error);
      return [] as SubscriptionDocument[];
    }),
    getGoals(userId, 50).catch((error) => {
      console.warn("[financial-context] metas indisponíveis:", error);
      return { documents: [] as GoalDocument[] };
    }),
    fetchMarketQuotes(),
  ]);

  const now = new Date();
  const monthSummary = computeMonthCashSummary(transactions, now);
  const totalWealth = computeTotalWealth(transactions, now);

  return {
    saldo: totalWealth,
    despesasMes: monthSummary.despesasMes,
    topCategoriasMes: monthSummary.topCategoriasMes,
    assinaturas: generateSubscriptionsContext(subscriptions),
    metas: generateGoalsContext(goalsResult.documents, now),
    ...(mercado ? { mercado } : {}),
    portfolio: {
      totalWealth,
      cashFlowMensal: monthSummary.cashFlowMensal,
      gastosMesAtual: monthSummary.despesasMes,
    },
    ultimasTransacoes: summarizeRecentTransactions(transactions, now, 5),
    compras: generateTransactionsContext(transactions, now),
    ...generateSystemContext(
      { isAuthenticated: true, provider: "Email/Senha" },
      now,
    ),
  };
}
