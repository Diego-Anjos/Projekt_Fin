"use client";

import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Hook de tradução da aplicação.
 *
 * @example
 * const { t, locale, changeLanguage } = useTranslation();
 * t("sidebar.goals")                       // "Minhas Metas"
 * t("dashboard.welcome", { name: "Diego" }) // "Bem-vindo de volta, Diego!"
 * changeLanguage("en")                      // troca instantânea + localStorage
 */
export function useTranslation() {
  const { t, locale, changeLanguage } = useLanguage();

  return { t, locale, currentLocale: locale, changeLanguage };
}
