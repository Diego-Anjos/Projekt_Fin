import {
  deleteCategory,
  deleteSubscription,
  deleteTransaction,
  getAllSubscriptions,
  getAllTransactions,
  getCategories,
  type CategoryDocument,
  type SubscriptionDocument,
  type TransactionDocument,
} from "@/lib/appwrite/database";
import { deleteGoal, getAllGoals, type GoalDocument } from "@/lib/appwrite/goals";

export type UserDataSnapshot = {
  transactions: TransactionDocument[];
  goals: GoalDocument[];
  subscriptions: SubscriptionDocument[];
  categories: CategoryDocument[];
};

export const EMPTY_USER_DATA: UserDataSnapshot = {
  transactions: [],
  goals: [],
  subscriptions: [],
  categories: [],
};

export function countUserData(data: UserDataSnapshot) {
  return (
    data.transactions.length + data.goals.length + data.subscriptions.length + data.categories.length
  );
}

/** Carrega (paginado) todos os documentos do utilizador, para exportação ou exclusão. */
export async function fetchAllUserData(userId: string): Promise<UserDataSnapshot> {
  const [transactions, goals, subscriptions, categories] = await Promise.all([
    getAllTransactions(userId),
    getAllGoals(userId),
    getAllSubscriptions(userId),
    getCategories(userId),
  ]);

  return { transactions, goals, subscriptions, categories };
}

const DELETE_BATCH_SIZE = 10;

async function deleteInBatches<T>(
  items: T[],
  deleteItem: (item: T) => Promise<unknown>,
): Promise<number> {
  let failures = 0;

  for (let index = 0; index < items.length; index += DELETE_BATCH_SIZE) {
    const batch = items.slice(index, index + DELETE_BATCH_SIZE);
    const results = await Promise.allSettled(batch.map((item) => deleteItem(item)));
    failures += results.filter((result) => result.status === "rejected").length;
  }

  return failures;
}

/**
 * Apaga todos os documentos do utilizador (transações, metas + imagens,
 * assinaturas e categorias). Se algo falhar, lança erro antes de a sessão
 * ser encerrada — os registos restantes podem ser apagados numa nova
 * tentativa, porque a operação é idempotente.
 */
export async function deleteAllUserData(userId: string): Promise<void> {
  const data = await fetchAllUserData(userId);

  const failures =
    (await deleteInBatches(data.goals, (goal) => deleteGoal(goal.$id, goal.imageId))) +
    (await deleteInBatches(data.transactions, (transaction) => deleteTransaction(transaction.$id))) +
    (await deleteInBatches(data.subscriptions, (subscription) =>
      deleteSubscription(subscription.$id),
    )) +
    (await deleteInBatches(data.categories, (category) => deleteCategory(category.$id)));

  if (failures > 0) {
    throw new Error(
      `Não foi possível apagar ${failures} ${failures === 1 ? "registo" : "registos"}. Tente novamente para concluir a exclusão.`,
    );
  }
}
