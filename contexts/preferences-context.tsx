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
};

type PreferencesContextValue = StoredPreferences & {
  setCurrency: (currency: AppCurrency) => void;
  setPrivacyMode: (privacyMode: boolean) => void;
  applyRemotePrefs: (prefs: object) => void;
};

const defaultPreferences: StoredPreferences = {
  currency: "BRL",
  privacyMode: false,
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

    if (editedRef.current) return;
    if (!isCurrency(remoteCurrency) && typeof remotePrivacy !== "boolean") return;

    const current = parsePreferences(getSnapshot());
    const next: StoredPreferences = {
      currency: isCurrency(remoteCurrency) ? remoteCurrency : current.currency,
      privacyMode: typeof remotePrivacy === "boolean" ? remotePrivacy : current.privacyMode,
    };

    if (next.currency === current.currency && next.privacyMode === current.privacyMode) return;
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

  const value = useMemo(
    () => ({
      currency: preferences.currency,
      privacyMode: preferences.privacyMode,
      setCurrency,
      setPrivacyMode,
      applyRemotePrefs,
    }),
    [preferences.currency, preferences.privacyMode, setCurrency, setPrivacyMode, applyRemotePrefs],
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
