"use client";

import { Lightbulb } from "lucide-react";
import { useEffect, useState } from "react";
import { useSession } from "@/components/require-session";
import { usePreferences } from "@/contexts/preferences-context";
import { useTranslation } from "@/hooks/use-translation";
import { loadFinancialContext } from "@/lib/chat/load-financial-context";
import {
  isDailyTipCacheFresh,
  readDailyTipCache,
  todayTipKey,
  writeDailyTipCache,
} from "@/lib/daily-tip-cache";

type TipStatus = "loading" | "ready" | "fallback";

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
      if (isDailyTipCacheFresh(cached, user.$id, locale)) {
        if (!active) return;
        setTip(cached!.tip);
        setStatus("ready");
        return;
      }

      if (active) setStatus("loading");

      try {
        const financialContext = await loadFinancialContext(user.$id);
        if (!active) return;

        const response = await fetch("/api/daily-tip", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            financialContext,
            currency,
            locale,
          }),
        });

        if (!response.ok) {
          throw new Error(`daily-tip HTTP ${response.status}`);
        }

        const data = (await response.json()) as { tip?: unknown };
        const nextTip = typeof data.tip === "string" ? data.tip.trim() : "";
        if (!nextTip) throw new Error("Dica vazia.");

        writeDailyTipCache({
          tip: nextTip,
          generatedAt: todayTipKey(),
          userId: user.$id,
          locale,
        });

        if (!active) return;
        setTip(nextTip);
        setStatus("ready");
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
