/** Shape mínimo aceite pelo resumo (Appwrite ou UI de Metas). */
export type GoalsContextInput = {
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  category?: string | null;
  /** Ausente ou false = activa; true = concluída. */
  isCompleted?: boolean | null;
  status?: string | null;
};

export type MetaListaItem = {
  nome: string;
  categoria: string;
  valorAtual: number;
  valorAlvo: number;
  valorRestante: number;
  percentagem: number;
  /** Resumo legível: "1200 de 5000 (24%)". */
  progresso: string;
  /** Prazo em ISO (YYYY-MM-DD) para a IA calcular com precisão. */
  prazo: string;
  mesesRestantes: number;
};

export type MetasContext = {
  listaMetas: MetaListaItem[];
  totalMetasAtivas: number;
};

const CATEGORY_LABELS: Record<string, string> = {
  travel: "Viagem",
  emergency: "Emergência",
  tech: "Tecnologia",
  home: "Casa",
  education: "Educação",
  car: "Veículo",
  other: "Outros",
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function isCompletedGoal(goal: GoalsContextInput) {
  if (goal.isCompleted === true) return true;
  if (typeof goal.status === "string") {
    const normalized = goal.status.trim().toLowerCase();
    if (
      normalized === "concluída" ||
      normalized === "concluida" ||
      normalized === "completed" ||
      normalized === "done"
    ) {
      return true;
    }
  }
  const target = Number(goal.targetAmount) || 0;
  const current = Number(goal.currentAmount) || 0;
  return target > 0 && current >= target;
}

function categoryLabel(category: string | null | undefined) {
  if (!category) return "Outros";
  const key = category.trim().toLowerCase();
  return CATEGORY_LABELS[key] ?? (category.trim().slice(0, 80) || "Outros");
}

/** Meses restantes até à data-alvo (0 se vencida; mínimo 1 se ainda há dias). */
export function computeMonthsRemaining(isoDate: string, now = new Date()): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) return 0;

  const target = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 0;
  if (diffDays < 30) return 1;
  return Math.round(diffDays / 30);
}

/**
 * Resume metas activas para a Quantum.IA:
 * progresso, prazo e meses restantes — sem imagens nem descrições longas.
 */
export function generateGoalsContext(
  goals: GoalsContextInput[],
  now = new Date(),
): MetasContext {
  const ativas = goals.filter((goal) => !isCompletedGoal(goal));

  const listaMetas = ativas.slice(0, 30).map((goal) => {
    const valorAlvo = round2(Math.max(0, Number(goal.targetAmount) || 0));
    const valorAtual = round2(Math.max(0, Number(goal.currentAmount) || 0));
    const valorRestante = round2(Math.max(0, valorAlvo - valorAtual));
    const percentagem =
      valorAlvo > 0 ? round2(Math.min(100, (valorAtual / valorAlvo) * 100)) : 0;
    const prazo = String(goal.targetDate ?? "").slice(0, 32);
    const mesesRestantes = computeMonthsRemaining(prazo, now);
    const nome = goal.title.trim().slice(0, 120) || "Sem nome";

    return {
      nome,
      categoria: categoryLabel(goal.category),
      valorAtual,
      valorAlvo,
      valorRestante,
      percentagem,
      progresso: `${valorAtual} de ${valorAlvo} (${percentagem}%)`,
      prazo,
      mesesRestantes,
    };
  });

  return {
    listaMetas,
    totalMetasAtivas: listaMetas.length,
  };
}

export function emptyMetasContext(): MetasContext {
  return { listaMetas: [], totalMetasAtivas: 0 };
}

/** Texto curto para o cabeçalho do system prompt. */
export function formatMetasSummaryLine(context: MetasContext): string {
  if (context.listaMetas.length === 0) return "nenhuma";
  const list = context.listaMetas
    .slice(0, 8)
    .map((item) => `${item.nome}: ${item.progresso}`)
    .join(", ");
  return `${list} | activas: ${context.totalMetasAtivas}`;
}
