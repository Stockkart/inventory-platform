import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { AppPunchRequest, PunchDirection } from '@inventory-platform/attendance-protocol';

import { PUNCH_QUEUE_TABLE, type SqlDatabase } from './db';
import { MemoryDatabase } from './memoryDb';
import { PUNCH_FIELD_NAMES, PunchQueue, type EnqueueInput } from './PunchQueue';

const PAIRING = '66a1b2c3d4e5f60718293a4b';
const SHOP = '66a1b2c3d4e5f60718293a4c';
const EMPLOYEE = '66a1b2c3d4e5f60718293a4d';

/** A valid signed request; `n` makes the punch id and the phone time distinct and ordered. */
function request(n: number, overrides: Partial<AppPunchRequest> = {}): AppPunchRequest {
  const second = String(n % 60).padStart(2, '0');
  const minute = String(Math.floor(n / 60) % 60).padStart(2, '0');
  return {
    pairingId: PAIRING,
    shopId: SHOP,
    employeeId: EMPLOYEE,
    punchId: `0f6b2c1e-9c4a-4a5e-8f1d-${String(n).padStart(12, '0')}`,
    phoneTime: `2025-04-03T09:${minute}:${second}Z`,
    offline: true,
    locationChecked: true,
    distanceMetres: 12,
    accuracyMetres: 8,
    mock: false,
    signature: `sig-${n}`,
    ...overrides,
  };
}

function setup(start = 1_000_000) {
  let clock = start;
  const db = new MemoryDatabase();
  const queue = new PunchQueue(db, { now: () => clock });
  return {
    db,
    queue,
    tick: (ms: number) => {
      clock += ms;
      return clock;
    },
    now: () => clock,
  };
}

