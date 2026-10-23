/** Cookie marcador — legível no middleware (Edge) sem importar o SDK. */
export const APP_SESSION_COOKIE = "pf_session";

/**
 * Cookie com o secret da sessão Appwrite (sincronizado a partir do
 * cookieFallback / getSession). Usado pelas Route Handlers para
 * validar a sessão com node-appwrite (`Client.setSession`).
 */
export const APP_SESSION_SECRET_COOKIE = "pf_aw_session";
