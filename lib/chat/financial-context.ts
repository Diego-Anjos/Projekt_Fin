import type { ComprasContext } from "@/lib/chat/generate-transactions-context";
import {
  emptyAssinaturasContext,
  formatAssinaturasSummaryLine,
  type AssinaturasContext,
} from "@/lib/chat/generate-subscriptions-context";
import {
  formatFluxoCaixaSummaryLine,
  type FluxoCaixaContext,
} from "@/lib/chat/generate-cash-flow-context";
import {
  emptyMetasContext,
  formatMetasSummaryLine,
  type MetasContext,
} from "@/lib/chat/generate-goals-context";
import {
  formatNoticiasSummaryLine,
  type NoticiasContext,
} from "@/lib/chat/generate-news-context";
import {
  formatConfiguracoesSummaryLine,
  type ConfiguracoesContext,
} from "@/lib/chat/generate-settings-context";
import {
  formatSistemaSummaryLine,
  TERMOS_CONDICOES_RESUMO,
  type AutenticacaoContext,
  type SistemaContext,
  type TermosCondicoesContext,
} from "@/lib/chat/generate-system-context";

/** Payload enviado no body do /api/chat e /api/daily-tip para personalizar a Quantum.IA. */
export type MarketHubQuotes = {
  dolar?: number;
  euro?: number;
  bitcoin?: number;
  ibovespa?: number;
  selic?: number;
  cdi?: number;
};

export type PortfolioContext = {
  totalWealth?: number;
  cashFlowMensal?: number;
  gastosMesAtual?: number;
};

export type TransactionContextItem = {
  desc: string;
  valor: number;
  tipo?: "income" | "expense" | string;
};

export type {
  AssinaturasContext,
  AutenticacaoContext,
  ComprasContext,
  ConfiguracoesContext,
  FluxoCaixaContext,
  MetasContext,
  NoticiasContext,
  SistemaContext,
  TermosCondicoesContext,
};

export type FinancialContextPayload = {
  saldo: number;
  /** Resumo estruturado das assinaturas activas (lista + custo mensal estimado). */
  assinaturas: AssinaturasContext;
  /** Resumo estruturado das metas activas (progresso, prazo, meses restantes). */
  metas: MetasContext;
  /** Soma das despesas do mês civil atual. */
  despesasMes?: number;
  /** Top categorias de despesa do mês (ex: "Alimentação: 320"). */
  topCategoriasMes?: string[];
  /** Cotações visíveis no Market Hub (APIs de mercado). */
  mercado?: MarketHubQuotes;
  /** KPIs do portfolio no Dashboard. */
  portfolio?: PortfolioContext;
  /** Últimas transações resumidas (ecrã Market Hub). */
  ultimasTransacoes?: TransactionContextItem[];
  /** Resumo inteligente do menu Compras (evita enviar a tabela completa). */
  compras?: ComprasContext;
  /** Snapshot do ecrã Fluxo de Caixa (período, totais e Raio-X). */
  fluxoCaixa?: FluxoCaixaContext;
  /** Manchetes visíveis no ecrã Notícias (aba + pesquisa + top 5). */
  noticias?: NoticiasContext;
  /** Identidade e preferências do ecrã Configurações (sem dados sensíveis). */
  configuracoes?: ConfiguracoesContext;
  /** Relógio e metadados da plataforma (fonte de verdade temporal da IA). */
  sistema?: SistemaContext;
  /** Estado de autenticação da sessão actual (sem tokens/senhas). */
  autenticacao?: AutenticacaoContext;
  /** Resumo das cláusulas principais dos Termos (não o texto completo). */
  termosCondicoesGlobais?: TermosCondicoesContext;
};

function parseFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function parseStringList(value: unknown, maxItems: number, maxChars: number) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.slice(0, maxChars))
    .slice(0, maxItems);
}

function parseOptionalNumberFields<T extends string>(
  raw: unknown,
  keys: readonly T[],
): Partial<Record<T, number>> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const source = raw as Record<string, unknown>;
  const result: Partial<Record<T, number>> = {};
  let hasAny = false;

  for (const key of keys) {
    const parsed = parseFiniteNumber(source[key]);
    if (parsed === null) continue;
    result[key] = parsed;
    hasAny = true;
  }

  return hasAny ? result : undefined;
}

