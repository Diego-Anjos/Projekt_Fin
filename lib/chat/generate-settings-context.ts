/**
 * Contexto seguro de Configurações para a Quantum.IA.
 * Nunca inclui senhas, tokens, session IDs, avatar URLs nem prefs brutas do Appwrite.
 */

export type SettingsProfileInput = {
  nome?: string | null;
  name?: string | null;
  email?: string | null;
};

export type SettingsPreferencesInput = {
  idioma?: string | null;
  language?: string | null;
  locale?: string | null;
  moeda?: string | null;
  currency?: string | null;
  tema?: string | null;
  theme?: string | null;
  modoPrivacidade?: boolean | null;
  privacyMode?: boolean | null;
  alertasVencimento?: boolean | null;
  alertsEnabled?: boolean | null;
  resumoEmail?: boolean | null;
  emailSummaryEnabled?: boolean | null;
};

export type ConfiguracoesContext = {
  perfil: {
    nome: string;
    email: string;
  };
  preferencias: {
    idioma: string;
    moeda: string;
    tema: string;
    modoPrivacidade: boolean;
    alertasVencimento: boolean;
    resumoEmail: boolean;
  };
  /** Abas do menu Configurações — para orientar navegação. */
  modulosAtivos: string[];
  /** Aba actualmente aberta no ecrã (quando disponível). */
  abaAtiva?: string;
};

export const SETTINGS_MODULES = [
  "Perfil",
  "Preferências",
  "Categorias",
  "Notificações",
  "Dados e Exportação",
] as const;

const TAB_LABELS: Record<string, string> = {
  perfil: "Perfil",
  preferencias: "Preferências",
  categorias: "Categorias",
  notificacoes: "Notificações",
  dados: "Dados e Exportação",
};

const ALLOWED_CURRENCIES = new Set(["BRL", "USD", "EUR"]);

function pickString(
  ...candidates: Array<string | null | undefined>
): string {
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return "";
}

function resolveCurrency(value: string): string {
  const normalized = value.trim().toUpperCase();
  return ALLOWED_CURRENCIES.has(normalized) ? normalized : "BRL";
}

function resolveTheme(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized === "light" || normalized === "claro") return "light";
  if (normalized === "system" || normalized === "sistema") return "system";
  return "dark";
}

/**
 * Extrai apenas identidade e preferências não-sensíveis do ecrã Configurações.
 */
export function generateSettingsContext(
  userProfile: SettingsProfileInput,
  preferences: SettingsPreferencesInput,
  activeTab?: string | null,
): ConfiguracoesContext {
  const nome =
    pickString(userProfile.nome, userProfile.name).slice(0, 120) || "Utilizador";
  const email = pickString(userProfile.email).slice(0, 160);

  const idioma =
    pickString(preferences.idioma, preferences.language, preferences.locale).slice(
      0,
      16,
    ) || "pt-BR";
  const moeda = resolveCurrency(
    pickString(preferences.moeda, preferences.currency) || "BRL",
  );
  const tema = resolveTheme(
    pickString(preferences.tema, preferences.theme) || "dark",
  );

  const modoPrivacidade =
    preferences.modoPrivacidade === true || preferences.privacyMode === true;
  const alertasVencimento =
    preferences.alertasVencimento !== false &&
    preferences.alertsEnabled !== false;
  const resumoEmail =
    preferences.resumoEmail === true || preferences.emailSummaryEnabled === true;

  const tabKey = (activeTab ?? "").trim().toLowerCase();
  const abaAtiva = TAB_LABELS[tabKey] ?? (activeTab?.trim().slice(0, 40) || undefined);

  return {
    perfil: { nome, email },
    preferencias: {
      idioma,
      moeda,
      tema,
      modoPrivacidade,
      alertasVencimento,
      resumoEmail,
    },
    modulosAtivos: [...SETTINGS_MODULES],
    ...(abaAtiva ? { abaAtiva } : {}),
  };
}

export function emptyConfiguracoesContext(): ConfiguracoesContext {
  return {
    perfil: { nome: "Utilizador", email: "" },
    preferencias: {
      idioma: "pt-BR",
      moeda: "BRL",
      tema: "dark",
      modoPrivacidade: false,
      alertasVencimento: true,
      resumoEmail: false,
    },
    modulosAtivos: [...SETTINGS_MODULES],
  };
}

/** Texto curto para o cabeçalho do system prompt. */
export function formatConfiguracoesSummaryLine(
  context: ConfiguracoesContext,
): string {
  const { perfil, preferencias } = context;
  return `${perfil.nome} | ${preferencias.idioma} | ${preferencias.moeda}`;
}
