/**
 * Collection "Goals" no Database do Appwrite:
 * 1. Crie a collection com o nome Goals.
 * 2. Atributos:
 *    - userId (string, required)
 *    - title (string, required)
 *    - targetAmount (float/double, required)
 *    - currentAmount (float/double, required)
 *    - targetDate (datetime ou string, required)
 *    - category (string, required)
 *    - imageId (string, optional)
 *    - isCompleted (boolean, required)
 * 3. Index em "userId".
 * 4. Permissões: Create/Read/Update/Delete para Users.
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

  return typeof url === "string" ? url : url.toString();
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

  const payload: Record<string, string | number | boolean> = {
    userId: goalData.userId,
    title: goalData.title.trim(),
    targetAmount: Number(goalData.targetAmount),
    currentAmount: Number(goalData.currentAmount),
    targetDate: goalData.targetDate,
    category: goalData.category,
    isCompleted: Boolean(goalData.isCompleted),
  };

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

export async function getGoals(userId: string) {
  if (!appwriteConfig.goalsCollectionId) {
    return { documents: [] as GoalDocument[], total: 0 };
  }

  return databases.listDocuments<GoalDocument>(
    appwriteConfig.databaseId,
    goalsCollectionId(),
    [Query.equal("userId", userId), Query.orderDesc("$createdAt"), Query.limit(100)],
  );
}