function parseUltimasTransacoes(raw: unknown): TransactionContextItem[] | undefined {
  if (!Array.isArray(raw)) return undefined;

  const items = raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as Record<string, unknown>;
      const desc =
        typeof row.desc === "string"
          ? row.desc.slice(0, 200)
          : typeof row.description === "string"
            ? row.description.slice(0, 200)
            : "";
      const valor = parseFiniteNumber(row.valor ?? row.amount);
      if (!desc || valor === null) return null;
      const tipo =
        typeof row.tipo === "string"
          ? row.tipo.slice(0, 32)
          : typeof row.type === "string"
            ? row.type.slice(0, 32)
            : undefined;
      return { desc, valor, ...(tipo ? { tipo } : {}) };
    })
    .filter((item): item is TransactionContextItem => item !== null)
    .slice(0, 10);

  return items.length > 0 ? items : undefined;
}

function parseResumoGastosMes(raw: unknown): Record<string, number> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const result: Record<string, number> = {};
  let count = 0;

  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (count >= 15) break;
    const amount = parseFiniteNumber(value);
    if (amount === null) continue;
    const categoria = key.trim().slice(0, 80);
    if (!categoria) continue;
    result[categoria] = amount;
    count += 1;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function parseComprasContext(raw: unknown): ComprasContext | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const value = raw as Record<string, unknown>;

  const totalGastoMes = parseFiniteNumber(value.totalGastoMes) ?? 0;
  const totalReceitasMes = parseFiniteNumber(value.totalReceitasMes) ?? 0;
  const totalTransacoesAvaliadas = parseFiniteNumber(value.totalTransacoesAvaliadas) ?? 0;
  const resumoGastosMes = parseResumoGastosMes(value.resumoGastosMes) ?? {};

  const categoriasMaisCaras = Array.isArray(value.categoriasMaisCaras)
    ? value.categoriasMaisCaras
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const row = entry as Record<string, unknown>;
          const categoria =
            typeof row.categoria === "string" ? row.categoria.slice(0, 80) : "";
          const total = parseFiniteNumber(row.total);
          if (!categoria || total === null) return null;
          return { categoria, total };
        })
        .filter((item): item is { categoria: string; total: number } => item !== null)
        .slice(0, 10)
    : Object.entries(resumoGastosMes)
        .map(([categoria, total]) => ({ categoria, total }))
        .slice(0, 10);

  const parcelasPendentes = Array.isArray(value.parcelasPendentes)
    ? value.parcelasPendentes
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const row = entry as Record<string, unknown>;
          const desc =
            typeof row.desc === "string"
              ? row.desc.slice(0, 200)
              : typeof row.description === "string"
                ? row.description.slice(0, 200)
                : "";
          const valor = parseFiniteNumber(row.valor ?? row.amount);
          const data =
            typeof row.data === "string"
              ? row.data.slice(0, 32)
              : typeof row.date === "string"
                ? row.date.slice(0, 32)
                : "";
          if (!desc || valor === null || !data) return null;
          const categoria =
            typeof row.categoria === "string" ? row.categoria.slice(0, 80) : undefined;
          const parcela =
            typeof row.parcela === "string" ? row.parcela.slice(0, 16) : undefined;
          return {
            desc,
            valor,
            data,
            ...(categoria ? { categoria } : {}),
            ...(parcela ? { parcela } : {}),
          };
        })
        .filter(
          (
            item,
          ): item is {
            desc: string;
            valor: number;
            data: string;
            categoria?: string;
            parcela?: string;
          } => item !== null,
        )
        .slice(0, 10)
    : [];

  return {
    totalGastoMes,
    totalReceitasMes,
    resumoGastosMes,
    categoriasMaisCaras,
    parcelasPendentes,
    totalTransacoesAvaliadas,
  };
}

