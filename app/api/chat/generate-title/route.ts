import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { isApiAuthError, requireApiSession } from "@/lib/appwrite/api-auth";
import { sanitizeChatInput } from "@/lib/validation/chat";

/**
 * POST /api/chat/generate-title — título curto (3–4 palavras) para uma
 * conversa da Quantum.IA, a partir da primeira interação (pergunta do
 * utilizador + primeira resposta da IA).
 *
 * Nunca deve quebrar o chat: sem GEMINI_API_KEY, com o provider em baixo
 * ou com qualquer erro, devolve 200 com um título de recurso derivado das
 * primeiras palavras da pergunta (`fallback: true`).
 */

export const runtime = "nodejs";

const MAX_MESSAGES = 4;
const MAX_MESSAGE_CHARS = 2_000;
const MODEL_QUEUE = [
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash",
] as const;

const SYSTEM_PROMPT =
  "Baseado nesta interação, crie um título curto de no máximo 3 a 4 palavras para esta conversa financeira. Retorne APENAS o título, sem aspas ou pontuação final.";

type IncomingMessage = { role: "user" | "assistant"; content: string };

function isIncomingMessage(value: unknown): value is IncomingMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Record<string, unknown>;
  return (
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string" &&
    message.content.trim().length > 0
  );
}

/** Primeiras 4 palavras da primeira pergunta — título de último recurso. */
function fallbackTitle(messages: IncomingMessage[]): string {
  const firstUser = messages.find((message) => message.role === "user");
  const words = (firstUser?.content ?? "Nova conversa")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 4)
    .join(" ");
  return words || "Nova conversa";
}

/** Remove aspas/pontuação final, quebras de linha e força o limite de palavras. */
function cleanTitle(raw: string): string {
  const cleaned = raw
    .replace(/[\r\n]+/g, " ")
    .trim()
    .replace(/^["'“”«]+|["'“”»]+$/g, "")
    .replace(/[.!?…:;,\s]+$/u, "")
    .trim();
  return cleaned.split(/\s+/).filter(Boolean).slice(0, 4).join(" ").slice(0, 60);
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

  const rawMessages = (body as { messages?: unknown })?.messages;
  const messages = (Array.isArray(rawMessages) ? rawMessages : [])
    .filter(isIncomingMessage)
    .slice(0, MAX_MESSAGES)
    .map((message) => ({
      role: message.role,
      content: sanitizeChatInput(message.content, MAX_MESSAGE_CHARS),
    }))
    .filter((message) => message.content.length > 0);

  if (!messages.some((message) => message.role === "user")) {
    return NextResponse.json(
      { error: "É necessária pelo menos uma mensagem do utilizador." },
      { status: 400 },
    );
  }

  const fallback = fallbackTitle(messages);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ title: fallback, fallback: true });
  }

  const interaction = messages
    .map((message) => `${message.role === "user" ? "Utilizador" : "Assistente"}: ${message.content}`)
    .join("\n");

  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError: unknown;
  for (const modelName of MODEL_QUEUE) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: SYSTEM_PROMPT,
        generationConfig: { temperature: 0.3, maxOutputTokens: 32 },
      });
      const result = await model.generateContent(interaction);
      const title = cleanTitle(result.response.text());
      if (title) return NextResponse.json({ title, fallback: false });
      throw new Error("O modelo devolveu um título vazio.");
    } catch (error) {
      lastError = error;
      console.error(`[api/chat/generate-title] falha em ${modelName}:`, error);
    }
  }

  console.error("[api/chat/generate-title] todos os modelos falharam:", lastError);
  return NextResponse.json({ title: fallback, fallback: true });
}
