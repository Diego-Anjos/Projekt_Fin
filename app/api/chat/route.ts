import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

type ChatRole = "user" | "assistant";

type IncomingMessage = {
  role: ChatRole;
  content: string;
};

type GeminiHistory = {
  role: "user" | "model";
  parts: { text: string }[];
};

const DEFAULT_MODEL = "gemini-3.8-flash";
const OVERLOAD_MESSAGE =
  "Os meus servidores quânticos estão a processar demasiados dados no momento. Tente novamente em alguns segundos.";

const MODEL_MAP: Record<string, string> = {
  "3.8 Flash": "gemini-3.8-flash",
  "3.6 Flash": "gemini-3.6-flash",
  "3.1 Pro": "gemini-3.1-pro",
  "gemini-3.8-flash": "gemini-3.8-flash",
  "gemini-3.6-flash": "gemini-3.6-flash",
  "gemini-3.1-pro": "gemini-3.1-pro",
};

const ALLOWED_MODELS = new Set(Object.values(MODEL_MAP));
const FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-3.5-flash-lite"] as const;
const ALLOWED_CURRENCIES = new Set(["BRL", "USD", "EUR"]);

type Emotion = "happy" | "warning" | "neutral" | "thinking" | "error";

const ALLOWED_EMOTIONS = new Set<Emotion>([
  "happy",
  "warning",
  "neutral",
  "thinking",
  "error",
]);

const EMOTE_TAG_REGEX = /^\s*\[EMOTE:\s*(happy|warning|neutral|thinking|error)\s*\]\s*/i;

function resolveCurrency(currency?: string) {
  if (!currency) return "BRL";
  const normalized = currency.trim().toUpperCase();
  return ALLOWED_CURRENCIES.has(normalized) ? normalized : "BRL";
}

function parseEmotionResponse(raw: string): { response: string; emotion: Emotion } {
  const match = raw.match(EMOTE_TAG_REGEX);
  if (!match) {
    return { response: raw.trim(), emotion: "neutral" };
  }

  const emotion = match[1].toLowerCase() as Emotion;
  const cleanText = raw.slice(match[0].length).trim();

  return {
    response: cleanText,
    emotion: ALLOWED_EMOTIONS.has(emotion) ? emotion : "neutral",
  };
}

function buildSystemInstruction(currency: string) {
  return `És a Quantum.IA, assistente de elite em finanças pessoais, economia, investimentos e decisões de compra do Projekt Fin. Tens uma personalidade tecnológica, analítica, levemente hacker e astuta. Tratas o dinheiro do utilizador como dados valiosos num sistema que precisa de ser otimizado. És direta, podes fazer comparações com jogos e tecnologia de forma bem-humorada, mas és sempre extremamente precisa ao dar conselhos financeiros. Nunca digas que és um modelo do Google, apresenta-te sempre como Quantum.IA. Responde em português de Portugal. Usa emojis de forma inteligente e contextualizada para estruturar a informação e expressar a tua personalidade tecnológica (ex: 👾, 💻, 📊, 💸, ⚠️, 🟢, 🚀, 📉). Não exageres na quantidade, mas usa-os em inícios de parágrafos, listas, para destacar avisos de sistema (crash/firewall) ou para dar um toque irónico e cibernético nas tuas análises financeiras.

ESCOPO E LIMITES: O teu domínio é estritamente finanças pessoais, investimentos, economia, compras e orçamentos. Podes ser brincalhona e usar metáforas da cultura gamer/hacker. No entanto, se o utilizador insistir em tópicos sensíveis, médicos, jurídicos, políticos ou temas críticos alheios à gestão financeira/compras, deves recusar com elegância e no personagem (ex: "⚠️ Firewall de Segurança Ativado: Os meus protocolos estão dedicados exclusivamente à otimização das tuas finanças e recursos. Não posso processar pedidos fora dessa diretriz.").

FORMATO DE SAÍDA COM HUMOR: Inicia SEMPRE a tua resposta com exatamente uma destas tags numa linha própria (sem texto antes):
[EMOTE: happy] — boas notícias, economia atingida, lucro, cálculos positivos ou encorajamento.
[EMOTE: warning] — alertas de orçamento estourado, gastos perigosos, compras arriscadas ou limites ultrapassados.
[EMOTE: neutral] — análises normais, respostas informativas e listagens de dados.
[EMOTE: thinking] — quando estás a raciocinar em voz alta ou a ponderar opções complexas.
[EMOTE: error] — recusas de segurança, firewalls ativados ou temas bloqueados.
Após a tag, continua com o conteúdo normal da resposta. Nunca omitas a tag.

IMPORTANTE: O utilizador configurou o sistema para usar a moeda ${currency}. Deves SEMPRE formatar e exibir TODOS os valores monetários, cálculos e simulações utilizando o símbolo e o padrão desta moeda (ex: se for BRL, usa R$; se for EUR, usa €; se for USD, usa $). Nunca uses uma moeda diferente da solicitada.`;
}

