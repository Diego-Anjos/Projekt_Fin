import { isApiAuthError, requireApiSession } from "@/lib/appwrite/api-auth";

type HgCurrency = {
  buy?: unknown;
  variation?: unknown;
};

type HgBitcoinVenue = {
  buy?: unknown;
  last?: unknown;
  variation?: unknown;
  format?: unknown;
};

type HgStock = {
  points?: unknown;
  variation?: unknown;
};

type HgTax = {
  selic?: unknown;
  cdi?: unknown;
  cdi_daily?: unknown;
};

type HgFinanceResponse = {
  valid_key?: boolean;
  results?: {
    currencies?: {
      USD?: HgCurrency;
      EUR?: HgCurrency;
      BTC?: HgCurrency;
    };
    bitcoin?: {
      blockchain_info?: HgBitcoinVenue;
    };
    stocks?: {
      IBOVESPA?: HgStock;
    };
    taxes?: HgTax | HgTax[];
  };
};

export type MarketSnapshot = {
  dollar: { buy: number; variation: number };
  euro: { buy: number; variation: number };
  bitcoin: { buy: number; variation: number };
  ibovespa: { points: number; variation: number };
  selic: { rate: number };
  cdi: { rate: number };
  /** Presente quando a resposta vem do fallback local (chave/HG indisponível). */
  source?: "live" | "fallback";
};

/**
 * Snapshot de reserva para o Market Hub não ficar vazio quando a HG
 * recusa a chave, atinge rate-limit ou está offline.
 * Valores ilustrativos — substituídos assim que a API externa responder.
 */
const FALLBACK_MARKET_SNAPSHOT: MarketSnapshot = {
  dollar: { buy: 5.42, variation: 0.18 },
  euro: { buy: 5.89, variation: -0.12 },
  bitcoin: { buy: 612_450.0, variation: 1.35 },
  ibovespa: { points: 128_450.0, variation: 0.42 },
  selic: { rate: 14.25 },
  cdi: { rate: 14.15 },
  source: "fallback",
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function readInterestRates(
  taxes: HgTax | HgTax[] | undefined,
): { selic: number; cdi: number } | null {
  const entry = Array.isArray(taxes) ? taxes[0] : taxes;
  const selic = toNumber(entry?.selic);
  const cdiAnnual = toNumber(entry?.cdi);
  const cdiDaily = toNumber(entry?.cdi_daily);
  if (selic === null) return null;

  // HG publishes the COPOM target in `selic` and often mirrors it in `cdi`.
  // The effective annual CDI (a.a.) then sits in `cdi_daily`.
  const effectiveCdi =
    cdiDaily !== null && cdiDaily > 1 && (cdiAnnual === null || Math.abs(cdiAnnual - selic) < 0.001)
      ? cdiDaily
      : cdiAnnual;

  if (effectiveCdi === null) return null;
  return { selic, cdi: effectiveCdi };
}

function readBitcoinBrl(
  venue: HgBitcoinVenue | undefined,
  quotedInBrl: HgCurrency | undefined,
  dollarBuy: number,
): { buy: number; variation: number } | null {
  const usdPrice = toNumber(venue?.buy) ?? toNumber(venue?.last);
  const usdVariation = toNumber(venue?.variation);
  const format = Array.isArray(venue?.format) ? venue.format : [];
  const venueIsBrl = format.includes("BRL");

  if (usdPrice !== null && usdVariation !== null) {
    const buy = venueIsBrl ? usdPrice : usdPrice * dollarBuy;
    if (Number.isFinite(buy) && buy > 0) return { buy, variation: usdVariation };
  }

  const brlPrice = toNumber(quotedInBrl?.buy);
  const brlVariation = toNumber(quotedInBrl?.variation);
  if (brlPrice === null || brlVariation === null) return null;
  return { buy: brlPrice, variation: brlVariation };
}

function fallbackResponse(reason: string) {
  console.warn(`[api/market] a servir fallback: ${reason}`);
  return Response.json(FALLBACK_MARKET_SNAPSHOT, {
    headers: { "X-Market-Source": "fallback" },
  });
}

export async function GET(request: Request) {
  try {
    const auth = await requireApiSession(request, "api/market");
    if (isApiAuthError(auth)) {
      return auth.error;
    }

    const apiKey = process.env.HG_BRASIL_API_KEY?.trim();
    if (!apiKey) {
      return fallbackResponse("HG_BRASIL_API_KEY ausente");
    }

    const url = `https://api.hgbrasil.com/finance?key=${encodeURIComponent(apiKey)}`;

    let response: Response;
    try {
      response = await fetch(url, { cache: "no-store" });
    } catch (error) {
      console.warn("[api/market] falha de rede na HG Brasil:", error);
      return fallbackResponse("rede HG indisponível");
    }

    if (!response.ok) {
      console.warn(`[api/market] HG Brasil HTTP ${response.status}`);
      return fallbackResponse(`HG HTTP ${response.status}`);
    }

    let payload: HgFinanceResponse;
    try {
      payload = (await response.json()) as HgFinanceResponse;
    } catch (error) {
      console.warn("[api/market] JSON inválido da HG Brasil:", error);
      return fallbackResponse("JSON HG inválido");
    }

    if (payload.valid_key === false) {
      return fallbackResponse("chave HG recusada (valid_key=false)");
    }

    const dollarBuy = toNumber(payload.results?.currencies?.USD?.buy);
    const dollarVariation = toNumber(payload.results?.currencies?.USD?.variation);
    const euroBuy = toNumber(payload.results?.currencies?.EUR?.buy);
    const euroVariation = toNumber(payload.results?.currencies?.EUR?.variation);
    const ibovespaPoints = toNumber(payload.results?.stocks?.IBOVESPA?.points);
    const ibovespaVariation = toNumber(payload.results?.stocks?.IBOVESPA?.variation);
    const interestRates = readInterestRates(payload.results?.taxes);
    const bitcoin =
      dollarBuy === null
        ? null
        : readBitcoinBrl(
            payload.results?.bitcoin?.blockchain_info,
            payload.results?.currencies?.BTC,
            dollarBuy,
          );

    if (
      dollarBuy === null ||
      dollarVariation === null ||
      euroBuy === null ||
      euroVariation === null ||
      bitcoin === null ||
      ibovespaPoints === null ||
      ibovespaVariation === null ||
      interestRates === null
    ) {
      return fallbackResponse("payload HG incompleto");
    }

    const snapshot: MarketSnapshot = {
      dollar: { buy: dollarBuy, variation: dollarVariation },
      euro: { buy: euroBuy, variation: euroVariation },
      bitcoin,
      ibovespa: { points: ibovespaPoints, variation: ibovespaVariation },
      selic: { rate: interestRates.selic },
      cdi: { rate: interestRates.cdi },
      source: "live",
    };

    return Response.json(snapshot, {
      headers: { "X-Market-Source": "live" },
    });
  } catch (error) {
    console.error("[api/market] erro inesperado:", error);
    return fallbackResponse("erro inesperado");
  }
}
