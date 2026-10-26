"use client";

import { useDynamicTranslations } from "@/hooks/use-dynamic-translation";
import { useTranslation } from "@/hooks/use-translation";
import { getApiAuthHeaders, markAppSession } from "@/lib/appwrite/session";
import { Newspaper, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

/** Id estável da categoria — o rótulo visível vem de `t()`, nunca do id. */
type NewsCategory = "geral" | "cripto" | "acoes" | "macro";

type NewsArticle = {
  source?: { name?: string | null } | null;
  title?: string | null;
  description?: string | null;
  url?: string | null;
  urlToImage?: string | null;
  publishedAt?: string | null;
};

const filters: { id: NewsCategory; labelKey: string }[] = [
  { id: "geral", labelKey: "news.categoryGeneral" },
  { id: "cripto", labelKey: "news.categoryCrypto" },
  { id: "acoes", labelKey: "news.categoryStocks" },
  { id: "macro", labelKey: "news.categoryMacro" },
];

/**
 * Termos exatos enviados à NewsAPI (`everything`). Ficam em PT de propósito:
 * a rota pesquisa `language=pt` + domínios financeiros — traduzir a query
 * quebraria os resultados.
 */
const filterQueries: Record<Exclude<NewsCategory, "geral">, string> = {
  cripto: "bitcoin OR ethereum OR criptomoeda OR criptoativos OR crypto",
  acoes: "ibovespa OR \"bolsa de valores\" OR \"ações\" OR B3 OR \"mercado de ações\"",
  macro: "Selic OR COPOM OR inflação OR PIB OR \"juros\" OR \"política monetária\"",
};

function isNewsArticle(value: unknown): value is NewsArticle {
  if (!value || typeof value !== "object") return false;
  const article = value as NewsArticle;

  return (
    typeof article.title === "string" &&
    article.title.trim().length > 0 &&
    article.title !== "[Removed]" &&
    typeof article.url === "string" &&
    article.url.trim().length > 0
  );
}

type Translate = (key: string, params?: Record<string, string | number>) => string;

function formatRelativeTime(isoDate: string, t: Translate) {
  const published = new Date(isoDate);
  if (Number.isNaN(published.getTime())) return t("news.now");

  const minutes = Math.max(0, Math.round((Date.now() - published.getTime()) / 60000));
  if (minutes < 1) return t("news.now");
  if (minutes < 60) return t("news.minutesAgo", { count: minutes });

  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? t("news.oneHourAgo") : t("news.hoursAgo", { count: hours });

  const days = Math.round(hours / 24);
  return days === 1 ? t("news.oneDayAgo") : t("news.daysAgo", { count: days });
}

function newsPath(activeFilter: NewsCategory, search: string) {
  const term = search.trim();
  const q = term || (activeFilter === "geral" ? "" : filterQueries[activeFilter]);
  if (!q) return "/api/news";
  return `/api/news?q=${encodeURIComponent(q)}`;
}

function NewsCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-black">
      <div className="h-48 w-full animate-pulse bg-zinc-900" />
      <div className="flex flex-1 flex-col p-5">
        <div className="h-4 w-36 animate-pulse rounded bg-zinc-800" />
        <div className="mt-3 h-5 w-full animate-pulse rounded bg-zinc-800" />
        <div className="mt-2 h-5 w-4/5 animate-pulse rounded bg-zinc-800" />
        <div className="mt-4 h-4 w-full animate-pulse rounded bg-zinc-800" />
        <div className="mt-2 h-4 w-full animate-pulse rounded bg-zinc-800" />
        <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-zinc-800" />
        <div className="mt-4 border-t border-zinc-800/50 pt-4">
          <div className="h-4 w-40 animate-pulse rounded bg-zinc-800" />
        </div>
      </div>
    </div>
  );
}

function ArticleCover({ src }: { src: string | null | undefined }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="flex h-48 w-full items-center justify-center bg-zinc-900 text-zinc-600">
        <Newspaper className="size-8" aria-hidden="true" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      onError={() => setFailed(true)}
      className="h-48 w-full bg-zinc-900 object-cover"
    />
  );
}

/**
 * Cartão de notícia — componente **apresentacional puro** (sem hooks de
 * tradução). A página traduz todos os títulos/resumos de uma vez com
 * `useDynamicTranslations` (1 pedido para a lista inteira) e passa os
 * textos já resolvidos por props; enquanto o batch está em voo, o cartão
 * mostra os originais com fade (`opacity-60` + transição), sem bloquear
 * a renderização. A fonte (nome do jornal) não é traduzida — nome próprio.
 */