describe('PunchQueue', () => {
  describe('enqueue', () => {
    it('stores the ten signed fields, the signature and the direction guess as WAITING', async () => {
      const { db, queue, now } = setup();
      const stored = await queue.enqueue(request(1), 'IN');

      expect(stored).toEqual({
        punchId: request(1).punchId,
        request: request(1),
        phoneTime: request(1).phoneTime,
        directionGuess: 'IN',
        state: 'WAITING',
        refusalMessage: null,
        attempts: 0,
        nextAttemptAt: 0,
        createdAt: now(),
      });
      const [row] = db.dump(PUNCH_QUEUE_TABLE);
      expect(row).toMatchObject({
        punch_id: request(1).punchId,
        signature: 'sig-1',
        phone_time: request(1).phoneTime,
        direction_guess: 'IN',
        state: 'WAITING',
        refusal_message: null,
        attempts: 0,
        next_attempt_at: 0,
        created_at: now(),
      });
      expect(Object.keys(JSON.parse(row['payload'] as string))).toEqual([...PUNCH_FIELD_NAMES]);
      expect(await queue.get(request(1).punchId)).toEqual(stored);
    });

    it('saves a punch once: a second row with the same punch id is refused', async () => {
      const { queue } = setup();
      await queue.enqueue(request(1), 'IN');
      await expect(queue.enqueue(request(1, { signature: 'other' }), 'OUT')).rejects.toThrow(
        /UNIQUE/,
      );
      expect(await queue.waitingCount()).toBe(1);
    });

    it('refuses malformed fields before writing anything', async () => {
      const { queue } = setup();
      await expect(queue.enqueue(request(1, { distanceMetres: 1.5 }), 'IN')).rejects.toThrow(
        /distanceMetres/,
      );
      await expect(queue.enqueue(request(2, { signature: '' }), 'IN')).rejects.toThrow(/signature/);
      await expect(
        queue.enqueue(request(3), 'SIDEWAYS' as unknown as PunchDirection),
      ).rejects.toThrow(/directionGuess/);
      expect(await queue.waitingCount()).toBe(0);
    });

    it('keeps null distance and accuracy (no location) as null', async () => {
      const { queue } = setup();
      const input = request(1, {
        locationChecked: false,
        distanceMetres: null,
        accuracyMetres: null,
      });
      const stored = await queue.enqueue(input, 'IN');
      expect(stored.request.distanceMetres).toBeNull();
      expect((await queue.get(input.punchId))?.request).toEqual(input);
    });
  });

  describe('send order (R6.5)', () => {
    it('nextWaiting is the oldest phone_time, whatever the insertion order', async () => {
      const { queue } = setup();
      await queue.enqueue(request(30), 'IN');
      await queue.enqueue(request(10), 'IN');
      await queue.enqueue(request(20), 'OUT');

      expect((await queue.nextWaiting())?.punchId).toBe(request(10).punchId);
      await queue.markAnswered(request(10).punchId);
      expect((await queue.nextWaiting())?.punchId).toBe(request(20).punchId);
      await queue.markAnswered(request(20).punchId);
      expect((await queue.nextWaiting())?.punchId).toBe(request(30).punchId);
      await queue.markAnswered(request(30).punchId);
      expect(await queue.nextWaiting()).toBeNull();
    });

    it('a punch made while others wait is placed after them (same phone time ordering)', async () => {
      const { queue } = setup();
      await queue.enqueue(request(1), 'IN');
      await queue.enqueue(request(2), 'OUT');
      expect((await queue.waiting()).map((p) => p.punchId)).toEqual([
        request(1).punchId,
        request(2).punchId,
      ]);
    });

    it('two rows with the same phone time are ordered by creation', async () => {
      const { queue, tick } = setup();
      await queue.enqueue(request(5, { punchId: 'aaaaaaaa-0000-4000-8000-000000000001' }), 'IN');
      tick(1);
      await queue.enqueue(request(5, { punchId: 'aaaaaaaa-0000-4000-8000-000000000000' }), 'OUT');
      expect((await queue.nextWaiting())?.punchId).toBe('aaaaaaaa-0000-4000-8000-000000000001');
    });
  });

  describe('retry gating (R6.15)', () => {
    it('the head is not returned before its next_attempt_at, and nothing jumps the queue', async () => {
      const { queue, now, tick } = setup();
      await queue.enqueue(request(1), 'IN');
      await queue.enqueue(request(2), 'OUT');

      expect(await queue.scheduleRetry(request(1).punchId, now() + 60_000, 1)).toBe(true);
      expect(await queue.nextWaiting()).toBeNull();
      expect(await queue.nextDueAt()).toBe(now() + 60_000);
      expect(await queue.waitingCount()).toBe(2);

      tick(59_999);
      expect(await queue.nextWaiting()).toBeNull();
      tick(1);
      const head = await queue.nextWaiting();
      expect(head?.punchId).toBe(request(1).punchId);
      expect(head?.attempts).toBe(1);
    });

    it('nextWaiting accepts an explicit clock', async () => {
      const { queue } = setup();
      await queue.enqueue(request(1), 'IN');
      await queue.scheduleRetry(request(1).punchId, 5_000, 2);
      expect(await queue.nextWaiting(4_999)).toBeNull();
      expect((await queue.nextWaiting(5_000))?.punchId).toBe(request(1).punchId);
    });

    it('scheduleRetry touches waiting rows only and validates its inputs', async () => {
      const { queue } = setup();
      await queue.enqueue(request(1), 'IN');
      await queue.markRefused(request(1).punchId, 'You are on approved leave today');
      expect(await queue.scheduleRetry(request(1).punchId, 10, 1)).toBe(false);
      expect(await queue.scheduleRetry('missing', 10, 1)).toBe(false);
      await expect(queue.scheduleRetry(request(1).punchId, 10, -1)).rejects.toThrow(/attempts/);
      await expect(queue.scheduleRetry(request(1).punchId, Number.NaN, 1)).rejects.toThrow(
        /nextAttemptAt/,
      );
    });
  });

  describe('answers (R6.7, R9.5)', () => {
    it('markAnswered deletes the row', async () => {
      const { db, queue } = setup();
      await queue.enqueue(request(1), 'IN');
      expect(await queue.markAnswered(request(1).punchId)).toBe(true);
      expect(db.dump(PUNCH_QUEUE_TABLE)).toEqual([]);
      expect(await queue.markAnswered(request(1).punchId)).toBe(false);
    });

    it('markAnswered runs the caller’s record step and the delete in one transaction', async () => {
      const { db, queue } = setup();
      await db.execAsync('CREATE TABLE answers (punch_id TEXT PRIMARY KEY NOT NULL)');
      await queue.enqueue(request(1), 'IN');

      await queue.markAnswered(request(1).punchId, async () => {
        await db.runAsync('INSERT INTO answers (punch_id) VALUES (?)', [request(1).punchId]);
      });
      expect(db.dump('answers')).toEqual([{ punch_id: request(1).punchId }]);
      expect(await queue.waitingCount()).toBe(0);

      await queue.enqueue(request(2), 'OUT');
      await expect(
        queue.markAnswered(request(2).punchId, async () => {
          throw new Error('record failed');
        }),
      ).rejects.toThrow('record failed');
      // Rolled back: the punch is still queued and nothing was recorded for it.
      expect(await queue.waitingCount()).toBe(1);
      expect(db.dump('answers')).toHaveLength(1);
    });
  });

  describe('refusals (R6.13, R6.14)', () => {
    it('markRefused turns the row REFUSED with the message, out of the waiting set', async () => {
      const { queue } = setup();
      await queue.enqueue(request(1), 'IN');
      await queue.enqueue(request(2), 'OUT');

      expect(await queue.markRefused(request(1).punchId, 'You are on approved leave today')).toBe(
        true,
      );
      expect(await queue.waitingCount()).toBe(1);
      expect((await queue.nextWaiting())?.punchId).toBe(request(2).punchId);
      expect(await queue.refused()).toMatchObject([
        {
          punchId: request(1).punchId,
          state: 'REFUSED',
          refusalMessage: 'You are on approved leave today',
          directionGuess: 'IN',
        },
      ]);
      // Refusing again, or refusing an unknown row, changes nothing.
      expect(await queue.markRefused(request(1).punchId, 'other')).toBe(false);
      expect(await queue.markRefused('missing', 'other')).toBe(false);
      expect((await queue.refused())[0].refusalMessage).toBe('You are on approved leave today');
      await expect(queue.markRefused(request(2).punchId, '')).rejects.toThrow(/message/);
    });

    it('a refused row stays until dismissRefused deletes it', async () => {
      const { db, queue } = setup();
      await queue.enqueue(request(1), 'IN');
      await queue.markRefused(request(1).punchId, 'Fake location detected');

      expect(await queue.dismissRefused('missing')).toBe(false);
      expect(db.dump(PUNCH_QUEUE_TABLE)).toHaveLength(1);
      expect(await queue.dismissRefused(request(1).punchId)).toBe(true);
      expect(db.dump(PUNCH_QUEUE_TABLE)).toEqual([]);
      expect(await queue.refused()).toEqual([]);
    });

    it('dismissRefused never deletes a waiting row', async () => {
      const { queue } = setup();
      await queue.enqueue(request(1), 'IN');
      expect(await queue.dismissRefused(request(1).punchId)).toBe(false);
      expect(await queue.waitingCount()).toBe(1);
    });
  });

  describe('home-screen label (R6.4)', () => {
    it('newestKnownDirection is the guess of the waiting row with the latest phone time', async () => {
      const { queue } = setup();
      expect(await queue.newestKnownDirection()).toBeNull();
      await queue.enqueue(request(20), 'OUT');
      await queue.enqueue(request(10), 'IN');
      expect(await queue.newestKnownDirection()).toBe('OUT');
      await queue.enqueue(request(30), 'IN');
      expect(await queue.newestKnownDirection()).toBe('IN');
    });

    it('a refused punch does not count; an answered one is gone', async () => {
      const { queue } = setup();
      await queue.enqueue(request(10), 'IN');
      await queue.enqueue(request(20), 'OUT');
      await queue.markRefused(request(20).punchId, 'Fake location detected');
      expect(await queue.newestKnownDirection()).toBe('IN');
      await queue.markAnswered(request(10).punchId);
      expect(await queue.newestKnownDirection()).toBeNull();
    });
  });

  describe('waitingCount (R6.16)', () => {
    it('counts WAITING rows only and follows every change', async () => {
      const { queue, now } = setup();
      expect(await queue.waitingCount()).toBe(0);
      await queue.enqueue(request(1), 'IN');
      await queue.enqueue(request(2), 'OUT');
      await queue.enqueue(request(3), 'IN');
      expect(await queue.waitingCount()).toBe(3);
      await queue.scheduleRetry(request(1).punchId, now() + 1, 1);
      expect(await queue.waitingCount()).toBe(3); // in a retry wait is still waiting
      await queue.markRefused(request(2).punchId, 'refused');
      expect(await queue.waitingCount()).toBe(2);
      await queue.markAnswered(request(1).punchId);
      expect(await queue.waitingCount()).toBe(1);
      await queue.clear();
      expect(await queue.waitingCount()).toBe(0);
      expect(await queue.refused()).toEqual([]);
    });
  });

  describe('schema', () => {
    it('is created on first use and a failure to create it is retried', async () => {
      const db = new MemoryDatabase();
      let fail = true;
      const flaky: SqlDatabase = {
        execAsync: (source: string) => {
          if (fail) {
            fail = false;
            return Promise.reject(new Error('disk busy'));
          }
          return db.execAsync(source);
        },
        runAsync: db.runAsync.bind(db),
        getAllAsync: db.getAllAsync.bind(db),
        getFirstAsync: db.getFirstAsync.bind(db),
        withTransactionAsync: db.withTransactionAsync.bind(db),
        closeAsync: db.closeAsync.bind(db),
      };
      const queue = new PunchQueue(flaky);
      await expect(queue.waitingCount()).rejects.toThrow('disk busy');
      expect(await queue.waitingCount()).toBe(0);
    });
  });
});