function parseFluxoCaixaContext(raw: unknown): FluxoCaixaContext | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const value = raw as Record<string, unknown>;
  const resumoRaw =
    value.resumo && typeof value.resumo === "object"
      ? (value.resumo as Record<string, unknown>)
      : value;

  const entradas = parseFiniteNumber(resumoRaw.entradas) ?? 0;
  const saidas = parseFiniteNumber(resumoRaw.saidas) ?? 0;
  const saldoLiquido =
    parseFiniteNumber(resumoRaw.saldoLiquido) ?? round2Safe(entradas - saidas);

  const periodoAtual =
    typeof value.periodoAtual === "string"
      ? value.periodoAtual.slice(0, 64)
      : typeof value.periodo === "string"
        ? value.periodo.slice(0, 64)
        : "";

  const modoRaw =
    typeof value.modoVisualizacao === "string"
      ? value.modoVisualizacao
      : typeof value.viewMode === "string"
        ? value.viewMode
        : "mensal";
  const modoVisualizacao: "mensal" | "anual" = /anual|year|annual/i.test(modoRaw)
    ? "anual"
    : "mensal";

  const raioXRaw =
    value.raioX && typeof value.raioX === "object"
      ? (value.raioX as Record<string, unknown>)
      : value;

  const topCategorias = Array.isArray(raioXRaw.topCategorias)
    ? raioXRaw.topCategorias
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const row = entry as Record<string, unknown>;
          const nome =
            typeof row.nome === "string"
              ? row.nome.slice(0, 80)
              : typeof row.name === "string"
                ? row.name.slice(0, 80)
                : "";
          const valor = parseFiniteNumber(row.valor ?? row.value);
          if (!nome || valor === null) return null;
          const percentagem =
            parseFiniteNumber(row.percentagem ?? row.percent ?? row.percentage) ?? 0;
          return { nome, valor, percentagem };
        })
        .filter(
          (
            item,
          ): item is { nome: string; valor: number; percentagem: number } =>
            item !== null,
        )
        .slice(0, 10)
    : [];

  const maioresMovimentacoes = Array.isArray(raioXRaw.maioresMovimentacoes)
    ? raioXRaw.maioresMovimentacoes
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const row = entry as Record<string, unknown>;
          const descricao =
            typeof row.descricao === "string"
              ? row.descricao.slice(0, 200)
              : typeof row.description === "string"
                ? row.description.slice(0, 200)
                : typeof row.desc === "string"
                  ? row.desc.slice(0, 200)
                  : "";
          const valor = parseFiniteNumber(row.valor ?? row.amount);
          if (!descricao || valor === null) return null;

          const tipoRaw =
            typeof row.tipo === "string"
              ? row.tipo
              : typeof row.type === "string"
                ? row.type
                : valor > 0
                  ? "Entrada"
                  : "Saída";
          const tipo: "Entrada" | "Saída" = /entrada|income|receita/i.test(tipoRaw)
            ? "Entrada"
            : "Saída";
          const categoria =
            typeof row.categoria === "string"
              ? row.categoria.slice(0, 80)
              : typeof row.category === "string"
                ? row.category.slice(0, 80)
                : undefined;
          const data =
            typeof row.data === "string"
              ? row.data.slice(0, 32)
              : typeof row.date === "string"
                ? row.date.slice(0, 32)
                : undefined;

          return {
            descricao,
            valor: Math.abs(valor),
            tipo,
            ...(categoria ? { categoria } : {}),
            ...(data ? { data } : {}),
          };
        })
        .filter(
          (
            item,
          ): item is {
            descricao: string;
            valor: number;
            tipo: "Entrada" | "Saída";
            categoria?: string;
            data?: string;
          } => item !== null,
        )
        .slice(0, 10)
    : [];

  // Sem período e sem totais/raio-x → não há snapshot útil do ecrã.
  if (
    !periodoAtual &&
    entradas === 0 &&
    saidas === 0 &&
    topCategorias.length === 0 &&
    maioresMovimentacoes.length === 0
  ) {
    return undefined;
  }

  return {
    periodoAtual,
    modoVisualizacao,
    resumo: { entradas, saidas, saldoLiquido },
    raioX: { topCategorias, maioresMovimentacoes },
  };
}

function round2Safe(value: number) {
  return Math.round(value * 100) / 100;
}

