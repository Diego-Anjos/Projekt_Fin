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
  getSubscriptions,
  getTransactions,
  type SubscriptionDocument,
  type TransactionDocument,
} from "@/lib/appwrite/database";
import type { DashboardKpis, Subscription, Transaction } from "@/types/dashboard";

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

function computeCashKpis(documents: TransactionDocument[]) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  let totalWealth = 0;
  let monthlyCashFlow = 0;
  let monthlyExpenses = 0;

  for (const document of documents) {
    const amount = Number(document.amount);
    const signed = document.type === "income" ? amount : -amount;
    totalWealth += signed;

    const match = /^(\d{4})-(\d{2})/.exec(document.date);
    const documentYear = match ? Number(match[1]) : new Date(document.date).getFullYear();
    const documentMonth = match ? Number(match[2]) - 1 : new Date(document.date).getMonth();

    if (documentYear !== currentYear || documentMonth !== currentMonth) continue;

    monthlyCashFlow += signed;
    if (document.type === "expense") monthlyExpenses += amount;
  }

  return { totalWealth, monthlyCashFlow, monthlyExpenses };
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
        const [transactionsResponse, subscriptionsResponse] = await Promise.all([
          getTransactions(user.$id, 100),
          getSubscriptions(user.$id, 100),
        ]);

        if (!active) return;

        setTransactions(
          transactionsResponse.documents
            .slice(0, 10)
            .map((document) => toDashboardTransaction(document, bcp47)),
        );
        setSubscriptions(
          subscriptionsResponse.documents.map((document) =>
            toDashboardSubscription(document, bcp47, (date) => t("dashboard.renews", { date })),
          ),
        );
        setKpis((current) => ({
          ...current,
          ...computeCashKpis(transactionsResponse.documents),
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

