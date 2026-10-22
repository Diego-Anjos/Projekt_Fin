import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import {
  defaultLocale,
  languageCodes,
  type LanguageCode,
} from "@/locales/dictionaries";

/**
 * POST /api/translate — tradução de conteúdo dinâmico (manchetes de notícias,
 * títulos/descrições de metas, etc.) para o idioma ativo da interface.
 *
 * Dois formatos (retrocompatível):
 * - Um texto:  `{ text, targetLanguage, sourceLanguage? }`
 *              → `{ translatedText, ... }`
 * - **Batch:** `{ texts: string[], targetLanguage, sourceLanguage? }`
 *              → `{ translatedTexts: string[], ... }` (alinhado com o input)
 *   É o formato das listas (Notícias): 40 textos = **1 pedido HTTP**, e por
 *   dentro 1 chamada ao provider (DeepL aceita arrays nativamente; o Gemini
 *   recebe a lista em JSON num único prompt). Duplicados no batch são
 *   traduzidos uma vez; hits da cache do servidor nem chegam ao provider.
 *
 * Providers (por ordem, selecionável com TRANSLATION_PROVIDER=deepl|gemini):
 *  1. DeepL  — se `DEEPL_API_KEY` existir (serviço dedicado, rápido/barato).
 *     Para conta Pro define `DEEPL_API_URL=https://api.deepl.com/v2/translate`.
 *  2. Gemini — reutiliza a `GEMINI_API_KEY` já usada por /api/chat, com a
 *     mesma fila de modelos dessa rota (default: gemini-3.8-flash, com
 *     fallback 3.6-flash → 3.5-flash-lite). Ajustável com
 *     `GEMINI_TRANSLATE_MODEL`.
 *  TODO(google): para Google Cloud Translation, adicionar um provider
 *  `translateWithGoogle()` com `GOOGLE_TRANSLATE_API_KEY` e incluí-lo
 *  em `PROVIDER_ORDER`/na seleção abaixo — o resto da rota não muda.
 *
 * Sem provider configurado devolve 503 com `fallback: true` e os textos
 * originais, para o cliente degradar graciosamente (mostra o original).
 *
 * Nota de segurança: tal como /api/chat, este endpoint não exige sessão.
 * Mitigações incluídas: limites de tamanho (por texto, por batch e total),
 * allowlist de idiomas, cache em memória e rate-limit por IP ponderado pelo
 * nº de textos que realmente chegam ao provider. TODO(auth): exigir sessão
 * Appwrite antes de produção pública para não expor quota da chave de IA.
 */

export const runtime = "nodejs";

const MAX_TEXT_LENGTH = 2_000;
const MAX_BATCH_ITEMS = 50;
const MAX_BATCH_CHARS = 20_000;
const SERVER_CACHE_LIMIT = 500;
const RATE_LIMIT_UNITS_PER_MINUTE = 300;

/** Nomes por extenso para instruções inequívocas ao modelo. */
const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  pt: "Portuguese (Portugal)",
  en: "English",
  es: "Spanish",
  fr: "French",
  it: "Italian",
  ja: "Japanese",
};

/** Códigos aceites pela API do DeepL (EN/PT/JA…; source pode ser omitido). */
const DEEPL_CODES: Record<LanguageCode, string> = {
  pt: "PT",
  en: "EN",
  es: "ES",
  fr: "FR",
  it: "IT",
  ja: "JA",
};

// Cache em memória do processo: `origem:destino::texto` → tradução.
// Sobrevive entre pedidos enquanto a instância estiver quente e evita
// pagar duas vezes pela mesma string (listas renderizam textos repetidos).
const serverCache = new Map<string, string>();

function serverCacheKey(source: LanguageCode, target: LanguageCode, text: string) {
  return `${source}:${target}::${text}`;
}

function cacheGet(key: string) {
  const value = serverCache.get(key);
  if (value !== undefined) {
    // LRU simples: re-inserir marca como recentemente usado.
    serverCache.delete(key);
    serverCache.set(key, value);
  }
  return value;
}

