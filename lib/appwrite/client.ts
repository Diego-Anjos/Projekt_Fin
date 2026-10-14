import { Account, Client, Databases, Storage } from "appwrite";

// Acesso direto e estático para o Next.js conseguir substituir no build
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

if (!endpoint || !projectId) {
  console.error("Variáveis de ambiente do Appwrite em falta no cliente.");
}

const client = new Client()
  .setEndpoint(endpoint || "https://cloud.appwrite.io/v1")
  .setProject(projectId || "");

export const appwriteClient = client;
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// Temporário: cole o ID real da Collection "Categories" em NEXT_PUBLIC_APPWRITE_CATEGORIES_COLLECTION_ID no .env.local e reinicie o servidor.
export const appwriteCategoriesCollectionId = process.env.NEXT_PUBLIC_APPWRITE_CATEGORIES_COLLECTION_ID;

if (!appwriteCategoriesCollectionId) {
  console.log(
    "Cole o ID real da Collection \"Categories\" na variável NEXT_PUBLIC_APPWRITE_CATEGORIES_COLLECTION_ID do ficheiro .env.local e reinicie o servidor de desenvolvimento.",
  );
}

export const appwriteConfig = {
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID as string,
  transactionsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID as string,
  subscriptionsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_SUBSCRIPTIONS_COLLECTION_ID as string,
  categoriesCollectionId: appwriteCategoriesCollectionId ?? "",
  avatarsBucketId: process.env.NEXT_PUBLIC_APPWRITE_AVATARS_BUCKET_ID ?? "",
};
