/**
 * Collection "ChatSessions" (histórico da Quantum.IA) no Appwrite:
 * 1. Crie a collection com ID `chatsessions` (ou defina
 *    NEXT_PUBLIC_APPWRITE_CHAT_SESSIONS_COLLECTION_ID com o ID criado).
 * 2. Atributos: userId (string 255, required), title (string 255, required),
 *    messages (string 1_000_000, required — JSON stringified),
 *    createdAt (datetime, required). Índice key em `userId`.
 * 3. Permissões da collection: Users com Create/Read/Update/Delete e
 *    Document Security ativa (cada documento só é do dono).
 *    Automático: `node scripts/setup-chat-sessions.cjs` (requer uma API key
 *    com scope `collections.write`; sem esse scope, crie na consola).
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

function chatSessionsCollectionId() {
  if (!appwriteConfig.chatSessionsCollectionId) {
    throw new Error(
      "Defina NEXT_PUBLIC_APPWRITE_CHAT_SESSIONS_COLLECTION_ID (collection ChatSessions).",
    );
  }
  return appwriteConfig.chatSessionsCollectionId;
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

export async function listChatSessions(userId: string, limit = 25) {
  const response = await databases.listDocuments<ChatSessionDocument>(
    appwriteConfig.databaseId,
    chatSessionsCollectionId(),
    [
      Query.equal("userId", userId),
      Query.orderDesc("$createdAt"),
      Query.limit(limit),
    ],
  );
  return response.documents;
}

export async function createChatSession(input: {
  userId: string;
  title: string;
  messages: StoredChatMessage[];
}) {
  return databases.createDocument<ChatSessionDocument>(
    appwriteConfig.databaseId,
    chatSessionsCollectionId(),
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
) {
  return databases.updateDocument<ChatSessionDocument>(
    appwriteConfig.databaseId,
    chatSessionsCollectionId(),
    documentId,
    { messages: JSON.stringify(messages) },
  );
}

export async function deleteChatSession(documentId: string) {
  return databases.deleteDocument(
    appwriteConfig.databaseId,
    chatSessionsCollectionId(),
    documentId,
  );
}
