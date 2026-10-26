"use client";

import { usePreferences } from "@/contexts/preferences-context";
import { useDynamicTranslationState } from "@/hooks/use-dynamic-translation";
import { useTranslation } from "@/hooks/use-translation";
import { localeToBcp47 } from "@/locales/dictionaries";
import { formatCurrency } from "@/lib/utils";
import {
  Car,
  CheckCircle2,
  Gamepad2,
  GraduationCap,
  Home,
  ImageIcon,
  Loader2,
  Pencil,
  Plane,
  Shield,
  Target,
  Trash2,
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

const CATEGORY_LABEL_KEYS: Record<GoalCategory, string> = {
  travel: "goals.categoryTravel",
  emergency: "goals.categoryEmergency",
  tech: "goals.categoryTech",
  home: "goals.categoryHome",
  education: "goals.categoryEducation",
  car: "goals.categoryCar",
  other: "goals.categoryOther",
};

function formatTargetDate(isoDate: string, bcp47: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) return isoDate;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Intl.DateTimeFormat(bcp47, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

type Translate = (key: string, params?: Record<string, string | number>) => string;

function getRemainingLabel(isoDate: string, t: Translate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) return null;

  const target = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return t("goals.overdue");
  if (diffDays === 0) return t("goals.dueToday");
  if (diffDays === 1) return t("goals.oneDay");
  if (diffDays < 30) return t("goals.days", { count: diffDays });

  const months = Math.round(diffDays / 30);
  if (months === 1) return t("goals.oneMonth");
  return t("goals.months", { count: months });
}

type GoalCardProps = {
  goal: FinancialGoal;
  onEdit?: (goal: FinancialGoal) => void;
  onDelete?: (goal: FinancialGoal) => void;
  /** True enquanto a exclusão desta meta está em curso. */
  isDeleting?: boolean;
};

export function GoalCard({ goal, onEdit, onDelete, isDeleting = false }: GoalCardProps) {
  const { currency, privacyMode } = usePreferences();
  const { t, locale } = useTranslation();
  // Conteúdo dinâmico (Appwrite): traduzido para o idioma ativo via
  // /api/translate com cache; em `pt` (origem) ou enquanto carrega,
  // mostra o original. Os hooks são incondicionais — strings vazias/
  // ausentes são ignoradas por dentro.
  const titleState = useDynamicTranslationState(goal.title);
  const descState = useDynamicTranslationState(goal.description);
  const translatedTitle = titleState.text;
  const translatedDesc = descState.text;
  // Fade suave enquanto a tradução está em voo (nunca bloqueia o cartão).
  const titleFadeClassName = `transition-opacity duration-300 ${
    titleState.isTranslating ? "opacity-60" : "opacity-100"
  }`;
  const descFadeClassName = `transition-opacity duration-300 ${
    descState.isTranslating ? "opacity-60" : "opacity-100"
  }`;
  const Icon = CATEGORY_ICONS[goal.category];
  const progress = goal.targetAmount > 0
    ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
    : 0;
  const isCompleted = goal.isCompleted;
  const remaining = getRemainingLabel(goal.targetDate, t);

  return (
    <article
      className={`group relative flex h-full flex-col rounded-2xl border p-5 pb-6 backdrop-blur-sm transition-colors duration-200 ${
        isCompleted
          ? "border-amber-500/20 bg-zinc-900/40 opacity-90 hover:border-amber-500/35"
          : "border-zinc-700/50 bg-black/60 hover:border-emerald-500/40"
      }`}
    >
      <div className="flex items-center">
        <div className="flex w-1/2 min-w-0 shrink-0 items-center gap-3">
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
            <h3 className={`truncate text-base font-semibold text-zinc-50 ${titleFadeClassName}`}>{translatedTitle}</h3>
            <p className="text-xs text-zinc-500">{t(CATEGORY_LABEL_KEYS[goal.category])}</p>
          </div>
        </div>

        <div className="relative ml-4 h-24 min-w-0 flex-1 md:h-28">
          {goal.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={goal.imageUrl}
              alt={translatedTitle}
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
                className={`h-8 w-8 md:h-10 md:w-10 ${
                  isCompleted ? "text-amber-400/70" : "text-emerald-500/70"
                }`}
                aria-hidden="true"
              />
            </div>
          )}

          {onEdit || onDelete ? (
            <div className="absolute top-2 right-2 z-20 flex items-center gap-2 rounded-lg border border-zinc-700/50 bg-zinc-900/80 p-1.5 opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100">
              {onEdit ? (
                <button
                  type="button"
                  onClick={() => onEdit(goal)}
                  disabled={isDeleting}
                  aria-label={t("goals.editGoalAria", { title: translatedTitle })}
                  title={t("goals.editGoal")}
                  className="flex size-7 items-center justify-center rounded-md text-zinc-400 transition-colors duration-200 hover:bg-zinc-800 hover:text-emerald-400 disabled:opacity-50"
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </button>
              ) : null}
              {onDelete ? (
                <button
                  type="button"
                  onClick={() => onDelete(goal)}
                  disabled={isDeleting}
                  aria-label={t("goals.deleteGoalAria", { title: translatedTitle })}
                  title={t("goals.deleteGoal")}
                  className="flex size-7 items-center justify-center rounded-md text-zinc-400 transition-colors duration-200 hover:bg-zinc-800 hover:text-red-400 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Trash2 className="size-4" aria-hidden="true" />
                  )}
                </button>
              ) : null}
            </div>
          ) : null}

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

      {goal.description ? (
        <p className={`mt-2 line-clamp-2 text-sm text-zinc-400 ${descFadeClassName}`}>{translatedDesc}</p>
      ) : null}

      <div className="mt-5">
        <p className="text-sm text-zinc-300">
          <span
            className={`font-semibold ${
              isCompleted ? "text-amber-300" : "text-emerald-300"
            }`}
          >
            {formatCurrency(goal.currentAmount, currency, privacyMode)}
          </span>
          <span className="text-zinc-500"> {t("goals.of")} </span>
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
          aria-label={t("goals.progressAria", { title: translatedTitle, progress })}
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
            {t("goals.completedLabel")}
          </span>
        ) : (
          <>
            <span>{t("goals.target", { date: formatTargetDate(goal.targetDate, localeToBcp47[locale]) })}</span>
            {remaining ? <span className="text-emerald-400/80">{remaining}</span> : null}
          </>
        )}
      </div>
    </article>
  );
}
