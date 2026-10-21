"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { usePreferences } from "@/contexts/preferences-context";
import { Eye, EyeOff, Menu } from "lucide-react";

const languages = [
  { code: "PT", label: "Português", flag: "br" },
  { code: "EN", label: "English", flag: "us" },
  { code: "ES", label: "Español", flag: "es" },
  { code: "FR", label: "Français", flag: "fr" },
  { code: "IT", label: "Italiano", flag: "it" },
  { code: "JA", label: "日本語", flag: "jp" },
] as const;

export function AppHeader({ onOpenMenu }: { onOpenMenu?: () => void }) {
  const { currentLang, setLang } = useLanguage();
  const { privacyMode, togglePrivacyMode } = usePreferences();

  return (
    <header
      aria-label="Cabeçalho"
      className="flex h-16 shrink-0 items-center gap-3 border-b border-zinc-800 bg-black px-4 md:px-8 lg:px-10"
    >
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Abrir menu"
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-zinc-100 transition-colors hover:bg-zinc-900 md:hidden"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>
      <div className="ml-auto flex min-w-0 items-center gap-2 overflow-x-auto sm:gap-3">
        <button
          type="button"
          onClick={togglePrivacyMode}
          aria-pressed={privacyMode}
          aria-label={privacyMode ? "Mostrar saldos" : "Ocultar saldos"}
          title={privacyMode ? "Mostrar saldos" : "Ocultar saldos"}
          className={`inline-flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-zinc-900 ${
            privacyMode ? "text-emerald-400" : "text-zinc-400 hover:text-zinc-100"
          }`}
        >
          {privacyMode ? (
            <EyeOff className="size-5" aria-hidden="true" />
          ) : (
            <Eye className="size-5" aria-hidden="true" />
          )}
        </button>
        {languages.map((language) => {
          const selected = currentLang === language.code;

          return (
            <button
              key={language.code}
              type="button"
              aria-label={language.label}
              aria-pressed={selected}
              onClick={() => setLang(language.code)}
              className={`w-8 h-8 rounded-full overflow-hidden border border-zinc-700 hover:border-emerald-500 hover:opacity-100 transition-all cursor-pointer ${
                selected
                  ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-zinc-950 grayscale-0 opacity-100"
                  : "opacity-60 grayscale hover:grayscale-0"
              }`}
            >
              <img
                src={`https://flagcdn.com/w40/${language.flag}.png`}
                alt=""
                className="w-full h-full object-cover"
              />
            </button>
          );
        })}
      </div>
    </header>
  );
}
