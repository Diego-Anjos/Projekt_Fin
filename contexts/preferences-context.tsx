"use client";

import { account } from "@/lib/appwrite/client";
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

export type AppCurrency = "BRL" | "USD" | "EUR";

const STORAGE_KEY = "projekt-fin-preferences";
const CHANGE_EVENT = "projekt-fin-preferences";

type StoredPreferences = {
  currency: AppCurrency;
  privacyMode: boolean;
  /**
   * Alertas in-app de vencimento (assinaturas/contas a vencer em 0–5 dias).
   * Guardado em localStorage (provisório/offline) e sincronizado para
   * `account.prefs` do Appwrite (`alertsEnabled`).
   */
  alertsEnabled: boolean;
  /**
   * Resumo financeiro periódico por e-mail (semanal/mensal).
   * Guardado em localStorage (provisório/offline) e sincronizado para
   * `account.prefs` do Appwrite (`emailSummaryEnabled`).
   *
   * // TODO: Appwrite Function - Criar Cron Job para ler emailSummaryEnabled === true
   * //       e disparar e-mail mensal via Resend/SendGrid com resumo financeiro.
   * //
   * // Arquitetura futura (produção):
   * // 1. Criar uma Appwrite Function (Node.js) com trigger Cron
   * //    (ex.: "0 8 1 * *" para mensal, "0 8 * * 1" para semanal).
   * // 2. A Function lista utilizadores (Users API, server-side com API key)
   * //    onde prefs.emailSummaryEnabled === true e agrega, por utilizador,
   * //    transações/assinaturas do período (Database server-side).
   * // 3. Renderizar um template HTML de resumo (receitas, despesas, saldo,
   * //    próximas assinaturas a vencer) e enviar via Resend ou SendGrid
   * //    usando uma API key guardada APENAS nas variáveis da Function
   * //    (nunca NEXT_PUBLIC_* / nunca no frontend).
   * // 4. (Opcional) Registar cada envio numa collection "NotificationLogs"
   * //    / "Notifications" para auditoria, deduplicação e preferências
   * //    de leitura (read) partilhadas entre dispositivos.
   */
  emailSummaryEnabled: boolean;
};

type PreferencesContextValue = StoredPreferences & {
  /** Alias legível de `privacyMode` para os ecrãs de valores financeiros. */
  isPrivacyMode: boolean;
  setCurrency: (currency: AppCurrency) => void;
  setPrivacyMode: (privacyMode: boolean) => void;
  togglePrivacyMode: () => void;
  setAlertsEnabled: (alertsEnabled: boolean) => void;
  setEmailSummaryEnabled: (emailSummaryEnabled: boolean) => void;
  applyRemotePrefs: (prefs: object) => void;
};

const defaultPreferences: StoredPreferences = {
  currency: "BRL",
  privacyMode: false,
  alertsEnabled: true,
  emailSummaryEnabled: false,
};

const defaultSnapshot = JSON.stringify(defaultPreferences);

function isCurrency(value: unknown): value is AppCurrency {
  return value === "BRL" || value === "USD" || value === "EUR";
}