function NewsArticleCard({
  article,
  translatedTitle,
  translatedDescription,
  isTranslating,
}: {
  article: NewsArticle;
  translatedTitle: string;
  translatedDescription: string;
  isTranslating: boolean;
}) {
  const { t } = useTranslation();
  const url = article.url?.trim() ?? "";
  const rawDescription = article.description?.trim() ?? "";
  const source = article.source?.name?.trim() || t("news.unknownSource");
  const publishedAt = article.publishedAt?.trim() || "";
  const description = rawDescription ? translatedDescription : t("news.noDescription");
  const fadeClassName = `transition-opacity duration-300 ${
    isTranslating ? "opacity-60" : "opacity-100"
  }`;

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-black transition-colors duration-200 hover:border-emerald-500/50">
      <ArticleCover src={article.urlToImage} />
      <div className="flex flex-1 flex-col p-5">
        <p className="text-sm text-zinc-400">
          {source}
          <span aria-hidden="true"> · </span>
          <time dateTime={publishedAt || undefined}>{formatRelativeTime(publishedAt, t)}</time>
        </p>
        <h2 className={`mt-2 line-clamp-2 text-lg font-semibold text-zinc-100 ${fadeClassName}`}>
          {translatedTitle}
        </h2>
        <p className={`mt-2 line-clamp-3 text-sm text-zinc-400 ${fadeClassName}`}>{description}</p>
        <div className="mt-4 border-t border-zinc-800/50 pt-4">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-emerald-400 transition-colors duration-200 hover:text-emerald-300"
          >
            {t("news.readFullArticle")}
          </a>
        </div>
      </div>
    </article>
  );
}

export default function NoticiasPage() {
  const { t } = useTranslation();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<NewsCategory>("geral");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchNews(path: string) {
      await markAppSession();
      if (controller.signal.aborted) return null;

      const authHeaders = await getApiAuthHeaders();
      if (controller.signal.aborted) return null;

      return fetch(path, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
      });
    }

    async function loadNews() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const path = newsPath(activeFilter, debouncedSearch);
        let response = await fetchNews(path);
        if (!response || controller.signal.aborted) return;

        // Retentativa após re-sync se a sessão ainda não estava no cookie.
        if (response.status === 401) {
          response = await fetchNews(path);
          if (!response || controller.signal.aborted) return;
        }

        const data: unknown = await response.json();
        if (controller.signal.aborted) return;

        if (!response.ok || !Array.isArray(data)) {
          setArticles([]);
          setLoadError(t("news.loadError"));
          return;
        }

        setArticles(data.filter(isNewsArticle));
        setLoadError(null);
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setArticles([]);
        setLoadError(t("news.loadError"));
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadNews();

    return () => controller.abort();
  }, [activeFilter, debouncedSearch, t]);

  // Batch único de tradução: todos os títulos + resumos da lista num só
  // pedido (a página renderiza já com os originais; quando o batch chega,
  // UM setState atualiza todos os cartões — sem hooks/fetch por cartão).
  const translatableTexts = useMemo(
    () =>
      articles.flatMap((article) => [
        article.title?.trim() ?? "",
        article.description?.trim() ?? "",
      ]),
    [articles],
  );
  const { texts: translatedTexts, isTranslating: isTranslatingArticles } =
    useDynamicTranslations(translatableTexts);

  const emptyMessage = loadError ?? t("news.empty");

  return (
    <div className="flex w-full flex-col gap-4 md:gap-6">
      <header className="rounded-2xl border border-emerald-950/80 bg-gradient-to-r from-[#041610] to-[#0a241a] px-6 py-8 sm:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
            {t("news.title")}
          </h1>
          <p className="mt-2 text-sm text-emerald-100/70 sm:text-base">
            {t("news.subtitle")}
          </p>
          <label className="relative mt-6 block">
            <span className="sr-only">{t("news.searchNews")}</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-emerald-300/80"
              aria-hidden="true"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("news.searchPlaceholder")}
              className="h-12 w-full rounded-2xl border border-emerald-800/50 bg-[#041610] pr-4 pl-12 text-sm text-zinc-100 outline-none transition-colors duration-200 placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </label>
          <div
            role="group"
            aria-label={t("news.filterAria")}
            className="mt-4 flex flex-wrap items-center justify-center gap-2"
          >
            {filters.map((filter) => {
              const isActive = filter.id === activeFilter;

              return (
                <button
                  key={filter.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => {
                    setSearch("");
                    setDebouncedSearch("");
                    setActiveFilter(filter.id);
                  }}
                  className={
                    isActive
                      ? "rounded-full border border-emerald-500 bg-emerald-500/15 px-4 py-1.5 text-sm font-medium text-emerald-400"
                      : "rounded-full border border-zinc-700/80 bg-black/40 px-4 py-1.5 text-sm font-medium text-zinc-300 transition-colors duration-200 hover:border-emerald-500/50 hover:text-emerald-300"
                  }
                >
                  {t(filter.labelKey)}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {isLoading ? (
        <section
          aria-label={t("news.loadingAria")}
          aria-busy="true"
          className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
        >
          {Array.from({ length: 6 }, (_, index) => (
            <NewsCardSkeleton key={index} />
          ))}
        </section>
      ) : articles.length === 0 ? (
        <p className="rounded-xl border border-zinc-800 bg-black px-5 py-10 text-center text-sm text-zinc-400">
          {emptyMessage}
        </p>
      ) : (
        <section aria-label={t("news.headlinesAria")} className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {articles.map((article, index) => (
            <NewsArticleCard
              key={article.url?.trim()}
              article={article}
              translatedTitle={translatedTexts[index * 2] ?? article.title?.trim() ?? ""}
              translatedDescription={translatedTexts[index * 2 + 1] ?? ""}
              isTranslating={isTranslatingArticles}
            />
          ))}
        </section>
      )}
    </div>
  );
}