/** Valida / normaliza o payload enviado pelo cliente (nunca confiar cegamente). */
export function parseFinancialContext(raw: unknown): FinancialContextPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const saldo = parseFiniteNumber(value.saldo);
  if (saldo === null) return null;

  const despesasMes = parseFiniteNumber(value.despesasMes);
  const mercado = parseOptionalNumberFields(value.mercado, [
    "dolar",
    "euro",
    "bitcoin",
    "ibovespa",
    "selic",
    "cdi",
  ] as const);
  const portfolio = parseOptionalNumberFields(value.portfolio, [
    "totalWealth",
    "cashFlowMensal",
    "gastosMesAtual",
  ] as const);
  const ultimasTransacoes = parseUltimasTransacoes(value.ultimasTransacoes);
  const compras = parseComprasContext(value.compras);
  const assinaturas = parseAssinaturasContext(value.assinaturas);
  const fluxoCaixa = parseFluxoCaixaContext(value.fluxoCaixa);
  const noticias = parseNoticiasContext(value.noticias);
  const configuracoes = parseConfiguracoesContext(value.configuracoes);
  const sistema = parseSistemaContext(value.sistema);
  const autenticacao = parseAutenticacaoContext(value.autenticacao);
  const termosCondicoesGlobais = parseTermosCondicoesContext(
    value.termosCondicoesGlobais,
  );

  return {
    saldo,
    assinaturas,
    metas: parseMetasContext(value.metas),
    ...(despesasMes !== null ? { despesasMes } : {}),
    topCategoriasMes: parseStringList(value.topCategoriasMes, 10, 120),
    ...(mercado ? { mercado } : {}),
    ...(portfolio ? { portfolio } : {}),
    ...(ultimasTransacoes ? { ultimasTransacoes } : {}),
    ...(compras ? { compras } : {}),
    ...(fluxoCaixa ? { fluxoCaixa } : {}),
    ...(noticias ? { noticias } : {}),
    ...(configuracoes ? { configuracoes } : {}),
    ...(sistema ? { sistema } : {}),
    ...(autenticacao ? { autenticacao } : {}),
    ...(termosCondicoesGlobais ? { termosCondicoesGlobais } : {}),
  };
}

function parseSistemaContext(raw: unknown): SistemaContext | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const value = raw as Record<string, unknown>;

  const dataHoraAtual =
    typeof value.dataHoraAtual === "string"
      ? value.dataHoraAtual.trim().slice(0, 40)
      : typeof value.now === "string"
        ? value.now.trim().slice(0, 40)
        : "";
  const fusoHorario =
    typeof value.fusoHorario === "string"
      ? value.fusoHorario.trim().slice(0, 64)
      : typeof value.timeZone === "string"
        ? value.timeZone.trim().slice(0, 64)
        : "UTC";
  const plataforma =
    typeof value.plataforma === "string"
      ? value.plataforma.trim().slice(0, 64)
      : typeof value.platform === "string"
        ? value.platform.trim().slice(0, 64)
        : "Projekt Fin";
  const versao =
    typeof value.versao === "string"
      ? value.versao.trim().slice(0, 32)
      : typeof value.version === "string"
        ? value.version.trim().slice(0, 32)
        : "1.0.0";

  if (!dataHoraAtual && !fusoHorario) return undefined;

  return {
    dataHoraAtual: dataHoraAtual || new Date().toISOString(),
    fusoHorario: fusoHorario || "UTC",
    plataforma: plataforma || "Projekt Fin",
    versao: versao || "1.0.0",
  };
}

function parseAutenticacaoContext(raw: unknown): AutenticacaoContext | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const value = raw as Record<string, unknown>;

  const sessaoAtiva =
    value.sessaoAtiva === true ||
    value.isAuthenticated === true ||
    (typeof value.status === "string" &&
      /autenticado/i.test(value.status) &&
      !/n[aã]o\s*autenticado/i.test(value.status));

  const status: AutenticacaoContext["status"] = sessaoAtiva
    ? "Autenticado"
    : "Não Autenticado";

  const metodo =
    typeof value.metodo === "string"
      ? value.metodo.trim().slice(0, 64)
      : typeof value.provider === "string"
        ? value.provider.trim().slice(0, 64)
        : "Email/Senha";

  return {
    status,
    metodo: metodo || "Email/Senha",
    sessaoAtiva,
  };
}

