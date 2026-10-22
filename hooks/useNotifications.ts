"use client";

import { useSession } from "@/components/require-session";
import { usePreferences } from "@/contexts/preferences-context";
import { getAllSubscriptions, type SubscriptionDocument } from "@/lib/appwrite/database";
import { formatCurrency } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

/**
 * Sistema de Notificações In-App (geração dinâmica no frontend).
 *
 * Futuro (produção):
 * // TODO: Appwrite Function - Criar Cron Job para ler emailSummaryEnabled === true
 * //       e disparar e-mail mensal via Resend/SendGrid com resumo financeiro.
 * Além disso, as notificações passariam a ser geradas no backend
 * (Appwrite Function agendada) e persistidas numa collection
 * "Notifications" { userId, title, message, type, read, dueDate, ... },
 * para sincronizar o estado `read` entre dispositivos. Por agora o
 * `read` fica em localStorage por utilizador e as notificações são
 * derivadas em tempo real das assinaturas ativas.
 */

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  type: "warning";
  date: Date;
  /** Assinatura que originou o alerta. */
  subscriptionId: string;
  /** Dias até ao vencimento (0 = hoje). */
  daysUntilDue: number;
  /** Data de vencimento original (ISO) da assinatura. */
  dueDate: string;
};

/** Janela de alerta: assinauras que vencem de hoje até daqui a 5 dias. */
export const NOTIFICATION_WINDOW_DAYS = 5;

const READ_STORAGE_PREFIX = "projekt-fin-notifications-read:";
const READ_CHANGE_EVENT = "projekt-fin-notifications-read";

function readStorageKey(userId: string) {
  return `${READ_STORAGE_PREFIX}${userId}`;
}

function parseReadIds(raw: string | null): Set<string> {
  if (!raw) return new Set();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return new Set();
  }
}

function saveReadIds(userId: string, ids: Set<string>) {
  try {
    window.localStorage.setItem(readStorageKey(userId), JSON.stringify([...ids]));
    window.dispatchEvent(new Event(READ_CHANGE_EVENT));
  } catch {
    // localStorage indisponível (modo privado, etc.).
  }
}

function subscribeReadIds(onStoreChange: () => void) {
  window.addEventListener(READ_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(READ_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

/** Meia-noite local de hoje, para comparar datas sem efeito do fuso/hora. */
function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Converte `nextDue` (ex.: "2026-10-25" ou ISO completo) em meia-noite local.
 * Devolve `null` se a data for inválida.
 */
function parseDueDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

export function daysUntilDue(dueDate: string, today = startOfToday()): number | null {
  const due = parseDueDate(dueDate);
  if (!due) return null;
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

function isActiveSubscription(document: SubscriptionDocument) {
  const status = (document.status ?? "active").trim().toLowerCase();
  return status === "" || status === "active" || status === "ativa";
}

function dueLabel(days: number) {
  if (days === 0) return "vence hoje";
  if (days === 1) return "vence em 1 dia";
  return `vence em ${days} dias`;
}

export function buildDueNotifications(
  subscriptions: SubscriptionDocument[],
  readIds: Set<string>,
  formatAmount: (amount: number) => string,
  today = startOfToday(),
): AppNotification[] {
  if (!subscriptions.length) return [];

  return subscriptions
    .filter(isActiveSubscription)
    .flatMap((subscription): AppNotification[] => {
      const days = daysUntilDue(subscription.nextDue, today);
      if (days === null || days < 0 || days > NOTIFICATION_WINDOW_DAYS) return [];

      // ID determinístico por assinatura + vencimento: quando a assinatura
      // renova (nextDue muda), nasce um alerta novo (não lido).
      const id = `sub-due-${subscription.$id}-${subscription.nextDue.slice(0, 10)}`;
      const amount = Number(subscription.amount);

      return [
        {
          id,
          title: "Assinatura a Vencer",
          message: `O ${subscription.name} ${dueLabel(days)}${
            Number.isFinite(amount) ? ` (${formatAmount(amount)})` : ""
          }`,
          read: readIds.has(id),
          type: "warning",
          date: new Date(),
          subscriptionId: subscription.$id,
          daysUntilDue: days,
          dueDate: subscription.nextDue,
        },
      ];
    })
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

export function useNotifications() {
  const { user } = useSession();
  const { alertsEnabled, currency, privacyMode } = usePreferences();
  const [subscriptions, setSubscriptions] = useState<SubscriptionDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // IDs lidos vivem em localStorage (por utilizador) — lidos como
  // external store, o mesmo padrão de `preferences-context`.
  const getReadSnapshot = useCallback(
    () => window.localStorage.getItem(readStorageKey(user.$id)) ?? "[]",
    [user.$id],
  );
  const getReadServerSnapshot = useCallback(() => "[]", []);
  const rawReadIds = useSyncExternalStore(
    subscribeReadIds,
    getReadSnapshot,
    getReadServerSnapshot,
  );
  const readIds = useMemo(() => parseReadIds(rawReadIds), [rawReadIds]);

  useEffect(() => {
    // Sem alertas ativos não há nada para gerar — nem vale a pena buscar.
    // (A lista devolvida é filtrada por `alertsEnabled` mais abaixo.)
    if (!alertsEnabled) return;

    let active = true;

    getAllSubscriptions(user.$id)
      .then((documents) => {
        if (!active) return;
        setSubscriptions(documents);
        setError(null);
      })
      .catch(() => {
        if (!active) return;
        setSubscriptions([]);
        setError("Não foi possível carregar as notificações.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user.$id, alertsEnabled, refreshKey]);

  const formatAmount = useCallback(
    (amount: number) => formatCurrency(amount, currency, privacyMode),
    [currency, privacyMode],
  );

  const notifications = useMemo(() => {
    if (!alertsEnabled) return [];
    return buildDueNotifications(subscriptions, readIds, formatAmount);
  }, [alertsEnabled, subscriptions, readIds, formatAmount]);

  const unreadCount = useMemo(
    () => notifications.reduce((total, item) => total + (item.read ? 0 : 1), 0),
    [notifications],
  );

  const markAsRead = useCallback(
    (notificationId: string) => {
      const next = parseReadIds(window.localStorage.getItem(readStorageKey(user.$id)));
      if (next.has(notificationId)) return;
      next.add(notificationId);
      saveReadIds(user.$id, next);
    },
    [user.$id],
  );

  const markAllAsRead = useCallback(() => {
    const next = parseReadIds(window.localStorage.getItem(readStorageKey(user.$id)));
    const sizeBefore = next.size;
    for (const notification of notifications) next.add(notification.id);
    if (next.size === sizeBefore) return;
    saveReadIds(user.$id, next);
  }, [notifications, user.$id]);

  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  return {
    notifications,
    unreadCount,
    isLoading: alertsEnabled ? isLoading : false,
    error: alertsEnabled ? error : null,
    alertsEnabled,
    markAsRead,
    markAllAsRead,
    refresh,
  };
}
