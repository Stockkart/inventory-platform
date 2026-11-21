import { describe, expect, it } from 'vitest';

import {
  HISTORY_WINDOW_DAYS,
  addDays,
  historyWindow,
  kolkataDate,
  kolkataTime,
  parseInstant,
} from './kolkataDates';

describe('kolkataDates', () => {
  it('shifts an instant to the Asia/Kolkata date and HH:mm', () => {
    // 2025-04-02 20:30 UTC = 2025-04-03 02:00 IST: the day changes at 18:30 UTC.
    const ms = Date.UTC(2025, 3, 2, 20, 30, 0);
    expect(kolkataDate(ms)).toBe('2025-04-03');
    expect(kolkataTime(ms)).toBe('02:00');
    expect(kolkataDate(Date.UTC(2025, 3, 2, 18, 29, 59))).toBe('2025-04-02');
    expect(kolkataDate(Date.UTC(2025, 3, 2, 18, 30, 0))).toBe('2025-04-03');
    expect(kolkataTime(Date.UTC(2025, 3, 3, 3, 42, 8))).toBe('09:12');
  });

  it('addDays moves across month and year ends', () => {
    expect(addDays('2025-03-01', -1)).toBe('2025-02-28');
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29');
    expect(addDays('2025-01-01', -1)).toBe('2024-12-31');
    expect(addDays('2025-04-03', 0)).toBe('2025-04-03');
  });

  it('historyWindow is today and the 30 days before it, 31 days in all (R4.10)', () => {
    const { from, to } = historyWindow(Date.UTC(2025, 3, 3, 3, 42, 0));
    expect(to).toBe('2025-04-03');
    expect(from).toBe('2025-03-04');
    expect(addDays(from, HISTORY_WINDOW_DAYS - 1)).toBe(to);
    // Just after IST midnight the window moves on, even though it is still yesterday in UTC.
    expect(historyWindow(Date.UTC(2025, 3, 3, 18, 30, 0))).toEqual({
      from: '2025-03-05',
      to: '2025-04-04',
    });
  });

  it('parseInstant returns epoch ms or null', () => {
    expect(parseInstant('2025-04-03T03:42:08Z')).toBe(Date.UTC(2025, 3, 3, 3, 42, 8));
    expect(parseInstant('nope')).toBeNull();
  });
});
