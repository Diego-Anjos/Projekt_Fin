/* Cria/atualiza a coleção ChatSessions no Appwrite (idempotente).
 * Requer APPWRITE_API_KEY com scope `collections.write`. Sem esse scope
 * (erro general_unauthorized_scope), crie a coleção na consola do Appwrite
 * com os atributos/permissões descritos em lib/appwrite/chat-sessions.ts
 * e ID `chatsessions`, e depois corra este script para validar. */
const fs = require("fs");
const { Client, Databases, ID, Permission, Role } = require("node-appwrite");

for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim();
}
const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);
const databases = new Databases(client);
const COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPWRITE_CHAT_COLLECTION_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_CHAT_SESSIONS_COLLECTION_ID ||
  "chatsessions";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitAvailable(kind, key) {
  for (let i = 0; i < 30; i++) {
    const res = kind === "attr"
      ? await databases.getAttribute(dbId, COLLECTION_ID, key)
      : await databases.getIndex(dbId, COLLECTION_ID, key);
    if (res.status === "available") return;
    if (res.status === "failed") throw new Error(`${kind} ${key} failed`);
    await sleep(1000);
  }
  throw new Error(`timeout ${kind} ${key}`);
}

async function main() {
  let collection;
  try {
    collection = await databases.getCollection(dbId, COLLECTION_ID);
    console.log("coleção já existe:", collection.name);
  } catch {
    collection = await databases.createCollection({
      databaseId: dbId,
      collectionId: COLLECTION_ID,
      name: "ChatSessions",
      permissions: [
        Permission.create(Role.users()),
        Permission.read(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ],
      documentSecurity: true,
      enabled: true,
    });
    console.log("coleção criada:", collection.$id);
  }

  const existing = new Set((await databases.listAttributes(dbId, COLLECTION_ID)).attributes.map(a => a.key));
  const attrs = [
    ["userId", () => databases.createStringAttribute({ databaseId: dbId, collectionId: COLLECTION_ID, key: "userId", size: 255, required: true })],
    ["title", () => databases.createStringAttribute({ databaseId: dbId, collectionId: COLLECTION_ID, key: "title", size: 255, required: true })],
    ["messages", () => databases.createStringAttribute({ databaseId: dbId, collectionId: COLLECTION_ID, key: "messages", size: 1000000, required: true })],
    ["createdAt", () => databases.createDatetimeAttribute({ databaseId: dbId, collectionId: COLLECTION_ID, key: "createdAt", required: true })],
  ];
  for (const [key, create] of attrs) {
    if (!existing.has(key)) { await create(); console.log("atributo criado:", key); }
    await waitAvailable("attr", key);
  }
  const indexes = await databases.listIndexes(dbId, COLLECTION_ID);
  if (!indexes.indexes.some(i => i.key === "idx_user_id")) {
    await databases.createIndex({ databaseId: dbId, collectionId: COLLECTION_ID, key: "idx_user_id", type: "key", attributes: ["userId"] });
    await waitAvailable("index", "idx_user_id");
    console.log("índice criado: idx_user_id");
  }
  console.log("ChatSessions pronta:", COLLECTION_ID);
}
main().catch((e) => { console.error(e); process.exit(1); });
