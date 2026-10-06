"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  languageCodes,
  translations,
  type LanguageCode,
} from "@/locales/dictionaries";

type LanguageContextValue = {
  currentLang: LanguageCode;
  setLang: (lang: LanguageCode) => void;
  t: (keyPath: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function isLanguageCode(value: string): value is LanguageCode {
  return (languageCodes as readonly string[]).includes(value);
}

function translate(lang: LanguageCode, keyPath: string) {
  const value = keyPath.split(".").reduce<unknown>((current, key) => {
    if (current && typeof current === "object" && key in current) {
      return (current as Record<string, unknown>)[key];
    }

    return undefined;
  }, translations[lang]);

  return typeof value === "string" ? value : keyPath;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [currentLang, setCurrentLang] = useState<LanguageCode>("PT");

  const setLang = useCallback((lang: LanguageCode) => {
    if (isLanguageCode(lang)) {
      setCurrentLang(lang);
    }
  }, []);

  const t = useCallback(
    (keyPath: string) => translate(currentLang, keyPath),
    [currentLang],
  );

  const value = useMemo(
    () => ({ currentLang, setLang, t }),
    [currentLang, setLang, t],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage deve ser usado dentro de LanguageProvider.");
  }

  return context;
}
