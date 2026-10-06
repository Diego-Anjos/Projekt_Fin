"use server";

export type StockQuote = {
  ticker: string;
  price: number;
  changePercent: number;
};

export type FetchStockPricesResult = {
  ok: boolean;
  quotes: StockQuote[];
  error?: string;
};

const TICKER_PATTERN = /^[A-Z0-9]{1,12}$/;
const MAX_TICKERS = 40;
const SUCCESS_CACHE_MS = 20_000;
const ERROR_CACHE_MS = 8_000;

type HgQuote = {
  price?: unknown;
  change_percent?: unknown;
  change?: unknown;
};

type HgStockPriceResponse = {
  valid_key?: boolean;
  results?: {
    error?: unknown;
    message?: unknown;
  } & Record<string, HgQuote | unknown>;
};

type CacheEntry = {
  expiresAt: number;
  result: FetchStockPricesResult;
};

const quoteCache = new Map<string, CacheEntry>();

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeTickers(tickers: string[]) {
  return [...new Set(tickers.map((ticker) => ticker.trim().toUpperCase()))].filter((ticker) =>
    TICKER_PATTERN.test(ticker),
  );
}

function readQuote(ticker: string, entry: unknown): StockQuote | null {
  if (!entry || typeof entry !== "object") return null;

  const quote = entry as HgQuote;
  const price = toNumber(quote.price);
  const changePercent = toNumber(quote.change_percent) ?? toNumber(quote.change);
  if (price === null || changePercent === null) return null;

  return { ticker, price, changePercent };
}

export async function fetchStockPrices(tickers: string[]): Promise<FetchStockPricesResult> {
  const symbols = normalizeTickers(tickers).slice(0, MAX_TICKERS);
  if (symbols.length === 0) return { ok: true, quotes: [] };

  const cacheKey = symbols.slice().sort().join(",");
  const cached = quoteCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.result;

  const apiKey = process.env.HG_BRASIL_API_KEY;
  if (!apiKey) {
    return { ok: false, quotes: [], error: "Chave da API de cotações não configurada." };
  }

  const url = `https://api.hgbrasil.com/finance/stock_price?key=${encodeURIComponent(apiKey)}&symbol=${encodeURIComponent(symbols.join(","))}`;

  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store" });
  } catch {
    return finish(cacheKey, {
      ok: false,
      quotes: [],
      error: "Não foi possível consultar as cotações.",
    });
  }

  if (response.status === 429) {
    return finish(cacheKey, {
      ok: false,
      quotes: [],
      error: "Limite de requisições atingido.",
    });
  }

  if (!response.ok) {
    return finish(cacheKey, {
      ok: false,
      quotes: [],
      error: "A API de cotações retornou uma resposta inválida.",
    });
  }

  let payload: HgStockPriceResponse;
  try {
    payload = (await response.json()) as HgStockPriceResponse;
  } catch {
    return finish(cacheKey, {
      ok: false,
      quotes: [],
      error: "Não foi possível ler a resposta das cotações.",
    });
  }

  if (payload.valid_key === false) {
    return finish(cacheKey, {
      ok: false,
      quotes: [],
      error: "A chave da API de cotações foi recusada.",
    });
  }

  if (payload.results?.error === true) {
    const message = typeof payload.results.message === "string" ? payload.results.message : "";
    const limitReached = /limite|quota|rate/i.test(message);
    return finish(cacheKey, {
      ok: false,
      quotes: [],
      error: limitReached
        ? "Limite de requisições atingido."
        : "Não foi possível obter as cotações ao vivo.",
    });
  }

  const quotes = symbols.flatMap((ticker) => {
    const quote = readQuote(ticker, payload.results?.[ticker]);
    return quote ? [quote] : [];
  });

  if (quotes.length === 0) {
    return finish(cacheKey, {
      ok: false,
      quotes: [],
      error: "Nenhuma cotação disponível.",
    });
  }

  return finish(cacheKey, { ok: true, quotes }, SUCCESS_CACHE_MS);
}

function finish(
  cacheKey: string,
  result: FetchStockPricesResult,
  ttl = ERROR_CACHE_MS,
): FetchStockPricesResult {
  quoteCache.set(cacheKey, { expiresAt: Date.now() + ttl, result });
  return result;
}
