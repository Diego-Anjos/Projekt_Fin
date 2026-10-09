import { Account, Client, Databases, Users } from "node-appwrite";

function requireEnv(
  name:
    | "NEXT_PUBLIC_APPWRITE_ENDPOINT"
    | "NEXT_PUBLIC_APPWRITE_PROJECT_ID"
    | "APPWRITE_API_KEY"
    | "NEXT_PUBLIC_APPWRITE_DATABASE_ID"
    | "NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID"
    | "NEXT_PUBLIC_APPWRITE_SUBSCRIPTIONS_COLLECTION_ID",
) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Variável de ambiente em falta: ${name}`);
  }

  return value;
}

if (typeof window !== "undefined") {
  throw new Error("lib/appwrite/server.ts só pode ser importado em Server Components, Route Handlers ou Server Actions.");
}

const client = new Client()
  .setEndpoint(requireEnv("NEXT_PUBLIC_APPWRITE_ENDPOINT"))
  .setProject(requireEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID"))
  .setKey(requireEnv("APPWRITE_API_KEY"));

export const appwriteConfig = {
  databaseId: requireEnv("NEXT_PUBLIC_APPWRITE_DATABASE_ID"),
  transactionsCollectionId: requireEnv("NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID"),
  subscriptionsCollectionId: requireEnv("NEXT_PUBLIC_APPWRITE_SUBSCRIPTIONS_COLLECTION_ID"),
};

export const appwriteServerClient = client;
export const account = new Account(client);
export const databases = new Databases(client);
export const users = new Users(client);