// --- properties ---

const objectId = fc.stringMatching(/^[0-9a-f]{24}$/);
const uuid = fc.uuid().map((u) => u.toLowerCase());
const phoneTime = fc
  .date({ min: new Date('2024-01-01T00:00:00Z'), max: new Date('2030-12-31T23:59:59Z') })
  .map((d) => d.toISOString().replace(/\.\d{3}Z$/, 'Z'));
const metres = fc.option(fc.nat({ max: 50_000 }), { nil: null });

const signedRequest: fc.Arbitrary<AppPunchRequest> = fc.record({
  pairingId: objectId,
  shopId: objectId,
  employeeId: objectId,
  punchId: uuid,
  phoneTime,
  offline: fc.boolean(),
  locationChecked: fc.boolean(),
  distanceMetres: metres,
  accuracyMetres: metres,
  mock: fc.boolean(),
  signature: fc.stringMatching(/^[A-Za-z0-9+/]{4,96}$/),
});

/** A coordinate with six decimals, as phones report them; never in exponent form. */
const coordinate = (limit: number) =>
  fc.integer({ min: -limit * 1_000_000, max: limit * 1_000_000 }).map((n) => n / 1_000_000);

/** A coordinate reading as `expo-location` would give it, plus the field names people reach for. */
const coordinateReading = fc.record({
  latitude: coordinate(90),
  longitude: coordinate(180),
  lat: coordinate(90),
  lng: coordinate(180),
});

