/** Shape mínimo aceite pelo resumo (Appwrite ou UI de Assinaturas). */
export type SubscriptionsContextInput = {
  name: string;
  amount: number;
  cycle: "monthly" | "yearly" | string;
  nextDue: string;
  /** Ausente ou "active"/"Ativa" contam como activas. */
  status?: string | null;
};

export type AssinaturaListaItem = {
  nome: string;
  valor: number;
  periodicidade: "Mensal" | "Anual";
  proximoVencimento: string;
};

export type AssinaturasContext = {
  listaAtivas: AssinaturaListaItem[];
  /** Custo mensal estimado (anuais ÷ 12). */
  totalGastoMensalEstimado: number;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function isActiveSubscription(status: string | null | undefined) {
  if (!status) return true;
  const normalized = status.trim().toLowerCase();
  return (
    normalized === "active" ||
    normalized === "ativa" ||
    normalized === "ativo" ||
    normalized === "enabled"
  );
}

function toPeriodicidade(cycle: string): "Mensal" | "Anual" {
  const normalized = cycle.trim().toLowerCase();
  if (
    normalized === "yearly" ||
    normalized === "annual" ||
    normalized === "anual" ||
    normalized === "ano"
  ) {
    return "Anual";
  }
  return "Mensal";
}

/**
 * Resume assinaturas activas para a Quantum.IA:
 * lista compacta + gasto mensal estimado (valores anuais normalizados ÷ 12).
 */
export function generateSubscriptionsContext(
  subscriptions: SubscriptionsContextInput[],
): AssinaturasContext {
  const ativas = subscriptions.filter((subscription) =>
    isActiveSubscription(subscription.status),
  );

  let gastoMensalEstimado = 0;
  const listaAtivas = ativas.slice(0, 50).map((subscription) => {
    const valor = Number(subscription.amount) || 0;
    const periodicidade = toPeriodicidade(String(subscription.cycle ?? "monthly"));

    if (periodicidade === "Anual") {
      gastoMensalEstimado += valor / 12;
    } else {
      gastoMensalEstimado += valor;
    }

    return {
      nome: subscription.name.trim().slice(0, 120) || "Sem nome",
      valor: round2(valor),
      periodicidade,
      proximoVencimento: String(subscription.nextDue ?? "").slice(0, 32),
    };
  });

  return {
    listaAtivas,
    totalGastoMensalEstimado: round2(gastoMensalEstimado),
  };
}

export function emptyAssinaturasContext(): AssinaturasContext {
  return { listaAtivas: [], totalGastoMensalEstimado: 0 };
}

/** Texto curto para o cabeçalho do system prompt. */
export function formatAssinaturasSummaryLine(context: AssinaturasContext): string {
  if (context.listaAtivas.length === 0) return "nenhuma";
  const list = context.listaAtivas
    .slice(0, 12)
    .map((item) => {
      const suffix = item.periodicidade === "Anual" ? "/ano" : "/mês";
      return `${item.nome}: ${item.valor}${suffix}`;
    })
    .join(", ");
  return `${list} | estimado/mês: ${context.totalGastoMensalEstimado}`;
}
