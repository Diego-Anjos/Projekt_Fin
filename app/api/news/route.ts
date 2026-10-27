import { NextResponse } from "next/server";
import { isApiAuthError, requireApiSession } from "@/lib/appwrite/api-auth";

const financialDomains =
  "infomoney.com.br,exame.com,valor.globo.com,investnews.com.br,sunoresearch.com.br,bloomberglinea.com.br";

/** Query financeira forte quando não usamos top-headlines/business. */
const generalQuery =
  '("economia" OR "finanças" OR "mercado financeiro" OR "ibovespa" OR "bolsa de valores" OR "investimentos")';

/** Em desenvolvimento, permite testar a UI/NewsAPI sem cookie `pf_aw_session`. Remover antes de produção. */
const SKIP_AUTH_IN_DEV = process.env.NODE_ENV === "development";

/** Títulos claramente fora de finanças/economia (ruído político/geral). */
const OFF_TOPIC_TITLE =
  /\b(eleição|eleições|eleitoral|candidat[oa]s?|partido político|congresso nacional|senado federal|câmara dos deputados|cancelamento de voos?|greve (de|dos|nas)|futebol|copa do mundo|celebridade)\b/i;

type NewsApiPayload = {
  status?: string;
  articles?: unknown;
};

type NewsArticle = {
  title?: string | null;
  description?: string | null;
};

function isNewsPayload(value: unknown): value is NewsApiPayload {
  return Boolean(value) && typeof value === "object";
}

function isOffTopic(article: unknown): boolean {
  if (!article || typeof article !== "object") return true;
  const { title, description } = article as NewsArticle;
  const text = `${title ?? ""} ${description ?? ""}`;
  return OFF_TOPIC_TITLE.test(text);
}

export async function GET(request: Request) {
  try {
    if (SKIP_AUTH_IN_DEV) {
      console.warn(
        "[api/news] AUTH BYPASS ativo (NODE_ENV=development). Não usar em produção.",
      );
    } else {
      const auth = await requireApiSession(request, "api/news");
      if (isApiAuthError(auth)) return auth.error;
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const apiKey = process.env.NEWS_API_KEY;

    // Misconfiguração / rate-limit / falha externa → [] (UI mostra empty state).
    if (!apiKey || apiKey === "sua_chave_aqui") {
      console.warn("[api/news] NEWS_API_KEY ausente ou placeholder — a servir [].");
      return NextResponse.json([]);
    }

    if (q.length > 200) {
      return NextResponse.json([]);
    }

    const isGeneral = !q || q.toLowerCase() === "geral";

    // Aba Geral: top-headlines business (BR) — evita política/assuntos gerais.
    if (isGeneral) {
      const headlines = await loadArticles(topHeadlinesBusinessUrl(apiKey));
      if (headlines.length > 0) {
        return NextResponse.json(headlines.filter((article) => !isOffTopic(article)));
      }

      const fallback = await loadArticles(everythingUrl(apiKey, generalQuery));
      return NextResponse.json(fallback.filter((article) => !isOffTopic(article)));
    }

    const articles = await loadArticles(everythingUrl(apiKey, q));
    return NextResponse.json(articles.filter((article) => !isOffTopic(article)));
  } catch (error) {
    console.error("[api/news] erro inesperado:", error);
    return NextResponse.json([]);
  }
}

function topHeadlinesBusinessUrl(apiKey: string) {
  const url = new URL("https://newsapi.org/v2/top-headlines");
  url.searchParams.set("country", "br");
  url.searchParams.set("category", "business");
  url.searchParams.set("pageSize", "30");
  url.searchParams.set("apiKey", apiKey);
  return url;
}

function everythingUrl(apiKey: string, q: string) {
  const url = new URL("https://newsapi.org/v2/everything");
  url.searchParams.set("q", q);
  url.searchParams.set("domains", financialDomains);
  url.searchParams.set("language", "pt");
  url.searchParams.set("sortBy", "publishedAt");
  url.searchParams.set("pageSize", "40");
  url.searchParams.set("apiKey", apiKey);
  return url;
}

async function loadArticles(url: URL): Promise<unknown[]> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "ProjektFinApp/1.0" },
      next: { revalidate: 1800 },
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
