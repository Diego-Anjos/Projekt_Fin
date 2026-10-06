import { MarketHubCards } from "@/components/market-hub-cards";
import { NewsTickerCard } from "@/components/NewsTickerCard";
import { PortfolioKPIs } from "@/components/portfolio-kpis";
import { PortfolioPerformance } from "@/components/portfolio-performance";
import { RecentTransactions } from "@/components/recent-transactions";
import { RecurringSubscriptions } from "@/components/recurring-subscriptions";
import type { PerformanceData, PortfolioKPIs as PortfolioKpiData, Subscription, Transaction } from "@/types/dashboard";

const portfolioKpis: PortfolioKpiData = {
  totalWealth: 130500,
  wealthChangePercent: 1.8,
  monthlyCashFlow: 4100,
  allocation: [
    { type: "Ações", percentage: 35, color: "#065f46" },
    { type: "Renda Fixa", percentage: 40, color: "#10b981" },
    { type: "Outros", percentage: 25, color: "#71717a" },
  ],
};

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

const transactions: Transaction[] = [
  {
    id: "#4821",
    date: "05 Out",
    description: "Compra no mercado",
    category: "Cart",
    amount: 186.4,
    status: "Paid",
  },
  {
    id: "#4820",
    date: "04 Out",
    description: "Mensalidade da academia",
    category: "Fitness",
    amount: 129.9,
    status: "Pending",
  },
  {
    id: "#4818",
    date: "02 Out",
    description: "Almoço de trabalho",
    category: "Food",
    amount: 64,
    status: "Paid",
  },
];

const subscriptions: Subscription[] = [
  {
    id: "netflix",
    name: "Netflix",
    date: "Today, 07:08",
    amount: 55.9,
    renewalDate: "Renova 12 Out",
  },
  {
    id: "spotify",
    name: "Spotify",
    date: "Today, 09:14",
    amount: 21.9,
    renewalDate: "Renova 18 Out",
  },
  {
    id: "academia",
    name: "Academia",
    date: "Today, 18:02",
    amount: 129.9,
    renewalDate: "Renova 02 Nov",
  },
];

const contributionLevels = [
  [0, 1, 2, 1, 3, 2, 0, 1, 2, 3, 1, 0, 2, 1, 3, 2, 0, 1],
  [1, 2, 0, 3, 1, 2, 3, 0, 1, 2, 3, 2, 1, 0, 2, 3, 1, 2],
  [2, 0, 1, 2, 3, 1, 0, 2, 3, 1, 0, 1, 3, 2, 1, 0, 2, 3],
  [0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 3, 0, 1, 2, 0, 1],
];

const contributionTones = ["bg-zinc-800", "bg-emerald-800", "bg-emerald-600", "bg-emerald-400"];

export default function Home() {
  return (
    <div className="flex min-h-full flex-col gap-8 p-6">
      <section aria-labelledby="market-hub-heading">
        <MarketHubCards news={<NewsTickerCard />} />
      </section>

      <section aria-labelledby="portfolio-kpis-heading" className="flex flex-col gap-4">
        <h2 id="portfolio-kpis-heading" className="text-base font-semibold text-zinc-100">
          Portfolio KPIs
        </h2>
        <PortfolioKPIs {...portfolioKpis} />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <PortfolioPerformance data={performanceData} />
          <TradesHeatmap />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <RecentTransactions transactions={transactions} />
        <RecurringSubscriptions subscriptions={subscriptions} />
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