function parseTermosCondicoesContext(
  raw: unknown,
): TermosCondicoesContext | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const value = raw as Record<string, unknown>;

  const privacidade =
    typeof value.privacidade === "string"
      ? value.privacidade.trim().slice(0, 500)
      : "";
  const disclaimerMercado =
    typeof value.disclaimerMercado === "string"
      ? value.disclaimerMercado.trim().slice(0, 500)
      : "";
  const regrasUso =
    typeof value.regrasUso === "string"
      ? value.regrasUso.trim().slice(0, 500)
      : "";

  if (!privacidade && !disclaimerMercado && !regrasUso) return undefined;

  return {
    privacidade: privacidade || TERMOS_CONDICOES_RESUMO.privacidade,
    disclaimerMercado:
      disclaimerMercado || TERMOS_CONDICOES_RESUMO.disclaimerMercado,
    regrasUso: regrasUso || TERMOS_CONDICOES_RESUMO.regrasUso,
  };
}

function parseConfiguracoesContext(raw: unknown): ConfiguracoesContext | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const value = raw as Record<string, unknown>;

  const perfilRaw =
    value.perfil && typeof value.perfil === "object"
      ? (value.perfil as Record<string, unknown>)
      : value;
  const preferenciasRaw =
    value.preferencias && typeof value.preferencias === "object"
      ? (value.preferencias as Record<string, unknown>)
      : value;

  const nome =
    typeof perfilRaw.nome === "string"
      ? perfilRaw.nome.trim().slice(0, 120)
      : typeof perfilRaw.name === "string"
        ? perfilRaw.name.trim().slice(0, 120)
        : "";
  const email =
    typeof perfilRaw.email === "string" ? perfilRaw.email.trim().slice(0, 160) : "";

  if (!nome && !email) return undefined;

  const idioma =
    typeof preferenciasRaw.idioma === "string"
      ? preferenciasRaw.idioma.trim().slice(0, 16)
      : typeof preferenciasRaw.language === "string"
        ? preferenciasRaw.language.trim().slice(0, 16)
        : typeof preferenciasRaw.locale === "string"
          ? preferenciasRaw.locale.trim().slice(0, 16)
          : "pt-BR";

  const moedaRaw =
    typeof preferenciasRaw.moeda === "string"
      ? preferenciasRaw.moeda.trim().toUpperCase()
      : typeof preferenciasRaw.currency === "string"
        ? preferenciasRaw.currency.trim().toUpperCase()
        : "BRL";
  const moeda =
    moedaRaw === "BRL" || moedaRaw === "USD" || moedaRaw === "EUR" ? moedaRaw : "BRL";

  const temaRaw =
    typeof preferenciasRaw.tema === "string"
      ? preferenciasRaw.tema.trim().toLowerCase()
      : typeof preferenciasRaw.theme === "string"
        ? preferenciasRaw.theme.trim().toLowerCase()
        : "dark";
  const tema =
    temaRaw === "light" || temaRaw === "system" ? temaRaw : "dark";

  const modoPrivacidade =
    preferenciasRaw.modoPrivacidade === true || preferenciasRaw.privacyMode === true;
  const alertasVencimento =
    preferenciasRaw.alertasVencimento !== false &&
    preferenciasRaw.alertsEnabled !== false;
  const resumoEmail =
    preferenciasRaw.resumoEmail === true ||
    preferenciasRaw.emailSummaryEnabled === true;

  const modulosAtivos = Array.isArray(value.modulosAtivos)
    ? value.modulosAtivos
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().slice(0, 64))
        .filter(Boolean)
        .slice(0, 10)
    : [
        "Perfil",
        "Preferências",
        "Categorias",
        "Notificações",
        "Dados e Exportação",
      ];

  const abaAtiva =
    typeof value.abaAtiva === "string"
      ? value.abaAtiva.trim().slice(0, 40)
      : typeof value.activeTab === "string"
        ? value.activeTab.trim().slice(0, 40)
        : undefined;

  return {
    perfil: {
      nome: nome || "Utilizador",
      email,
    },
    preferencias: {
      idioma: idioma || "pt-BR",
      moeda,
      tema,
      modoPrivacidade,
      alertasVencimento,
      resumoEmail,
    },
    modulosAtivos:
      modulosAtivos.length > 0
        ? modulosAtivos
        : [
            "Perfil",
            "Preferências",
            "Categorias",
            "Notificações",
            "Dados e Exportação",
          ],
    ...(abaAtiva ? { abaAtiva } : {}),
  };
}

