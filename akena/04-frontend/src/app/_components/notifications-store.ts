// Notifications store — persisted per userId in localStorage.
// MVP: only OPPORTUNITY_ADDED type (added as collaborator to an opportunity).
// 🔄 NEXT.JS: este módulo usa localStorage → sólo puede ejecutarse en el cliente.
"use client";

export type NotificationType = "OPPORTUNITY_ADDED";

export interface AppNotification {
  id:                string;
  userId:            string;      // receptor
  tipo:              NotificationType;
  oportunidadId:     string;
  oportunidadNombre: string;
  createdAt:         string;
  readAt:            string | null;
  createdBy:         string | null; // who added them
}

const KEY_PREFIX = "akena-notifs-";

function storageKey(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

export function getNotifications(userId: string): AppNotification[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as AppNotification[];
    }
  } catch {}
  return [];
}

function saveNotifications(userId: string, items: AppNotification[]): void {
  try { localStorage.setItem(storageKey(userId), JSON.stringify(items)); } catch {}
}

export function addNotification(
  notification: Omit<AppNotification, "id" | "createdAt">,
): AppNotification {
  const items = getNotifications(notification.userId);
  const newItem: AppNotification = {
    ...notification,
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  saveNotifications(notification.userId, [newItem, ...items]);
  return newItem;
}

export function markNotificationRead(userId: string, notifId: string): void {
  const items = getNotifications(userId);
  const idx = items.findIndex((n) => n.id === notifId);
  if (idx !== -1 && !items[idx].readAt) {
    items[idx] = { ...items[idx], readAt: new Date().toISOString() };
    saveNotifications(userId, items);
  }
}

export function getUnreadCount(userId: string): number {
  return getNotifications(userId).filter((n) => !n.readAt).length;
}