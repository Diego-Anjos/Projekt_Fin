"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  defaultLocale,
  type LanguageCode,
} from "@/locales/dictionaries";

/**
 * Tradução dinâmica de conteúdo dinâmico (Appwrite, APIs de notícias, etc.)
 * — otimizada para NÃO bloquear a renderização nem a thread principal.
 *
 * @example
 * // Um texto (metas, etc.):
 * const translatedDesc = useDynamicTranslation(goal.description);
 * const { text, isTranslating } = useDynamicTranslationState(goal.title);
 *
 * // Uma lista inteira (notícias): UMA chamada de rede para todos os textos.
 * const { texts, isTranslating } = useDynamicTranslations(allTitlesAndDescriptions);
 *
 * Arquitetura de performance:
 * 1. **Render nunca espera.** O estado nasce com o texto original
 *    (`useState(original)`) e a tradução chega por `useEffect`, substituindo-o
 *    (pop-in suave). Sem provider/erro → fica o original.
 * 2. **Cache agressivo em 2 camadas**, chave `${target}_${hash}:${len}`:
 *    - `Map` global em memória (partilhado por toda a app, hit síncrono no
 *      render — sem flash quando o texto já foi traduzido nesta sessão);
 *    - `localStorage` persistente, mas com **parse feito UMA vez** e escrita
 *      **coalescida com debounce**. (A versão anterior fazia
 *      `JSON.parse`/`stringify` da store inteira por cada texto — O(n²)
 *      síncrono na thread principal em listas.)
 * 3. **Micro-batching global:** pedidos feitos na mesma janela (~40ms —
 *    ex.: os 40 textos de uma lista de notícias ao montar) são agrupados
 *    num único `POST /api/translate { texts: [...] }`, com dedupe de textos
 *    repetidos e de pedidos em voo. Resultado: 1 fetch + 1 setState por
 *    lista, em vez de ~40 fetches + ~40 re-renders.
 */

const STORAGE_KEY = "projekt-fin:dynamic-translations:v1";
const MAX_PERSISTED_ENTRIES = 300;
const MAX_MEMORY_ENTRIES = 500;
const BATCH_WINDOW_MS = 40;
const BATCH_MAX_ITEMS = 50; // = MAX_BATCH_ITEMS no servidor
const BATCH_MAX_CHARS = 20_000;
const PERSIST_DEBOUNCE_MS = 300;

type DynamicTranslationOptions = {
  /** Idioma em que o texto foi originalmente escrito. Default: `pt`. */
  sourceLocale?: LanguageCode;
  /** Desliga a tradução (ex.: campos que nunca devem ser traduzidos). */
  enabled?: boolean;
};

type TranslateBatchResponse = {
  translatedTexts?: unknown;
  fallback?: boolean;
};

// ---------------------------------------------------------------------------
// Cache (memória + localStorage de parse único)
// ---------------------------------------------------------------------------

/** Cache em memória: `${target}::${texto}` → tradução. */
const memoryCache = new Map<string, string>();

function memoryKeyFor(target: LanguageCode, text: string) {
  return `${target}::${text}`;
}

/** FNV-1a (32-bit) — só para encurtar a chave persistida. */
function hashText(text: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/** Chave persistida pedida: `${targetLanguage}_${hashDoTexto}` (+ tamanho p/ colisões). */
function persistedKeyFor(target: LanguageCode, text: string) {
  return `${target}_${hashText(text)}:${text.length}`;
}

/**
 * Store persistida já parseada — parse feito uma única vez por sessão.
 * A versão anterior parseava a store inteira em cada leitura/escrita.
 */
let persistedStore: Record<string, string> | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function ensurePersistedLoaded(): Record<string, string> {
  if (persistedStore !== null) return persistedStore;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    persistedStore =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, string>)
        : {};
  } catch {
    persistedStore = {}; // Indisponível/corrompido → só memória.
  }
  return persistedStore;
}

/** Escrita coalescida: N traduções na mesma janela = 1 `stringify`+`setItem`. */
function schedulePersist() {
  if (persistTimer !== null) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    if (persistedStore === null) return;
    try {
      const entries = Object.entries(persistedStore);
      const trimmed =
        entries.length > MAX_PERSISTED_ENTRIES
          ? Object.fromEntries(entries.slice(entries.length - MAX_PERSISTED_ENTRIES))
          : persistedStore;
      persistedStore = trimmed;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // Quota/modo privado: a camada em memória continua a funcionar.
    }
  }, PERSIST_DEBOUNCE_MS);
}

