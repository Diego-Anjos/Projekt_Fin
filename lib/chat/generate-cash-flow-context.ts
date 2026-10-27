import type { CashTransaction, CategoryTotal } from "@/lib/cash-flow";

export type FluxoCaixaCategoriaItem = {
  nome: string;
  valor: number;
  percentagem: number;
};

export type FluxoCaixaMovimentacaoItem = {
  descricao: string;
  valor: number;
  tipo: "Entrada" | "Saída";
  categoria?: string;
  data?: string;
};

export type FluxoCaixaContext = {
  periodoAtual: string;
  modoVisualizacao: "mensal" | "anual";
  resumo: {
    entradas: number;
    saidas: number;
    saldoLiquido: number;
  };
  raioX: {
    topCategorias: FluxoCaixaCategoriaItem[];
    maioresMovimentacoes: FluxoCaixaMovimentacaoItem[];
  };
};

export type CashFlowContextInput = {
  periodoAtual: string;
  modoVisualizacao?: "mensal" | "anual";
  entradas: number;
  saidas: number;
  saldoLiquido: number;
  categorias: CategoryTotal[];
  movimentacoes: CashTransaction[];
  /** Quantidade de categorias/movimentações a incluir (default 5). */
  limit?: number;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

/**
 * Condensa o ecrã Fluxo de Caixa num JSON leve para a Quantum.IA:
 * período, totais e Raio-X (top categorias + maiores movimentações).
 */
export function generateCashFlowContext(input: CashFlowContextInput): FluxoCaixaContext {
  const limit = Math.min(Math.max(input.limit ?? 5, 1), 10);

  const topCategorias = input.categorias.slice(0, limit).map((category) => ({
    nome: category.name.trim().slice(0, 80) || "Sem categoria",
    valor: round2(category.value),
    percentagem: round2(category.percent),
  }));

  const maioresMovimentacoes = input.movimentacoes.slice(0, limit).map((move) => {
    const amount = Number(move.amount) || 0;
    const descricao =
      (move.description?.trim() || move.category?.trim() || "—").slice(0, 200);
    const categoria = move.category?.trim().slice(0, 80);
    const data = move.date?.slice(0, 10);

    return {
      descricao,
      valor: round2(Math.abs(amount)),
      tipo: (move.type === "income" ? "Entrada" : "Saída") as "Entrada" | "Saída",
      ...(categoria ? { categoria } : {}),
      ...(data ? { data } : {}),
    };
  });

  return {
    periodoAtual: input.periodoAtual.slice(0, 64),
    modoVisualizacao: input.modoVisualizacao ?? "mensal",
    resumo: {
      entradas: round2(input.entradas),
      saidas: round2(input.saidas),
      saldoLiquido: round2(input.saldoLiquido),
    },
    raioX: {
      topCategorias,
      maioresMovimentacoes,
    },
  };
}

export function emptyFluxoCaixaContext(): FluxoCaixaContext {
  return {
    periodoAtual: "",
    modoVisualizacao: "mensal",
    resumo: { entradas: 0, saidas: 0, saldoLiquido: 0 },
    raioX: { topCategorias: [], maioresMovimentacoes: [] },
  };
}

/** Texto curto para o cabeçalho do system prompt. */
export function formatFluxoCaixaSummaryLine(context: FluxoCaixaContext): string {
  if (!context.periodoAtual) return "indisponível";
  const { entradas, saidas, saldoLiquido } = context.resumo;
  const top =
    context.raioX.topCategorias.length > 0
      ? context.raioX.topCategorias
          .slice(0, 3)
          .map((c) => `${c.nome}: ${c.valor}`)
          .join(", ")
      : "sem categorias";
  return `${context.periodoAtual} | +${entradas} / -${saidas} / líquido ${saldoLiquido} | top: ${top}`;
}
