"use server";

export type FinancialNews = {
  id: string;
  title: string;
  summary: string;
  image: string | null;
  url: string;
  source: string;
  publishedAt: string;
};

type NewsApiArticle = {
  source?: { name?: string | null };
  title?: string | null;
  description?: string | null;
  url?: string | null;
  urlToImage?: string | null;
  publishedAt?: string | null;
};

type NewsApiResponse = {
  status?: string;
  articles?: NewsApiArticle[];
};

const EMPTY_SUMMARY = "Sem resumo disponível.";

function cleanText(value: string | null | undefined) {
  const text = value?.trim() ?? "";
  return text.length > 0 ? text : null;
}

function mapArticle(article: NewsApiArticle): FinancialNews | null {
  const title = cleanText(article.title);
  const url = cleanText(article.url);

  if (!title || !url || title === "[Removed]") return null;

  const image = cleanText(article.urlToImage);

  return {
    id: url,
    title,
    summary: cleanText(article.description) ?? EMPTY_SUMMARY,
    image,
    url,
    source: cleanText(article.source?.name) ?? "Fonte desconhecida",
    publishedAt: cleanText(article.publishedAt) ?? new Date(0).toISOString(),
  };
}

function mapArticles(articles: NewsApiArticle[] | undefined) {
  const seen = new Set<string>();

  return (articles ?? []).flatMap((article) => {
    const news = mapArticle(article);
    if (!news || seen.has(news.id)) return [];
    seen.add(news.id);
    return [news];
  });
}

async function requestNews(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "ProjektFinApp/1.0",
    },
    next: { revalidate: 3600 },
  });

  const payload = (await response.clone().json()) as NewsApiResponse;
  console.log(response.status, payload);

  if (!response.ok || payload.status !== "ok" || !Array.isArray(payload.articles)) {
    return [];
  }

  return mapArticles(payload.articles);
}

export async function fetchFinancialNews(): Promise<FinancialNews[]> {
  const apiKey = process.env.NEWS_API_KEY;

  if (!apiKey) return [];

  const key = encodeURIComponent(apiKey);
  const headlinesUrl = `https://newsapi.org/v2/top-headlines?country=br&category=business&apiKey=${key}`;
  const searchUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent("economia OR bolsa OR bitcoin OR selic")}&language=pt&sortBy=publishedAt&pageSize=12&apiKey=${key}`;

  try {
    const headlines = await requestNews(headlinesUrl);
    if (headlines.length > 0) return headlines;

    return await requestNews(searchUrl);
  } catch {
    return [];
  }
}