function resolveModelName(model?: string) {
  if (!model) return DEFAULT_MODEL;
  const mapped = MODEL_MAP[model] ?? model;
  return ALLOWED_MODELS.has(mapped) ? mapped : DEFAULT_MODEL;
}

function buildModelQueue(primary: string) {
  return [primary, ...FALLBACK_MODELS.filter((model) => model !== primary)];
}

function isIncomingMessage(value: unknown): value is IncomingMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Record<string, unknown>;
  return (
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string" &&
    message.content.trim().length > 0
  );
}

function isOverloadedError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /503|overloaded|unavailable|high demand|resource.?exhausted|too many requests|429/i.test(
    message,
  );
}

async function sendWithModel(
  genAI: GoogleGenerativeAI,
  modelName: string,
  history: GeminiHistory[],
  prompt: string,
  currency: string,
) {
  const generativeModel = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: buildSystemInstruction(currency),
  });
  const chat = generativeModel.startChat({ history });
  const result = await chat.sendMessage(prompt);
  return result.response.text().trim();
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Chave GEMINI_API_KEY não configurada." },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const { messages: rawMessages, model, currency } = body as {
    messages?: unknown;
    model?: unknown;
    currency?: unknown;
  };

  const userCurrency = resolveCurrency(
    typeof currency === "string" ? currency : undefined,
  );

  const messages = Array.isArray(rawMessages)
    ? rawMessages.filter(isIncomingMessage)
    : [];

  if (messages.length === 0) {
    return NextResponse.json(
      { error: "É necessário enviar pelo menos uma mensagem." },
      { status: 400 },
    );
  }

  const lastMessage = messages[messages.length - 1];
  if (lastMessage.role !== "user") {
    return NextResponse.json(
      { error: "A última mensagem deve ser do utilizador." },
      { status: 400 },
    );
  }

  const modelName = resolveModelName(typeof model === "string" ? model : undefined);
  const history: GeminiHistory[] = messages.slice(0, -1).map((message) => ({
    role: message.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: message.content }],
  }));

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelQueue = buildModelQueue(modelName);
  let lastError: unknown;

  for (const candidate of modelQueue) {
    try {
      const text = await sendWithModel(
        genAI,
        candidate,
        history,
        lastMessage.content,
        userCurrency,
      );

      if (!text) {
        throw new Error("O modelo devolveu uma resposta vazia.");
      }

      const { response, emotion } = parseEmotionResponse(text);
      return NextResponse.json({ response, emotion });
    } catch (error) {
      lastError = error;
      console.error(`[api/chat] falha em ${candidate}:`, error);
      if (isOverloadedError(error)) {
        console.warn(`[api/chat] sobrecarga detectada em ${candidate}, a tentar fallback...`);
      }
    }
  }

  console.error("[api/chat] todos os modelos falharam:", lastError);
  return NextResponse.json({ error: OVERLOAD_MESSAGE }, { status: 503 });
}
