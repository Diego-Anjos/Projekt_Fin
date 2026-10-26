"use client";

import { getApiAuthHeaders, markAppSession } from "@/lib/appwrite/session";
import { Bitcoin } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

type MarketSnapshot = {
  dollar: { buy: number; variation: number };
  euro: { buy: number; variation: number };
  bitcoin: { buy: number; variation: number };
  ibovespa: { points: number; variation: number };
  selic: { rate: number };
  cdi: { rate: number };
  source?: "live" | "fallback";
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const pointsFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
});

const rateFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const variationFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});

function isMarketSnapshot(value: unknown): value is MarketSnapshot {
  if (!value || typeof value !== "object") return false;
  const data = value as MarketSnapshot;

  return (
    isQuote(data.dollar) &&
    isQuote(data.euro) &&
    isQuote(data.bitcoin) &&
    typeof data.ibovespa?.points === "number" &&
    Number.isFinite(data.ibovespa.points) &&
    typeof data.ibovespa?.variation === "number" &&
    Number.isFinite(data.ibovespa.variation) &&
    typeof data.selic?.rate === "number" &&
    Number.isFinite(data.selic.rate) &&
    typeof data.cdi?.rate === "number" &&
    Number.isFinite(data.cdi.rate)
  );
}

function isQuote(value: { buy?: number; variation?: number } | undefined): boolean {
  return (
    typeof value?.buy === "number" &&
    Number.isFinite(value.buy) &&
    typeof value.variation === "number" &&
    Number.isFinite(value.variation)
  );
}

function variationClassName(value: number) {
  if (value > 0) return "text-emerald-500";
  if (value < 0) return "text-red-500";
  return "text-zinc-400";
}

function formatVariation(value: number) {
  return `${variationFormatter.format(value)}%`;
}

/** Mock local — mantém o Market Hub visível se /api/market falhar (ex.: 401). */
const CLIENT_FALLBACK_MARKET: MarketSnapshot = {
  dollar: { buy: 4.97, variation: -0.03 },
  euro: { buy: 5.56, variation: -0.11 },
  bitcoin: { buy: 399_990.55, variation: -0.95 },
  ibovespa: { points: 128_450.0, variation: 0.47 },
  selic: { rate: 14.25 },
  cdi: { rate: 14.15 },
  source: "fallback",
};

export function MarketHubCards({ news }: { news: ReactNode }) {
  const [market, setMarket] = useState<MarketSnapshot | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchMarket() {
      // Garante cookie `pf_aw_session` + Bearer a partir do cookieFallback.
      await markAppSession();
      if (controller.signal.aborted) return null;

      const authHeaders = await getApiAuthHeaders();
      if (controller.signal.aborted) return null;

      return fetch("/api/market", {
        signal: controller.signal,
        credentials: "include",
        cache: "no-store",
        headers: authHeaders,
      });
    }

    async function loadMarket() {
      try {
        let response = await fetchMarket();
        if (!response || controller.signal.aborted) return;

        // Uma retentativa após re-sync se a sessão ainda não estava no cookie.
        if (response.status === 401) {
          response = await fetchMarket();
          if (!response || controller.signal.aborted) return;
        }

        const payload: unknown = await response.json();

        if (!response.ok || !isMarketSnapshot(payload)) {
          throw new Error(`market request failed (${response.status})`);
        }

        setMarket(payload);
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        console.warn("Usando dados de mock devido a erro na API:", caught);
        // FALLBACK PARA DESENVOLVIMENTO — UI não fica vazia com 401/rede.
        setMarket(CLIENT_FALLBACK_MARKET);
      }
    }

    void loadMarket();

    return () => controller.abort();
  }, []);

  return (
    <div>
      <h2 id="market-hub-heading" className="mb-4 text-base font-semibold text-zinc-100">
        Market Hub APIs
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1.5fr)_minmax(0,1.35fr)]">
        {market ? (
          <>
            <article className="flex h-20 items-center justify-between gap-3 rounded-xl border border-zinc-700/50 bg-black px-3">
              <div className="flex min-w-0 items-center gap-3">
                <UsdFlag />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-zinc-400">Dólar</p>
                  <p className="mt-0.5 flex items-baseline gap-2">
                    <span className="text-sm font-semibold tracking-tight text-zinc-100">
                      {currencyFormatter.format(market.dollar.buy)}
                    </span>
                    <span
                      className={`text-xs font-medium ${variationClassName(market.dollar.variation)}`}
                    >
                      {formatVariation(market.dollar.variation)}
                    </span>
                  </p>
                </div>
              </div>
              <Sparkline variation={market.dollar.variation} />
            </article>

            <article className="flex h-20 items-center justify-between gap-3 rounded-xl border border-zinc-700/50 bg-black px-3">
              <div className="flex min-w-0 items-center gap-3">
                <EuroMark />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-zinc-400">Euro</p>
                  <p className="mt-0.5 flex items-baseline gap-2">
                    <span className="text-sm font-semibold tracking-tight text-zinc-100">
                      {currencyFormatter.format(market.euro.buy)}
                    </span>
                    <span className={`text-xs font-medium ${variationClassName(market.euro.variation)}`}>
                      {formatVariation(market.euro.variation)}
                    </span>
                  </p>
                </div>
              </div>
              <Sparkline variation={market.euro.variation} />
            </article>

            <BitcoinCard quote={market.bitcoin} />

            <article className="flex h-20 items-center justify-between gap-3 rounded-xl border border-zinc-700/50 bg-black px-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-400">Ibovespa</p>
                <p className="mt-0.5 text-sm font-semibold tracking-tight text-zinc-100">
                  {pointsFormatter.format(market.ibovespa.points)} pts
                </p>
              </div>
              <p className={`text-xs font-medium ${variationClassName(market.ibovespa.variation)}`}>
                {formatVariation(market.ibovespa.variation)}
              </p>
            </article>

            <article className="flex h-20 items-center justify-between gap-3 rounded-xl border border-zinc-700/50 bg-black px-3">
              <div className="w-full min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Juros & Renda Fixa</span>
                  <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                    a.a.
                  </span>
                </div>

                <div className="mt-1 flex items-center justify-between">
                  <div>
                    <span className="block text-[11px] text-slate-500">Selic Meta</span>
                    <span className="text-lg font-bold tracking-tight text-white">
                      {rateFormatter.format(market.selic.rate)}%
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="block text-[11px] text-slate-500">CDI / Juros</span>
                    <span className="text-lg font-bold tracking-tight text-emerald-400">
                      {rateFormatter.format(market.cdi.rate)}%
                    </span>
                  </div>
                </div>
              </div>
            </article>
          </>
        ) : (
          Array.from({ length: 5 }, (_, index) => <QuoteSkeleton key={index} />)
        )}
        {news}
      </div>
    </div>
  );
}

