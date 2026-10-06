"use client";

import { fetchStockPrices, type StockQuote } from "@/services/hgFinance";
import { Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type AssetClass = "Ação" | "FII" | "Cripto" | "ETF/BDR";

type TabId = "carteira" | "acoes" | "fiis" | "cripto" | "etfs";

type Holding = {
  ticker: string;
  name: string;
  type: AssetClass;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  dayChange: number;
};

type MarketAsset = {
  ticker: string;
  name: string;
  type: AssetClass;
  price: number;
  change24h: number;
  change7d: number;
  sparkline: number[];
};

type AporteDraft = {
  ticker: string;
  name: string;
  type: AssetClass;
  currentPrice: number;
  dayChange: number;
  isNew: boolean;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const tabs: { id: TabId; label: string; type?: AssetClass }[] = [
  { id: "carteira", label: "Minha Carteira" },
  { id: "acoes", label: "Ações", type: "Ação" },
  { id: "fiis", label: "FIIs", type: "FII" },
  { id: "cripto", label: "Criptomoedas", type: "Cripto" },
  { id: "etfs", label: "ETFs/BDRs", type: "ETF/BDR" },
];

const logoTone: Record<string, string> = {
  VALE3: "bg-lime-700",
  PETR4: "bg-emerald-700",
  ITUB4: "bg-orange-700",
  BBDC4: "bg-red-800",
  WEGE3: "bg-sky-700",
  ABEV3: "bg-amber-700",
  MXRF11: "bg-teal-700",
  HGLG11: "bg-cyan-800",
  KNRI11: "bg-indigo-700",
  XPML11: "bg-yellow-700",
  BTC: "bg-orange-600",
  ETH: "bg-violet-700",
  SOL: "bg-fuchsia-700",
  IVVB11: "bg-blue-700",
  BOVA11: "bg-emerald-800",
  HASH11: "bg-zinc-600",
  AAPL34: "bg-zinc-500",
  MSFT34: "bg-sky-800",
};

const initialHoldings: Holding[] = [
  {
    ticker: "VALE3",
    name: "Vale",
    type: "Ação",
    quantity: 40,
    averagePrice: 62.4,
    currentPrice: 64.18,
    dayChange: 1.5,
  },
  {
    ticker: "PETR4",
    name: "Petrobras",
    type: "Ação",
    quantity: 80,
    averagePrice: 36.1,
    currentPrice: 38.42,
    dayChange: 0.8,
  },
  {
    ticker: "ITUB4",
    name: "Itaú Unibanco",
    type: "Ação",
    quantity: 50,
    averagePrice: 34.2,
    currentPrice: 33.75,
    dayChange: -0.8,
  },
  {
    ticker: "MXRF11",
    name: "Maxi Renda",
    type: "FII",
    quantity: 120,
    averagePrice: 10.15,
    currentPrice: 10.02,
    dayChange: -0.4,
  },
  {
    ticker: "HGLG11",
    name: "CSHG Logística",
    type: "FII",
    quantity: 15,
    averagePrice: 158.4,
    currentPrice: 161.2,
    dayChange: 0.6,
  },
  {
    ticker: "BTC",
    name: "Bitcoin",
    type: "Cripto",
    quantity: 0.012,
    averagePrice: 320000,
    currentPrice: 345200,
    dayChange: 2.1,
  },
  {
    ticker: "IVVB11",
    name: "iShares S&P 500",
    type: "ETF/BDR",
    quantity: 8,
    averagePrice: 310,
    currentPrice: 328.5,
    dayChange: 0.4,
  },
];

const marketAssets: MarketAsset[] = [
  {
    ticker: "PETR4",
    name: "Petrobras PN",
    type: "Ação",
    price: 38.42,
    change24h: 0.8,
    change7d: 2.4,
    sparkline: [36.2, 36.8, 37.1, 36.9, 37.6, 38.1, 38.42],
  },
  {
    ticker: "VALE3",
    name: "Vale ON",
    type: "Ação",
    price: 64.18,
    change24h: 1.5,
    change7d: -0.6,
    sparkline: [65.1, 64.4, 63.8, 64.2, 63.5, 63.9, 64.18],
  },
  {
    ticker: "ITUB4",
    name: "Itaú Unibanco PN",
    type: "Ação",
    price: 33.75,
    change24h: -0.8,
    change7d: 1.1,
    sparkline: [33.1, 33.4, 33.8, 34.2, 34.0, 33.9, 33.75],
  },
  {
    ticker: "BBDC4",
    name: "Bradesco PN",
    type: "Ação",
    price: 14.22,
    change24h: -1.2,
    change7d: -2.4,
    sparkline: [14.9, 14.7, 14.6, 14.5, 14.4, 14.35, 14.22],
  },
  {
    ticker: "WEGE3",
    name: "WEG ON",
    type: "Ação",
    price: 52.9,
    change24h: 0.4,
    change7d: 3.2,
    sparkline: [50.1, 50.8, 51.2, 51.6, 52.1, 52.4, 52.9],
  },
  {
    ticker: "ABEV3",
    name: "Ambev ON",
    type: "Ação",
    price: 12.84,
    change24h: 0.2,
    change7d: -0.9,
    sparkline: [13.1, 12.9, 13.0, 12.7, 12.75, 12.8, 12.84],
  },
  {
    ticker: "MXRF11",
    name: "Maxi Renda",
    type: "FII",
    price: 10.02,
    change24h: -0.4,
    change7d: 0.3,
    sparkline: [9.96, 10.01, 10.05, 10.08, 10.04, 10.06, 10.02],
  },
  {
    ticker: "HGLG11",
    name: "CSHG Logística",
    type: "FII",
    price: 161.2,
    change24h: 0.6,
    change7d: 1.4,
    sparkline: [157, 158.2, 158.8, 159.4, 160.1, 160.6, 161.2],
  },
  {
    ticker: "KNRI11",
    name: "Kinea Renda Imobiliária",
    type: "FII",
    price: 148.7,
    change24h: 0.3,
    change7d: -0.5,
    sparkline: [150.2, 149.6, 149.1, 148.4, 148.9, 148.5, 148.7],
  },
  {
    ticker: "XPML11",
    name: "XP Malls",
    type: "FII",
    price: 109.35,
    change24h: -0.7,
    change7d: 0.8,
    sparkline: [107.4, 108.1, 108.8, 109.6, 110.1, 109.8, 109.35],
  },
  {
    ticker: "BTC",
    name: "Bitcoin",
    type: "Cripto",
    price: 345200,
    change24h: 2.1,
    change7d: 4.8,
    sparkline: [328000, 331500, 329800, 336200, 340100, 342400, 345200],
  },
  {
    ticker: "ETH",
    name: "Ethereum",
    type: "Cripto",
    price: 18450,
    change24h: -1.4,
    change7d: 2.2,
    sparkline: [17800, 18120, 18640, 18910, 18750, 18620, 18450],
  },
  {
    ticker: "SOL",
    name: "Solana",
    type: "Cripto",
    price: 892.4,
    change24h: 3.6,
    change7d: 8.1,
    sparkline: [810, 828, 845, 860, 872, 881, 892.4],
  },
  {
    ticker: "IVVB11",
    name: "iShares S&P 500",
    type: "ETF/BDR",
    price: 328.5,
    change24h: 0.4,
    change7d: 1.7,
    sparkline: [318, 320, 322, 324, 325.5, 327, 328.5],
  },
  {
    ticker: "BOVA11",
    name: "iShares Ibovespa",
    type: "ETF/BDR",
    price: 128.9,
    change24h: 0.5,
    change7d: 1.2,
    sparkline: [126.2, 126.8, 127.1, 127.6, 128.1, 128.4, 128.9],
  },
  {
    ticker: "HASH11",
    name: "Hashdex Nasdaq Crypto",
    type: "ETF/BDR",
    price: 46.72,
    change24h: 1.8,
    change7d: 5.4,
    sparkline: [43.1, 43.8, 44.2, 45.0, 45.6, 46.1, 46.72],
  },
  {
    ticker: "AAPL34",
    name: "Apple",
    type: "ETF/BDR",
    price: 68.15,
    change24h: -0.3,
    change7d: 1.9,
    sparkline: [66.2, 66.8, 67.4, 68.1, 68.6, 68.3, 68.15],
  },
  {
    ticker: "MSFT34",
    name: "Microsoft",
    type: "ETF/BDR",
    price: 72.4,
    change24h: 0.9,
    change7d: 2.6,
    sparkline: [69.5, 70.1, 70.8, 71.2, 71.6, 72.0, 72.4],
  },
];

function formatQuantity(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: value < 1 ? 6 : 2,
  }).format(value);
}

