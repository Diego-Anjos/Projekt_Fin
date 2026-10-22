"use client";

import { useNotifications, type AppNotification } from "@/hooks/useNotifications";
import { useTranslation } from "@/hooks/use-translation";
import { localeToBcp47 } from "@/locales/dictionaries";
import { AlertTriangle, Bell, BellOff, CheckCheck } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function formatDueDate(isoDate: string, bcp47 = "pt-BR") {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) return isoDate;
  return new Intl.DateTimeFormat(bcp47).format(
    new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
}

function dueLabel(
  notification: AppNotification,
  t: (key: string, params?: Record<string, string | number>) => string,
) {
  if (notification.daysUntilDue === 0) return t("notifications.dueToday");
  if (notification.daysUntilDue === 1) return t("notifications.dueTomorrow");
  return t("notifications.dueInDays", { count: notification.daysUntilDue });
}

export function NotificationBell() {
  const { t, locale } = useTranslation();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);
  const containerRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, isLoading, error, markAsRead, markAllAsRead } =
    useNotifications();

  // Fecha ao mudar de página (ajuste de estado durante a renderização).
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  // Fecha com clique fora / Escape (padrão de Popover sem dependência extra).
  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open ]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={
          unreadCount > 0 ? t("notifications.unreadAria", { count: unreadCount }) : t("notifications.title")
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="relative rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
      >
        <Bell className="size-4" aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] leading-none font-bold text-white ring-2 ring-[#0a241a]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={t("notifications.aria")}
          className="absolute top-full left-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-zinc-700/60 bg-zinc-950 shadow-2xl shadow-black/60 max-md:-translate-x-48"
        >
          <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
            <p className="text-sm font-semibold text-zinc-50">
              {t("notifications.title")}
              {unreadCount > 0 ? (
                <span className="ml-2 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400">
                  {unreadCount === 1 ? t("notifications.newOne", { count: unreadCount }) : t("notifications.newMany", { count: unreadCount })}
                </span>
              ) : null}
            </p>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={markAllAsRead}
                className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-400 transition-colors hover:text-emerald-300"
              >
                <CheckCheck className="size-3.5" aria-hidden="true" />
                {t("notifications.markAllRead")}
              </button>
            ) : null}
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-2 px-4 py-4" aria-busy="true">
              <span className="h-12 animate-pulse rounded-lg bg-zinc-900" />
              <span className="h-12 animate-pulse rounded-lg bg-zinc-900" />
            </div>
          ) : error ? (
            <p className="px-4 py-6 text-center text-sm text-zinc-400">{error}</p>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <BellOff className="size-7 text-zinc-600" aria-hidden="true" />
              <p className="text-sm font-medium text-zinc-300">{t("notifications.emptyTitle")}</p>
              <p className="text-xs text-zinc-500">
                {t("notifications.emptyText")}
              </p>
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => markAsRead(notification.id)}
                    aria-label={`${notification.title}: ${notification.message}${
                      notification.read ? ` (${t("notifications.readSuffix")})` : ` (${t("notifications.unreadSuffix")})`
                    }`}
                    className={
                      notification.read
                        ? "flex w-full items-start gap-3 px-4 py-3 text-left opacity-50 transition-colors hover:bg-zinc-900"
                        : "flex w-full items-start gap-3 bg-amber-500/[0.06] px-4 py-3 text-left transition-colors hover:bg-zinc-900"
                    }
                  >
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
                      <AlertTriangle className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-zinc-100">
                          {notification.title}
                        </span>
                        {!notification.read ? (
                          <span className="size-2 shrink-0 rounded-full bg-red-500" aria-hidden="true" />
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-sm leading-snug text-zinc-400">
                        {notification.message}
                      </span>
                      <span className="mt-1 block text-xs text-zinc-500">
                        {dueLabel(notification, t)} • {formatDueDate(notification.dueDate, localeToBcp47[locale])}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
