/**
 * Parcelas na collection de transações (atributos opcionais):
 * - groupId (String, tamanho 36, opcional) — liga as parcelas da mesma compra
 * - installmentNumber (Integer, opcional) — número desta parcela (1, 2, 3…)
 * - totalInstallments (Integer, opcional) — total de parcelas do grupo
 * Sem estes atributos, uma compra parcelada falha ao gravar. Transações
 * normais continuam a funcionar, porque os campos só são enviados quando existem.
 */
/**
 * Collection "Categories" no Database do Appwrite:
 * 1. Crie a collection com o nome Categories.
 * 2. Atributos: "name" (string, required) e "userId" (string, required).
 * 3. Index em "userId", para filtrar as categorias do utilizador autenticado.
 * 4. Document Security ON. Collection permissions: apenas Create para Users
 *    (Role: users). DESATIVE permissões globais "Any" de Read/Update/Delete
 *    na aba Settings — o isolamento é por documento (Permission.* Role.user).
 * 5. Copie o ID da collection para NEXT_PUBLIC_APPWRITE_CATEGORIES_COLLECTION_ID.
 *
 * O mesmo aplica-se a Transactions, Subscriptions, Goals e ChatSessions:
 * Appwrite Console → Collection → Settings → Permissions → remover "Any".
 */
import { ID, Permission, Query, Role, type Models } from "appwrite";
import { appwriteCategoriesCollectionId, appwriteConfig, databases } from "@/lib/appwrite/client";
import { addInstallmentMonths, splitInstallmentAmounts } from "@/lib/installments";

