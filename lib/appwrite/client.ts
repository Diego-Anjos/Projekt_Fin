import { Account, Client, Databases, Storage } from "appwrite";

/**
 * Acesso direto e estático às env públicas — o Next.js só faz inline
 * de `process.env.NEXT_PUBLIC_*` quando a chave aparece literalmente no código.
 * Sem fallbacks: undefined no build da Vercel quebraria o endpoint/projeto
 * e geraria CORS ou 404 no Appwrite.
 */
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

if (!endpoint || !projectId) {
  throw new Error(
    "NEXT_PUBLIC_APPWRITE_ENDPOINT e NEXT_PUBLIC_APPWRITE_PROJECT_ID são obrigatórios. " +
      "Defina-os no .env.local e nas Environment Variables da Vercel.",
  );
}

const client = new Client().setEndpoint(endpoint).setProject(projectId);

export const appwriteClient = client;
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// Temporário: cole o ID real da Collection "Categories" em NEXT_PUBLIC_APPWRITE_CATEGORIES_COLLECTION_ID no .env.local e reinicie o servidor.
export const appwriteCategoriesCollectionId =
  process.env.NEXT_PUBLIC_APPWRITE_CATEGORIES_COLLECTION_ID;

if (!appwriteCategoriesCollectionId) {
  console.log(
    'Cole o ID real da Collection "Categories" na variável NEXT_PUBLIC_APPWRITE_CATEGORIES_COLLECTION_ID do ficheiro .env.local e reinicie o servidor de desenvolvimento.',
  );
}

export const appwriteConfig = {
  endpoint,
  projectId,
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "",
  transactionsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID || "",
  subscriptionsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_SUBSCRIPTIONS_COLLECTION_ID || "",
  goalsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_GOALS_COLLECTION_ID || "",
  /**
   * ID real da collection de histórico de chat (Appwrite Console → Collection ID).
   * Preferir NEXT_PUBLIC_APPWRITE_CHAT_COLLECTION_ID; a env antiga ainda é aceite.
   * Sem fallback hardcoded — o ID gerado na consola não é "chatsessions".
   */
  chatCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_CHAT_COLLECTION_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_CHAT_SESSIONS_COLLECTION_ID ||
    "",
  /** @deprecated Use `chatCollectionId`. */
  chatSessionsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_CHAT_COLLECTION_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_CHAT_SESSIONS_COLLECTION_ID ||
    "",
  categoriesCollectionId: appwriteCategoriesCollectionId || "",
  avatarsBucketId: process.env.NEXT_PUBLIC_APPWRITE_AVATARS_BUCKET_ID || "",
  goalsBucketId: process.env.NEXT_PUBLIC_APPWRITE_GOALS_BUCKET_ID || "",
};
