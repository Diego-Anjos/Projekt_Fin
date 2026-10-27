/**
 * Contexto global do Projekt Fin para a Quantum.IA:
 * tempo/sistema, estado de autenticação e resumo dos Termos
 * (sem o texto completo — poupa tokens).
 */

export const PROJEKT_FIN_PLATFORM = "Projekt Fin";
/** Versão de produto exposta à IA (não confundir com package.json interno). */
export const PROJEKT_FIN_VERSION = "1.0.0";

export type AuthStateInput = {
  isAuthenticated?: boolean | null;
  provider?: string | null;
  metodo?: string | null;
};

export type SistemaContext = {
  dataHoraAtual: string;
  fusoHorario: string;
  plataforma: string;
  versao: string;
};

export type AutenticacaoContext = {
  status: "Autenticado" | "Não Autenticado";
  metodo: string;
  sessaoAtiva: boolean;
};

export type TermosCondicoesContext = {
  privacidade: string;
  disclaimerMercado: string;
  regrasUso: string;
};

export type SystemContextPayload = {
  sistema: SistemaContext;
  autenticacao: AutenticacaoContext;
  termosCondicoesGlobais: TermosCondicoesContext;
};

/** Cláusulas principais — alinhadas a /termos, em forma condensada. */
export const TERMOS_CONDICOES_RESUMO: TermosCondicoesContext = {
  privacidade:
    "Os dados financeiros do utilizador são privados e processados de forma segura (Appwrite). A IA não partilha dados com terceiros para marketing; pedidos técnicos a APIs externas não expõem o histórico financeiro completo salvo quando necessário à funcionalidade.",
  disclaimerMercado:
    "Cotações e notícias (via Brapi/HG Brasil/NewsAPI e afins) são informativas. O Projekt Fin e a Quantum.IA não fazem recomendações oficiais de investimento nem prestam aconselhamento fiscal ou jurídico.",
  regrasUso:
    "Ao criar conta, o utilizador concordou com os Termos: usar a plataforma para controlo de gastos, fluxo de caixa e gamificação de metas pessoais; manter credenciais seguras; e não utilizar o serviço para fins ilícitos ou abusivos.",
};

function resolveTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * Condensa estado do sistema, autenticação e termos para a Quantum.IA.
 * Regenerar em cada pedido para manter `dataHoraAtual` exacta.
 */
export function generateSystemContext(
  authState?: AuthStateInput | null,
  now = new Date(),
): SystemContextPayload {
  const isAuthenticated = authState?.isAuthenticated !== false;
  const metodo =
    (authState?.metodo ?? authState?.provider ?? "Email/Senha").trim().slice(0, 64) ||
    "Email/Senha";

  return {
    sistema: {
      dataHoraAtual: now.toISOString(),
      fusoHorario: resolveTimeZone(),
      plataforma: PROJEKT_FIN_PLATFORM,
      versao: PROJEKT_FIN_VERSION,
    },
    autenticacao: {
      status: isAuthenticated ? "Autenticado" : "Não Autenticado",
      metodo,
      sessaoAtiva: isAuthenticated,
    },
    termosCondicoesGlobais: { ...TERMOS_CONDICOES_RESUMO },
  };
}

/** Texto curto para o cabeçalho do system prompt. */
export function formatSistemaSummaryLine(sistema: SistemaContext): string {
  return `${sistema.plataforma} v${sistema.versao} | ${sistema.dataHoraAtual} (${sistema.fusoHorario})`;
}