function parseNoticiasContext(raw: unknown): NoticiasContext | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const value = raw as Record<string, unknown>;

  const abaSelecionada =
    typeof value.abaSelecionada === "string"
      ? value.abaSelecionada.trim().slice(0, 40)
      : typeof value.currentTab === "string"
        ? value.currentTab.trim().slice(0, 40)
        : "";
  const termoPesquisado =
    typeof value.termoPesquisado === "string"
      ? value.termoPesquisado.trim().slice(0, 120) || "Nenhum"
      : typeof value.searchQuery === "string"
        ? value.searchQuery.trim().slice(0, 120) || "Nenhum"
        : "Nenhum";

  const headlinesRaw = Array.isArray(value.ultimasManchetes)
    ? value.ultimasManchetes
    : Array.isArray(value.headlines)
      ? value.headlines
      : [];

  const ultimasManchetes = headlinesRaw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as Record<string, unknown>;
      const titulo =
        typeof row.titulo === "string"
          ? row.titulo.trim().slice(0, 200)
          : typeof row.title === "string"
            ? row.title.trim().slice(0, 200)
            : "";
      if (!titulo) return null;

      const fonte =
        typeof row.fonte === "string"
          ? row.fonte.trim().slice(0, 80)
          : typeof row.source === "string"
            ? row.source.trim().slice(0, 80)
            : "Fonte desconhecida";
      const tempo =
        typeof row.tempo === "string"
          ? row.tempo.trim().slice(0, 40)
          : typeof row.timeAgo === "string"
            ? row.timeAgo.trim().slice(0, 40)
            : "";
      const resumoRaw =
        typeof row.resumo === "string"
          ? row.resumo
          : typeof row.description === "string"
            ? row.description
            : "";
      const resumo = resumoRaw.trim().slice(0, 160);

      return {
        fonte: fonte || "Fonte desconhecida",
        tempo: tempo || "agora",
        titulo,
        resumo,
      };
    })
    .filter(
      (
        item,
      ): item is {
        fonte: string;
        tempo: string;
        titulo: string;
        resumo: string;
      } => item !== null,
    )
    .slice(0, 5);

  if (!abaSelecionada && ultimasManchetes.length === 0) return undefined;

  return {
    abaSelecionada: abaSelecionada || "Geral",
    termoPesquisado,
    ultimasManchetes,
  };
}

/**
 * Aceita o objecto novo ou a lista legada de strings ("Hunter 350: 1200/5000").
 */
function parseMetasContext(raw: unknown): MetasContext {
  if (!raw) return emptyMetasContext();

  if (Array.isArray(raw)) {
    const legacy = parseStringList(raw, 50, 200);
    const listaMetas = legacy.map((entry) => {
      const match = /^(.+?):\s*([\d.,]+)\s*\/\s*([\d.,]+)/.exec(entry);
      const valorAtual = match ? Number(match[2].replace(",", ".")) || 0 : 0;
      const valorAlvo = match ? Number(match[3].replace(",", ".")) || 0 : 0;
      const valorRestante = Math.max(0, valorAlvo - valorAtual);
      const percentagem =
        valorAlvo > 0 ? Math.round((valorAtual / valorAlvo) * 1000) / 10 : 0;
      const nome = (match?.[1] ?? entry).trim().slice(0, 120) || "Sem nome";
      return {
        nome,
        categoria: "Outros",
        valorAtual,
        valorAlvo,
        valorRestante,
        percentagem,
        progresso: `${valorAtual} de ${valorAlvo} (${percentagem}%)`,
        prazo: "",
        mesesRestantes: 0,
      };
    });
    return { listaMetas, totalMetasAtivas: listaMetas.length };
  }

  if (typeof raw !== "object") return emptyMetasContext();
  const value = raw as Record<string, unknown>;

  const listaMetas = Array.isArray(value.listaMetas)
    ? value.listaMetas
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const row = entry as Record<string, unknown>;
          const nome =
            typeof row.nome === "string"
              ? row.nome.slice(0, 120)
              : typeof row.title === "string"
                ? row.title.slice(0, 120)
                : typeof row.name === "string"
                  ? row.name.slice(0, 120)
                  : "";
          const valorAtual =
            parseFiniteNumber(row.valorAtual ?? row.currentAmount) ?? 0;
          const valorAlvo =
            parseFiniteNumber(row.valorAlvo ?? row.targetAmount) ?? 0;
          if (!nome) return null;

          const valorRestante =
            parseFiniteNumber(row.valorRestante) ??
            Math.max(0, valorAlvo - valorAtual);
          const percentagem =
            parseFiniteNumber(row.percentagem ?? row.percent) ??
            (valorAlvo > 0
              ? Math.round((valorAtual / valorAlvo) * 1000) / 10
              : 0);
          const categoria =
            typeof row.categoria === "string"
              ? row.categoria.slice(0, 80)
              : typeof row.category === "string"
                ? row.category.slice(0, 80)
                : "Outros";
          const prazo =
            typeof row.prazo === "string"
              ? row.prazo.slice(0, 32)
              : typeof row.targetDate === "string"
                ? row.targetDate.slice(0, 32)
                : typeof row.dataLimite === "string"
                  ? row.dataLimite.slice(0, 32)
                  : "";
          const mesesRestantes =
            parseFiniteNumber(row.mesesRestantes) ?? 0;
          const progresso =
            typeof row.progresso === "string"
              ? row.progresso.slice(0, 120)
              : `${valorAtual} de ${valorAlvo} (${percentagem}%)`;

          return {
            nome,
            categoria,
            valorAtual,
            valorAlvo,
            valorRestante,
            percentagem,
            progresso,
            prazo,
            mesesRestantes,
          };
        })
        .filter(
          (
            item,
          ): item is {
            nome: string;
            categoria: string;
            valorAtual: number;
            valorAlvo: number;
            valorRestante: number;
            percentagem: number;
            progresso: string;
            prazo: string;
            mesesRestantes: number;
          } => item !== null,
        )
        .slice(0, 30)
    : [];

  const totalMetasAtivas =
    parseFiniteNumber(value.totalMetasAtivas) ?? listaMetas.length;

  return { listaMetas, totalMetasAtivas };
}