function QuoteSkeleton() {
  return (
    <article className="flex h-20 animate-pulse items-center justify-between gap-3 rounded-xl border border-zinc-700/50 bg-black px-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="size-10 shrink-0 rounded-full bg-zinc-800" />
        <div className="flex flex-col gap-2">
          <span className="h-3 w-14 rounded bg-zinc-800" />
          <span className="h-4 w-24 rounded bg-zinc-800" />
        </div>
      </div>
      <span className="h-3 w-10 rounded bg-zinc-800" />
    </article>
  );
}

function BitcoinCard({ quote }: { quote: { buy: number; variation: number } }) {
  return (
    <article className="flex h-20 items-center justify-between gap-3 rounded-xl border border-zinc-700/50 bg-black px-3">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white"
          aria-hidden="true"
        >
          <Bitcoin className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-400">Bitcoin</p>
          <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
            <span className="text-sm font-semibold tracking-tight text-zinc-100">
              {currencyFormatter.format(quote.buy)}
            </span>
            <span className={`text-xs font-medium ${variationClassName(quote.variation)}`}>
              {formatVariation(quote.variation)}
            </span>
          </p>
        </div>
      </div>
      <Sparkline variation={quote.variation} />
    </article>
  );
}

function UsdFlag() {
  return (
    <span
      className="relative size-10 shrink-0 overflow-hidden rounded-full border border-zinc-700"
      aria-hidden="true"
    >
      <span className="absolute inset-0 bg-[repeating-linear-gradient(to_bottom,#b22234_0_7.69%,#fff_7.69%_15.38%)]" />
      <span className="absolute top-0 left-0 h-1/2 w-[45%] bg-[#3c3b6e]" />
    </span>
  );
}

function EuroMark() {
  return (
    <span
      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#003399] text-2xl font-semibold leading-none text-[#ffcc00]"
      aria-hidden="true"
    >
      €
    </span>
  );
}

function Sparkline({ variation }: { variation: number }) {
  const rising = variation >= 0;
  const points = rising ? "2,22 14,19 26,16 38,18 50,11 62,13 74,6" : "2,6 14,9 26,12 38,10 50,17 62,15 74,22";
  const area = rising
    ? "2,26 2,22 14,19 26,16 38,18 50,11 62,13 74,6 74,26"
    : "2,26 2,6 14,9 26,12 38,10 50,17 62,15 74,22 74,26";
  const tone = variation > 0 ? "text-emerald-500" : variation < 0 ? "text-red-500" : "text-zinc-400";
  const fill = variation > 0 ? "fill-emerald-500/15" : variation < 0 ? "fill-red-500/15" : "fill-zinc-400/15";

  return (
    <svg viewBox="0 0 76 28" className={`h-6 w-12 shrink-0 ${tone}`} aria-hidden="true">
      <polygon points={area} className={fill} />
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