function formatSignedPercent(value: number) {
  const formatted = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Math.abs(value));

  if (value > 0) return `+${formatted}%`;
  if (value < 0) return `-${formatted}%`;
  return `${formatted}%`;
}

function changeTone(value: number) {
  if (value > 0) return "text-emerald-500";
  if (value < 0) return "text-red-500";
  return "text-zinc-400";
}

function matchesQuery(query: string, ticker: string, name: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return (
    ticker.toLowerCase().includes(normalized) || name.toLowerCase().includes(normalized)
  );
}

function Sparkline({ values, positive }: { values: number[]; positive: boolean }) {
  const width = 88;
  const height = 32;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      className="shrink-0"
    >
      <polyline
        fill="none"
        stroke={positive ? "#10b981" : "#ef4444"}
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}

type QuoteMode = "loading" | "live" | "last" | "unavailable";

type ResolvedQuote = {
  mode: QuoteMode;
  price: number | null;
  change: number | null;
};

function LiveFigure({
  mode,
  text,
  className,
  skeletonClassName,
  showLastKnownCaption = false,
}: {
  mode: QuoteMode;
  text: string;
  className: string;
  skeletonClassName: string;
  showLastKnownCaption?: boolean;
}) {
  if (mode === "loading") {
    return (
      <span
        className={`inline-block animate-pulse rounded bg-zinc-800 ${skeletonClassName}`}
        aria-hidden="true"
      />
    );
  }

  if (mode === "unavailable") {
    return <span className="text-sm font-medium text-zinc-500">Indisponível</span>;
  }

  return (
    <span className="block">
      <span className={className}>{text}</span>
      {mode === "last" && showLastKnownCaption ? (
        <span className="mt-1 block text-[11px] font-normal text-zinc-500">
          Último preço conhecido
        </span>
      ) : null}
    </span>
  );
}

