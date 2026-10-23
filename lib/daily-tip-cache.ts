const STORAGE_KEY = "quantum_tip_data";

export type DailyTipCache = {
  tip: string;
  /** `new Date().toDateString()` do dia em que a dica foi gerada. */
  generatedAt: string;
  userId: string;
  locale: string;
};

export function todayTipKey(now = new Date()) {
  return now.toDateString();
}

export function readDailyTipCache(): DailyTipCache | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<DailyTipCache>;
    if (
      typeof parsed.tip !== "string" ||
      !parsed.tip.trim() ||
      typeof parsed.generatedAt !== "string" ||
      typeof parsed.userId !== "string" ||
      typeof parsed.locale !== "string"
    ) {
      return null;
    }

    return {
      tip: parsed.tip.trim(),
      generatedAt: parsed.generatedAt,
      userId: parsed.userId,
      locale: parsed.locale,
    };
  } catch {
    return null;
  }
}

export function writeDailyTipCache(entry: DailyTipCache) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch (error) {
    console.warn("[daily-tip] falha ao gravar cache:", error);
  }
}

export function isDailyTipCacheFresh(
  cache: DailyTipCache | null,
  userId: string,
  locale: string,
  now = new Date(),
) {
  if (!cache) return false;
  return (
    cache.userId === userId &&
    cache.locale === locale &&
    cache.generatedAt === todayTipKey(now) &&
    Boolean(cache.tip.trim())
  );
}