/**
 * Aceita o objecto novo ou a lista legada de strings ("Spotify: 21.90/mês").
 */
function parseAssinaturasContext(raw: unknown): AssinaturasContext {
  if (!raw) return emptyAssinaturasContext();

  if (Array.isArray(raw)) {
    const legacy = parseStringList(raw, 50, 200);
    return {
      listaAtivas: legacy.map((entry) => ({
        nome: entry.slice(0, 120),
        valor: 0,
        periodicidade: entry.toLowerCase().includes("/ano") ? "Anual" : "Mensal",
        proximoVencimento: "",
      })),
      totalGastoMensalEstimado: 0,
    };
  }

  if (typeof raw !== "object") return emptyAssinaturasContext();
  const value = raw as Record<string, unknown>;
  const totalGastoMensalEstimado =
    parseFiniteNumber(value.totalGastoMensalEstimado) ?? 0;

  const listaAtivas = Array.isArray(value.listaAtivas)
    ? value.listaAtivas
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const row = entry as Record<string, unknown>;
          const nome =
            typeof row.nome === "string"
              ? row.nome.slice(0, 120)
              : typeof row.name === "string"
                ? row.name.slice(0, 120)
                : "";
          const valor = parseFiniteNumber(row.valor ?? row.amount) ?? 0;
          if (!nome) return null;
          const periodicidadeRaw =
            typeof row.periodicidade === "string"
              ? row.periodicidade
              : typeof row.cycle === "string"
                ? row.cycle
                : "Mensal";
          const periodicidade: "Mensal" | "Anual" = /anual|yearly|annual|ano/i.test(
            periodicidadeRaw,
          )
            ? "Anual"
            : "Mensal";
          const proximoVencimento =
            typeof row.proximoVencimento === "string"
              ? row.proximoVencimento.slice(0, 32)
              : typeof row.nextDue === "string"
                ? row.nextDue.slice(0, 32)
                : "";
          return { nome, valor, periodicidade, proximoVencimento };
        })
        .filter(
          (
            item,
          ): item is {
            nome: string;
            valor: number;
            periodicidade: "Mensal" | "Anual";
            proximoVencimento: string;
          } => item !== null,
        )
        .slice(0, 50)
    : [];

  return { listaAtivas, totalGastoMensalEstimado };
}

/**
 * Funde o snapshot carregado (Appwrite/API) com o snapshot live do ecrã Market Hub.
 * Campos do ecrã têm prioridade — são os valores que o utilizador está a ver.
 */
