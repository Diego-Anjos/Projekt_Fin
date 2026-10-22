"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { account } from "@/lib/appwrite/client";
import {
  LOCALE_STORAGE_KEY,
  defaultLocale,
  fallbackLocale,
  languageCodes,
  localeToBcp47,
  translations,
  type LanguageCode,
} from "@/locales/dictionaries";

export type TranslationParams = Record<string, string | number>;

type LanguageContextValue = {
  /** Idioma ativo (ex: "pt"). `currentLocale`/`currentLang` são aliases. */
  locale: LanguageCode;
  currentLocale: LanguageCode;
  currentLang: LanguageCode;
  changeLanguage: (lang: LanguageCode) => void;
  setLang: (lang: LanguageCode) => void;
  /** Aplica `prefs.language` do Appwrite (login / outro dispositivo) ao estado local. */
  applyRemoteLanguage: (prefs: unknown) => void;
  t: (keyPath: string, params?: TranslationParams) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function normalizeLanguageCode(value: string | null): LanguageCode | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return (languageCodes as readonly string[]).includes(normalized)
    ? (normalized as LanguageCode)
    : null;
}

function lookup(lang: LanguageCode, keyPath: string): string | undefined {
  const value = keyPath.split(".").reduce<unknown>((current, key) => {
    if (current && typeof current === "object" && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, translations[lang]);

  return typeof value === "string" ? value : undefined;
}

function interpolate(template: string, params?: TranslationParams) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/**
 * Fallback seguro: idioma ativo → português → a própria chave (debug).
 * Suporta interpolação: t("dashboard.welcome", { name: "Diego" }).
 */
function translate(lang: LanguageCode, keyPath: string, params?: TranslationParams) {
  const template = lookup(lang, keyPath) ?? lookup(fallbackLocale, keyPath) ?? keyPath;
  return interpolate(template, params);
}

const LOCALE_CHANGE_EVENT = LOCALE_STORAGE_KEY;

function subscribeLocale(onStoreChange: () => void) {
  window.addEventListener(LOCALE_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(LOCALE_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getLocaleSnapshot() {
  return window.localStorage.getItem(LOCALE_STORAGE_KEY) ?? defaultLocale;
}

function getServerLocaleSnapshot() {
  return defaultLocale;
}

function writeLocale(normalized: LanguageCode) {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, normalized);
    window.dispatchEvent(new Event(LOCALE_CHANGE_EVENT));
  } catch {
    // localStorage indisponível (modo privado, etc.).
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // localStorage como fonte imediata (padrão do PreferencesProvider):
  // restaura `projekt-fin-locale` sem flash/hydration mismatch, antes de
  // qualquer resposta do Appwrite. A nuvem reconcilia a seguir (ver abaixo).
  const storedLocale = useSyncExternalStore(
    subscribeLocale,
    getLocaleSnapshot,
    getServerLocaleSnapshot,
  );
  const currentLocale = normalizeLanguageCode(storedLocale) ?? defaultLocale;
  // Se o utilizador já escolheu um idioma nesta sessão, uma resposta
  // remota tardia nunca o deve reverter.
  const editedRef = useRef(false);
  const pendingCloudLocaleRef = useRef<LanguageCode | null>(null);

  // Mantém <html lang="…"> sincronizado com o idioma ativo.
  useEffect(() => {
    document.documentElement.lang = localeToBcp47[currentLocale];
  }, [currentLocale]);

  const applyRemoteLanguage = useCallback((prefs: unknown) => {
    if (editedRef.current) return;
    if (!prefs || typeof prefs !== "object") return;
    const remote = normalizeLanguageCode(
      typeof (prefs as Record<string, unknown>).language === "string"
        ? ((prefs as Record<string, unknown>).language as string)
        : null,
    );
    if (!remote) return;
    if (normalizeLanguageCode(getLocaleSnapshot()) === remote) return;
    writeLocale(remote);
  }, []);

  // Persistência absoluta (cross-device): ao arrancar com sessão ativa,
  // o idioma guardado em `account.prefs.language` vence o localStorage
  // deste browser. Sem sessão (401) / offline → mantém-se o local, sem erro.
  useEffect(() => {
    let cancelled = false;
    account
      .getPrefs()
      .then((prefs) => {
        if (!cancelled) applyRemoteLanguage(prefs);
      })
      .catch(() => {
        // Anónimo/offline: localStorage continua a ser a fonte.
      });
    return () => {
      cancelled = true;
    };
  }, [applyRemoteLanguage]);

  const changeLanguage = useCallback((lang: LanguageCode) => {
    const normalized = normalizeLanguageCode(lang);
    if (!normalized) return;

    editedRef.current = true;
    pendingCloudLocaleRef.current = normalized;
    // 1) Imediato: estado (via external store) + localStorage — sobrevive
    //    a logout e a fechar o browser neste dispositivo.
    writeLocale(normalized);

    // 2) Nuvem (fire-and-forget): sobrevive a trocar de dispositivo.
    //    Espalha as prefs atuais (`...user.prefs`) porque `updatePrefs`
    //    substitui o objeto inteiro — nunca apagar avatar/moeda/etc.
    void (async () => {
      try {
        const user = await account.get();
        // Outra troca mais recente entretanto: só persiste a última.
        if (pendingCloudLocaleRef.current !== normalized) return;
        await account.updatePrefs({
          prefs: { ...user.prefs, language: normalized },
        });
      } catch {
        // Sem sessão/offline: o localStorage já guardou a escolha e a
        // próxima sessão com rede volta a tentar via getPrefs/login.
      }
    })();
  }, []);

  const t = useCallback(
    (keyPath: string, params?: TranslationParams) => translate(currentLocale, keyPath, params),
    [currentLocale],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale: currentLocale,
      currentLocale,
      currentLang: currentLocale,
      changeLanguage,
      setLang: changeLanguage,
      applyRemoteLanguage,
      t,
    }),
    [currentLocale, changeLanguage, applyRemoteLanguage, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage deve ser usado dentro de LanguageProvider.");
  }

  return context;
}
