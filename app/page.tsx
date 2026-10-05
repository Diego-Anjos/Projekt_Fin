import {
  Bell,
  ChartColumn,
  ChartLine,
  Dumbbell,
  Layers,
  LayoutGrid,
  Lightbulb,
  Newspaper,
  Search,
  Settings,
  ShoppingCart,
  TrendingUp,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { CompanyLogo } from "@/components/company-logo";
import { PortfolioPerformanceChart } from "@/components/portfolio-performance-chart";

const navItems: { label: string; href: string; icon: LucideIcon; active?: boolean }[] = [
  { label: "Market Hub", href: "#market-hub", icon: LayoutGrid, active: true },
  { label: "Investments", href: "#investments", icon: ChartLine },
  { label: "Subscriptions", href: "#subscriptions", icon: Layers },
  { label: "Cash Flow", href: "#cash-flow", icon: ChartColumn },
  { label: "Settings", href: "#settings", icon: Settings },
];

export default function Home() {
  return (
    <div className="flex h-full bg-zinc-950 text-zinc-100">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <DashboardContent />
        </div>
      </div>
    </div>
  );
}

function Sidebar() {
  return (
    <aside
      aria-label="Barra lateral"
      className="flex h-full w-[260px] shrink-0 flex-col border-r border-zinc-800 bg-zinc-900"
    >
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-5">
        <TrendingUp className="size-5 text-emerald-500" aria-hidden="true" />
        <span className="text-base font-bold tracking-tight text-white">
          Projekt Fin
        </span>
      </div>

      <div className="mx-4 mb-6 flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-800/50 px-3 py-2.5">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white"
          aria-hidden="true"
        >
          EM
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-100">
            Ethan Miller
          </p>
          <p className="text-xs text-zinc-400">Active</p>
        </div>
        <button
          type="button"
          aria-label="Notificações"
          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
        >
          <Bell className="size-4" aria-hidden="true" />
        </button>
      </div>

      <nav aria-label="Menu principal" className="min-h-0 flex-1 overflow-y-auto px-3">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => (
            <li key={item.label}>
              <a
                href={item.href}
                aria-current={item.active ? "page" : undefined}
                className={
                  item.active
                    ? "flex items-center gap-3 rounded-lg bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100"
                    : "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
                }
              >
                <item.icon className="size-4 shrink-0" aria-hidden="true" />
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="m-4 rounded-xl border border-zinc-800 bg-zinc-800/50 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Lightbulb className="size-4 text-emerald-500" aria-hidden="true" />
          <p className="text-sm font-semibold text-zinc-100">Daily Tip:</p>
        </div>
        <p className="text-sm leading-5 text-zinc-400">
          Consolidate your subscriptions to save money this month.
        </p>
      </div>
    </aside>
  );
}

function Header() {
  return (
    <header
      aria-label="Cabeçalho"
      className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-zinc-800 bg-zinc-900 px-6"
    >
      <label className="relative block w-full max-w-md">
        <span className="sr-only">Pesquisar</span>
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400"
          aria-hidden="true"
        />
        <input
          type="search"
          placeholder="Pesquisar..."
          className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 pr-3 pl-10 text-sm text-zinc-100 outline-none placeholder:text-zinc-400 focus:border-emerald-600"
        />
      </label>

      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          aria-label="Configurações"
          className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
        >
          <Settings className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
        >
          Add New Transaction
        </button>
      </div>
    </header>
  );
}

function DashboardContent() {
  return (
    <div className="flex min-h-full flex-col gap-8 p-6">
      <section aria-labelledby="market-hub-heading">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,1.35fr)]">
          <div className="flex flex-col">
            <h2
              id="market-hub-heading"
              className="mb-4 text-base font-semibold text-zinc-100"
            >
              Market Hub APIs
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <article className="flex h-20 items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <UsdFlag />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-zinc-400">USD/BRL</p>
                    <p className="mt-0.5 flex items-baseline gap-2">
                      <span className="text-sm font-semibold tracking-tight text-zinc-100">
                        R$ 5.18
                      </span>
                      <span className="text-xs font-medium text-emerald-500">+0.3%</span>
                    </p>
                  </div>
                </div>
                <Sparkline />
              </article>

              <article className="flex h-20 items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-zinc-400">Ibovespa</p>
                  <p className="mt-0.5 text-sm font-semibold tracking-tight text-zinc-100">
                    126.5k pts
                  </p>
                </div>
                <p className="text-xs font-medium text-red-500">-0.1%</p>
              </article>

              <article className="flex h-20 items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-3">
                <p className="text-xs font-medium text-zinc-400">CDI/Selic</p>
                <p className="text-sm font-semibold tracking-tight text-zinc-100">11.25%</p>
              </article>
            </div>
          </div>

          <div className="flex flex-col">
            <h2 className="mb-4 text-base font-semibold text-zinc-100">News</h2>
            <article className="flex h-20 items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-100">
                <Newspaper className="size-3.5" aria-hidden="true" />
              </span>
              <p className="line-clamp-2 text-sm font-medium leading-5 text-zinc-100">
                Mercado reage a dados de inflação...
              </p>
            </article>
          </div>
        </div>
      </section>

      <PortfolioKpis />
      <DashboardBottom />
    </div>
  );
}

