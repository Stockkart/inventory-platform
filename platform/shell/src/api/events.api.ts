import { apiClient } from '@inventory-platform/api-client';
import type { ReminderDetail, InventoryLowEvent } from '@inventory-platform/contracts';
import { EVENT_ENDPOINTS } from './endpoints';

export const eventsApi = {
  subscribe(
    onReminderDue: (data: ReminderDetail) => void,
    onInventoryLow?: (data: InventoryLowEvent) => void
  ): EventSource {
    const es = apiClient.createSseConnection(EVENT_ENDPOINTS.STREAM);

    es.addEventListener('REMINDER_DUE', (event) => {
      const messageEvent = event as MessageEvent;
      onReminderDue(JSON.parse(messageEvent.data));
    });

    es.addEventListener('INVENTORY_LOW', (event) => {
      if (!onInventoryLow) return;

      const messageEvent = event as MessageEvent;
      onInventoryLow(JSON.parse(messageEvent.data));
    });

    es.onerror = () => {
      // Prevent default EventSource error logging noise.
    };

    return es;
  },
};
