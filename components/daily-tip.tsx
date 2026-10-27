"use client";

import { Lightbulb } from "lucide-react";
import { useEffect, useState } from "react";
import { useSession } from "@/components/require-session";
import { usePreferences } from "@/contexts/preferences-context";
import { useTranslation } from "@/hooks/use-translation";
import {
  getAllSubscriptions,
  getAllTransactions,
} from "@/lib/appwrite/database";
import { getGoals } from "@/lib/appwrite/goals";
import {
  generateDynamicTip,
  type DynamicTipInsight,
} from "@/lib/generate-dynamic-tip";
import {
  isDailyTipCacheFresh,
  readDailyTipCache,
  todayTipKey,
  writeDailyTipCache,
} from "@/lib/daily-tip-cache";
import { formatCurrency } from "@/lib/utils";

type TipStatus = "loading" | "ready" | "fallback";

function formatTipInsight(
  insight: DynamicTipInsight,
  t: (key: string, params?: Record<string, string | number>) => string,
  currency: string,
): string {
  switch (insight.kind) {
    case "goalFocus":
      return t("sidebar.dailyTipGoalFocus", {
        category: insight.category.toLowerCase(),
        amount: formatCurrency(insight.amount, currency, false),
        goal: insight.goalName,
      });
    case "subscriptionDue":
      return t("sidebar.dailyTipSubscriptionDue", {
        name: insight.name,
        days: insight.daysUntil,
        amount: formatCurrency(insight.amount, currency, false),
      });
    case "positiveBalance":
      return t("sidebar.dailyTipPositiveBalance", {
        surplus: formatCurrency(insight.surplus, currency, false),
      });
    case "spendingAlert":
      return t("sidebar.dailyTipSpendingAlert", {
        percent: insight.percent,
      });
    case "fallback":
    default:
      return t("sidebar.dailyTipText");
  }
}

export function DailyTip() {
  const { user } = useSession();
  const { currency } = usePreferences();
  const { t, locale } = useTranslation();
  const [tip, setTip] = useState("");
  const [status, setStatus] = useState<TipStatus>("loading");

  useEffect(() => {
    let active = true;

    async function resolveTip() {
      const cached = readDailyTipCache();
      if (isDailyTipCacheFresh(cached, user.$id, locale, currency)) {
        if (!active) return;
        setTip(cached!.tip);
        setStatus("ready");
        return;
      }

      if (active) setStatus("loading");

      try {
        const [transactions, subscriptions, goalsResult] = await Promise.all([
          getAllTransactions(user.$id),
          getAllSubscriptions(user.$id),
          getGoals(user.$id, 50),
        ]);
        if (!active) return;

        const insight = generateDynamicTip(
          transactions,
          goalsResult.documents,
          subscriptions,
        );
        const nextTip = formatTipInsight(insight, t, currency).trim();
        if (!nextTip) throw new Error("Dica vazia.");

        writeDailyTipCache({
          tip: nextTip,
          generatedAt: todayTipKey(),
          userId: user.$id,
          locale,
          currency,
        });

        if (!active) return;
        setTip(nextTip);
        setStatus(insight.kind === "fallback" ? "fallback" : "ready");
      } catch (error) {
        console.warn("[daily-tip] a usar fallback estático:", error);
        if (!active) return;
        setTip(t("sidebar.dailyTipText"));
        setStatus("fallback");
      }
    }

    void resolveTip();

    return () => {
      active = false;
    };
  }, [user.$id, currency, locale, t]);

  return (
    <div className="m-4 rounded-xl border border-[#113829] bg-[#0a241a] p-4">
      <div className="mb-2 flex items-center gap-2">
        <Lightbulb className="size-4 text-emerald-500" aria-hidden="true" />
        <p className="text-sm font-semibold text-zinc-100">{t("sidebar.dailyTip")}</p>
      </div>

      {status === "loading" ? (
        <div className="space-y-2" aria-live="polite" aria-busy="true">
          <p className="animate-pulse text-sm leading-5 text-emerald-400/80">
            {t("sidebar.dailyTipLoading")}
          </p>
          <div className="h-3 w-full animate-pulse rounded bg-emerald-950/80" />
          <div className="h-3 w-[80%] animate-pulse rounded bg-emerald-950/60" />
        </div>
      ) : (
        <p className="text-sm leading-5 text-zinc-400" aria-live="polite">
          {tip}
        </p>
      )}
    </div>
  );
}
