import { NextResponse } from "next/server";
import { isApiAuthError, requireApiSession } from "@/lib/appwrite/api-auth";

const financialDomains =
  "infomoney.com.br,exame.com,valor.globo.com,investnews.com.br,sunoresearch.com.br,bloomberglinea.com.br";

const generalQuery = "(economia OR finanças OR mercado OR investimentos)";

type NewsApiPayload = {
  status?: string;
  articles?: unknown;
};

function isNewsPayload(value: unknown): value is NewsApiPayload {
  return Boolean(value) && typeof value === "object";
}

export async function GET(request: Request) {
  const auth = await requireApiSession(request);
  if (isApiAuthError(auth)) return auth.error;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const apiKey = process.env.NEWS_API_KEY;

  if (!apiKey || apiKey === "sua_chave_aqui") {
    return NextResponse.json(
      { error: "Chave da NewsAPI não configurada." },
      { status: 500 },
    );
  }

  if (q.length > 200) {
    return NextResponse.json([]);
  }

  const articles = await loadArticles(newsUrl(apiKey, q));
  return NextResponse.json(articles);
}

function newsUrl(apiKey: string, q: string) {
  const term = !q || q.toLowerCase() === "geral" ? generalQuery : q;
  const url = new URL("https://newsapi.org/v2/everything");
  url.searchParams.set("q", term);
  url.searchParams.set("domains", financialDomains);
  url.searchParams.set("language", "pt");
  url.searchParams.set("sortBy", "publishedAt");
  url.searchParams.set("apiKey", apiKey);
  return url;
}

async function loadArticles(url: URL): Promise<unknown[]> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "ProjektFinApp/1.0" },
      next: { revalidate: 3600 },
    });

    if (!response.ok) return [];

    const payload: unknown = await response.json();
    if (!isNewsPayload(payload) || payload.status !== "ok" || !Array.isArray(payload.articles)) {
      return [];
    }

    return payload.articles;
  } catch {
    return [];
  }
}
