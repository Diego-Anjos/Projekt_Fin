/**
 * Collection "ChatSessions" (histórico da Quantum.IA) no Appwrite:
 * 1. Defina NEXT_PUBLIC_APPWRITE_CHAT_COLLECTION_ID com o Collection ID
 *    exacto da consola Appwrite (não o nome da collection).
 * 2. Atributos: userId (string 255, required), title (string 255, required),
 *    messages (string 1_000_000, required — JSON stringified),
 *    createdAt (datetime, required). Índice key em `userId`.
 * 3. Document Security ON. Collection: Create para Users apenas.
 *    Remova permissões "Any" (Read/Update/Delete) na aba Settings —
 *    cada documento usa Permission.read/update/delete(Role.user(userId)).
 */
import { ID, Permission, Query, Role, type Models } from "appwrite";
import { appwriteConfig, databases } from "@/lib/appwrite/client";

export type StoredChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  emotion?: string;
};

export type ChatSessionDocument = Models.Document & {
  userId: string;
  title: string;
  /** JSON stringified de StoredChatMessage[]. */
  messages: string;
  createdAt: string;
};

function databaseId() {
  if (!appwriteConfig.databaseId) {
    throw new Error(
      "Defina NEXT_PUBLIC_APPWRITE_DATABASE_ID (database do Appwrite).",
    );
  }
  return appwriteConfig.databaseId;
}

/** ID dinâmico da collection — só via env (`appwriteConfig.chatCollectionId`). */
function chatCollectionId() {
  const id = appwriteConfig.chatCollectionId.trim();
  if (!id) {
    throw new Error(
      "Defina NEXT_PUBLIC_APPWRITE_CHAT_COLLECTION_ID no .env.local com o Collection ID real da consola Appwrite.",
    );
  }
  return id;
}

function ownerPermissions(userId: string) {
  const role = Role.user(userId);
  return [Permission.read(role), Permission.update(role), Permission.delete(role)];
}

export function parseStoredMessages(raw: string): StoredChatMessage[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is StoredChatMessage =>
        !!item &&
        typeof item === "object" &&
        typeof (item as StoredChatMessage).content === "string" &&
        ((item as StoredChatMessage).role === "user" ||
          (item as StoredChatMessage).role === "assistant"),
    );
  } catch {
    return [];
  }
}

/** Título local de último recurso (primeiras 4 palavras da 1.ª pergunta). */
export function fallbackChatTitle(messages: StoredChatMessage[]): string {
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

/**
 * Pede um título à IA (rota /api/chat/generate-title). Nunca lança:
 * em qualquer falha devolve o título local de recurso.
 */
export async function generateChatTitle(
  messages: StoredChatMessage[],
): Promise<string> {
  try {
    const response = await fetch("/api/chat/generate-title", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: messages.slice(0, 4).map(({ role, content }) => ({ role, content })),
      }),
    });
    if (!response.ok) return fallbackChatTitle(messages);
    const data = (await response.json().catch(() => null)) as { title?: unknown } | null;
    return typeof data?.title === "string" && data.title.trim()
      ? data.title.trim()
      : fallbackChatTitle(messages);
  } catch {
    return fallbackChatTitle(messages);
  }
}

export const CHAT_SESSIONS_UPDATED_EVENT = "chat-sessions-updated";

/** Dispara após create/update bem-sucedido — a sidebar (ou outros listeners) refetch. */
export function notifyChatSessionsUpdated(detail?: { sessionId?: string }) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(CHAT_SESSIONS_UPDATED_EVENT, { detail: detail ?? {} }),
  );
}

/**
 * Lista conversas recentes.
 * Em sucesso devolve o array (pode ser vazio). Em falha devolve `null`
 * para a UI NÃO sobrescrever estado otimista com lista vazia.
 */
export async function listChatSessions(
  userId: string,
  limit = 25,
): Promise<ChatSessionDocument[] | null> {
  try {
    if (!userId || !databaseId()) return [];
    // Sem orderDesc no servidor: evita exigir índice composto (equal + order).
    // Ordenamos por $createdAt no cliente.
    const response = await databases.listDocuments<ChatSessionDocument>(
      databaseId(),
      chatCollectionId(),
      [Query.equal("userId", userId), Query.limit(limit)],
    );
    return [...response.documents].sort(
      (a, b) =>
        new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime(),
    );
  } catch (error) {
    console.error(
      "[chat-sessions] listChatSessions falhou (collection/DB/permissões/índice?).",
      error,
    );
    return null;
  }
}

export async function createChatSession(input: {
  userId: string;
  title: string;
  messages: StoredChatMessage[];
}) {
  const collectionId = chatCollectionId();
  console.log("[chat-sessions] createDocument", {
    databaseId: databaseId(),
    collectionId,
    userId: input.userId,
    title: input.title.slice(0, 255),
    messageCount: input.messages.length,
  });
  return databases.createDocument<ChatSessionDocument>(
    databaseId(),
    collectionId,
    ID.unique(),
    {
      userId: input.userId,
      title: input.title.slice(0, 255),
      messages: JSON.stringify(input.messages),
      createdAt: new Date().toISOString(),
    },
    ownerPermissions(input.userId),
  );
}

export async function updateChatSession(
  documentId: string,
  messages: StoredChatMessage[],
  title?: string,
) {
  const payload: { messages: string; title?: string } = {
    messages: JSON.stringify(messages),
  };
  if (typeof title === "string" && title.trim()) {
    payload.title = title.trim().slice(0, 255);
  }
  console.log("[chat-sessions] updateDocument", {
    documentId,
    messageCount: messages.length,
    title: payload.title,
  });
  return databases.updateDocument<ChatSessionDocument>(
    databaseId(),
    chatCollectionId(),
    documentId,
    payload,
  );
}

export async function deleteChatSession(documentId: string) {
  return databases.deleteDocument(
    databaseId(),
    chatCollectionId(),
    documentId,
  );
}
