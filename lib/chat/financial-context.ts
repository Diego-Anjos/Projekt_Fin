/** Payload enviado no body do /api/chat e /api/daily-tip para personalizar a Quantum.IA. */
export type FinancialContextPayload = {
  saldo: number;
  assinaturas: string[];
  metas: string[];
  /** Soma das despesas do mês civil atual. */
  despesasMes?: number;
  /** Top categorias de despesa do mês (ex: "Alimentação: 320"). */
  topCategoriasMes?: string[];
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

/** Valida / normaliza o payload enviado pelo cliente (nunca confiar cegamente). */
export function parseFinancialContext(raw: unknown): FinancialContextPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const saldo = parseFiniteNumber(value.saldo);
  if (saldo === null) return null;

  const despesasMes = parseFiniteNumber(value.despesasMes);

  return {
    saldo,
    assinaturas: parseStringList(value.assinaturas, 50, 200),
    metas: parseStringList(value.metas, 50, 200),
    ...(despesasMes !== null ? { despesasMes } : {}),
    topCategoriasMes: parseStringList(value.topCategoriasMes, 10, 120),
  };
}

/** String clara para concatenar ao SYSTEM_PROMPT. */
export function formatFinancialContextForPrompt(
  context: FinancialContextPayload,
): string {
  const assinaturas =
    context.assinaturas.length > 0
      ? context.assinaturas.join(", ")
      : "nenhuma";
  const metas =
    context.metas.length > 0 ? context.metas.join(", ") : "nenhuma";
  const despesas =
    typeof context.despesasMes === "number" && Number.isFinite(context.despesasMes)
      ? String(context.despesasMes)
      : "indisponível";
  const categorias =
    context.topCategoriasMes && context.topCategoriasMes.length > 0
      ? context.topCategoriasMes.join(", ")
      : "indisponível";

  return `Dados atuais do utilizador: Saldo: ${context.saldo} | Despesas do mês: ${despesas} | Top categorias do mês: ${categorias} | Assinaturas ativas: ${assinaturas} | Metas: ${metas}`;
}
