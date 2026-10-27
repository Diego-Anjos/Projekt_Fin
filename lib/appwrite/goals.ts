/**
 * Collection "Goals" no Database do Appwrite:
 * 1. Crie a collection com o nome Goals.
 * 2. Atributos:
 *    - userId (string, required)
 *    - title (string, required)
 *    - description (string 255, optional)
 *    - targetAmount (float/double, required)
 *    - currentAmount (float/double, required)
 *    - targetDate (datetime ou string, required)
 *    - category (string, required)
 *    - imageId (string, optional)
 *    - isCompleted (boolean, required)
 * 3. Index em "userId".
 * 4. Document Security ON. Collection: Create para Users.
 *    Remova "Any" em Read/Update/Delete na aba Settings.
 * 5. Copie o ID para NEXT_PUBLIC_APPWRITE_GOALS_COLLECTION_ID.
 *
 * Bucket de imagens de metas:
 * 1. Crie um bucket (ex: goals-images) com permissão de leitura para Users.
 * 2. Copie o ID para NEXT_PUBLIC_APPWRITE_GOALS_BUCKET_ID.
 */
import { ID, Permission, Query, Role, type Models } from "appwrite";
import { appwriteConfig, databases, storage } from "@/lib/appwrite/client";

export type GoalDocument = Models.Document & {
  userId: string;
  title: string;
  description?: string | null;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  category: string;
  imageId?: string | null;
  isCompleted: boolean;
};

export type GoalInput = {
  userId: string;
  title: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  category: string;
  imageId?: string;
  isCompleted: boolean;
};

function goalsCollectionId() {
  if (!appwriteConfig.goalsCollectionId) {
    throw new Error(
      "Defina NEXT_PUBLIC_APPWRITE_GOALS_COLLECTION_ID com o ID da collection Goals.",
    );
  }
  return appwriteConfig.goalsCollectionId;
}

function goalsBucketId() {
  if (!appwriteConfig.goalsBucketId) {
    throw new Error(
      "Defina NEXT_PUBLIC_APPWRITE_GOALS_BUCKET_ID com o ID do bucket de imagens de metas.",
    );
  }
  return appwriteConfig.goalsBucketId;
}

function ownerPermissions(userId: string) {
  const role = Role.user(userId);
  return [Permission.read(role), Permission.update(role), Permission.delete(role)];
}

export function getGoalImageUrl(imageId: string) {
  if (!imageId || !appwriteConfig.goalsBucketId) return "";

  const url = storage.getFileView({
    bucketId: appwriteConfig.goalsBucketId,
    fileId: imageId,
  });

  return String(url);
}

export async function uploadGoalImage(file: File, userId: string) {
  const bucketId = goalsBucketId();

  const created = await storage.createFile({
    bucketId,
    fileId: ID.unique(),
    file,
    permissions: ownerPermissions(userId),
  });

  return created.$id;
}

export async function createGoal(goalData: GoalInput) {
  if (!goalData.userId) {
    throw new Error("userId é obrigatório para criar uma meta.");
  }

  const payload: Omit<GoalInput, "imageId"> & { imageId?: string } = {
    userId: goalData.userId,
    title: goalData.title.trim(),
    targetAmount: Number(goalData.targetAmount),
    currentAmount: Number(goalData.currentAmount),
    targetDate: goalData.targetDate,
    category: goalData.category,
    isCompleted: Boolean(goalData.isCompleted),
  };

  if (goalData.description !== undefined) {
    // Atributo opcional (string, 255): envia "" para limpar / sem descrição.
    payload.description = goalData.description.trim().slice(0, 255);
  }

  if (goalData.imageId) {
    payload.imageId = goalData.imageId;
  }

  return databases.createDocument<GoalDocument>(
    appwriteConfig.databaseId,
    goalsCollectionId(),
    ID.unique(),
    payload,
    ownerPermissions(goalData.userId),
  );
}