const allocation = [
  { label: "Ações", percent: "35%", share: 0.35, tone: "text-emerald-800" },
  { label: "Renda Fixa", percent: "40%", share: 0.4, tone: "text-emerald-500" },
  { label: "Outros", percent: "25%", share: 0.25, tone: "text-zinc-500" },
];

const contributionLevels = [
  [0, 1, 2, 1, 3, 2, 0, 1, 2, 3, 1, 0, 2, 1, 3, 2, 0, 1],
  [1, 2, 0, 3, 1, 2, 3, 0, 1, 2, 3, 2, 1, 0, 2, 3, 1, 2],
  [2, 0, 1, 2, 3, 1, 0, 2, 3, 1, 0, 1, 3, 2, 1, 0, 2, 3],
  [0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 3, 0, 1, 2, 0, 1],
];

const contributionTones = [
  "bg-zinc-800",
  "bg-emerald-800",
  "bg-emerald-600",
  "bg-emerald-400",
];

function PortfolioKpis() {
  return (
    <section aria-labelledby="portfolio-kpis-heading" className="flex flex-col gap-4">
      <h2 id="portfolio-kpis-heading" className="text-base font-semibold text-zinc-100">
        Portfolio KPIs
      </h2>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <article className="flex h-full flex-col rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs font-medium text-zinc-400">Total Wealth</p>
          <div className="mt-4 flex items-end justify-between gap-3">
            <p className="text-2xl font-semibold tracking-tight text-zinc-100">
              R$ 130,500.00
            </p>
            <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-500">
              +1.8%
            </span>
          </div>
        </article>

        <article className="flex h-full flex-col rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs font-medium text-zinc-400">Monthly Cash Flow</p>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-emerald-500">
            +R$ 4,100.00
          </p>
        </article>

        <article className="flex h-full flex-col rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs font-medium text-zinc-400">Investment Allocation</p>
          <div className="mt-4 flex flex-1 items-center gap-3">
            <AllocationDonut />
            <ul className="flex flex-col justify-center gap-1.5">
              {allocation.map((item) => (
                <li key={item.label} className="flex items-center gap-1.5 text-xs">
                  <span className={`size-2 shrink-0 rounded-full ${item.tone} bg-current`} />
                  <span className="text-zinc-100">{item.label}</span>
                  <span className="text-zinc-400">{item.percent}</span>
                </li>
              ))}
            </ul>
          </div>
        </article>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <article className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 xl:col-span-2">
          <h3 className="text-sm font-semibold text-zinc-100">Portfolio Performance</h3>
          <div className="mt-4 h-64">
            <PortfolioPerformanceChart />
          </div>
        </article>

        <article className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <h3 className="text-sm font-semibold text-zinc-100">Ações & FIIs</h3>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-zinc-100">
            260 <span className="text-base font-medium text-zinc-400">trades</span>
          </p>
          <div
            className="mt-5 grid w-full grid-flow-col grid-rows-4 gap-1"
            aria-hidden="true"
          >
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
      </div>
    </section>
  );
}

const cashFlowFilters = ["Pendente 70", "Responded 85", "Pago 53"];