/** Hit síncrono (memória → persistida promovida a memória). Sem rede, sem parse repetido. */
function cacheGetSync(target: LanguageCode, text: string): string | undefined {
  const key = memoryKeyFor(target, text);
  const fromMemory = memoryCache.get(key);
  if (fromMemory !== undefined) {
    // LRU simples: re-inserir marca como recentemente usado.
    memoryCache.delete(key);
    memoryCache.set(key, fromMemory);
    return fromMemory;
  }
  if (typeof window === "undefined") return undefined;
  const fromStorage = ensurePersistedLoaded()[persistedKeyFor(target, text)];
  if (fromStorage !== undefined) {
    memoryCache.set(key, fromStorage);
    return fromStorage;
  }
  return undefined;
}

function cacheSet(target: LanguageCode, text: string, translated: string) {
  const key = memoryKeyFor(target, text);
  memoryCache.delete(key);
  memoryCache.set(key, translated);
  if (memoryCache.size > MAX_MEMORY_ENTRIES) {
    const oldest = memoryCache.keys().next().value;
    if (oldest !== undefined) memoryCache.delete(oldest);
  }
  if (typeof window === "undefined") return;
  ensurePersistedLoaded()[persistedKeyFor(target, text)] = translated;
  schedulePersist();
}

// ---------------------------------------------------------------------------
// Micro-batching global de rede
// ---------------------------------------------------------------------------

type Waiter = (translated: string | null) => void;

type PendingBatch = {
  source: LanguageCode;
  target: LanguageCode;
  items: Map<string, Waiter[]>;
  chars: number;
  timer: ReturnType<typeof setTimeout> | null;
};

const pendingBatches = new Map<string, PendingBatch>();
/** Textos já enviados e à espera de resposta — dedupe entre batches. */
const inFlight = new Map<string, Promise<string | null>>();

/** Um único POST com todos os textos; devolve mapa texto→tradução (só sucessos). */
async function fetchBatchFromApi(
  texts: string[],
  source: LanguageCode,
  target: LanguageCode,
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  try {
    const response = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        texts,
        sourceLanguage: source,
        targetLanguage: target,
      }),
    });
    const data = (await response.json().catch(() => null)) as
      | TranslateBatchResponse
      | null;

    if (
      !response.ok ||
      !data ||
      data.fallback ||
      !Array.isArray(data.translatedTexts) ||
      data.translatedTexts.length !== texts.length
    ) {
      return results; // Chamador mantém os originais.
    }

    const translatedList: unknown[] = data.translatedTexts;
    texts.forEach((text, index) => {
      const translated: unknown = translatedList[index];
      if (typeof translated === "string" && translated.length > 0) {
        cacheSet(target, text, translated);
        results.set(text, translated);
      }
    });
    return results;
  } catch {
    return results; // Offline/erro de rede → originais, sem ruído na UI.
  }
}

function flushBatch(batchKey: string) {
  const batch = pendingBatches.get(batchKey);
  if (!batch) return;
  pendingBatches.delete(batchKey);
  if (batch.timer !== null) clearTimeout(batch.timer);
  if (batch.items.size === 0) return;

  const entries = [...batch.items.entries()];
  const texts = entries.map(([text]) => text);

  const shared = fetchBatchFromApi(texts, batch.source, batch.target);
  for (const [text, waiters] of entries) {
    const key = memoryKeyFor(batch.target, text);
    const promise = shared.then((results) => results.get(text) ?? null);
    inFlight.set(key, promise);
    void promise.then((translated) => {
      inFlight.delete(key);
      for (const resolve of waiters) resolve(translated);
    });
  }
}

/**
 * Traduz um texto: cache síncrono → pedido em voo → fila de micro-batch.
 * Nunca lança; `null` = manter o original.
 */
