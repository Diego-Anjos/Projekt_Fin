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
 *
 * @param debugLabel Prefixo opcional nos logs (ex: "api/market") para localizar o 401 no terminal.
 */
export async function requireApiSession(
  request: Request,
  debugLabel?: string,
): Promise<ApiAuthResult> {
  const tag = debugLabel ? `[${debugLabel}]` : "[api-auth]";

  const unauthorized = (reason: string): ApiAuthFailure => {
    console.error(`DEBUG API ${tag}: Falha na sessão — ${reason}. Retornando 401.`);
    return {
      error: NextResponse.json({ error: "Unauthorized", reason }, { status: 401 }),
    };
  };

  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  if (!endpoint || !projectId) {
    return unauthorized(
      "NEXT_PUBLIC_APPWRITE_ENDPOINT ou NEXT_PUBLIC_APPWRITE_PROJECT_ID ausentes no .env",
    );
  }

  const hasBearer = Boolean(
    request.headers.get("authorization")?.toLowerCase().startsWith("bearer "),
  );
  const cookieHeader = request.headers.get("cookie");
  const hasAwCookie = Boolean(readCookie(cookieHeader, APP_SESSION_SECRET_COOKIE));
  const hasMarker = readCookie(cookieHeader, APP_SESSION_COOKIE) === "1";

  const secret = extractSessionSecret(request);
  // Marcador sozinho não autentica APIs (evitar abuso só com pf_session=1).
  if (!secret) {
    if (hasMarker) {
      return unauthorized(
        `cookie pf_session=1 presente mas sem secret (pf_aw_session/Bearer/a_session_*). bearer=${hasBearer} pf_aw_session=${hasAwCookie}`,
      );
    }
    return unauthorized(
      `nenhum secret de sessão no pedido. bearer=${hasBearer} pf_aw_session=${hasAwCookie} pf_session=${hasMarker}`,
    );
  }

  try {
    const client = new Client().setEndpoint(endpoint).setProject(projectId).setSession(secret);
    const account = new Account(client);
    const user = await account.get();
    if (!user?.$id) {
      return unauthorized("account.get() ok mas user.$id vazio");
    }
    return { user };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return unauthorized(
      `account.get() rejeitou o secret (sessão expirada/inválida?). detalhe=${message}`,
    );
  }
}

export function isApiAuthError(result: ApiAuthResult): result is ApiAuthFailure {
  return "error" in result;
}
