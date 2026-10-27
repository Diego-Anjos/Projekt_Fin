import { formatInstallmentDescription } from "@/lib/installments";
import { isCurrentMonthTransaction } from "@/lib/transaction-timing";

/** Shape mínimo aceite pelo resumo (Appwrite ou UI de Compras). */
export type TransactionsContextInput = {
  description: string;
  category: string;
  date: string;
  amount: number;
  type: "income" | "expense" | string;
  status: "Paid" | "Pending" | string;
  installmentNumber?: number | null;
  totalInstallments?: number | null;
};

export type PendingParcelContext = {
  desc: string;
  valor: number;
  data: string;
  categoria?: string;
  parcela?: string;
};

export type ComprasContext = {
  totalGastoMes: number;
  totalReceitasMes: number;
  /** Gastos do mês actual por categoria (top categorias, tokens limitados). */
  resumoGastosMes: Record<string, number>;
  categoriasMaisCaras: Array<{ categoria: string; total: number }>;
  /** Até 10 parcelas/lançamentos Pendentes (datas futuras e em aberto). */
  parcelasPendentes: PendingParcelContext[];
  totalTransacoesAvaliadas: number;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

/**
 * Resume centenas de transações num bloco compacto para a Quantum.IA.
 * Evita enviar a tabela completa (custo de tokens) sem perder o essencial:
 * totais do mês, categorias e parcelas pendentes.
 */
export function generateTransactionsContext(
  transactions: TransactionsContextInput[],
  now = new Date(),
): ComprasContext {
  const gastosPorCategoria: Record<string, number> = {};
  let totalGastoMes = 0;
  let totalReceitasMes = 0;

  for (const transaction of transactions) {
    if (!isCurrentMonthTransaction(transaction.date, now)) continue;

    const amount = Number(transaction.amount) || 0;
    if (amount <= 0) continue;

    if (transaction.type === "income") {
      totalReceitasMes += amount;
      continue;
    }

    if (transaction.type !== "expense") continue;

    totalGastoMes += amount;
    const categoria = transaction.category.trim() || "Sem categoria";
    gastosPorCategoria[categoria] = (gastosPorCategoria[categoria] ?? 0) + amount;
  }

  const categoriasMaisCaras = Object.entries(gastosPorCategoria)
    .map(([categoria, total]) => ({ categoria, total: round2(total) }))
    .sort(
      (left, right) =>
        right.total - left.total || left.categoria.localeCompare(right.categoria, "pt-BR"),
    )
    .slice(0, 10);

  const resumoGastosMes: Record<string, number> = {};
  for (const item of categoriasMaisCaras) {
    resumoGastosMes[item.categoria] = item.total;
  }

  const parcelasPendentes = transactions
    .filter((transaction) => transaction.status === "Pending")
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(0, 10)
    .map((transaction) => {
      const desc = formatInstallmentDescription(
        transaction.description,
        transaction.installmentNumber,
        transaction.totalInstallments,
      );
      const categoria = transaction.category.trim() || undefined;
      const total = Number(transaction.totalInstallments);
      const current = Number(transaction.installmentNumber);
      const parcela =
        Number.isInteger(total) &&
        total > 1 &&
        Number.isInteger(current) &&
        current >= 1
          ? `${current}/${total}`
          : undefined;

      return {
        desc,
        valor: round2(Number(transaction.amount) || 0),
        data: transaction.date.slice(0, 10),
        ...(categoria ? { categoria } : {}),
        ...(parcela ? { parcela } : {}),
      };
    });

  return {
    totalGastoMes: round2(totalGastoMes),
    totalReceitasMes: round2(totalReceitasMes),
    resumoGastosMes,
    categoriasMaisCaras,
    parcelasPendentes,
    totalTransacoesAvaliadas: transactions.length,
  };
}