function AssetMark({ ticker }: { ticker: string }) {
  return (
    <span
      className={`flex size-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-semibold tracking-tight text-white ${logoTone[ticker] ?? "bg-zinc-700"}`}
      aria-hidden="true"
    >
      {ticker.slice(0, 2)}
    </span>
  );
}

export default function InvestimentosPage() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<TabId>("carteira");
  const [holdings, setHoldings] = useState(initialHoldings);
  const [watching, setWatching] = useState<string[]>(["WEGE3", "ETH"]);
  const [draft, setDraft] = useState<AporteDraft | null>(null);
  const [aporteQty, setAporteQty] = useState("1");
  const [aportePrice, setAportePrice] = useState("");
  const [quoteStatus, setQuoteStatus] = useState<"loading" | "live" | "error">("loading");
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});

  const tickerKey = useMemo(() => {
    const symbols = new Set<string>();
    for (const holding of holdings) symbols.add(holding.ticker);
    for (const asset of marketAssets) symbols.add(asset.ticker);
    return [...symbols].sort().join(",");
  }, [holdings]);

  useEffect(() => {
    let cancelled = false;
    const tickers = tickerKey.split(",").filter(Boolean);

    setQuoteStatus((current) => (current === "live" ? current : "loading"));

    fetchStockPrices(tickers)
      .then((result) => {
        if (cancelled) return;

        if (!result.ok) {
          setQuoteStatus("error");
          return;
        }

        setQuotes(Object.fromEntries(result.quotes.map((quote) => [quote.ticker, quote])));
        setQuoteStatus("live");
      })
      .catch(() => {
        if (!cancelled) setQuoteStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [tickerKey]);

  function resolveQuote(ticker: string, fallbackPrice: number, fallbackChange: number): ResolvedQuote {
    if (quoteStatus === "loading") return { mode: "loading", price: null, change: null };

    const live = quotes[ticker];
    if (live) return { mode: "live", price: live.price, change: live.changePercent };

    if (Number.isFinite(fallbackPrice)) {
      return { mode: "last", price: fallbackPrice, change: fallbackChange };
    }

    return { mode: "unavailable", price: null, change: null };
  }

  const activeTab = tabs.find((item) => item.id === tab) ?? tabs[0];

  const visibleHoldings = useMemo(
    () => holdings.filter((holding) => matchesQuery(query, holding.ticker, holding.name)),
    [holdings, query],
  );

  const visibleMarket = useMemo(
    () =>
      marketAssets.filter(
        (asset) =>
          asset.type === activeTab.type && matchesQuery(query, asset.ticker, asset.name),
      ),
    [activeTab.type, query],
  );

  const portfolioCost = holdings.reduce(
    (total, holding) => total + holding.quantity * holding.averagePrice,
    0,
  );
  const portfolioValue = holdings.reduce((total, holding) => {
    const quote = resolveQuote(holding.ticker, holding.currentPrice, holding.dayChange);
    if (quote.price === null) return total;
    return total + holding.quantity * quote.price;
  }, 0);
  const dayResult = holdings.reduce((total, holding) => {
    const quote = resolveQuote(holding.ticker, holding.currentPrice, holding.dayChange);
    if (quote.price === null || quote.change === null || quote.change === -100) return total;
    const previous = quote.price / (1 + quote.change / 100);
    return total + (quote.price - previous) * holding.quantity;
  }, 0);

  function openAporte(holding: Holding) {
    const quote = resolveQuote(holding.ticker, holding.currentPrice, holding.dayChange);
    const price = quote.price ?? holding.currentPrice;
    const change = quote.change ?? holding.dayChange;

    setDraft({
      ticker: holding.ticker,
      name: holding.name,
      type: holding.type,
      currentPrice: price,
      dayChange: change,
      isNew: false,
    });
    setAporteQty("1");
    setAportePrice(price.toString());
  }

  function openBuy(asset: MarketAsset) {
    const quote = resolveQuote(asset.ticker, asset.price, asset.change24h);
    const price = quote.price ?? asset.price;
    const change = quote.change ?? asset.change24h;
    const existing = holdings.find((holding) => holding.ticker === asset.ticker);
    if (existing) {
      openAporte(existing);
      return;
    }

    setDraft({
      ticker: asset.ticker,
      name: asset.name,
      type: asset.type,
      currentPrice: price,
      dayChange: change,
      isNew: true,
    });
    setAporteQty("1");
    setAportePrice(price.toString());
  }

  function confirmAporte() {
    if (!draft) return;

    const quantity = Number(aporteQty.replace(",", "."));
    const price = Number(aportePrice.replace(",", "."));
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price <= 0) {
      return;
    }

    setHoldings((current) => {
      const existing = current.find((holding) => holding.ticker === draft.ticker);
      if (!existing) {
        return [
          ...current,
          {
            ticker: draft.ticker,
            name: draft.name,
            type: draft.type,
            quantity,
            averagePrice: price,
            currentPrice: draft.currentPrice,
            dayChange: draft.dayChange,
          },
        ];
      }

      const nextQuantity = existing.quantity + quantity;
      const nextAverage =
        (existing.quantity * existing.averagePrice + quantity * price) / nextQuantity;

      return current.map((holding) =>
        holding.ticker === draft.ticker
          ? { ...holding, quantity: nextQuantity, averagePrice: nextAverage }
          : holding,
      );
    });
    setDraft(null);
  }

  function toggleWatch(ticker: string) {
    setWatching((current) =>
      current.includes(ticker)
        ? current.filter((item) => item !== ticker)
        : [...current, ticker],
    );
  }

  return (
    <div className="flex w-full flex-col gap-6 px-6 py-8">
      <header className="rounded-2xl border border-emerald-950/80 bg-gradient-to-r from-[#041610] to-[#0a241a] px-6 py-8 sm:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
            Investimentos
          </h1>
          <p className="mt-2 text-sm text-emerald-100/70 sm:text-base">
            Acompanhe a carteira e pesquise ativos do mercado
          </p>
          <label className="relative mt-6 block">
            <span className="sr-only">Pesquisar ativo</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-emerald-300/80"
              aria-hidden="true"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pesquisar ativo, ex: PETR4, AAPL, BTC..."
              className="h-14 w-full rounded-2xl border border-emerald-800/50 bg-[#041610] pr-4 pl-12 text-base text-zinc-100 outline-none transition-colors duration-200 placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </label>
        </div>
      </header>

      <div
        role="tablist"
        aria-label="Categorias de investimentos"
        className="flex gap-1 overflow-x-auto border-b border-zinc-800"
      >
        {tabs.map((item) => {
          const isActive = item.id === tab;

          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(item.id)}
              className={
                isActive
                  ? "shrink-0 border-b-2 border-emerald-500 px-4 py-3 text-sm font-medium text-emerald-400"
                  : "shrink-0 border-b-2 border-transparent px-4 py-3 text-sm font-medium text-zinc-400 transition-colors duration-200 hover:text-zinc-200"
              }
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {quoteStatus === "error" ? (
        <p
          role="status"
          className="rounded-xl border border-zinc-800 bg-black px-5 py-3 text-sm text-zinc-400"
        >
          Cotações ao vivo indisponíveis. Exibindo o último preço conhecido.
        </p>
      ) : null}

      {tab === "carteira" ? (
        <section
          aria-label="Minha carteira"
          aria-busy={quoteStatus === "loading"}
          className="flex flex-col gap-6"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <article className="rounded-xl border border-zinc-800 bg-black p-5">
              <p className="text-sm text-zinc-400">Valor da carteira</p>
              <div className="mt-2">
                <LiveFigure
                  mode={quoteStatus === "loading" ? "loading" : "live"}
                  text={currencyFormatter.format(portfolioValue)}
                  className="text-2xl font-semibold tracking-tight text-zinc-50"
                  skeletonClassName="h-8 w-40"
                />
              </div>
            </article>
            <article className="rounded-xl border border-zinc-800 bg-black p-5">
              <p className="text-sm text-zinc-400">Custo médio</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50">
                {currencyFormatter.format(portfolioCost)}
              </p>
            </article>
            <article className="rounded-xl border border-zinc-800 bg-black p-5">
              <p className="text-sm text-zinc-400">Variação do dia</p>
              <div className="mt-2">
                <LiveFigure
                  mode={quoteStatus === "loading" ? "loading" : "live"}
                  text={`${dayResult > 0 ? "+" : ""}${currencyFormatter.format(dayResult)}`}
                  className={`text-2xl font-semibold tracking-tight ${changeTone(dayResult)}`}
                  skeletonClassName="h-8 w-36"
                />
              </div>
            </article>
          </div>

          {visibleHoldings.length === 0 ? (
            <p className="rounded-xl border border-zinc-800 bg-black px-5 py-10 text-center text-sm text-zinc-400">
              Nenhum ativo encontrado na carteira.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleHoldings.map((holding) => {
                const quote = resolveQuote(holding.ticker, holding.currentPrice, holding.dayChange);
                const currentValue =
                  quote.price === null ? null : holding.quantity * quote.price;

                return (
                  <article
                    key={holding.ticker}
                    className="rounded-xl border border-zinc-800 bg-black p-5 transition-all duration-200 hover:border-emerald-500/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-semibold tracking-tight text-zinc-50">
                            {holding.ticker}
                          </h2>
                          <span className="rounded-md border border-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-400">
                            {holding.type}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs text-zinc-500">{holding.name}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openAporte(holding)}
                        className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-zinc-800 px-2.5 text-xs font-medium text-zinc-300 transition-all duration-200 hover:border-emerald-500/50 hover:text-emerald-400"
                      >
                        <Plus className="size-3.5" aria-hidden="true" />
                        Novo Aporte
                      </button>
                    </div>

                    <dl className="mt-5 grid grid-cols-2 gap-3">
                      <div>
                        <dt className="text-xs text-zinc-500">Quantidade</dt>
                        <dd className="mt-1 text-sm font-medium text-zinc-100">
                          {formatQuantity(holding.quantity)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-zinc-500">Preço Médio</dt>
                        <dd className="mt-1 text-sm font-medium text-zinc-100">
                          {currencyFormatter.format(holding.averagePrice)}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-5 flex items-end justify-between gap-3 border-t border-zinc-800 pt-4">
                      <div>
                        <p className="text-xs text-zinc-500">Valor Atual</p>
                        <div className="mt-1">
                          <LiveFigure
                            mode={quote.mode}
                            text={
                              currentValue === null ? "" : currencyFormatter.format(currentValue)
                            }
                            className="text-base font-semibold text-zinc-50"
                            skeletonClassName="h-6 w-28"
                            showLastKnownCaption
                          />
                        </div>
                      </div>
                      <LiveFigure
                        mode={quote.mode}
                        text={quote.change === null ? "" : formatSignedPercent(quote.change)}
                        className={`text-sm font-semibold ${changeTone(quote.change ?? 0)}`}
                        skeletonClassName="h-5 w-14"
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <section aria-label={activeTab.label} className="overflow-hidden rounded-xl border border-zinc-800 bg-black">
          <div className="hidden grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,0.7fr))_auto] gap-4 border-b border-zinc-800 px-5 py-3 text-xs font-medium tracking-wide text-zinc-500 uppercase lg:grid">
            <span>Ativo</span>
            <span>Preço</span>
            <span>24h</span>
            <span>7 dias</span>
            <span className="text-right">Ação</span>
          </div>

          {visibleMarket.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-zinc-400">
              Nenhum ativo encontrado em {activeTab.label}.
            </p>
          ) : (
            <ul>
              {visibleMarket.map((asset) => {
                const isWatching = watching.includes(asset.ticker);
                const quote = resolveQuote(asset.ticker, asset.price, asset.change24h);
                const sparkline =
                  quote.price === null
                    ? asset.sparkline
                    : [...asset.sparkline.slice(0, -1), quote.price];

                return (
                  <li
                    key={asset.ticker}
                    className="flex flex-col gap-4 border-b border-zinc-800 px-5 py-4 transition-all duration-200 last:border-b-0 hover:border-emerald-500/50 lg:grid lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,0.7fr))_auto] lg:items-center"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <AssetMark ticker={asset.ticker} />
                      <div className="min-w-0">
                        <p className="font-semibold tracking-tight text-zinc-50">{asset.ticker}</p>
                        <p className="truncate text-xs text-zinc-500">{asset.name}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 lg:contents">
                      <p className="text-sm font-medium text-zinc-100">
                        <span className="mr-2 text-xs text-zinc-500 lg:hidden">Preço</span>
                        <LiveFigure
                          mode={quote.mode}
                          text={quote.price === null ? "" : currencyFormatter.format(quote.price)}
                          className="text-sm font-medium text-zinc-100"
                          skeletonClassName="h-5 w-24"
                        />
                      </p>
                      <div className="flex items-center gap-3">
                        {quote.mode === "loading" ? (
                          <span className="inline-block h-8 w-[88px] animate-pulse rounded bg-zinc-800" />
                        ) : (
                          <Sparkline
                            values={sparkline}
                            positive={(quote.change ?? asset.change24h) >= 0}
                          />
                        )}
                        <p className="text-sm font-semibold">
                          <span className="mr-1 text-xs font-normal text-zinc-500 lg:hidden">24h</span>
                          <LiveFigure
                            mode={quote.mode}
                            text={quote.change === null ? "" : formatSignedPercent(quote.change)}
                            className={`text-sm font-semibold ${changeTone(quote.change ?? 0)}`}
                            skeletonClassName="h-5 w-14"
                          />
                        </p>
                      </div>
                      <p className={`text-sm font-medium ${changeTone(asset.change7d)}`}>
                        <span className="mr-1 text-xs font-normal text-zinc-500 lg:hidden">7d</span>
                        {formatSignedPercent(asset.change7d)}
                      </p>
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => toggleWatch(asset.ticker)}
                        aria-pressed={isWatching}
                        className={
                          isWatching
                            ? "h-8 rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-400 transition-all duration-200"
                            : "h-8 rounded-lg border border-zinc-800 px-3 text-xs font-medium text-zinc-300 transition-all duration-200 hover:border-emerald-500/50 hover:text-emerald-400"
                        }
                      >
                        {isWatching ? "Seguindo" : "Acompanhar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => openBuy(asset)}
                        className="h-8 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white transition-colors duration-200 hover:bg-emerald-500"
                      >
                        Comprar
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {draft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="aporte-title"
            onSubmit={(event) => {
              event.preventDefault();
              confirmAporte();
            }}
            className="w-full max-w-md rounded-xl border border-zinc-800 bg-black p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="aporte-title" className="text-lg font-semibold text-zinc-50">
                  {draft.isNew ? "Comprar" : "Novo Aporte"} {draft.ticker}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">{draft.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setDraft(null)}
                aria-label="Fechar"
                className="rounded-lg p-1.5 text-zinc-400 transition-colors duration-200 hover:bg-zinc-900 hover:text-zinc-100"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="grid gap-1.5 text-xs font-medium text-zinc-400">
                Quantidade
                <input
                  value={aporteQty}
                  onChange={(event) => setAporteQty(event.target.value)}
                  inputMode="decimal"
                  className="h-11 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none transition-colors duration-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-zinc-400">
                Preço
                <input
                  value={aportePrice}
                  onChange={(event) => setAportePrice(event.target.value)}
                  inputMode="decimal"
                  className="h-11 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none transition-colors duration-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="h-10 rounded-lg border border-zinc-800 px-4 text-sm text-zinc-300 transition-colors duration-200 hover:border-zinc-600"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="h-10 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-emerald-500"
              >
                Confirmar
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
