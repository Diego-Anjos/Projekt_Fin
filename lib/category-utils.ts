import {
  Briefcase,
  Car,
  DollarSign,
  Droplet,
  Gamepad2,
  GraduationCap,
  HeartPulse,
  Home,
  ShoppingBag,
  Smartphone,
  Tag,
  Utensils,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";

const CATEGORY_ICON_RULES: { keywords: string[]; icon: LucideIcon }[] = [
  { keywords: ["alimentacao", "comida", "mercado", "restaurante", "ifood", "lanche"], icon: Utensils },
  { keywords: ["moradia", "casa", "aluguel", "condominio"], icon: Home },
  { keywords: ["transporte", "carro", "uber", "gasolina", "combustivel", "onibus"], icon: Car },
  { keywords: ["saude", "farmacia", "medico", "academia"], icon: HeartPulse },
  { keywords: ["lazer", "diversao", "jogos", "cinema", "festa"], icon: Gamepad2 },
  { keywords: ["compras", "roupa", "presente", "shopping"], icon: ShoppingBag },
  { keywords: ["educacao", "curso", "escola", "faculdade", "livro"], icon: GraduationCap },
  { keywords: ["salario", "renda", "pagamento"], icon: DollarSign },
  { keywords: ["carteira"], icon: Wallet },
  { keywords: ["assinaturas", "internet", "telefone", "netflix", "spotify"], icon: Smartphone },
  { keywords: ["luz", "energia"], icon: Zap },
  { keywords: ["agua"], icon: Droplet },
  { keywords: ["trabalho", "negocio"], icon: Briefcase },
];

export function normalizeCategoryName(name: string) {
  return name
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function getCategoryIcon(categoryName: string): LucideIcon {
  const normalized = normalizeCategoryName(categoryName);
  const match = CATEGORY_ICON_RULES.find((rule) =>
    rule.keywords.some((keyword) => normalized.includes(keyword)),
  );

  return match?.icon ?? Tag;
}