function requestTranslation(
  text: string,
  source: LanguageCode,
  target: LanguageCode,
): Promise<string | null> {
  const cached = cacheGetSync(target, text);
  if (cached !== undefined) return Promise.resolve(cached);

  const key = memoryKeyFor(target, text);
  const flying = inFlight.get(key);
  if (flying) return flying;

  return new Promise<string | null>((resolve) => {
    const batchKey = `${source}->${target}`;
    let batch = pendingBatches.get(batchKey);
    if (!batch) {
      batch = {
        source,
        target,
        items: new Map(),
        chars: 0,
        timer: null,
      };
      pendingBatches.set(batchKey, batch);
    }

    const waiters = batch.items.get(text);
    if (waiters) {
      waiters.push(resolve);
      return;
    }
    batch.items.set(text, [resolve]);
    batch.chars += text.length;

    if (batch.items.size >= BATCH_MAX_ITEMS || batch.chars >= BATCH_MAX_CHARS) {
      flushBatch(batchKey); // Batch cheio: envia já, sem esperar pela janela.
      return;
    }
    if (batch.timer === null) {
      batch.timer = setTimeout(() => flushBatch(batchKey), BATCH_WINDOW_MS);
    }
  });
}

/**
 * Traduz um array inteiro de uma vez (dedupe + cache + chunks de 50).
 * Textos vazios/repetidos não geram rede. Nunca lança.
 */