function cacheSet(key: string, value: string) {
  serverCache.set(key, value);
  if (serverCache.size > SERVER_CACHE_LIMIT) {
    const oldest = serverCache.keys().next().value;
    if (oldest !== undefined) serverCache.delete(oldest);
  }
}

// Rate-limit por IP (janela fixa de 1 min), ponderado: 1 unidade por texto
// que chega mesmo ao provider (hits de cache e duplicados não contam).
const rateWindows = new Map<string, { count: number; resetAt: number }>();

function consumeRateUnits(ip: string, units: number) {
  const now = Date.now();
  const window = rateWindows.get(ip);
  if (!window || now > window.resetAt) {
    rateWindows.set(ip, { count: units, resetAt: now + 60_000 });
    return units > RATE_LIMIT_UNITS_PER_MINUTE;
  }
  window.count += units;
  return window.count > RATE_LIMIT_UNITS_PER_MINUTE;
}

/** Aceita "en", "en-US", "pt-BR"… e devolve o código suportado ou null. */
function normalizeLanguageCode(value: unknown): LanguageCode | null {
  if (typeof value !== "string") return null;
  const base = value.trim().toLowerCase().split(/[-_]/)[0];
  return (languageCodes as readonly string[]).includes(base)
    ? (base as LanguageCode)
    : null;
}

// ---------------------------------------------------------------------------
// Providers (batch)
// ---------------------------------------------------------------------------