export type UpdateGoalInput = Partial<Omit<GoalInput, "userId" | "imageId">> & {
  /** `null` limpa a imagem associada à meta. */
  imageId?: string | null;
};

export async function updateGoal(documentId: string, data: UpdateGoalInput) {
  if (!documentId) {
    throw new Error("documentId é obrigatório para atualizar uma meta.");
  }

  const payload: Partial<
    Pick<
      GoalDocument,
      | "title"
      | "description"
      | "targetAmount"
      | "currentAmount"
      | "targetDate"
      | "category"
      | "imageId"
      | "isCompleted"
    >
  > = {};

  if (data.title !== undefined) payload.title = data.title.trim();
  if (data.description !== undefined) {
    payload.description = data.description.trim().slice(0, 255);
  }
  if (data.targetAmount !== undefined) payload.targetAmount = Number(data.targetAmount);
  if (data.currentAmount !== undefined) payload.currentAmount = Number(data.currentAmount);
  if (data.targetDate !== undefined) payload.targetDate = data.targetDate;
  if (data.category !== undefined) payload.category = data.category;
  if (data.isCompleted !== undefined) payload.isCompleted = Boolean(data.isCompleted);
  if (data.imageId !== undefined) payload.imageId = data.imageId;

  return databases.updateDocument<GoalDocument>({
    databaseId: appwriteConfig.databaseId,
    collectionId: goalsCollectionId(),
    documentId,
    data: payload,
  });
}

/**
 * Apaga apenas o ficheiro de imagem da meta no Storage.
 * Best-effort: nunca lança — uma imagem órfã não deve bloquear a edição/exclusão da meta.
 */
export async function deleteGoalImage(imageId: string) {
  if (!imageId || !appwriteConfig.goalsBucketId) return;

  try {
    await storage.deleteFile({
      bucketId: appwriteConfig.goalsBucketId,
      fileId: imageId,
    });
  } catch (error) {
    console.error("Falha ao apagar a imagem da meta no Storage:", error);
  }
}

export async function deleteGoal(documentId: string, imageId?: string | null) {
  if (!documentId) {
    throw new Error("documentId é obrigatório para excluir uma meta.");
  }

  await databases.deleteDocument({
    databaseId: appwriteConfig.databaseId,
    collectionId: goalsCollectionId(),
    documentId,
  });

  if (imageId) {
    await deleteGoalImage(imageId);
  }
}

const GOAL_PAGE_SIZE = 100;

/** Todas as metas do utilizador (pagina com cursor), para exportação/exclusão de conta. */
export async function getAllGoals(userId: string) {
  if (!appwriteConfig.goalsCollectionId) return [] as GoalDocument[];

  const documents: GoalDocument[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < 20; page += 1) {
    const queries = [
      Query.equal("userId", userId),
      Query.orderDesc("$createdAt"),
      Query.limit(GOAL_PAGE_SIZE),
    ];
    if (cursor) queries.push(Query.cursorAfter(cursor));

    const response = await databases.listDocuments<GoalDocument>(
      appwriteConfig.databaseId,
      goalsCollectionId(),
      queries,
    );

    documents.push(...response.documents);
    if (response.documents.length < GOAL_PAGE_SIZE) break;

    const nextCursor = response.documents[response.documents.length - 1]?.$id;
    if (!nextCursor || nextCursor === cursor) break;
    cursor = nextCursor;
  }

  return documents;
}

export async function getGoals(userId: string, limit = 10, offset = 0) {
  if (!appwriteConfig.goalsCollectionId) {
    return { documents: [] as GoalDocument[], total: 0 };
  }

  return databases.listDocuments<GoalDocument>(
    appwriteConfig.databaseId,
    goalsCollectionId(),
    [
      Query.equal("userId", userId),
      Query.orderDesc("$createdAt"),
      Query.limit(limit),
      Query.offset(offset),
    ],
  );
}