export async function translateTexts(
  texts: readonly string[],
  target: LanguageCode,
  options: DynamicTranslationOptions = {},
): Promise<string[]> {
  const source = options.sourceLocale ?? defaultLocale;
  if ((options.enabled ?? true) === false || target === source) {
    return [...texts];
  }

  const results = [...texts];
  const missing = new Map<string, number[]>(); // texto → índices
  texts.forEach((text, index) => {
    if (text.trim().length === 0) return;
    const cached = cacheGetSync(target, text);
    if (cached !== undefined) {
      results[index] = cached;
      return;
    }
    const indexes = missing.get(text);
    if (indexes) indexes.push(index);
    else missing.set(text, [index]);
  });
  if (missing.size === 0) return results;

  const uniqueMissing = [...missing.keys()];
  try {
    for (let start = 0; start < uniqueMissing.length; start += BATCH_MAX_ITEMS) {
      const chunk = uniqueMissing.slice(start, start + BATCH_MAX_ITEMS);
      // requestTranslation volta a agrupar o chunk num único POST (janela de
      // micro-batch), e cada texto resolve individualmente a partir dele.
      const translated = await Promise.all(
        chunk.map((text) => requestTranslation(text, source, target)),
      );
      chunk.forEach((text, chunkIndex) => {
        const value = translated[chunkIndex];
        if (value) {
          for (const index of missing.get(text) ?? []) results[index] = value;
        }
      });
    }
  } catch {
    // Garantia absoluta: falha de API/rede/cache nunca propaga — devolve
    // os originais (com os hits de cache já aplicados em `results`).
  }
  return results;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export type DynamicTranslationState = {
  /** Texto a mostrar: original (origem/carregando/erro) ou traduzido. */
  text: string;
  /** True enquanto o pedido de tradução está em curso (p/ fade, nunca p/ bloquear). */
  isTranslating: boolean;
  /** True quando `text` é já a tradução (≠ original por tradução, não por acaso). */
  isTranslated: boolean;
};

export function useDynamicTranslationState(
  text: string | null | undefined,
  options: DynamicTranslationOptions = {},
): DynamicTranslationState {
  const { locale } = useLanguage();
  const source = options.sourceLocale ?? defaultLocale;
  const original = text ?? "";

  const needsTranslation =
    (options.enabled ?? true) &&
    original.trim().length > 0 &&
    locale !== source;

  // Nasce com o original: a página renderiza instantaneamente e a tradução
  // faz pop-in quando chega. `translatedFor` guarda a chave (idioma+texto)
  // a que `translatedText` pertence, para nunca mostrar uma tradução velha
  // de outro texto/idioma durante a transição.
  const [translatedText, setTranslatedText] = useState(original);
  const [translatedFor, setTranslatedFor] = useState<string | null>(null);
  const currentKey = needsTranslation ? memoryKeyFor(locale, original) : null;

  // Hit síncrono de cache (Map/memória): trocar de idioma para um texto já
  // traduzido mostra a tradução no primeiro render, sem pop-in nem rede.
  const cached = needsTranslation ? cacheGetSync(locale, original) : undefined;

  useEffect(() => {
    if (!needsTranslation || !currentKey) return;
    if (cacheGetSync(locale, original) !== undefined) return; // já resolvido no render

    let cancelled = false;
    void requestTranslation(original, source, locale)
      .then((translated) => {
        if (cancelled) return;
        setTranslatedText(translated ?? original);
        setTranslatedFor(currentKey);
      })
      .catch(() => {
        // Sem rede/API: fica o texto original, a UI nunca quebra.
        if (cancelled) return;
        setTranslatedText(original);
        setTranslatedFor(currentKey);
      });
    return () => {
      cancelled = true;
    };
  }, [needsTranslation, currentKey, original, source, locale]);

  if (!needsTranslation || !currentKey) {
    return { text: original, isTranslating: false, isTranslated: false };
  }
  if (cached !== undefined) {
    return { text: cached, isTranslating: false, isTranslated: true };
  }
  if (translatedFor === currentKey) {
    return {
      text: translatedText,
      isTranslating: false,
      isTranslated: translatedText !== original,
    };
  }
  // Em voo: original visível (o chamador pode aplicar fade via isTranslating).
  return { text: original, isTranslating: true, isTranslated: false };
}

/**
 * Versão simples (string): `const translated = useDynamicTranslation(goal.description)`.
 * Enquanto traduz — ou se falhar — devolve o texto original.
 */
export function useDynamicTranslation(
  text: string | null | undefined,
  options?: DynamicTranslationOptions,
): string {
  return useDynamicTranslationState(text, options).text;
}

export type DynamicTranslationsState = {
  /** Array alinhado com o input: original (ou cache) → tradução, por índice. */
  texts: string[];
  /** True enquanto o batch está em voo (p/ fade da lista, nunca p/ bloquear). */
  isTranslating: boolean;
};

/**
 * Batch para listas: recebe TODOS os textos de uma vez e faz **uma** chamada
 * à API (via micro-batching global), resolvendo com **um único setState**
 * para a lista inteira — em vez de um hook/fetch/re-render por cartão.
 */
export function useDynamicTranslations(
  texts: readonly (string | null | undefined)[],
  options: DynamicTranslationOptions = {},
): DynamicTranslationsState {
  const { locale } = useLanguage();
  const source = options.sourceLocale ?? defaultLocale;
  const enabled = (options.enabled ?? true) && locale !== source;

  // Chave de conteúdo: o array de entrada é recriado a cada render do chamador.
  const contentKey = JSON.stringify(texts.map((text) => text ?? ""));
  const originals = useMemo(
    () => texts.map((text) => text ?? ""),
    // contentKey cobre o conteúdo; `texts` muda de referência sem mudar valores.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contentKey],
  );
  const batchKey = enabled ? `${locale}::${contentKey}` : null;

  const [resolved, setResolved] = useState<{
    key: string;
    values: string[];
  } | null>(null);

  // O que mostrar já neste render: cache síncrono onde existir, original no resto.
  const immediate = useMemo(
    () =>
      originals.map((original) =>
        enabled && original.trim().length > 0
          ? (cacheGetSync(locale, original) ?? original)
          : original,
      ),
    [originals, enabled, locale],
  );
  const hasMissing =
    enabled &&
    originals.some(
      (original) =>
        original.trim().length > 0 && cacheGetSync(locale, original) === undefined,
    );

  useEffect(() => {
    if (!batchKey || !hasMissing) return;
    let cancelled = false;
    void translateTexts(originals, locale, { sourceLocale: source })
      .then((values) => {
        if (!cancelled) setResolved({ key: batchKey, values });
      })
      .catch(() => {
        // Fallback: `immediate` (originais/cache) continua visível.
      });
    return () => {
      cancelled = true;
    };
    // `originals`/`hasMissing` derivam de `batchKey` — incluí-los re-dispararia o efeito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchKey, locale, source]);

  const textsOut = useMemo(() => {
    if (!batchKey) return originals;
    if (resolved?.key === batchKey) return resolved.values;
    return immediate;
  }, [batchKey, originals, resolved, immediate]);

  return {
    texts: textsOut,
    isTranslating: Boolean(batchKey && hasMissing && resolved?.key !== batchKey),
  };
}

/** Limpa as caches (memória + persistente). Útil em logout/testes. */
export function clearDynamicTranslationCache() {
  memoryCache.clear();
  inFlight.clear();
  for (const batch of pendingBatches.values()) {
    if (batch.timer !== null) clearTimeout(batch.timer);
  }
  pendingBatches.clear();
  persistedStore = {};
  if (persistTimer !== null) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignora: localStorage indisponível.
  }
}