export function mergeFinancialContext(
  base: FinancialContextPayload,
  overlay: Partial<FinancialContextPayload> | null | undefined,
): FinancialContextPayload {
  if (!overlay) return base;

  return {
    saldo: typeof overlay.saldo === "number" ? overlay.saldo : base.saldo,
    assinaturas: overlay.assinaturas ?? base.assinaturas,
    metas: overlay.metas ?? base.metas,
    despesasMes:
      typeof overlay.despesasMes === "number" ? overlay.despesasMes : base.despesasMes,
    topCategoriasMes: overlay.topCategoriasMes ?? base.topCategoriasMes,
    mercado: overlay.mercado
      ? { ...base.mercado, ...overlay.mercado }
      : base.mercado,
    portfolio: overlay.portfolio
      ? { ...base.portfolio, ...overlay.portfolio }
      : base.portfolio,
    ultimasTransacoes: overlay.ultimasTransacoes ?? base.ultimasTransacoes,
    compras: overlay.compras ?? base.compras,
    fluxoCaixa: overlay.fluxoCaixa ?? base.fluxoCaixa,
    noticias: overlay.noticias ?? base.noticias,
    configuracoes: overlay.configuracoes ?? base.configuracoes,
    sistema: overlay.sistema ?? base.sistema,
    autenticacao: overlay.autenticacao ?? base.autenticacao,
    termosCondicoesGlobais:
      overlay.termosCondicoesGlobais ?? base.termosCondicoesGlobais,
  };
}

/** String clara para concatenar ao SYSTEM_PROMPT. */
export function formatFinancialContextForPrompt(
  context: FinancialContextPayload,
): string {
  const assinaturas = formatAssinaturasSummaryLine(context.assinaturas);
  const fluxoCaixaLine = context.fluxoCaixa
    ? formatFluxoCaixaSummaryLine(context.fluxoCaixa)
    : "indisponível";
  const metas = formatMetasSummaryLine(context.metas);
  const noticiasLine = context.noticias
    ? formatNoticiasSummaryLine(context.noticias)
    : "indisponível";
  const configuracoesLine = context.configuracoes
    ? formatConfiguracoesSummaryLine(context.configuracoes)
    : "indisponível";
  const sistemaLine = context.sistema
    ? formatSistemaSummaryLine(context.sistema)
    : "indisponível";
  const authLine = context.autenticacao
    ? `${context.autenticacao.status} (${context.autenticacao.metodo})`
    : "indisponível";
  const despesas =
    typeof context.despesasMes === "number" && Number.isFinite(context.despesasMes)
      ? String(context.despesasMes)
      : typeof context.portfolio?.gastosMesAtual === "number"
        ? String(context.portfolio.gastosMesAtual)
        : "indisponível";
  const categorias =
    context.topCategoriasMes && context.topCategoriasMes.length > 0
      ? context.topCategoriasMes.join(", ")
      : "indisponível";

  const liveSnapshot = {
    sistema: context.sistema ?? null,
    autenticacao: context.autenticacao ?? null,
    termosCondicoesGlobais: context.termosCondicoesGlobais ?? null,
    mercado: context.mercado ?? null,
    portfolio: {
      totalWealth: context.portfolio?.totalWealth ?? context.saldo,
      cashFlowMensal: context.portfolio?.cashFlowMensal ?? null,
      gastosMesAtual: context.portfolio?.gastosMesAtual ?? context.despesasMes ?? null,
    },
    ultimasTransacoes: context.ultimasTransacoes ?? [],
    compras: context.compras ?? null,
    assinaturas: context.assinaturas,
    fluxoCaixa: context.fluxoCaixa ?? null,
    metas: context.metas,
    noticias: context.noticias ?? null,
    configuracoes: context.configuracoes ?? null,
    topCategoriasMes: context.topCategoriasMes ?? [],
  };

  return `Dados atuais do utilizador: Saldo: ${context.saldo} | Despesas do mês: ${despesas} | Top categorias do mês: ${categorias} | Assinaturas ativas: ${assinaturas} | Fluxo de Caixa: ${fluxoCaixaLine} | Metas: ${metas} | Notícias: ${noticiasLine} | Configurações: ${configuracoesLine} | Sistema: ${sistemaLine} | Auth: ${authLine}

Contexto financeiro em tempo real (JSON — usa estes valores exactos; não inventes números em falta):
${JSON.stringify(liveSnapshot)}`;
}
