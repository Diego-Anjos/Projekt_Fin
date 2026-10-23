import { NextResponse, type NextRequest } from "next/server";
import { APP_SESSION_COOKIE } from "@/lib/appwrite/session-cookie";

/**
 * Rotas da área autenticada (app/(app)/...).
 * Nota: a sessão Appwrite Cloud vive muitas vezes em localStorage (cookieFallback),
 * por isso usamos o cookie marcador `pf_session` definido no cliente após account.get()
 * bem-sucedido. A validação real continua em RequireSession + account.get();
 * as APIs validam com `pf_aw_session` + node-appwrite.
 */
const PRIVATE_PREFIXES = [
  "/dashboard",
  "/compras",
  "/subscriptions",
  "/cash-flow",
  "/metas",
  "/investimentos",
  "/noticias",
  "/settings",
] as const;

/** Login / registo (página única em `/`; `/login` e `/register` redireccionam ou espelham). */
const PUBLIC_AUTH_PATHS = new Set(["/", "/login", "/register"]);

function isPrivatePath(pathname: string) {
  return PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function hasAppSessionCookie(request: NextRequest) {
  const marker = request.cookies.get(APP_SESSION_COOKIE)?.value;
  if (marker === "1") return true;

  // Fallback: cookie nativo Appwrite no mesmo domínio (self-hosted / custom domain).
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  if (!projectId) return false;
  return Boolean(
    request.cookies.get(`a_session_${projectId}`)?.value ||
      request.cookies.get(`a_session_${projectId}_legacy`)?.value,
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const authenticated = hasAppSessionCookie(request);

  if (isPrivatePath(pathname) && !authenticated) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Utilizador com marcador de sessão em rota pública de auth → dashboard
  // (evita loops de "já autenticado" no formulário de login).
  // Cookie stale: RequireSession limpa artefactos e devolve a `/`.
  if (PUBLIC_AUTH_PATHS.has(pathname) && authenticated) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

/**
 * Matcher explícito: páginas públicas de auth + todas as rotas privadas e sub-rotas.
 * Exclui estáticos / imagens Next.
 */
export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
    "/dashboard/:path*",
    "/compras/:path*",
    "/subscriptions/:path*",
    "/cash-flow/:path*",
    "/metas/:path*",
    "/investimentos/:path*",
    "/noticias/:path*",
    "/settings/:path*",
  ],
};
