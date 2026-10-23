"use client";

import { usePreferences } from "@/contexts/preferences-context";
import { useTranslation } from "@/hooks/use-translation";
import { localeToBcp47 } from "@/locales/dictionaries";
import { formatCurrency } from "@/lib/utils";
import { Info, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type TabId = "acoes" | "fiis" | "etfs";

type BrapiQuote = {
  stock: string;
  name: string;
  close: number;
  change: number;
  logo?: string | null;
  type?: string;
  subType?: string;
};

function isBrapiQuote(value: unknown): value is BrapiQuote {
  if (!value || typeof value !== "object") return false;
  const asset = value as BrapiQuote;

  return (
    typeof asset.stock === "string" &&
    asset.stock.length > 0 &&
    typeof asset.name === "string" &&
    typeof asset.close === "number" &&
    Number.isFinite(asset.close) &&
    typeof asset.change === "number" &&
    Number.isFinite(asset.change)
  );
}

/** Abas por id estável — o rótulo visível vem sempre de `t()`. */
const tabs: { id: TabId; labelKey: string; badgeKey?: string }[] = [
  { id: "acoes", labelKey: "investments.tabs.stocks" },
  { id: "fiis", labelKey: "investments.tabs.fii" },
  { id: "etfs", labelKey: "investments.tabs.etf", badgeKey: "investments.badgeEtfs" },
];

const explanationKeys: Record<TabId, string> = {
  acoes: "investments.explanationStocks",
  fiis: "investments.explanationFiis",
  etfs: "investments.explanationEtfs",
};

function formatSignedPercent(value: number, bcp47: string) {
  const formatted = new Intl.NumberFormat(bcp47, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Math.abs(value));

  if (value > 0) return `+${formatted}%`;
  if (value < 0) return `-${formatted}%`;
  return `${formatted}%`;
}

function matchesQuery(query: string, ticker: string, name: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return (
    ticker.toLowerCase().includes(normalized) || name.toLowerCase().includes(normalized)
  );
}

function screenerType(tab: TabId) {
  if (tab === "acoes") return "stock";
  if (tab === "fiis") return "fund";
  return "bdr";
}

export default function InvestimentosPage() {
  const { currency, privacyMode } = usePreferences();
  const { t, locale } = useTranslation();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("acoes");
  const [assets, setAssets] = useState<BrapiQuote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [screenerError, setScreenerError] = useState<string | null>(null);

  const selectedTab = tabs.find((item) => item.id === activeTab) ?? tabs[0];
  const selectedTabLabel = t(selectedTab.labelKey);
  const selectedTabBadge = selectedTab.badgeKey
    ? t(selectedTab.badgeKey)
    : selectedTabLabel;

  useEffect(() => {
    const controller = new AbortController();

    async function loadScreener() {
      const type = screenerType(activeTab);
      setIsLoading(true);
      setScreenerError(null);

      try {
        const response = await fetch(`/api/screener/brapi?type=${type}`, {
          signal: controller.signal,
        });
        const data: unknown = await response.json();
        const stocks =
          data && typeof data === "object" && "stocks" in data ? data.stocks : null;
        const quotes = Array.isArray(stocks) ? stocks.filter(isBrapiQuote) : [];
        const visible =
          activeTab === "fiis"
            ? quotes.filter((asset) => asset.subType === "fii" || !asset.subType)
            : quotes;

        if (controller.signal.aborted) return;

        if (!response.ok) {
          const message =
            data &&
            typeof data === "object" &&
            "error" in data &&
            typeof data.error === "string"
              ? data.error
              : t("investments.loadError");
          setAssets([]);
          setScreenerError(message);
          return;
        }

        setAssets(visible);
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setAssets([]);
        setScreenerError(t("investments.loadError"));
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
          setCurrentPage(1);
        }
      }
    }

    void loadScreener();

    return () => controller.abort();
  }, [activeTab, t]);

  const visibleScreener = useMemo(
    () => assets.filter((asset) => matchesQuery(query, asset.stock, asset.name)),
    [assets, query],
  );
  const totalPages = Math.max(1, Math.ceil(visibleScreener.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const pageAssets = visibleScreener.slice(
    (safePage - 1) * itemsPerPage,
    safePage * itemsPerPage,
  );

  return (
    <div className="flex w-full flex-col">
      <header className="rounded-2xl border border-emerald-950/80 bg-gradient-to-r from-[#041610] to-[#0a241a] px-6 py-8 sm:px-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
          {t("investments.title")}
        </h1>
        <p className="mt-2 text-sm text-emerald-100/70 sm:text-base">
          {t("investments.subtitle")}
        </p>
        <label className="relative mt-6 block">
          <span className="sr-only">{t("investments.searchAsset")}</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-emerald-300/80"
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setCurrentPage(1);
            }}
            placeholder={t("investments.searchPlaceholder")}
            className="h-14 w-full rounded-2xl border border-emerald-800/50 bg-[#041610] pr-4 pl-12 text-base text-zinc-100 outline-none transition-colors duration-200 placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </label>
      </header>

      <div
        role="tablist"
        aria-label={t("investments.categoriesAria")}
        className="mt-6 flex gap-1 overflow-x-auto whitespace-nowrap scrollbar-hide border-b border-zinc-800 pb-2"
      >
        {tabs.map((item) => {
          const isActive = item.id === activeTab;

          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(item.id)}
              className={
                isActive
                  ? "shrink-0 border-b-2 border-emerald-500 px-4 py-3 text-sm font-medium text-emerald-400"
                  : "shrink-0 border-b-2 border-transparent px-4 py-3 text-sm font-medium text-zinc-400 transition-colors duration-200 hover:text-zinc-200"
              }
            >
              {t(item.labelKey)}
            </button>
          );
        })}
      </div>

      <section aria-label={selectedTabLabel} aria-busy={isLoading} className="mt-8">
        <div className="flex items-start gap-3 p-4 mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 backdrop-blur-sm">
          <Info className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-emerald-100/80">{t(explanationKeys[activeTab])}</p>
        </div>

        <div className="flex flex-col gap-4">
        {isLoading ? (
          <p role="status" className="px-2 py-10 text-center text-sm text-zinc-400">
            {t("investments.loadingQuotes")}
          </p>
        ) : screenerError ? (
          <p
            role="alert"
            className="rounded-xl border border-zinc-800 bg-black px-5 py-10 text-center text-sm text-zinc-400"
          >
            {screenerError}
          </p>
        ) : pageAssets.length === 0 ? (
          <p className="rounded-xl border border-zinc-800 bg-black px-5 py-10 text-center text-sm text-zinc-400">
            {t("investments.noAssetsFound", { tab: selectedTabLabel })}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {pageAssets.map((asset) => {
              const positive = asset.change > 0;
              const negative = asset.change < 0;

              return (
                <article
                  key={asset.stock}
                  className="flex flex-col justify-between rounded-2xl bg-[#0b1310]/80 p-5 transition-colors duration-200 hover:bg-[#0d1814]"
                >
                  <div className="flex items-start gap-3">
                    {asset.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={asset.logo}
                        alt=""
                        className="size-8 shrink-0 rounded-full bg-white object-cover"
                      />
                    ) : (
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-semibold text-white">
                        {asset.stock.slice(0, 2)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold tracking-tight text-zinc-50">
                          {asset.stock}
                        </h2>
                        <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-300 uppercase">
                          {selectedTabBadge}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm text-zinc-500">{asset.name}</p>
                    </div>
                  </div>

                  <div className="mt-6 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs text-zinc-500">{t("investments.currentPrice")}</p>
                      <p className="mt-1 text-xl font-bold tracking-tight text-zinc-50">
                        {formatCurrency(asset.close, currency, privacyMode)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-zinc-500">{t("investments.change24h")}</p>
                      <p
                        className={`mt-1 text-sm font-semibold ${
                          positive ? "text-emerald-400" : negative ? "text-rose-400" : "text-zinc-400"
                        }`}
                      >
                        {formatSignedPercent(asset.change, localeToBcp47[locale])}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!isLoading && !screenerError && visibleScreener.length > 0 ? (
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
              disabled={safePage <= 1}
              className="h-10 rounded-lg border border-zinc-800 px-4 text-sm font-medium text-zinc-200 transition-colors duration-200 hover:border-emerald-500/50 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-zinc-800 disabled:hover:text-zinc-200"
            >
              {t("common.previous")}
            </button>
            <span className="text-sm text-zinc-500">
              {safePage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
              disabled={safePage >= totalPages}
              className="h-10 rounded-lg border border-zinc-800 px-4 text-sm font-medium text-zinc-200 transition-colors duration-200 hover:border-emerald-500/50 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-zinc-800 disabled:hover:text-zinc-200"
            >
              {t("common.next")}
            </button>
          </div>
        ) : null}
        </div>
      </section>
    </div>
  );
}
