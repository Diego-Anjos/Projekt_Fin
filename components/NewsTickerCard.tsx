"use client";

import { fetchFinancialNews, type FinancialNews } from "@/services/newsApi";
import { Newspaper } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const HEADLINE_LIMIT = 10;

export function NewsTickerCard() {
  const [news, setNews] = useState<FinancialNews[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetchFinancialNews()
      .then((articles) => {
        if (!cancelled) setNews(articles.slice(0, HEADLINE_LIMIT));
      })
      .catch(() => {
        if (!cancelled) setNews([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (news.length === 0) return;

    const interval = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % news.length);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [news.length]);

  const headline = news[currentIndex];
  const className =
    "flex h-20 items-center gap-3 rounded-xl border border-zinc-700/50 bg-black px-3 transition-colors duration-200 hover:border-emerald-500/50";

  const body = (
    <>
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-100">
        <Newspaper className="size-3.5" aria-hidden="true" />
      </span>
      {headline ? (
        <p
          key={headline.id}
          className="line-clamp-2 text-sm font-medium leading-5 text-zinc-100 opacity-100 transition-opacity duration-500 starting:opacity-0"
        >
          {headline.title}
        </p>
      ) : (
        <p className="text-sm font-medium text-zinc-400">A carregar...</p>
      )}
    </>
  );

  if (!headline) {
    return (
      <Link href="/noticias" className={className} aria-busy="true">
        {body}
      </Link>
    );
  }

  return (
    <a
      href={headline.url}
      target="_blank"
      rel="noreferrer"
      className={className}
      aria-live="polite"
    >
      {body}
    </a>
  );
}
