import { useEffect, useState, useCallback, useRef } from 'react';
import { eventsApi } from '@inventory-platform/api';
import type {
  ReminderDetail,
  ReminderNotification,
  InventoryLowEvent,
} from '@inventory-platform/types';

const STORAGE_KEY = 'reminder_notifications';

/* SAFE LOCAL STORAGE HYDRATION */
function loadFromStorage(): ReminderNotification[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useNotifications(shopId?: string) {
  const esRef = useRef<EventSource | null>(null);

  // hydrate ONCE, before effects
  const [notifications, setNotifications] =
    useState<ReminderNotification[]>(loadFromStorage);
  const [isConnected, setIsConnected] = useState(false);

  /* ---------- PERSIST (STRICTMODE SAFE) ---------- */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const unreadOnly = notifications.filter((n) => !n.read);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unreadOnly));
  }, [notifications]);

  /* ---------- SSE SUBSCRIPTION ---------- */
  useEffect(() => {
    if (!shopId) return;

    if (esRef.current) return;

    const es = eventsApi.subscribe(
      /* REMINDER_DUE */
      (data: ReminderDetail) => {
        const title =
          data.type === 'EXPIRY' ? 'Expiry Reminder' : 'Custom Reminder';

        const message = [
          data.notes,
          data.inventory?.name && `Product: ${data.inventory.name}`,
          data.inventory?.companyName &&
            `Company: ${data.inventory.companyName}`,
        ]
          .filter(Boolean)
          .join('\n');

        setNotifications((prev) => {
          // prevent duplicates
          if (prev.some((n) => n.id === data.id)) return prev;
          console.log(
            'SSE reminderId = ',
            (data as any).reminderId,
            (data as any).id
          );

          return [
            {
              id: data.id,
              type: 'REMINDER_DUE',
              title,
              message,
              createdAt: new Date().toISOString(),
              read: false,
            },
            ...prev,
          ];
        });
      },

      /* INVENTORY_LOW */
      (e: InventoryLowEvent) => {
        setNotifications((prev) => {
          if (prev.some((n) => n.id === e.inventoryId)) return prev;

          return [
            {
              id: e.inventoryId,
              type: 'INVENTORY_LOW',
              title: 'Low Stock Alert',
              message: `${e.productName} is low (${e.currentCount}/${e.threshold})`,
              createdAt: new Date().toISOString(),
              read: false,
            },
            ...prev,
          ];
        });
      }
    );

    esRef.current = es;

    setIsConnected(true);

    es.onerror = () => {
      setIsConnected(false);
    };
  }, [shopId]);

  /* ---------- ACTIONS ---------- */
  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    clearAll,
  };
}
