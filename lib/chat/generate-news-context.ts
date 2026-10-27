/** Shape mínimo de um artigo visível no ecrã Notícias. */
export type NewsContextInput = {
  source?: string | { name?: string | null } | null;
  title?: string | null;
  description?: string | null;
  publishedAt?: string | null;
  /** Relativo já formatado (ex: "Há 1 dia"); se ausente, deriva de publishedAt. */
  timeAgo?: string | null;
};

export type NoticiaMancheteItem = {
  fonte: string;
  tempo: string;
  titulo: string;
  resumo: string;
};

export type NoticiasContext = {
  abaSelecionada: string;
  termoPesquisado: string;
  ultimasManchetes: NoticiaMancheteItem[];
};

const TAB_LABELS: Record<string, string> = {
  geral: "Geral",
  cripto: "Cripto",
  acoes: "Ações",
  macro: "Macroeconomia",
};

const MAX_HEADLINES = 5;
const MAX_SUMMARY_CHARS = 150;
const MAX_TITLE_CHARS = 200;
const MAX_SOURCE_CHARS = 80;

function resolveSource(source: NewsContextInput["source"]): string {
  if (typeof source === "string") {
    const trimmed = source.trim();
    return trimmed.slice(0, MAX_SOURCE_CHARS) || "Fonte desconhecida";
  }
  if (source && typeof source === "object" && typeof source.name === "string") {
    const trimmed = source.name.trim();
    return trimmed.slice(0, MAX_SOURCE_CHARS) || "Fonte desconhecida";
  }
  return "Fonte desconhecida";
}

/** Relativo em PT para o contexto da IA (independente do idioma da UI). */
export function formatNewsRelativeTime(
  isoDate: string | null | undefined,
  now = new Date(),
): string {
  if (!isoDate) return "agora";
  const published = new Date(isoDate);
  if (Number.isNaN(published.getTime())) return "agora";

  const minutes = Math.max(0, Math.round((now.getTime() - published.getTime()) / 60000));
  if (minutes < 1) return "agora";
  if (minutes < 60) return `Há ${minutes} min`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? "Há 1 hora" : `Há ${hours} horas`;

  const days = Math.round(hours / 24);
  return days === 1 ? "Há 1 dia" : `Há ${days} dias`;
}

function truncateSummary(description: string | null | undefined): string {
  const text = (description ?? "").trim();
  if (!text) return "";
  if (text.length <= MAX_SUMMARY_CHARS) return text;
  return `${text.slice(0, MAX_SUMMARY_CHARS)}...`;
}

/**
 * Resume as notícias visíveis no ecrã para a Quantum.IA.
 * Limita a 5 manchetes e corta resumos para poupar tokens no Gemini.
 */
export function generateNewsContext(
  visibleNews: NewsContextInput[],
  currentTab: string,
  searchQuery?: string | null,
  now = new Date(),
): NoticiasContext {
  const tabKey = currentTab.trim().toLowerCase();
  const abaSelecionada =
    TAB_LABELS[tabKey] ?? (currentTab.trim().slice(0, 40) || "Geral");

  const termo = (searchQuery ?? "").trim();
  const noticiasRelevantes = visibleNews.slice(0, MAX_HEADLINES).map((news) => {
    const titulo = (news.title ?? "").trim().slice(0, MAX_TITLE_CHARS) || "Sem título";
    const tempo =
      (news.timeAgo ?? "").trim().slice(0, 40) ||
      formatNewsRelativeTime(news.publishedAt, now);

    return {
      fonte: resolveSource(news.source),
      tempo,
      titulo,
      resumo: truncateSummary(news.description),
    };
  });

  return {
    abaSelecionada,
    termoPesquisado: termo || "Nenhum",
    ultimasManchetes: noticiasRelevantes,
  };
}

export function emptyNoticiasContext(): NoticiasContext {
  return {
    abaSelecionada: "Geral",
    termoPesquisado: "Nenhum",
    ultimasManchetes: [],
  };
}

/** Texto curto para o cabeçalho do system prompt. */
export function formatNoticiasSummaryLine(context: NoticiasContext): string {
  if (context.ultimasManchetes.length === 0) return "nenhuma";
  const list = context.ultimasManchetes
    .slice(0, 3)
    .map((item) => `${item.fonte}: ${item.titulo}`)
    .join("; ");
  return `aba ${context.abaSelecionada} | ${list}`;
}
