"use client";

import { fetchFinancialNews, type FinancialNews } from "@/services/newsApi";
import { Newspaper, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type NewsCategory = "Geral" | "Cripto" | "Ações" | "Macroeconomia";

const filters: NewsCategory[] = ["Geral", "Cripto", "Ações", "Macroeconomia"];

const categoryKeywords: Record<Exclude<NewsCategory, "Geral">, string[]> = {
  Cripto: ["bitcoin", "cripto", "ethereum", "blockchain", "stablecoin"],
  Ações: ["ação", "ações", "ibovespa", "bolsa", "b3", "petrobras", "vale"],
  Macroeconomia: [
    "selic",
    "inflação",
    "pib",
    "copom",
    "juros",
    "dólar",
    "cambio",
    "câmbio",
    "banco central",
  ],
};

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

function matchesCategory(article: FinancialNews, category: NewsCategory) {
  if (category === "Geral") return true;

  const text = `${article.title} ${article.summary}`.toLowerCase();
  return categoryKeywords[category].some((keyword) => text.includes(keyword));
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

export default function NoticiasPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<NewsCategory>("Geral");
  const [articles, setArticles] = useState<FinancialNews[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchFinancialNews()
      .then((news) => {
        if (!cancelled) setArticles(news);
      })
      .catch(() => {
        if (!cancelled) setArticles([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleArticles = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return articles.filter((article) => {
      const matchesTopic = matchesCategory(article, category);
      const matchesQuery =
        normalized.length === 0 ||
        article.title.toLowerCase().includes(normalized) ||
        article.summary.toLowerCase().includes(normalized) ||
        article.source.toLowerCase().includes(normalized);

      return matchesTopic && matchesQuery;
    });
  }, [articles, category, query]);

  const emptyMessage =
    articles.length === 0
      ? "Não foi possível carregar as notícias agora."
      : "Nenhuma notícia encontrada para essa busca.";

  return (
    <div className="flex w-full flex-col gap-6 px-6 py-8">
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
              value={query}
              onChange={(event) => setQuery(event.target.value)}
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
              const isActive = filter === category;

              return (
                <button
                  key={filter}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setCategory(filter)}
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
      ) : visibleArticles.length === 0 ? (
        <p className="rounded-xl border border-zinc-800 bg-black px-5 py-10 text-center text-sm text-zinc-400">
          {emptyMessage}
        </p>
      ) : (
        <section aria-label="Manchetes" className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visibleArticles.map((article) => (
            <article
              key={article.id}
              className="flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-black transition-colors duration-200 hover:border-emerald-500/50"
            >
              {article.image ? (
                <img
                  src={article.image}
                  alt=""
                  className="h-48 w-full bg-zinc-900 object-cover"
                />
              ) : (
                <div className="flex h-48 w-full items-center justify-center bg-zinc-900 text-zinc-600">
                  <Newspaper className="size-8" aria-hidden="true" />
                </div>
              )}
              <div className="flex flex-1 flex-col p-5">
                <p className="text-sm text-zinc-400">
                  {article.source}
                  <span aria-hidden="true"> · </span>
                  <time dateTime={article.publishedAt}>{formatRelativeTime(article.publishedAt)}</time>
                </p>
                <h2 className="mt-2 line-clamp-2 text-lg font-semibold text-zinc-100">
                  {article.title}
                </h2>
                <p className="mt-2 line-clamp-3 text-sm text-zinc-400">{article.summary}</p>
                <div className="mt-4 border-t border-zinc-800/50 pt-4">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-emerald-400 transition-colors duration-200 hover:text-emerald-300"
                  >
                    Ler artigo completo -&gt;
                  </a>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
