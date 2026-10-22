import type { UserDataSnapshot } from "@/lib/appwrite/user-data";

type CsvValue = string | number | boolean | null | undefined;

/** Escapa um valor para CSV (RFC 4180): vírgulas, aspas e quebras de linha. */
export function escapeCsvValue(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers: string[], rows: CsvValue[][]): string {
  return [headers, ...rows].map((row) => row.map(escapeCsvValue).join(",")).join("\n");
}

function section(title: string, headers: string[], rows: CsvValue[][]): string {
  return [escapeCsvValue(title), toCsv(headers, rows)].join("\n");
}

/**
 * CSV único com secções (Transações, Metas, Assinaturas, Categorias).
 * Começa com BOM (\uFEFF) para o Excel abrir os acentos em UTF-8.
 */
export function buildUserDataCsv(data: UserDataSnapshot): string {
  const sections = [
    section(
      "Transações",
      ["id", "tipo", "descricao", "categoria", "data", "valor", "estado", "criado_em"],
      data.transactions.map((transaction) => [
        transaction.$id,
        transaction.type,
        transaction.description,
        transaction.category,
        transaction.date,
        transaction.amount,
        transaction.status,
        transaction.$createdAt,
      ]),
    ),
    section(
      "Metas",
      [
        "id",
        "titulo",
        "descricao",
        "categoria",
        "valor_alvo",
        "valor_atual",
        "data_alvo",
        "concluida",
        "criado_em",
      ],
      data.goals.map((goal) => [
        goal.$id,
        goal.title,
        goal.description ?? "",
        goal.category,
        goal.targetAmount,
        goal.currentAmount,
        goal.targetDate,
        goal.isCompleted ? "sim" : "não",
        goal.$createdAt,
      ]),
    ),
    section(
      "Assinaturas",
      ["id", "nome", "valor", "ciclo", "subscrita_em", "proximo_vencimento", "pagamento", "estado"],
      data.subscriptions.map((subscription) => [
        subscription.$id,
        subscription.name,
        subscription.amount,
        subscription.cycle,
        subscription.subscribedAt,
        subscription.nextDue,
        subscription.payment,
        subscription.status,
      ]),
    ),
    section(
      "Categorias",
      ["id", "nome", "criado_em"],
      data.categories.map((category) => [category.$id, category.name, category.$createdAt]),
    ),
  ];

  return `\uFEFF${sections.join("\n\n")}\n`;
}

/** Cria o Blob CSV, simula o clique num link temporário e limpa URL/link. */
export function downloadCsv(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
