import type { UserDataSnapshot } from "@/lib/appwrite/user-data";
import { escapeCsvValue, toCsv } from "@/lib/export-csv";
import { readMonth } from "@/lib/cash-flow";

export type ExportPeriod = "this_month" | "last_3_months" | "last_year" | "all";
export type ExportFormat = "csv" | "json";

export type ExportDataTypes = {
  income: boolean;
  expenses: boolean;
  goals: boolean;
  subscriptions: boolean;
};

export type FilteredExportSnapshot = {
  transactions: UserDataSnapshot["transactions"];
  goals: UserDataSnapshot["goals"];
  subscriptions: UserDataSnapshot["subscriptions"];
};

function startOfMonth(year: number, month: number) {
  return new Date(year, month, 1);
}

function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

/** Limite inferior inclusivo do período (null = sem filtro). */
export function periodLowerBound(period: ExportPeriod, now = new Date()): Date | null {
  const current = startOfMonth(now.getFullYear(), now.getMonth());

  switch (period) {
    case "this_month":
      return current;
    case "last_3_months":
      return addMonths(current, -2);
    case "last_year":
      return addMonths(current, -11);
    case "all":
      return null;
  }
}

function parseDateValue(value: string | undefined | null): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isOnOrAfter(date: Date, lower: Date) {
  return date.getTime() >= lower.getTime();
}

function transactionInPeriod(
  dateValue: string,
  lower: Date | null,
): boolean {
  if (!lower) return true;
  const point = readMonth(dateValue);
  if (!point) {
    const parsed = parseDateValue(dateValue);
    return parsed ? isOnOrAfter(parsed, lower) : false;
  }
  const transactionMonth = startOfMonth(point.year, point.month);
  return isOnOrAfter(transactionMonth, lower);
}

export function filterUserDataForExport(
  data: UserDataSnapshot,
  period: ExportPeriod,
  types: ExportDataTypes,
  now = new Date(),
): FilteredExportSnapshot {
  const lower = periodLowerBound(period, now);

  const includeTransactions = types.income || types.expenses;
  const transactions = includeTransactions
    ? data.transactions.filter((transaction) => {
        if (!transactionInPeriod(transaction.date, lower)) return false;
        if (transaction.type === "income") return types.income;
        return types.expenses;
      })
    : [];

  const goals = types.goals
    ? data.goals.filter((goal) => {
        if (!lower) return true;
        const date =
          parseDateValue(goal.targetDate) ?? parseDateValue(goal.$createdAt);
        return date ? isOnOrAfter(date, lower) : true;
      })
    : [];

  const subscriptions = types.subscriptions
    ? data.subscriptions.filter((subscription) => {
        if (!lower) return true;
        const date =
          parseDateValue(subscription.subscribedAt) ??
          parseDateValue(subscription.nextDue) ??
          parseDateValue(subscription.$createdAt);
        return date ? isOnOrAfter(date, lower) : true;
      })
    : [];

  return { transactions, goals, subscriptions };
}

export function countFilteredExport(data: FilteredExportSnapshot) {
  return data.transactions.length + data.goals.length + data.subscriptions.length;
}

function section(title: string, headers: string[], rows: (string | number | boolean | null | undefined)[][]) {
  return [escapeCsvValue(title), toCsv(headers, rows)].join("\n");
}

/** CSV consolidado com secções conforme os tipos selecionados. */
export function buildFilteredExportCsv(data: FilteredExportSnapshot): string {
  const sections: string[] = [];

  if (data.transactions.length > 0) {
    sections.push(
      section(
        "Transações",
        ["Data", "Descrição", "Categoria", "Tipo", "Valor", "Status"],
        data.transactions.map((transaction) => [
          transaction.date,
          transaction.description,
          transaction.category,
          transaction.type === "income" ? "Receita" : "Despesa",
          transaction.amount,
          transaction.status ?? "",
        ]),
      ),
    );
  }

  if (data.goals.length > 0) {
    sections.push(
      section(
        "Metas",
        ["Título", "Descrição", "Categoria", "Valor Alvo", "Valor Atual", "Data Alvo", "Concluída"],
        data.goals.map((goal) => [
          goal.title,
          goal.description ?? "",
          goal.category,
          goal.targetAmount,
          goal.currentAmount,
          goal.targetDate,
          goal.isCompleted ? "sim" : "não",
        ]),
      ),
    );
  }

  if (data.subscriptions.length > 0) {
    sections.push(
      section(
        "Assinaturas",
        ["Nome", "Valor", "Ciclo", "Subscrita em", "Próximo Vencimento", "Pagamento", "Estado"],
        data.subscriptions.map((subscription) => [
          subscription.name,
          subscription.amount,
          subscription.cycle,
          subscription.subscribedAt,
          subscription.nextDue,
          subscription.payment,
          subscription.status,
        ]),
      ),
    );
  }

  return `\uFEFF${sections.join("\n\n")}\n`;
}

export function buildFilteredExportJson(data: FilteredExportSnapshot): string {
  return `${JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      transactions: data.transactions.map((transaction) => ({
        date: transaction.date,
        description: transaction.description,
        category: transaction.category,
        type: transaction.type,
        amount: transaction.amount,
        status: transaction.status ?? null,
      })),
      goals: data.goals.map((goal) => ({
        title: goal.title,
        description: goal.description ?? null,
        category: goal.category,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        targetDate: goal.targetDate,
        isCompleted: goal.isCompleted,
      })),
      subscriptions: data.subscriptions.map((subscription) => ({
        name: subscription.name,
        amount: subscription.amount,
        cycle: subscription.cycle,
        subscribedAt: subscription.subscribedAt,
        nextDue: subscription.nextDue,
        payment: subscription.payment,
        status: subscription.status,
      })),
    },
    null,
    2,
  )}\n`;
}

export function downloadBlob(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportFilename(format: ExportFormat, now = new Date()) {
  const day = now.toISOString().split("T")[0];
  return `projekt-fin-exportacao-${day}.${format}`;
}