describe('PunchQueue properties', () => {
  it('a stored row holds exactly the ten signed fields: no coordinates, whatever else the input carried (R9.2, R9.5)', async () => {
    await fc.assert(
      fc.asyncProperty(signedRequest, coordinateReading, async (req, reading) => {
        const db = new MemoryDatabase();
        const queue = new PunchQueue(db);
        // A caller that leaks the whole location reading into the request by mistake. The type
        // forbids it (see the type-level test below), so it is forced here on purpose.
        const leaky = {
          ...req,
          ...reading,
          coords: { latitude: reading.latitude, longitude: reading.longitude },
        } as unknown as EnqueueInput;

        await queue.enqueue(leaky, 'IN');

        const [row] = db.dump(PUNCH_QUEUE_TABLE);
        const payload = row['payload'] as string;
        const parsed = JSON.parse(payload) as Record<string, unknown>;
        expect(Object.keys(parsed).sort()).toEqual([...PUNCH_FIELD_NAMES].sort());
        for (const key of ['lat', 'lng', 'latitude', 'longitude', 'coords']) {
          expect(parsed).not.toHaveProperty(key);
        }
        // The decimal text of a coordinate never appears anywhere in the row. Whole-number
        // coordinates are skipped: "12" is also a legitimate distance in metres.
        const everything = JSON.stringify(row);
        for (const value of [reading.latitude, reading.longitude, reading.lat, reading.lng]) {
          if (!Number.isInteger(value)) {
            expect(everything).not.toContain(String(value));
          }
        }
        // What comes back is the request as signed, and only that.
        expect((await queue.get(req.punchId))?.request).toEqual(req);
      }),
      { numRuns: 150 },
    );
  });

  it('rows are returned oldest phone time first, one at a time, and leave only on an answer (R6.5, R6.7)', async () => {
    const batch = fc
      .uniqueArray(signedRequest, {
        minLength: 1,
        maxLength: 8,
        selector: (r) => r.punchId,
      })
      .filter((rs) => new Set(rs.map((r) => r.phoneTime)).size === rs.length);
    await fc.assert(
      fc.asyncProperty(
        batch,
        fc.array(fc.boolean(), { minLength: 8, maxLength: 8 }),
        async (requests, answers) => {
          let clock = 1;
          const queue = new PunchQueue(new MemoryDatabase(), { now: () => clock++ });
          for (const req of requests) {
            await queue.enqueue(req, 'IN');
          }
          const expectedOrder = [...requests].map((r) => r.phoneTime).sort();
          const seen: string[] = [];
          let i = 0;
          for (;;) {
            const head = await queue.nextWaiting(Number.MAX_SAFE_INTEGER);
            if (!head) {
              break;
            }
            seen.push(head.phoneTime);
            if (answers[i++ % answers.length]) {
              await queue.markAnswered(head.punchId);
            } else {
              await queue.markRefused(head.punchId, 'refused');
            }
          }
          expect(seen).toEqual(expectedOrder);
          expect(await queue.waitingCount()).toBe(0);
          const refusedCount = (await queue.refused()).length;
          expect(refusedCount).toBe(seen.filter((_, idx) => !answers[idx % answers.length]).length);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// --- type-level: the enqueue type refuses coordinate-named properties ---

// @ts-expect-error latitude is not an allowed property of EnqueueInput
const _rejectsLatitude: EnqueueInput = { ...request(1), latitude: 28.6 };
// @ts-expect-error lng is not an allowed property of EnqueueInput
const _rejectsLng: EnqueueInput = { ...request(1), lng: 77.2 };
// @ts-expect-error a coords object is not an allowed property of EnqueueInput
const _rejectsCoords: EnqueueInput = { ...request(1), coords: { latitude: 1, longitude: 2 } };
const _acceptsPlainRequest: EnqueueInput = request(1);
void [_rejectsLatitude, _rejectsLng, _rejectsCoords, _acceptsPlainRequest];
