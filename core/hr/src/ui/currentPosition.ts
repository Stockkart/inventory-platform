/** The browser's location for one punch or for setting the shop; never stored or logged here. */
export type PositionResult =
  | { ok: true; lat: number; lng: number; accuracy: number }
  | { ok: false; message: string };

const MESSAGES: Record<number, string> = {
  1: 'Location is blocked for this site. Allow it in the browser settings.',
  2: 'Your location is not available right now.',
  3: 'Getting your location took too long.',
};

/** One high-accuracy reading (15 s timeout, no cached position). Never rejects. */
export function getCurrentPosition(): Promise<PositionResult> {
  const geo = typeof navigator === 'undefined' ? undefined : navigator.geolocation;
  if (!geo) {
    return Promise.resolve({ ok: false, message: 'This browser cannot share its location.' });
  }
  return new Promise((resolve) => {
    geo.getCurrentPosition(
      ({ coords }) =>
        resolve({
          ok: true,
          lat: coords.latitude,
          lng: coords.longitude,
          accuracy: coords.accuracy,
        }),
      (err) => resolve({ ok: false, message: MESSAGES[err.code] ?? MESSAGES[2] }),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  });
}
