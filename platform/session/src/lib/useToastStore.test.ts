import { afterEach, describe, expect, it } from 'vitest';
import { useToastStore } from './useToastStore';

const EXPIRED = 'Your plan or trial has expired. Please renew to continue.';

describe('useToastStore.show', () => {
  afterEach(() => useToastStore.getState().clearAll());

  it('shows a repeated message once while it is on screen', () => {
    const { show } = useToastStore.getState();
    for (let i = 0; i < 7; i++) {
      show({ type: 'error', message: EXPIRED });
    }
    expect(useToastStore.getState().toasts).toHaveLength(1);
  });

  it('shows the message again once the first one is gone', () => {
    const { show, remove } = useToastStore.getState();
    show({ type: 'error', message: EXPIRED });
    remove(useToastStore.getState().toasts[0].id);
    show({ type: 'error', message: EXPIRED });
    expect(useToastStore.getState().toasts).toHaveLength(1);
  });

  it('keeps different messages, and the same text with a different type', () => {
    const { show } = useToastStore.getState();
    show({ type: 'error', message: EXPIRED });
    show({ type: 'error', message: 'Network error. Please check your connection.' });
    show({ type: 'warning', message: EXPIRED });
    expect(useToastStore.getState().toasts.map((t) => [t.type, t.message])).toEqual([
      ['error', EXPIRED],
      ['error', 'Network error. Please check your connection.'],
      ['warning', EXPIRED],
    ]);
  });
});
