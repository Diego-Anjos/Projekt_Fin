"use client";

import { useEffect, useState } from "react";
import { DashboardSessionBar } from "@/components/dashboard-session-bar";
import { MarketHubCards } from "@/components/market-hub-cards";
import { NewsTickerCard } from "@/components/NewsTickerCard";
import { PortfolioKPIs } from "@/components/portfolio-kpis";
import { PortfolioPerformance } from "@/components/portfolio-performance";
import { useSession } from "@/components/require-session";
import { RecentTransactions } from "@/components/recent-transactions";
import { RecurringSubscriptions } from "@/components/recurring-subscriptions";
import {
  getSubscriptions,
  getTransactions,
  type SubscriptionDocument,
  type TransactionDocument,
} from "@/lib/appwrite/database";
import type { Allocation, DashboardKpis, PerformanceData, Subscription, Transaction } from "@/types/dashboard";

const performanceData: PerformanceData = [
  { month: "Jan", value: 109200 },
  { month: "", value: 113800 },
  { month: "", value: 108400 },
  { month: "", value: 114600 },
  { month: "Feb", value: 111200 },
  { month: "", value: 117900 },
  { month: "", value: 115100 },
  { month: "", value: 120400 },
  { month: "Mar", value: 125400 },
  { month: "", value: 119800 },
  { month: "", value: 122600 },
  { month: "", value: 118200 },
  { month: "Apr", value: 123900 },
  { month: "", value: 121100 },
  { month: "", value: 126700 },
  { month: "", value: 124200 },
  { month: "May", value: 128800 },
  { month: "", value: 125600 },
  { month: "", value: 129900 },
  { month: "", value: 127400 },
  { month: "Jun", value: 131600 },
  { month: "", value: 128300 },
  { month: "", value: 132400 },
  { month: "", value: 130500 },
];

const contributionLevels = [
  [0, 1, 2, 1, 3, 2, 0, 1, 2, 3, 1, 0, 2, 1, 3, 2, 0, 1],
  [1, 2, 0, 3, 1, 2, 3, 0, 1, 2, 3, 2, 1, 0, 2, 3, 1, 2],
  [2, 0, 1, 2, 3, 1, 0, 2, 3, 1, 0, 1, 3, 2, 1, 0, 2, 3],
  [0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 3, 0, 1, 2, 0, 1],
];

const contributionTones = ["bg-zinc-800", "bg-emerald-800", "bg-emerald-600", "bg-emerald-400"];

function formatDashboardDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = new Intl.DateTimeFormat("pt-BR", { month: "short" })
    .format(date)
    .replace(".", "");

  return `${day} ${month.charAt(0).toUpperCase()}${month.slice(1)}`;
}

function toDashboardTransaction(document: TransactionDocument): Transaction {
  return {
    id: document.$id,
    date: formatDashboardDate(document.date),
    description: document.description,
    category: document.category,
    amount: document.amount,
    status: document.status === "Paid" ? "Paid" : "Pending",
  };
}

function toDashboardSubscription(document: SubscriptionDocument): Subscription {
  return {
    id: document.$id,
    name: document.name,
    date: formatDashboardDate(document.subscribedAt),
    amount: document.amount,
    renewalDate: `Renova ${formatDashboardDate(document.nextDue)}`,
  };
}

function computeCashKpis(documents: TransactionDocument[]) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  let totalWealth = 0;
  let monthlyCashFlow = 0;

  for (const document of documents) {
    const signed = document.type === "income" ? document.amount : -document.amount;
    totalWealth += signed;

    const match = /^(\d{4})-(\d{2})/.exec(document.date);
    const documentYear = match ? Number(match[1]) : new Date(document.date).getFullYear();
    const documentMonth = match ? Number(match[2]) : new Date(document.date).getMonth() + 1;

    if (documentYear === year && documentMonth === month) {
      monthlyCashFlow += signed;
    }
  }

  return { totalWealth, monthlyCashFlow };
}

export default function Home() {
  const { user } = useSession();
  const [kpis, setKpis] = useState<DashboardKpis>({
    totalWealth: 0,
    wealthGrowth: "0%",
    monthlyCashFlow: 0,
  });

  const [allocations, setAllocations] = useState<Allocation[]>([
    { id: 1, label: "Ações", percentage: 35, color: "bg-emerald-500" },
    { id: 2, label: "Renda Fixa", percentage: 40, color: "bg-emerald-300" },
    { id: 3, label: "Outros", percentage: 25, color: "bg-gray-400" },
  ]);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  useEffect(() => {
    let active = true;

    async function loadFinance() {
      try {
        const [transactionsResponse, subscriptionsResponse] = await Promise.all([
          getTransactions(user.$id),
          getSubscriptions(user.$id),
        ]);

        if (!active) return;

        setTransactions(transactionsResponse.documents.map(toDashboardTransaction));
        setSubscriptions(subscriptionsResponse.documents.map(toDashboardSubscription));
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
  }, [user.$id]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  return (
    <div className="flex min-h-full flex-col gap-8 p-6">
      <DashboardSessionBar />

      <section aria-labelledby="market-hub-heading">
        <MarketHubCards news={<NewsTickerCard />} />
      </section>

      <section aria-labelledby="portfolio-kpis-heading" className="flex flex-col gap-4">
        <h2 id="portfolio-kpis-heading" className="text-base font-semibold text-zinc-100">
          Portfolio KPIs
        </h2>
        <PortfolioKPIs kpis={kpis} allocations={allocations} formatCurrency={formatCurrency} />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <PortfolioPerformance data={performanceData} />
          <TradesHeatmap />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <RecentTransactions transactions={transactions} formatCurrency={formatCurrency} />
        <RecurringSubscriptions subscriptions={subscriptions} formatCurrency={formatCurrency} />
      </section>
    </div>
  );
}

function TradesHeatmap() {
  return (
    <article className="rounded-xl border border-zinc-700/50 bg-black p-4">
      <h3 className="text-sm font-semibold text-zinc-100">Ações & FIIs</h3>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-zinc-100">
        260 <span className="text-base font-medium text-zinc-400">trades</span>
      </p>
      <div className="mt-5 grid w-full grid-flow-col grid-rows-4 gap-1" aria-hidden="true">
        {contributionLevels[0].map((_, column) =>
          contributionLevels.map((row, rowIndex) => (
            <span
              key={`${column}-${rowIndex}`}
              className={`size-4 rounded-[3px] ${contributionTones[row[column]]}`}
            />
          )),
        )}
      </div>
    </article>
  );
}

