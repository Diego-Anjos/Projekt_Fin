"use client";

import { usePreferences } from "@/contexts/preferences-context";
import { formatCurrency } from "@/lib/utils";
import {
  Car,
  CheckCircle2,
  Gamepad2,
  GraduationCap,
  Home,
  ImageIcon,
  Plane,
  Shield,
  Target,
  type LucideIcon,
} from "lucide-react";
import type { FinancialGoal, GoalCategory } from "@/components/goal-modal";

const CATEGORY_ICONS: Record<GoalCategory, LucideIcon> = {
  travel: Plane,
  emergency: Shield,
  tech: Gamepad2,
  home: Home,
  education: GraduationCap,
  car: Car,
  other: Target,
};

const CATEGORY_LABELS: Record<GoalCategory, string> = {
  travel: "Viagem",
  emergency: "Emergência",
  tech: "Tech / Setup",
  home: "Casa",
  education: "Educação",
  car: "Veículo",
  other: "Outro",
};

function formatTargetDate(isoDate: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) return isoDate;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function getRemainingLabel(isoDate: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) return null;

  const target = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "Prazo ultrapassado";
  if (diffDays === 0) return "Vence hoje";
  if (diffDays === 1) return "1 dia restante";
  if (diffDays < 30) return `${diffDays} dias restantes`;

  const months = Math.round(diffDays / 30);
  if (months === 1) return "≈ 1 mês restante";
  return `≈ ${months} meses restantes`;
}

type GoalCardProps = {
  goal: FinancialGoal;
};

export function GoalCard({ goal }: GoalCardProps) {
  const { currency, privacyMode } = usePreferences();
  const Icon = CATEGORY_ICONS[goal.category];
  const progress = goal.targetAmount > 0
    ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
    : 0;
  const isCompleted = goal.isCompleted;
  const remaining = getRemainingLabel(goal.targetDate);

  return (
    <article
      className={`group relative flex flex-col rounded-2xl border p-5 pb-6 backdrop-blur-sm transition-colors duration-200 ${
        isCompleted
          ? "border-amber-500/20 bg-zinc-900/40 opacity-90 hover:border-amber-500/35"
          : "border-zinc-700/50 bg-black/60 hover:border-emerald-500/40"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span
            className={`flex size-11 shrink-0 items-center justify-center rounded-xl border ${
              isCompleted
                ? "border-amber-500/25 bg-amber-500/10 text-amber-300"
                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
            }`}
          >
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-zinc-50">{goal.title}</h3>
            <p className="text-xs text-zinc-500">{CATEGORY_LABELS[goal.category]}</p>
          </div>
        </div>

        <div className="relative h-16 w-16 flex-shrink-0 md:h-20 md:w-20">
          {goal.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={goal.imageUrl}
              alt={goal.title}
              className={`h-full w-full rounded-xl border object-cover shadow-md ${
                isCompleted ? "border-amber-500/20" : "border-zinc-800"
              }`}
            />
          ) : (
            <div
              className={`flex h-full w-full items-center justify-center rounded-xl border shadow-inner ${
                isCompleted
                  ? "border-amber-500/20 bg-amber-500/10"
                  : "border-emerald-500/20 bg-emerald-500/10"
              }`}
            >
              <ImageIcon
                className={`h-6 w-6 md:h-8 md:w-8 ${
                  isCompleted ? "text-amber-400/70" : "text-emerald-500/70"
                }`}
                aria-hidden="true"
              />
            </div>
          )}

          <div
            className={`absolute -right-2 -bottom-2 z-10 rounded-md border bg-zinc-900 px-2 py-1 text-xs font-bold ${
              isCompleted
                ? "border-amber-400/40 text-amber-300"
                : "border-emerald-500/30 text-emerald-400"
            }`}
          >
            {progress}%
          </div>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm text-zinc-300">
          <span
            className={`font-semibold ${
              isCompleted ? "text-amber-300" : "text-emerald-300"
            }`}
          >
            {formatCurrency(goal.currentAmount, currency, privacyMode)}
          </span>
          <span className="text-zinc-500"> de </span>
          <span className="text-zinc-200">
            {formatCurrency(goal.targetAmount, currency, privacyMode)}
          </span>
        </p>

        <div
          className="mt-3 h-2.5 overflow-hidden rounded-full bg-zinc-800/80"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progresso de ${goal.title}: ${progress}%`}
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isCompleted
                ? "bg-gradient-to-r from-emerald-400 via-amber-300 to-amber-200 shadow-[0_0_14px_rgba(251,191,36,0.55)]"
                : "bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.35)]"
            }`}
            style={{ width: `${isCompleted ? 100 : progress}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-zinc-800/80 pt-4 text-xs text-zinc-500">
        {isCompleted ? (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 font-medium text-emerald-400">
            <CheckCircle2 className="size-3.5" aria-hidden="true" />
            Concluído
          </span>
        ) : (
          <>
            <span>Meta: {formatTargetDate(goal.targetDate)}</span>
            {remaining ? <span className="text-emerald-400/80">{remaining}</span> : null}
          </>
        )}
      </div>
    </article>
  );
}