function parsePreferences(raw: string): StoredPreferences {
  try {
    const parsed = JSON.parse(raw) as Partial<StoredPreferences>;
    return {
      currency: isCurrency(parsed.currency) ? parsed.currency : "BRL",
      privacyMode: parsed.privacyMode === true,
      // Default `true` para não perder alertas em perfis antigos sem a chave;
      // só um `false` explícito desliga.
      alertsEnabled: parsed.alertsEnabled !== false,
      emailSummaryEnabled: parsed.emailSummaryEnabled === true,
    };
  } catch {
    return defaultPreferences;
  }
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getSnapshot() {
  return window.localStorage.getItem(STORAGE_KEY) ?? defaultSnapshot;
}

function getServerSnapshot() {
  return defaultSnapshot;
}

function writePreferences(next: StoredPreferences) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

async function syncAppwritePreferences(next: StoredPreferences) {
  try {
    const user = await account.get();
    await account.updatePrefs({
      prefs: {
        ...user.prefs,
        currency: next.currency,
        privacyMode: next.privacyMode,
        alertsEnabled: next.alertsEnabled,
        emailSummaryEnabled: next.emailSummaryEnabled,
      },
    });
  } catch {
    // Sem sessão o valor continua disponível neste browser via localStorage.
  }
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const preferences = useMemo(() => parsePreferences(raw), [raw]);
  const editedRef = useRef(false);

  const applyRemotePrefs = useCallback((prefs: object) => {
    const record = prefs as Record<string, unknown>;
    const remoteCurrency = record.currency;
    const remotePrivacy = record.privacyMode;
    const remoteAlerts = record.alertsEnabled;
    const remoteEmailSummary = record.emailSummaryEnabled;

    if (editedRef.current) return;
    if (
      !isCurrency(remoteCurrency) &&
      typeof remotePrivacy !== "boolean" &&
      typeof remoteAlerts !== "boolean" &&
      typeof remoteEmailSummary !== "boolean"
    )
      return;

    const current = parsePreferences(getSnapshot());
    const next: StoredPreferences = {
      currency: isCurrency(remoteCurrency) ? remoteCurrency : current.currency,
      privacyMode: typeof remotePrivacy === "boolean" ? remotePrivacy : current.privacyMode,
      alertsEnabled: typeof remoteAlerts === "boolean" ? remoteAlerts : current.alertsEnabled,
      emailSummaryEnabled:
        typeof remoteEmailSummary === "boolean"
          ? remoteEmailSummary
          : current.emailSummaryEnabled,
    };

    if (
      next.currency === current.currency &&
      next.privacyMode === current.privacyMode &&
      next.alertsEnabled === current.alertsEnabled &&
      next.emailSummaryEnabled === current.emailSummaryEnabled
    )
      return;
    writePreferences(next);
  }, []);

  useEffect(() => {
    let active = true;

    account
      .get()
      .then((user) => {
        if (!active) return;
        applyRemotePrefs(user.prefs);
      })
      .catch(() => {
        // Visitantes sem sessão usam só o que já está no browser.
      });

    return () => {
      active = false;
    };
  }, [applyRemotePrefs]);

  const commit = useCallback((partial: Partial<StoredPreferences>) => {
    editedRef.current = true;
    const next = { ...parsePreferences(getSnapshot()), ...partial };
    writePreferences(next);
    void syncAppwritePreferences(next);
  }, []);

  const setCurrency = useCallback(
    (currency: AppCurrency) => {
      commit({ currency });
    },
    [commit],
  );

  const setPrivacyMode = useCallback(
    (privacyMode: boolean) => {
      commit({ privacyMode });
    },
    [commit],
  );

  // Lê o snapshot atual em vez de fechar sobre `preferences`, para dois
  // toggles rápidos seguidos não partirem de um valor desatualizado.
  const togglePrivacyMode = useCallback(() => {
    commit({ privacyMode: !parsePreferences(getSnapshot()).privacyMode });
  }, [commit]);

  const setAlertsEnabled = useCallback(
    (alertsEnabled: boolean) => {
      commit({ alertsEnabled });
    },
    [commit],
  );

  const setEmailSummaryEnabled = useCallback(
    (emailSummaryEnabled: boolean) => {
      commit({ emailSummaryEnabled });
    },
    [commit],
  );

  const value = useMemo(
    () => ({
      currency: preferences.currency,
      privacyMode: preferences.privacyMode,
      isPrivacyMode: preferences.privacyMode,
      alertsEnabled: preferences.alertsEnabled,
      emailSummaryEnabled: preferences.emailSummaryEnabled,
      setCurrency,
      setPrivacyMode,
      togglePrivacyMode,
      setAlertsEnabled,
      setEmailSummaryEnabled,
      applyRemotePrefs,
    }),
    [
      preferences.currency,
      preferences.privacyMode,
      preferences.alertsEnabled,
      preferences.emailSummaryEnabled,
      setCurrency,
      setPrivacyMode,
      togglePrivacyMode,
      setAlertsEnabled,
      setEmailSummaryEnabled,
      applyRemotePrefs,
    ],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);

  if (!context) {
    throw new Error("usePreferences deve ser usado dentro de PreferencesProvider.");
  }

  return context;
}
