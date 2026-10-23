import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "A senha deve ter no mínimo 8 caracteres.");

export const loginFormSchema = z.object({
  email: z.email("Email inválido."),
  password: passwordSchema,
  remember: z.boolean().optional(),
});

export const registerFormSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório."),
  email: z.email("Email inválido."),
  password: passwordSchema,
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;
export type RegisterFormValues = z.infer<typeof registerFormSchema>;
