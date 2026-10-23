import { account, appwriteConfig } from "@/lib/appwrite/client";
import {
  APP_SESSION_COOKIE,
  APP_SESSION_SECRET_COOKIE,
} from "@/lib/appwrite/session-cookie";
import type { Models } from "appwrite";

export {
  APP_SESSION_COOKIE,
  APP_SESSION_SECRET_COOKIE,
} from "@/lib/appwrite/session-cookie";

const APP_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function projectSessionCookieNames() {
  const projectId = appwriteConfig.projectId;
  if (!projectId) return [] as string[];
  return [`a_session_${projectId}`, `a_session_${projectId}_legacy`];
}

function expireBrowserCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
}

function setBrowserCookie(name: string, value: string, maxAge = APP_SESSION_MAX_AGE_SECONDS) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; path=/; SameSite=Lax`;
}

/** Lê o secret da sessão a partir do cookieFallback (Appwrite Cloud cross-origin). */
function readCookieFallbackSecret(): string | null {
  if (typeof window === "undefined") return null;
  const projectId = appwriteConfig.projectId;
  if (!projectId) return null;

  try {
    const raw = window.localStorage.getItem("cookieFallback");
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const key = `a_session_${projectId}`;
    const value = (parsed as Record<string, unknown>)[key];
    return typeof value === "string" && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

async function resolveSessionSecret(): Promise<string | null> {
  try {
    const session = await account.getSession("current");
    if (typeof session?.secret === "string" && session.secret.length > 0) {
      return session.secret;
    }
  } catch {
    // fallback abaixo
  }
  return readCookieFallbackSecret();
}

/**
 * Marca sessão válida no browser (middleware) e sincroniza o secret
 * para as Route Handlers validarem com node-appwrite.
 */
export async function markAppSession() {
  if (typeof document === "undefined") return;
  setBrowserCookie(APP_SESSION_COOKIE, "1");

  const secret = await resolveSessionSecret();
  if (secret) {
    setBrowserCookie(APP_SESSION_SECRET_COOKIE, secret);
  }
}

/** Remove vestígios locais da sessão Appwrite + marcadores da app. */
export function clearAppSessionArtifacts() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem("cookieFallback");
  } catch {
    // ignore
  }

  expireBrowserCookie(APP_SESSION_COOKIE);
  expireBrowserCookie(APP_SESSION_SECRET_COOKIE);
  for (const name of projectSessionCookieNames()) {
    expireBrowserCookie(name);
  }
}

/** account.get() só resolve com sessão válida; 401/guest → null. */
export async function getValidAccount(): Promise<Models.User | null> {
  try {
    const user = await account.get();
    if (!user?.$id) return null;
    return user;
  } catch {
    return null;
  }
}

/**
 * Encerra a sessão no Appwrite e limpa cache local.
 * Nunca deixa cookieFallback/pf_session para trás (evita falso "já autenticado" no login).
 */
export async function signOutCurrentSession() {
  try {
    await account.deleteSession("current");
  } catch (error) {
    console.warn("[auth] deleteSession(current) falhou, a tentar deleteSessions:", error);
    try {
      await account.deleteSessions();
    } catch (allError) {
      console.warn("[auth] deleteSessions falhou:", allError);
    }
  } finally {
    clearAppSessionArtifacts();
  }
}
