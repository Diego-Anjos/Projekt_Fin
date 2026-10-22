"use client";

import { usePreferences } from "@/contexts/preferences-context";
import { useTranslation } from "@/hooks/use-translation";
import type { LanguageCode } from "@/locales/dictionaries";
import { Eye, EyeOff, Menu } from "lucide-react";

const languages: { code: LanguageCode; label: string; flag: string }[] = [
  { code: "pt", label: "Português (Brasil)", flag: "br" },
  { code: "en", label: "English", flag: "us" },
  { code: "es", label: "Español", flag: "es" },
  { code: "fr", label: "Français", flag: "fr" },
  { code: "it", label: "Italiano", flag: "it" },
  { code: "ja", label: "日本語", flag: "jp" },
];

export function AppHeader({ onOpenMenu }: { onOpenMenu?: () => void }) {
  const { t, locale, changeLanguage } = useTranslation();
  const { privacyMode, togglePrivacyMode } = usePreferences();

  const privacyLabel = privacyMode ? t("header.showBalances") : t("header.hideBalances");

  return (
    <header
      aria-label={t("header.header")}
      className="flex h-16 shrink-0 items-center gap-3 border-b border-zinc-800 bg-black/70 px-4 backdrop-blur-md md:px-8 lg:px-10"
    >
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label={t("header.openMenu")}
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-zinc-100 transition-colors hover:bg-zinc-900 md:hidden"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>
      {/* p-2: espaço p/ o ring da bandeira ativa (ring-2 + ring-offset-2 = 4px
          para fora do botão) não ser cortado pelo overflow-x-auto deste
          contentor — sem ele, o anel é clipado nas extremidades/topo. */}
      <div className="ml-auto flex min-w-0 items-center gap-2 overflow-x-auto p-2 sm:gap-3">
        <button
          type="button"
          onClick={togglePrivacyMode}
          aria-pressed={privacyMode}
          aria-label={privacyLabel}
          title={privacyLabel}
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
          const selected = locale === language.code;

          return (
            <button
              key={language.code}
              type="button"
              aria-label={language.label}
              title={language.label}
              aria-pressed={selected}
              onClick={() => changeLanguage(language.code)}
              className={`h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-full border border-zinc-700 transition-all hover:border-emerald-500 ${
                selected
                  ? "opacity-100 ring-2 ring-emerald-500 ring-offset-2 ring-offset-zinc-950"
                  : "opacity-50 hover:opacity-80"
              }`}
            >
              {/* Bandeiras externas (flagcdn) — fora do otimizador de imagens. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://flagcdn.com/w40/${language.flag}.png`}
                alt=""
                className="h-full w-full object-cover"
              />
            </button>
          );
        })}
      </div>
    </header>
  );
}
