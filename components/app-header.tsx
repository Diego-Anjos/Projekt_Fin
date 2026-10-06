"use client";

import { useLanguage } from "@/contexts/LanguageContext";

const languages = [
  { code: "PT", label: "Português", flag: "br" },
  { code: "EN", label: "English", flag: "us" },
  { code: "ES", label: "Español", flag: "es" },
  { code: "FR", label: "Français", flag: "fr" },
  { code: "IT", label: "Italiano", flag: "it" },
  { code: "JA", label: "日本語", flag: "jp" },
] as const;

export function AppHeader() {
  const { currentLang, setLang } = useLanguage();

  return (
    <header
      aria-label="Cabeçalho"
      className="flex h-16 shrink-0 items-center justify-end gap-4 border-b border-zinc-800 bg-black px-6"
    >
      <div className="flex shrink-0 items-center gap-3">
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
