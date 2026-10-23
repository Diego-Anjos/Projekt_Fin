"use client";

import { useEffect, useState } from "react";
import { DashboardSessionBar } from "@/components/dashboard-session-bar";
import { MarketHubCards } from "@/components/market-hub-cards";
import { NewsTickerCard } from "@/components/NewsTickerCard";
import { PortfolioKPIs } from "@/components/portfolio-kpis";
import { useSession } from "@/components/require-session";
import { RecentTransactions } from "@/components/recent-transactions";
import { RecurringSubscriptions } from "@/components/recurring-subscriptions";
import { usePreferences } from "@/contexts/preferences-context";
import { useTranslation } from "@/hooks/use-translation";
import { localeToBcp47 } from "@/locales/dictionaries";
import { formatCurrency } from "@/lib/utils";
import {
  getAllTransactions,
  getSubscriptions,
  type SubscriptionDocument,
  type TransactionDocument,
} from "@/lib/appwrite/database";
import {
  isCurrentMonthTransaction,
  isFuturePendingTransaction,
  isOnOrBeforeCurrentMonthEnd,
} from "@/lib/transaction-timing";
import type { DashboardKpis, Subscription, Transaction } from "@/types/dashboard";

const RECENT_TRANSACTION_LIMIT = 10;

function formatDashboardDate(value: string, bcp47: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = new Intl.DateTimeFormat(bcp47, { month: "short" })
    .format(date)
    .replace(".", "");

  return `${day} ${month.charAt(0).toUpperCase()}${month.slice(1)}`;
}

function toDashboardTransaction(document: TransactionDocument, bcp47: string): Transaction {
  return {
    id: document.$id,
    date: formatDashboardDate(document.date, bcp47),
    description: document.description,
    category: document.category,
    amount: document.amount,
    status: document.status === "Paid" ? "Paid" : "Pending",
    installmentNumber: document.installmentNumber,
    totalInstallments: document.totalInstallments,
  };
}

function toDashboardSubscription(
  document: SubscriptionDocument,
  bcp47: string,
  renewsLabel: (date: string) => string,
): Subscription {
  return {
    id: document.$id,
    name: document.name,
    date: formatDashboardDate(document.subscribedAt, bcp47),
    amount: document.amount,
    renewalDate: renewsLabel(formatDashboardDate(document.nextDue, bcp47)),
  };
}

/**
 * KPIs do Market Hub:
 * - mês atual: só lançamentos com o mesmo mês/ano de hoje
 * - património: tudo até ao fim do mês atual; ignora Pending de meses futuros
 */
function computeCashKpis(documents: TransactionDocument[], now = new Date()) {
  const currentMonthTransactions = documents.filter((document) =>
    isCurrentMonthTransaction(document.date, now),
  );

  let monthlyCashFlow = 0;
  let monthlyExpenses = 0;

  for (const document of currentMonthTransactions) {
    const amount = Number(document.amount) || 0;
    const signed = document.type === "income" ? amount : -amount;
    monthlyCashFlow += signed;
    if (document.type === "expense") monthlyExpenses += amount;
  }

  let totalWealth = 0;

  for (const document of documents) {
    if (isFuturePendingTransaction(document.date, document.status, now)) continue;

    const amount = Number(document.amount) || 0;
    totalWealth += document.type === "income" ? amount : -amount;
  }

  return { totalWealth, monthlyCashFlow, monthlyExpenses };
}

function recentDashboardTransactions(
  documents: TransactionDocument[],
  bcp47: string,
  now = new Date(),
  limit = RECENT_TRANSACTION_LIMIT,
) {
  // getAllTransactions já vem orderDesc("date"); filtramos o futuro e ficamos com as 10 mais recentes "atuais".
  return documents
    .filter((document) => isOnOrBeforeCurrentMonthEnd(document.date, now))
    .slice(0, limit)
    .map((document) => toDashboardTransaction(document, bcp47));
}

export default function Home() {
  const { user } = useSession();
  const { currency, privacyMode } = usePreferences();
  const { t, locale } = useTranslation();
  const bcp47 = localeToBcp47[locale];
  const [kpis, setKpis] = useState<DashboardKpis>({
    totalWealth: 0,
    wealthGrowth: "0%",
    monthlyCashFlow: 0,
    monthlyExpenses: 0,
  });

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  useEffect(() => {
    let active = true;

    async function loadFinance() {
      try {
        const [transactionDocuments, subscriptionsResponse] = await Promise.all([
          getAllTransactions(user.$id),
          getSubscriptions(user.$id, 100),
        ]);

        if (!active) return;

        const now = new Date();

        setTransactions(recentDashboardTransactions(transactionDocuments, bcp47, now));
        setSubscriptions(
          subscriptionsResponse.documents.map((document) =>
            toDashboardSubscription(document, bcp47, (date) => t("dashboard.renews", { date })),
          ),
        );
        setKpis((current) => ({
          ...current,
          ...computeCashKpis(transactionDocuments, now),
        }));
      } catch (error) {
        console.error("Falha ao carregar dados do Appwrite.", error);
      }
    }

    void loadFinance();

    return () => {
      active = false;
    };
  }, [user.$id, bcp47, t]);

  const formatMoney = (value: number) => formatCurrency(value, currency, privacyMode);

  return (
    <div className="flex min-h-full flex-col gap-4 md:gap-6 lg:gap-8">
      <DashboardSessionBar />

      <section aria-labelledby="market-hub-heading">
        <MarketHubCards news={<NewsTickerCard />} />
      </section>

      <section aria-labelledby="portfolio-kpis-heading" className="flex flex-col gap-4">
        <h2 id="portfolio-kpis-heading" className="text-base font-semibold text-zinc-100">
          {t("dashboard.portfolioKpis")}
        </h2>
        <PortfolioKPIs kpis={kpis} formatCurrency={formatMoney} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
          <RecentTransactions transactions={transactions} formatCurrency={formatMoney} />
          <RecurringSubscriptions subscriptions={subscriptions} formatCurrency={formatMoney} />
        </div>
      </section>
    </div>
  );
}
