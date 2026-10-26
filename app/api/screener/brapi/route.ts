import { NextResponse } from "next/server";
import { isApiAuthError, requireApiSession } from "@/lib/appwrite/api-auth";

const ALLOWED_TYPES = new Set(["stock", "fund", "bdr"]);

/** Em desenvolvimento, permite testar a UI/Brapi sem cookie `pf_aw_session`. Remover antes de produção. */
const SKIP_AUTH_IN_DEV = process.env.NODE_ENV === "development";

type BrapiListResponse = {
  stocks?: unknown;
};

function isBrapiList(value: unknown): value is BrapiListResponse {
  return Boolean(value) && typeof value === "object" && Array.isArray((value as BrapiListResponse).stocks);
}

export async function GET(request: Request) {
  if (SKIP_AUTH_IN_DEV) {
    console.warn(
      "[api/screener/brapi] AUTH BYPASS ativo (NODE_ENV=development). Não usar em produção.",
    );
  } else {
    const auth = await requireApiSession(request, "api/screener/brapi");
    if (isApiAuthError(auth)) return auth.error;
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "stock";
  const token = process.env.BRAPI_TOKEN;

  console.log("--- DEBUG BRAPI ---");
  console.log(
    "Token carregado no Node?",
    token ? "Sim (Oculto)" : "NÃO! Faltando no .env",
  );

  if (!token || token === "sua_chave_aqui") {
    return NextResponse.json(
      { error: "Token da API ausente" },
      { status: 500 },
    );
  }

  if (!ALLOWED_TYPES.has(type)) {
    return NextResponse.json({ error: "Tipo de ativo inválido." }, { status: 400 });
  }

  const url = new URL("https://brapi.dev/api/quote/list");
  url.searchParams.set("type", type);
  url.searchParams.set("sortBy", "volume");
  url.searchParams.set("sortOrder", "desc");
  url.searchParams.set("token", token);

  console.log(
    "Brapi URL (token omitido):",
    `${url.origin}${url.pathname}?type=${type}&sortBy=volume&sortOrder=desc&token=***`,
  );

  let response: Response;
  try {
    response = await fetch(url, { next: { revalidate: 60 } });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível consultar a Brapi." },
      { status: 502 },
    );
  }

  if (!response.ok) {
    console.error("--- DEBUG BRAPI --- status externo:", response.status);
    return NextResponse.json(
      { error: "A Brapi retornou uma resposta inválida." },
      { status: 502 },
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return NextResponse.json(
      { error: "Não foi possível ler a resposta da Brapi." },
      { status: 502 },
    );
  }

  if (!isBrapiList(payload)) {
    return NextResponse.json(
      { error: "A resposta da Brapi está incompleta." },
      { status: 502 },
    );
  }

  return NextResponse.json(payload);
}
