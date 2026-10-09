import { ID, Permission, Query, Role, type Models } from "appwrite";
import { appwriteConfig, databases } from "@/lib/appwrite/client";

export type TransactionDocument = Models.Document & {
  userId: string;
  type: "income" | "expense";
  description: string;
  category: string;
  date: string;
  amount: number;
  status: "Paid" | "Pending";
};

export type SubscriptionDocument = Models.Document & {
  userId: string;
  name: string;
  amount: number;
  cycle: "monthly" | "yearly";
  subscribedAt: string;
  nextDue: string;
  payment: "credit" | "pix" | "boleto";
  status: string;
};

export type TransactionInput = Omit<TransactionDocument, keyof Models.Document>;
export type SubscriptionInput = Omit<SubscriptionDocument, keyof Models.Document>;

function ownerPermissions(userId: string) {
  const role = Role.user(userId);

  return [Permission.read(role), Permission.update(role), Permission.delete(role)];
}

export async function getTransactions(userId: string) {
  return databases.listDocuments<TransactionDocument>(
    appwriteConfig.databaseId,
    appwriteConfig.transactionsCollectionId,
    [Query.equal("userId", userId), Query.orderDesc("date"), Query.limit(10)],
  );
}

export async function getSubscriptions(userId: string) {
  return databases.listDocuments<SubscriptionDocument>(
    appwriteConfig.databaseId,
    appwriteConfig.subscriptionsCollectionId,
    [Query.equal("userId", userId)],
  );
}

export async function createTransaction(data: TransactionInput) {
  return databases.createDocument<TransactionDocument>(
    appwriteConfig.databaseId,
    appwriteConfig.transactionsCollectionId,
    ID.unique(),
    data,
    ownerPermissions(data.userId),
  );
}

export async function createSubscription(data: SubscriptionInput) {
  console.log("=== INÍCIO CREATE SUBSCRIPTION ===");
  console.log("1. Recebido em database.ts:", data);

  if (!data.userId) {
    console.error("❌ ERRO CRÍTICO: userId está ausente nos dados recebidos!");
    throw new Error("userId é obrigatório para criar uma assinatura.");
  }

  try {
    const payload = {
      userId: data.userId,
      name: data.name,
      amount: data.amount,
      cycle: data.cycle,
      subscribedAt: data.subscribedAt || new Date().toISOString(),
      nextDue: data.nextDue || new Date().toISOString(),
      payment: data.payment,
      status: data.status || "active",
    };

    console.log("2. Payload formatado para enviar:", payload);
    console.log("3. Usando DatabaseID:", appwriteConfig.databaseId);
    console.log("4. Usando CollectionID (Subscriptions):", appwriteConfig.subscriptionsCollectionId);

    const permissions = [
      Permission.read(Role.user(data.userId)),
      Permission.update(Role.user(data.userId)),
      Permission.delete(Role.user(data.userId)),
    ];

    const response = await databases.createDocument<SubscriptionDocument>(
      appwriteConfig.databaseId,
      appwriteConfig.subscriptionsCollectionId,
      ID.unique(),
      payload,
      permissions,
    );

    console.log("✅ 5. Sucesso ao criar no Appwrite:", response);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ 5. ERRO DO APPWRITE SDK:", error);
    console.error("Mensagem exata:", message);
    throw error;
  }
}