const transactions: {
  id: string;
  date: string;
  description: string;
  category: string;
  icon: LucideIcon;
  amount: string;
  status: "Paid" | "Pending";
}[] = [
  {
    id: "#4821",
    date: "05 Out",
    description: "Compra no mercado",
    category: "Cart",
    icon: ShoppingCart,
    amount: "R$ 186,40",
    status: "Paid",
  },
  {
    id: "#4820",
    date: "04 Out",
    description: "Mensalidade da academia",
    category: "Fitness",
    icon: Dumbbell,
    amount: "R$ 129,90",
    status: "Pending",
  },
  {
    id: "#4818",
    date: "02 Out",
    description: "Almoço de trabalho",
    category: "Food",
    icon: Utensils,
    amount: "R$ 64,00",
    status: "Paid",
  },
];

const subscriptions = [
  {
    name: "Netflix",
    time: "Today, 07:08",
    amount: "R$ 55,90",
    renewal: "Renova 12 Out",
  },
  {
    name: "Spotify",
    time: "Today, 09:14",
    amount: "R$ 21,90",
    renewal: "Renova 18 Out",
  },
  {
    name: "Academia",
    time: "Today, 18:02",
    amount: "R$ 129,90",
    renewal: "Renova 02 Nov",
  },
];

function DashboardBottom() {
  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <article className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 xl:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-zinc-100">
            Recent Cash Flow Transactions
          </h3>
          <div className="flex flex-wrap gap-2">
            {cashFlowFilters.map((filter) => (
              <button
                key={filter}
                type="button"
                className="rounded-md bg-emerald-950 px-2 py-1 text-xs font-medium text-emerald-400"
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="text-xs text-zinc-400">
                <th className="pr-4 pb-3 font-medium">ID</th>
                <th className="pr-4 pb-3 font-medium">Date</th>
                <th className="pr-4 pb-3 font-medium">Description</th>
                <th className="pr-4 pb-3 font-medium">Category</th>
                <th className="pr-4 pb-3 text-right font-medium">Amount</th>
                <th className="pb-3 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="border-t border-zinc-800">
                  <td className="py-3 pr-4 text-zinc-400">{transaction.id}</td>
                  <td className="py-3 pr-4 text-zinc-400">{transaction.date}</td>
                  <td className="py-3 pr-4 text-zinc-100">{transaction.description}</td>
                  <td className="py-3 pr-4">
                    <span className="inline-flex items-center gap-1.5 text-zinc-100">
                      <transaction.icon className="size-3.5 text-zinc-400" aria-hidden="true" />
                      {transaction.category}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right text-zinc-100">{transaction.amount}</td>
                  <td
                    className={`py-3 text-right font-medium ${
                      transaction.status === "Paid" ? "text-emerald-400" : "text-orange-400"
                    }`}
                  >
                    {transaction.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article id="subscriptions" className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-zinc-100">Assinaturas Recorrentes</h3>
          <a href="#subscriptions" className="text-xs font-medium text-emerald-500">
            View all
          </a>
        </div>

        <ul className="mt-4 flex flex-col gap-4">
          {subscriptions.map((item) => (
            <li key={item.name} className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <CompanyLogo name={item.name} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-100">{item.name}</p>
                  <p className="text-xs text-zinc-400">{item.time}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-zinc-100">{item.amount}</p>
                <p className="text-xs text-zinc-400">{item.renewal}</p>
              </div>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}

function AllocationDonut() {
  const size = 52;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let consumed = 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="-rotate-90"
      aria-hidden="true"
    >
      {allocation.map((segment) => {
        const length = circumference * segment.share;
        const dashOffset = -consumed;
        consumed += length;

        return (
          <circle
            key={segment.label}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeDasharray={`${length} ${circumference - length}`}
            strokeDashoffset={dashOffset}
            className={segment.tone}
          />
        );
      })}
    </svg>
  );
}

function UsdFlag() {
  return (
    <span
      className="relative size-6 shrink-0 overflow-hidden rounded-full border border-zinc-700"
      aria-hidden="true"
    >
      <span className="absolute inset-0 bg-[repeating-linear-gradient(to_bottom,#b22234_0_2px,#fff_2px_4px)]" />
      <span className="absolute top-0 left-0 h-1/2 w-[45%] bg-[#3c3b6e]" />
    </span>
  );
}

function Sparkline() {
  return (
    <svg
      viewBox="0 0 76 28"
      className="h-6 w-12 shrink-0 text-emerald-500"
      aria-hidden="true"
    >
      <polygon
        points="2,26 2,22 14,19 26,16 38,18 50,11 62,13 74,6 74,26"
        className="fill-emerald-500/15"
      />
      <polyline
        points="2,22 14,19 26,16 38,18 50,11 62,13 74,6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
