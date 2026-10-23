/**
 * Barreira de autenticação para Route Handlers (`app/api/...`).
 * Valida a sessão Appwrite via cookie `pf_aw_session` / `a_session_*`
 * ou header `Authorization: Bearer <sessionSecret>`.
 */
import { Account, Client, type Models } from "node-appwrite";
import { NextResponse } from "next/server";
import {
  APP_SESSION_COOKIE,
  APP_SESSION_SECRET_COOKIE,
} from "@/lib/appwrite/session-cookie";

export type ApiAuthSuccess = { user: Models.User };
export type ApiAuthFailure = { error: NextResponse };
export type ApiAuthResult = ApiAuthSuccess | ApiAuthFailure;

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  const parts = header.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (key !== name) continue;
    const value = trimmed.slice(eq + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return null;
}

function extractSessionSecret(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    if (token) return token;
  }

  const cookieHeader = request.headers.get("cookie");
  const fromAppCookie = readCookie(cookieHeader, APP_SESSION_SECRET_COOKIE);
  if (fromAppCookie) return fromAppCookie;

  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  if (!projectId) return null;

  return (
    readCookie(cookieHeader, `a_session_${projectId}`) ||
    readCookie(cookieHeader, `a_session_${projectId}_legacy`)
  );
}

/**
 * Verifica sessão válida. Em falha devolve imediatamente
 * `{ error: NextResponse }` com status 401 — o handler deve `return result.error`.
 */
export async function requireApiSession(request: Request): Promise<ApiAuthResult> {
  const unauthorized = (): ApiAuthFailure => ({
    error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  });

  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  if (!endpoint || !projectId) return unauthorized();

  const secret = extractSessionSecret(request);
  // Marcador sozinho não autentica APIs (evitar abuso só com pf_session=1).
  if (!secret) {
    const marker = readCookie(request.headers.get("cookie"), APP_SESSION_COOKIE);
    if (marker === "1") {
      // Sessão marcador sem secret: cliente desatualizado / cookieFallback não sincronizado.
      return unauthorized();
    }
    return unauthorized();
  }

  try {
    const client = new Client().setEndpoint(endpoint).setProject(projectId).setSession(secret);
    const account = new Account(client);
    const user = await account.get();
    if (!user?.$id) return unauthorized();
    return { user };
  } catch {
    return unauthorized();
  }
}

export function isApiAuthError(result: ApiAuthResult): result is ApiAuthFailure {
  return "error" in result;
}
