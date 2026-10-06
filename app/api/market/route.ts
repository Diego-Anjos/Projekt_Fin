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
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function readSelic(taxes: HgTax | HgTax[] | undefined): number | null {
  const entry = Array.isArray(taxes) ? taxes[0] : taxes;
  return toNumber(entry?.selic);
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

export async function GET() {
  const apiKey = process.env.HG_BRASIL_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "Chave da API de mercado não configurada." },
      { status: 500 },
    );
  }

  const url = `https://api.hgbrasil.com/finance?key=${encodeURIComponent(apiKey)}`;

  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store" });
  } catch {
    return Response.json(
      { error: "Não foi possível consultar a API de mercado." },
      { status: 502 },
    );
  }

  if (!response.ok) {
    return Response.json(
      { error: "A API de mercado retornou uma resposta inválida." },
      { status: 502 },
    );
  }

  let payload: HgFinanceResponse;
  try {
    payload = (await response.json()) as HgFinanceResponse;
  } catch {
    return Response.json(
      { error: "Não foi possível ler a resposta da API de mercado." },
      { status: 502 },
    );
  }

  if (payload.valid_key === false) {
    return Response.json(
      { error: "A chave da API de mercado foi recusada." },
      { status: 502 },
    );
  }

  const dollarBuy = toNumber(payload.results?.currencies?.USD?.buy);
  const dollarVariation = toNumber(payload.results?.currencies?.USD?.variation);
  const euroBuy = toNumber(payload.results?.currencies?.EUR?.buy);
  const euroVariation = toNumber(payload.results?.currencies?.EUR?.variation);
  const ibovespaPoints = toNumber(payload.results?.stocks?.IBOVESPA?.points);
  const ibovespaVariation = toNumber(payload.results?.stocks?.IBOVESPA?.variation);
  const selicRate = readSelic(payload.results?.taxes);
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
    selicRate === null
  ) {
    return Response.json(
      { error: "A resposta da API de mercado está incompleta." },
      { status: 502 },
    );
  }

  const snapshot: MarketSnapshot = {
    dollar: { buy: dollarBuy, variation: dollarVariation },
    euro: { buy: euroBuy, variation: euroVariation },
    bitcoin,
    ibovespa: { points: ibovespaPoints, variation: ibovespaVariation },
    selic: { rate: selicRate },
  };

  return Response.json(snapshot);
}