export type TransactionDocument = Models.Document & {
  userId: string;
  type: "income" | "expense";
  description: string;
  category: string;
  date: string;
  amount: number;
  status: "Paid" | "Pending";
  /** Liga as parcelas da mesma compra. Ausente em transações avulsas. */
  groupId?: string | null;
  installmentNumber?: number | null;
  totalInstallments?: number | null;
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

export type TransactionPageFilters = {
  status?: "Paid" | "Pending";
  /** Mês no formato "YYYY-MM". Filtrado no servidor por intervalo de datas. */
  month?: string;
};

/** Último instante (exclusivo) do mês seguinte, para o intervalo [início, fim). */
function nextMonthStart(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const next = new Date(Date.UTC(year, monthNumber, 1));
  return next.toISOString();
}

export async function getTransactions(
  userId: string,
  limit = 10,
  offset = 0,
  filters: TransactionPageFilters = {},
) {
  const queries = [
    Query.equal("userId", userId),
    Query.orderDesc("date"),
    Query.limit(limit),
    Query.offset(offset),
  ];

  if (filters.status) queries.push(Query.equal("status", filters.status));
  if (filters.month) {
    queries.push(Query.greaterThanEqual("date", `${filters.month}-01T00:00:00.000Z`));
    queries.push(Query.lessThan("date", nextMonthStart(filters.month)));
  }

  return databases.listDocuments<TransactionDocument>(
    appwriteConfig.databaseId,
    appwriteConfig.transactionsCollectionId,
    queries,
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

export async function getSubscriptions(userId: string, limit = 10, offset = 0) {
  return databases.listDocuments<SubscriptionDocument>(
    appwriteConfig.databaseId,
    appwriteConfig.subscriptionsCollectionId,
    [
      Query.equal("userId", userId),
      Query.orderDesc("$createdAt"),
      Query.limit(limit),
      Query.offset(offset),
    ],
  );
}

const SUBSCRIPTION_PAGE_SIZE = 100;

/** Todas as assinaturas do utilizador (pagina com cursor), para alertas/dashboard. */
export async function getAllSubscriptions(userId: string) {
  const documents: SubscriptionDocument[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < 20; page += 1) {
    const queries = [
      Query.equal("userId", userId),
      Query.orderAsc("nextDue"),
      Query.limit(SUBSCRIPTION_PAGE_SIZE),
    ];
    if (cursor) queries.push(Query.cursorAfter(cursor));

    const response = await databases.listDocuments<SubscriptionDocument>(
      appwriteConfig.databaseId,
      appwriteConfig.subscriptionsCollectionId,
      queries,
    );

    documents.push(...response.documents);
    if (response.documents.length < SUBSCRIPTION_PAGE_SIZE) break;

    const nextCursor = response.documents[response.documents.length - 1]?.$id;
    if (!nextCursor || nextCursor === cursor) break;
    cursor = nextCursor;
  }

  return documents;
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
    ...(data.groupId ? { groupId: data.groupId } : {}),
    ...(data.installmentNumber != null
      ? { installmentNumber: Math.trunc(data.installmentNumber) }
      : {}),
    ...(data.totalInstallments != null
      ? { totalInstallments: Math.trunc(data.totalInstallments) }
      : {}),
  };
}

export async function createTransaction(data: TransactionInput) {
  if (!data.userId) {
    throw new Error("userId é obrigatório para criar uma transação.");
  }
  const amount = Number(data.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("O valor da transação deve ser um número positivo.");
  }

  return databases.createDocument<TransactionDocument>(
    appwriteConfig.databaseId,
    appwriteConfig.transactionsCollectionId,
    ID.unique(),
    toTransactionPayload(data),
    ownerPermissions(data.userId),
  );
}

/**
 * Grava uma compra parcelada: um documento por mês, ligados pelo mesmo groupId.
 * A primeira parcela usa o status escolhido; as seguintes ficam pendentes.
 */
export async function createInstallmentTransactions(data: TransactionInput, totalInstallments: number) {
  if (!data.userId) {
    throw new Error("userId é obrigatório para criar parcelas.");
  }
  const totalAmount = Number(data.amount);
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    throw new Error("O valor da compra parcelada deve ser um número positivo.");
  }

  const count = Math.trunc(totalInstallments);
  const groupId = ID.unique();
  const amounts = splitInstallmentAmounts(totalAmount, count);
  const permissions = ownerPermissions(data.userId);
  const creates: Promise<TransactionDocument>[] = [];

  for (let installmentNumber = 1; installmentNumber <= count; installmentNumber += 1) {
    creates.push(
      databases.createDocument<TransactionDocument>(
        appwriteConfig.databaseId,
        appwriteConfig.transactionsCollectionId,
        ID.unique(),
        toTransactionPayload({
          ...data,
          amount: amounts[installmentNumber - 1] ?? 0,
          date: addInstallmentMonths(data.date, installmentNumber - 1),
          status: installmentNumber === 1 ? data.status : "Pending",
          groupId,
          installmentNumber,
          totalInstallments: count,
        }),
        permissions,
      ),
    );
  }

  return Promise.all(creates);
}

export async function updateTransaction(documentId: string, data: TransactionInput) {
  return databases.updateDocument<TransactionDocument>(
    appwriteConfig.databaseId,
    appwriteConfig.transactionsCollectionId,
    documentId,
    toTransactionPayload(data),
  );
}

export type CategoryDocument = Models.Document & {
  userId: string;
  name: string;
};

function categoriesCollectionId() {
  if (!appwriteCategoriesCollectionId) {
    throw new Error(
      "Defina NEXT_PUBLIC_APPWRITE_CATEGORIES_COLLECTION_ID com o ID da collection Categories.",
    );
  }
  return appwriteCategoriesCollectionId;
}

export async function getCategories(userId: string) {
  if (!appwriteCategoriesCollectionId) return [];

  const response = await databases.listDocuments<CategoryDocument>(
    appwriteConfig.databaseId,
    appwriteCategoriesCollectionId,
    [Query.equal("userId", userId), Query.limit(100)],
  );

  if (response.documents.length === 0) return [];

  return [...response.documents].sort((left, right) =>
    left.name.localeCompare(right.name, "pt-BR"),
  );
}

export async function createCategory(userId: string, name: string) {
  return databases.createDocument<CategoryDocument>(
    appwriteConfig.databaseId,
    categoriesCollectionId(),
    ID.unique(),
    {
      name,
      userId,
    },
    ownerPermissions(userId),
  );
}

export async function deleteCategory(documentId: string) {
  return databases.deleteDocument(
    appwriteConfig.databaseId,
    categoriesCollectionId(),
    documentId,
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

    const response = await databases.createDocument<SubscriptionDocument>(
      appwriteConfig.databaseId,
      appwriteConfig.subscriptionsCollectionId,
      ID.unique(),
      payload,
      ownerPermissions(data.userId),
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
