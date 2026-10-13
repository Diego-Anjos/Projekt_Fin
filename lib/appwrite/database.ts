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

export async function getTransactions(userId: string, limit = 10) {
  return databases.listDocuments<TransactionDocument>(
    appwriteConfig.databaseId,
    appwriteConfig.transactionsCollectionId,
    [Query.equal("userId", userId), Query.orderDesc("date"), Query.limit(limit)],
  );
}

const TRANSACTION_PAGE_SIZE = 100;

export async function getAllTransactions(userId: string) {
  const documents: TransactionDocument[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < 20; page += 1) {
    const queries = [
      Query.equal("userId", userId),
      Query.orderDesc("date"),
      Query.limit(TRANSACTION_PAGE_SIZE),
    ];
    if (cursor) queries.push(Query.cursorAfter(cursor));

    let response: Models.DocumentList<TransactionDocument>;
    try {
      response = await databases.listDocuments<TransactionDocument>(
        appwriteConfig.databaseId,
        appwriteConfig.transactionsCollectionId,
        queries,
      );
    } catch (error) {
      if (documents.length > 0) return documents;
      throw error;
    }

    documents.push(...response.documents);
    if (response.documents.length < TRANSACTION_PAGE_SIZE) break;

    const nextCursor = response.documents[response.documents.length - 1]?.$id;
    if (!nextCursor || nextCursor === cursor) break;
    cursor = nextCursor;
  }

  return documents;
}

export async function getSubscriptions(userId: string) {
  return databases.listDocuments<SubscriptionDocument>(
    appwriteConfig.databaseId,
    appwriteConfig.subscriptionsCollectionId,
    [Query.equal("userId", userId)],
  );
}

function toTransactionPayload(data: TransactionInput) {
  return {
    userId: data.userId,
    type: data.type,
    description: data.description,
    category: data.category,
    date: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
    amount: Number(data.amount),
    status: data.status,
  };
}

export async function createTransaction(data: TransactionInput) {
  return databases.createDocument<TransactionDocument>(
    appwriteConfig.databaseId,
    appwriteConfig.transactionsCollectionId,
    ID.unique(),
    toTransactionPayload(data),
    ownerPermissions(data.userId),
  );
}

export async function updateTransaction(documentId: string, data: TransactionInput) {
  return databases.updateDocument<TransactionDocument>(
    appwriteConfig.databaseId,
    appwriteConfig.transactionsCollectionId,
    documentId,
    toTransactionPayload(data),
  );
}

export async function deleteTransaction(documentId: string) {
  return databases.deleteDocument(
    appwriteConfig.databaseId,
    appwriteConfig.transactionsCollectionId,
    documentId,
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

export const deleteSubscription = async (documentId: string) => {
  return await databases.deleteDocument(
    appwriteConfig.databaseId,
    appwriteConfig.subscriptionsCollectionId,
    documentId,
  );
};

export async function updateSubscription(documentId: string, data: SubscriptionInput) {
  return databases.updateDocument<SubscriptionDocument>(
    appwriteConfig.databaseId,
    appwriteConfig.subscriptionsCollectionId,
    documentId,
    {
      userId: data.userId,
      name: data.name,
      amount: data.amount,
      cycle: data.cycle,
      subscribedAt: data.subscribedAt,
      nextDue: data.nextDue,
      payment: data.payment,
      status: data.status || "active",
    },
  );
}
