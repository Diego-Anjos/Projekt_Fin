import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { isApiAuthError, requireApiSession } from "@/lib/appwrite/api-auth";
import {
  formatFinancialContextForPrompt,
  parseFinancialContext,
} from "@/lib/chat/financial-context";

export const runtime = "nodejs";

const MAX_TIP_CHARS = 150;
const MODEL_QUEUE = [
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash",
] as const;

const ALLOWED_CURRENCIES = new Set(["BRL", "USD", "EUR"]);
const ALLOWED_LOCALES = new Set(["pt", "en", "es", "fr", "it", "ja"]);

const LOCALE_LANGUAGE: Record<string, string> = {
  pt: "português do Brasil",
  en: "English",
  es: "español",
  fr: "français",
  it: "italiano",
  ja: "日本語",
};

const SYSTEM_PROMPT = `Você é a Quantum.IA. Baseado nestes dados financeiros do utilizador, gere APENAS UMA dica financeira curta, prática e motivacional (máximo de 2 frases e 150 caracteres). Não use saudações, vá direto ao ponto. Exemplo: "Notei que gastou muito em alimentação este mês. Que tal cozinhar mais em casa para poupar?".

Regras:
- Responda APENAS com o texto da dica, sem aspas, sem prefixos e sem markdown.
- Não invente valores: use apenas os dados fornecidos.
- Se os dados forem escassos, dê uma dica geral útil sobre hábitos financeiros.
- Nunca diga que é um modelo do Google; apresenta-te sempre como Quantum.IA apenas se for indispensável (de preferência nem te apresentes).`;

function resolveCurrency(currency?: string) {
  if (!currency) return "BRL";
  const normalized = currency.trim().toUpperCase();
  return ALLOWED_CURRENCIES.has(normalized) ? normalized : "BRL";
}

function resolveLocale(locale?: string) {
  if (!locale) return "pt";
  const normalized = locale.trim().toLowerCase().slice(0, 2);
  return ALLOWED_LOCALES.has(normalized) ? normalized : "pt";
}

/** Remove aspas/markdown e força o limite de caracteres. */
function cleanTip(raw: string) {
  const cleaned = raw
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^["'“”«]+|["'“”»]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length <= MAX_TIP_CHARS) return cleaned;

  const truncated = cleaned.slice(0, MAX_TIP_CHARS);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 80 ? truncated.slice(0, lastSpace) : truncated).trim();
}

export async function POST(request: Request) {
  const auth = await requireApiSession(request);
  if (isApiAuthError(auth)) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const payload = body as {
    financialContext?: unknown;
    currency?: unknown;
    locale?: unknown;
  };

  const financialContext = parseFinancialContext(payload.financialContext);
  if (!financialContext) {
    return NextResponse.json(
      { error: "Contexto financeiro inválido ou em falta." },
      { status: 400 },
    );
  }

  const currency = resolveCurrency(
    typeof payload.currency === "string" ? payload.currency : undefined,
  );
  const locale = resolveLocale(typeof payload.locale === "string" ? payload.locale : undefined);
  const language = LOCALE_LANGUAGE[locale] ?? LOCALE_LANGUAGE.pt;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Chave GEMINI_API_KEY não configurada." },
      { status: 500 },
    );
  }

  const systemInstruction = `${SYSTEM_PROMPT}

${formatFinancialContextForPrompt(financialContext)}

IMPORTANTE: Escreve a dica em ${language}. Formata valores monetários na moeda ${currency}.`;

  const userPrompt =
    "Gera agora a dica do dia com base nos dados acima. Responde só com a dica.";

  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError: unknown;

  for (const modelName of MODEL_QUEUE) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 120,
        },
      });
      const result = await model.generateContent(userPrompt);
      const tip = cleanTip(result.response.text());
      if (tip) {
        return NextResponse.json({ tip });
      }
      throw new Error("O modelo devolveu uma dica vazia.");
    } catch (error) {
      lastError = error;
      console.error(`[api/daily-tip] falha em ${modelName}:`, error);
    }
  }

  console.error("[api/daily-tip] todos os modelos falharam:", lastError);
  return NextResponse.json(
    { error: "Não foi possível gerar a dica do dia." },
    { status: 502 },
  );
}
