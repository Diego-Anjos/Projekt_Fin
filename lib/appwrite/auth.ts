import { ID } from "appwrite";
import { account, appwriteConfig, storage } from "@/lib/appwrite/client";

type ProfilePrefs = {
  avatarUrl?: string;
  [key: string]: unknown;
};

export async function updateUserProfile(name: string, avatarFile?: File) {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("Indique um nome.");
  }

  if (avatarFile) {
    const bucketId = appwriteConfig.avatarsBucketId;

    if (!bucketId) {
      throw new Error("Bucket de avatares não configurado.");
    }

    const created = await storage.createFile({
      bucketId,
      fileId: ID.unique(),
      file: avatarFile,
    });
    const avatarUrl = storage.getFileView({
      bucketId,
      fileId: created.$id,
    });
    const current = await account.get<ProfilePrefs>();

    await account.updatePrefs({
      prefs: {
        ...current.prefs,
        avatarUrl,
      },
    });
  }

  return account.updateName({ name: trimmedName });
}