async function translateBatchWithDeepL(
  texts: string[],
  source: LanguageCode,
  target: LanguageCode,
): Promise<string[]> {
  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) throw new Error("DEEPL_API_KEY não configurada.");

  const url =
    process.env.DEEPL_API_URL ?? "https://api-free.deepl.com/v2/translate";
  // DeepL aceita o array inteiro num único pedido.
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: texts,
      source_lang: DEEPL_CODES[source],
      target_lang: DEEPL_CODES[target],
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepL respondeu ${response.status}.`);
  }

  const data = (await response.json()) as {
    translations?: { text?: string }[];
  };
  const translated = (data.translations ?? []).map((entry) => entry.text?.trim() ?? "");
  if (translated.length !== texts.length || translated.some((text) => !text)) {
    throw new Error("DeepL devolveu um batch incompleto.");
  }
  return translated;
}

async function generateWithGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurada.");

  const genAI = new GoogleGenerativeAI(apiKey);

  // Mesma fila de modelos de /api/chat: se o principal estiver
  // indisponível/sobrecarregado, tenta os seguintes antes de desistir.
  const primary = process.env.GEMINI_TRANSLATE_MODEL ?? "gemini-3.8-flash";
  const modelQueue = [
    primary,
    ...["gemini-3.6-flash", "gemini-3.5-flash-lite"].filter(
      (model) => model !== primary,
    ),
  ];

  let lastError: unknown;
  for (const modelName of modelQueue) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { temperature: 0 },
      });
      const result = await model.generateContent(prompt);
      const output = result.response.text().trim();
      if (!output) throw new Error("Gemini devolveu uma resposta vazia.");
      return output;
    } catch (error) {
      lastError = error;
      console.error(`[api/translate] Gemini ${modelName} falhou:`, error);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Gemini falhou em todos os modelos.");
}

const GEMINI_RULES = [
  "Preserve numbers, dates, currency symbols, names and placeholders like {name} exactly as they are.",
  "Keep the tone and length natural for short UI content (titles and descriptions).",
];

async function translateOneWithGemini(
  text: string,
  source: LanguageCode,
  target: LanguageCode,
): Promise<string> {
  const prompt = [
    "You are a professional translator for a personal-finance app.",
    `Translate the user content below from ${LANGUAGE_NAMES[source]} to ${LANGUAGE_NAMES[target]}.`,
    "Rules: return ONLY the translated text, with no quotes, labels or explanations.",
    ...GEMINI_RULES,
    "",
    text,
  ].join("\n");

  const translated = (await generateWithGemini(prompt))
    .replace(/^["“”']+|["“”']+$/g, "")
    .trim();
  if (!translated) throw new Error("Gemini devolveu uma tradução vazia.");
  return translated;
}

async function translateBatchWithGemini(
  texts: string[],
  source: LanguageCode,
  target: LanguageCode,
): Promise<string[]> {
  if (texts.length === 1) {
    return [await translateOneWithGemini(texts[0], source, target)];
  }

  // Um único prompt com a lista em JSON → uma chamada para o batch inteiro.
  const prompt = [
    "You are a professional translator for a personal-finance app.",
    `Translate each item below from ${LANGUAGE_NAMES[source]} to ${LANGUAGE_NAMES[target]}.`,
    "Rules: return ONLY a JSON array of strings — the translations, in the same order and with exactly the same number of items. No quotes around the array, no labels, no explanations, no markdown fences.",
    ...GEMINI_RULES,
    "",
    JSON.stringify(texts),
  ].join("\n");

  try {
    const raw = (await generateWithGemini(prompt))
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
    const parsed: unknown = JSON.parse(raw);
    if (
      Array.isArray(parsed) &&
      parsed.length === texts.length &&
      parsed.every((item) => typeof item === "string" && item.trim().length > 0)
    ) {
      return parsed.map((item) => (item as string).trim());
    }
    throw new Error("Gemini devolveu um batch com formato inesperado.");
  } catch (error) {
    // Formato inesperado não deve perder o batch: traduz item a item
    // (continua a ser 1 pedido HTTP do cliente; só o provider é chamado N×).
    console.error("[api/translate] batch Gemini inválido, fallback por item:", error);
    return Promise.all(texts.map((text) => translateOneWithGemini(text, source, target)));
  }
}

type ProviderName = "deepl" | "gemini";

function availableProviders(): ProviderName[] {
  const preferred = process.env.TRANSLATION_PROVIDER?.trim().toLowerCase();
  const available: ProviderName[] = [];
  if (process.env.DEEPL_API_KEY) available.push("deepl");
  if (process.env.GEMINI_API_KEY) available.push("gemini");

  if (preferred === "deepl" || preferred === "gemini") {
    return [
      ...available.filter((provider) => provider === preferred),
      ...available.filter((provider) => provider !== preferred),
    ];
  }
  return available;
}

function translateBatchWithProvider(
  provider: ProviderName,
  texts: string[],
  source: LanguageCode,
  target: LanguageCode,
): Promise<string[]> {
  return provider === "deepl"
    ? translateBatchWithDeepL(texts, source, target)
    : translateBatchWithGemini(texts, source, target);
}

// ---------------------------------------------------------------------------
// Rotas
// ---------------------------------------------------------------------------

/** Estado dos providers (sem expor chaves) — útil para diagnóstico. */
export function GET() {
  const providers = availableProviders();
  return NextResponse.json({
    ok: providers.length > 0,
    providers,
    supportedLanguages: languageCodes,
    defaultSourceLanguage: defaultLocale,
    cachedEntries: serverCache.size,
    maxBatchItems: MAX_BATCH_ITEMS,
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  const { text, texts, targetLanguage, sourceLanguage } = (body ?? {}) as {
    text?: unknown;
    texts?: unknown;
    targetLanguage?: unknown;
    sourceLanguage?: unknown;
  };

  // Normaliza os dois formatos para um array interno. `text` também pode
  // vir como array (tolerância); `texts` tem prioridade.
  const rawBatch: unknown = Array.isArray(texts) ? texts : text;
  const isBatch = Array.isArray(rawBatch);
  const inputTexts: unknown[] = isBatch ? rawBatch : [rawBatch];

  if (inputTexts.length === 0) {
    return NextResponse.json(
      { error: "É necessário enviar 'text' ou 'texts' (não vazio)." },
      { status: 400 },
    );
  }
  if (inputTexts.length > MAX_BATCH_ITEMS) {
    return NextResponse.json(
      { error: `Batch demasiado grande (máx. ${MAX_BATCH_ITEMS} textos).` },
      { status: 413 },
    );
  }
  if (inputTexts.some((item) => typeof item !== "string")) {
    return NextResponse.json(
      { error: "Todos os textos têm de ser strings." },
      { status: 400 },
    );
  }
  const sourceTexts = inputTexts as string[];

  if (!isBatch && sourceTexts[0].trim().length === 0) {
    return NextResponse.json(
      { error: "É necessário enviar 'text' (string não vazia)." },
      { status: 400 },
    );
  }
  if (sourceTexts.some((item) => item.length > MAX_TEXT_LENGTH)) {
    return NextResponse.json(
      { error: `Texto demasiado longo (máx. ${MAX_TEXT_LENGTH} caracteres).` },
      { status: 413 },
    );
  }
  const totalChars = sourceTexts.reduce((sum, item) => sum + item.length, 0);
  if (totalChars > MAX_BATCH_CHARS) {
    return NextResponse.json(
      { error: `Batch demasiado longo (máx. ${MAX_BATCH_CHARS} caracteres no total).` },
      { status: 413 },
    );
  }

  const target = normalizeLanguageCode(targetLanguage);
  if (!target) {
    return NextResponse.json(
      {
        error: `'targetLanguage' inválido. Suportados: ${languageCodes.join(", ")}.`,
      },
      { status: 400 },
    );
  }
  const source = normalizeLanguageCode(sourceLanguage) ?? defaultLocale;

  function respond(translatedTexts: string[], provider: string, cachedCount: number) {
    const payload = {
      sourceTexts,
      sourceLanguage: source,
      targetLanguage: target,
      provider,
      cached: cachedCount === sourceTexts.length,
      cachedCount,
    };
    return isBatch
      ? NextResponse.json({ ...payload, translatedTexts })
      : NextResponse.json({ ...payload, translatedText: translatedTexts[0] });
  }

  function respondFallback(status: number, error: string) {
    const payload = { error, fallback: true as const };
    return isBatch
      ? NextResponse.json({ ...payload, translatedTexts: sourceTexts }, { status })
      : NextResponse.json({ ...payload, translatedText: sourceTexts[0] }, { status });
  }

  // Mesmo idioma: nada a traduzir (o cliente nem devia chamar, mas é barato).
  if (source === target) {
    return respond(sourceTexts, "none", 0);
  }

  // Resolve cache + duplicados primeiro: só os textos únicos em falta
  // chegam ao provider (e contam para o rate-limit).
  const translatedByText = new Map<string, string>();
  const missing: string[] = [];
  for (const item of sourceTexts) {
    if (item.trim().length === 0 || translatedByText.has(item)) continue;
    const cached = cacheGet(serverCacheKey(source, target, item));
    if (cached !== undefined) translatedByText.set(item, cached);
    else {
      translatedByText.set(item, item); // placeholder; substituído após o provider
      missing.push(item);
    }
  }
  const missingSet = new Set(missing);
  const cachedCount = sourceTexts.filter(
    (item) => item.trim().length > 0 && !missingSet.has(item),
  ).length;

  if (missing.length === 0) {
    return respond(
      sourceTexts.map((item) => translatedByText.get(item) ?? item),
      "cache",
      cachedCount,
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (consumeRateUnits(ip, missing.length)) {
    return NextResponse.json(
      { error: "Demasiados pedidos de tradução. Tente novamente em instantes." },
      { status: 429 },
    );
  }

  const providers = availableProviders();
  if (providers.length === 0) {
    return respondFallback(
      503,
      "Nenhum provider de tradução configurado (defina GEMINI_API_KEY ou DEEPL_API_KEY).",
    );
  }

  let lastError: unknown;
  for (const provider of providers) {
    try {
      const translatedMissing = await translateBatchWithProvider(
        provider,
        missing,
        source,
        target,
      );
      if (
        translatedMissing.length !== missing.length ||
        translatedMissing.some((item) => typeof item !== "string" || !item)
      ) {
        throw new Error(`Provider ${provider} devolveu um batch incompleto.`);
      }

      missing.forEach((item, index) => {
        translatedByText.set(item, translatedMissing[index]);
        cacheSet(serverCacheKey(source, target, item), translatedMissing[index]);
      });

      return respond(
        sourceTexts.map((item) => translatedByText.get(item) ?? item),
        provider,
        cachedCount,
      );
    } catch (error) {
      lastError = error;
      console.error(`[api/translate] provider ${provider} falhou:`, error);
    }
  }

  console.error("[api/translate] todos os providers falharam:", lastError);
  return respondFallback(502, "Não foi possível traduzir neste momento.");
}
