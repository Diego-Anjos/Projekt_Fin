"use client";

import { Newspaper, Search } from "lucide-react";
import { useEffect, useState } from "react";

type NewsCategory = "Geral" | "Cripto" | "Ações" | "Macroeconomia";

type NewsArticle = {
  source?: { name?: string | null } | null;
  title?: string | null;
  description?: string | null;
  url?: string | null;
  urlToImage?: string | null;
  publishedAt?: string | null;
};

const filters: NewsCategory[] = ["Geral", "Cripto", "Ações", "Macroeconomia"];

const filterQueries: Record<Exclude<NewsCategory, "Geral">, string> = {
  Cripto: "cripto OR bitcoin OR ethereum",
  Ações: "ações OR bolsa OR ibovespa",
  Macroeconomia: "selic OR copom OR inflação OR pib",
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

function formatRelativeTime(isoDate: string) {
  const published = new Date(isoDate);
  if (Number.isNaN(published.getTime())) return "Agora";

  const minutes = Math.max(0, Math.round((Date.now() - published.getTime()) / 60000));
  if (minutes < 1) return "Agora";
  if (minutes < 60) return `Há ${minutes} min`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? "Há 1 hora" : `Há ${hours} horas`;

  const days = Math.round(hours / 24);
  return days === 1 ? "Há 1 dia" : `Há ${days} dias`;
}

function newsPath(activeFilter: NewsCategory, search: string) {
  const term = search.trim();
  const q = term || (activeFilter === "Geral" ? "" : filterQueries[activeFilter]);
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

export default function NoticiasPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<NewsCategory>("Geral");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadNews() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const response = await fetch(newsPath(activeFilter, debouncedSearch), {
          signal: controller.signal,
        });
        const data: unknown = await response.json();

        if (controller.signal.aborted) return;

        if (!response.ok || !Array.isArray(data)) {
          setArticles([]);
          setLoadError("Não foi possível carregar as notícias agora.");
          return;
        }

        setArticles(data.filter(isNewsArticle));
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setArticles([]);
        setLoadError("Não foi possível carregar as notícias agora.");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadNews();

    return () => controller.abort();
  }, [activeFilter, debouncedSearch]);

  const emptyMessage = loadError ?? "Nenhuma notícia encontrada para essa busca.";

  return (
    <div className="flex w-full flex-col gap-4 md:gap-6">
      <header className="rounded-2xl border border-emerald-950/80 bg-gradient-to-r from-[#041610] to-[#0a241a] px-6 py-8 sm:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
            Notícias do Mercado
          </h1>
          <p className="mt-2 text-sm text-emerald-100/70 sm:text-base">
            As principais manchetes de economia e finanças em tempo real
          </p>
          <label className="relative mt-6 block">
            <span className="sr-only">Pesquisar notícias</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-emerald-300/80"
              aria-hidden="true"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pesquisar manchete, fonte ou tema..."
              className="h-12 w-full rounded-2xl border border-emerald-800/50 bg-[#041610] pr-4 pl-12 text-sm text-zinc-100 outline-none transition-colors duration-200 placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </label>
          <div
            role="group"
            aria-label="Filtrar notícias por tema"
            className="mt-4 flex flex-wrap items-center justify-center gap-2"
          >
            {filters.map((filter) => {
              const isActive = filter === activeFilter;

              return (
                <button
                  key={filter}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => {
                    setSearch("");
                    setDebouncedSearch("");
                    setActiveFilter(filter);
                  }}
                  className={
                    isActive
                      ? "rounded-full border border-emerald-500 bg-emerald-500/15 px-4 py-1.5 text-sm font-medium text-emerald-400"
                      : "rounded-full border border-zinc-700/80 bg-black/40 px-4 py-1.5 text-sm font-medium text-zinc-300 transition-colors duration-200 hover:border-emerald-500/50 hover:text-emerald-300"
                  }
                >
                  {filter}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {isLoading ? (
        <section
          aria-label="Carregando notícias"
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
        <section aria-label="Manchetes" className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {articles.map((article) => {
            const title = article.title?.trim() ?? "";
            const url = article.url?.trim() ?? "";
            const description = article.description?.trim() || "Sem resumo disponível.";
            const source = article.source?.name?.trim() || "Fonte desconhecida";
            const publishedAt = article.publishedAt?.trim() || "";

            return (
              <article
                key={url}
                className="flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-black transition-colors duration-200 hover:border-emerald-500/50"
              >
                <ArticleCover src={article.urlToImage} />
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-sm text-zinc-400">
                    {source}
                    <span aria-hidden="true"> · </span>
                    <time dateTime={publishedAt || undefined}>{formatRelativeTime(publishedAt)}</time>
                  </p>
                  <h2 className="mt-2 line-clamp-2 text-lg font-semibold text-zinc-100">{title}</h2>
                  <p className="mt-2 line-clamp-3 text-sm text-zinc-400">{description}</p>
                  <div className="mt-4 border-t border-zinc-800/50 pt-4">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-emerald-400 transition-colors duration-200 hover:text-emerald-300"
                    >
                      Ler artigo completo -&gt;
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
