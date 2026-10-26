"use client";

import { usePreferences } from "@/contexts/preferences-context";
import { useTranslation } from "@/hooks/use-translation";
import { getApiAuthHeaders, markAppSession } from "@/lib/appwrite/session";
import { localeToBcp47 } from "@/locales/dictionaries";
import { formatCurrency } from "@/lib/utils";
import { AlertTriangle, Info, Search } from "lucide-react";
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

const itemsPerPage = 12;

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
  const [todosAtivos, setTodosAtivos] = useState<BrapiQuote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [screenerError, setScreenerError] = useState<string | null>(null);

  const selectedTab = tabs.find((item) => item.id === activeTab) ?? tabs[0];
  const selectedTabLabel = t(selectedTab.labelKey);
  const selectedTabBadge = selectedTab.badgeKey
    ? t(selectedTab.badgeKey)
    : selectedTabLabel;

  useEffect(() => {
    const controller = new AbortController();

    async function fetchScreener(type: string) {
      // Sincroniza cookie `pf_aw_session` + Bearer a partir do cookieFallback (Appwrite Cloud).
      await markAppSession();
      if (controller.signal.aborted) return null;

      const authHeaders = await getApiAuthHeaders();
      if (controller.signal.aborted) return null;

      return fetch(`/api/screener/brapi?type=${type}`, {
        method: "GET",
        credentials: "include", // OBRIGATÓRIO: envia cookies de sessão (pf_aw_session, etc.)
        cache: "no-store",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
      });
    }

    async function loadScreener() {
      const type = screenerType(activeTab);
      setIsLoading(true);
      setScreenerError(null);

      try {
        let response = await fetchScreener(type);
        if (!response || controller.signal.aborted) return;

        // Retentativa após re-sync se a sessão ainda não estava no cookie.
        if (response.status === 401) {
          response = await fetchScreener(type);
          if (!response || controller.signal.aborted) return;
        }

        const data: unknown = await response.json();
        if (controller.signal.aborted) return;

        if (!response.ok) {
          const rawMessage =
            data &&
            typeof data === "object" &&
            "error" in data &&
            typeof data.error === "string"
              ? data.error
              : null;
          // Não expor "Unauthorized" cru — sessão Appwrite em falta/expirada.
          const message =
            response.status === 401 || rawMessage === "Unauthorized"
              ? t("investments.loadError")
              : (rawMessage ?? t("investments.loadError"));
          setTodosAtivos([]);
          setScreenerError(message);
          return;
        }

        const stocks =
          data && typeof data === "object" && "stocks" in data ? data.stocks : null;
        const quotes = Array.isArray(stocks) ? stocks.filter(isBrapiQuote) : [];
        const visible =
          activeTab === "fiis"
            ? quotes.filter((asset) => asset.subType === "fii" || !asset.subType)
            : quotes;

        setTodosAtivos(visible);
        setScreenerError(null);
        setCurrentPage(1);
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setTodosAtivos([]);
        setScreenerError(t("investments.loadError"));
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadScreener();

    return () => controller.abort();
  }, [activeTab, t]);

  const ativosFiltrados = useMemo(
    () => todosAtivos.filter((asset) => matchesQuery(query, asset.stock, asset.name)),
    [todosAtivos, query],
  );

  const totalPages = Math.ceil(ativosFiltrados.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const ativosPaginados = ativosFiltrados.slice(indexOfFirstItem, indexOfLastItem);

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
              onClick={() => {
                setActiveTab(item.id);
                setCurrentPage(1);
              }}
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
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 backdrop-blur-sm">
          <Info className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-emerald-100/80">{t(explanationKeys[activeTab])}</p>
        </div>

        <div className="flex flex-col gap-4">
          {isLoading ? (
            <p role="status" className="px-2 py-10 text-center text-sm text-zinc-400">
              {t("investments.loadingQuotes")}
            </p>
          ) : screenerError ? (
            <div
              role="alert"
              className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-14 text-center"
            >
              <AlertTriangle className="size-8 text-amber-400/90" aria-hidden="true" />
              <p className="max-w-sm text-sm leading-relaxed text-zinc-300">{screenerError}</p>
            </div>
          ) : ativosPaginados.length === 0 ? (
            <p className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-5 py-10 text-center text-sm text-zinc-400">
              {t("investments.noAssetsFound", { tab: selectedTabLabel })}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {ativosPaginados.map((asset) => {
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
                            positive
                              ? "text-emerald-400"
                              : negative
                                ? "text-rose-400"
                                : "text-zinc-400"
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

          {!isLoading && !screenerError && ativosFiltrados.length > 0 ? (
            <div className="mt-8 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm text-zinc-400 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("common.previous")}
              </button>
              <span className="text-sm text-zinc-500">
                {currentPage} / {totalPages || 1}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-4 py-2 text-sm text-zinc-400 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
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
