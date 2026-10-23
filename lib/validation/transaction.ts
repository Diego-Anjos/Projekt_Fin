import { z } from "zod";
import { MAX_INSTALLMENTS, MIN_INSTALLMENTS } from "@/lib/installments";

const MAX_DESCRIPTION = 255;
const MAX_CATEGORY = 100;
const MAX_AMOUNT = 1_000_000_000;

/** Valor monetário: número finito, estritamente positivo (arredonda a cêntimos). */
export const moneyAmountSchema = z
  .number({ error: "Valor monetário inválido." })
  .finite({ error: "Valor monetário inválido." })
  .positive({ error: "O valor deve ser maior que zero." })
  .max(MAX_AMOUNT, { error: "Valor demasiado elevado." })
  .transform((value) => Math.round(value * 100) / 100);

export const transactionFormSchema = z
  .object({
    type: z.enum(["income", "expense"]),
    description: z
      .string()
      .trim()
      .min(1, "Descrição obrigatória.")
      .max(MAX_DESCRIPTION, "Descrição demasiado longa."),
    category: z
      .string()
      .trim()
      .min(1, "Categoria obrigatória.")
      .max(MAX_CATEGORY, "Categoria inválida."),
    date: z.date({ error: "Data obrigatória." }),
    amount: moneyAmountSchema,
    status: z.enum(["Paid", "Pending"]),
    isInstallment: z.boolean(),
    installmentCount: z.number().int().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "income" && data.isInstallment) {
      ctx.addIssue({
        code: "custom",
        path: ["isInstallment"],
        message: "Receitas não podem ser parceladas.",
      });
    }
    if (data.isInstallment) {
      const count = data.installmentCount;
      if (
        count == null ||
        !Number.isInteger(count) ||
        count < MIN_INSTALLMENTS ||
        count > MAX_INSTALLMENTS
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["installmentCount"],
          message: `Parcelas entre ${MIN_INSTALLMENTS} e ${MAX_INSTALLMENTS}.`,
        });
      }
    }
  });

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;

/** Payload enviado ao Appwrite após validação. */
export const transactionPersistSchema = z.object({
  userId: z.string().min(1),
  type: z.enum(["income", "expense"]),
  description: z.string().trim().min(1).max(MAX_DESCRIPTION),
  category: z.string().trim().min(1).max(MAX_CATEGORY),
  date: z.string().min(1),
  amount: moneyAmountSchema,
  status: z.enum(["Paid", "Pending"]),
});

export type TransactionPersistInput = z.infer<typeof transactionPersistSchema>;
