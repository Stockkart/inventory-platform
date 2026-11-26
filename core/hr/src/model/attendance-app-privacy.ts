/**
 * The Attendance app privacy note (R9.14): the plain-English page the owner can show workers.
 * The consent text itself (what is recorded, what never is, who sees it) comes from
 * `GET /hr/attendance-app/consent/latest` so the note and the phone's consent screen cannot
 * drift; the lists below are the parts the server does not carry: what the app keeps on the
 * phone (R9.3–R9.4), what the server keeps per punch (R9.1–R9.2) and how long each is kept
 * (R9.11, R3.10). Update them whenever those criteria change.
 */

/** Dashboard route of the note; linked from the HR Settings → Attendance card. */
export const ATTENDANCE_APP_PRIVACY_PATH = '/dashboard/hr/attendance-app-privacy';

/** The employee list filtered to employees with a paired phone (R1.9 link, R8.12 filter). */
export const PAIRED_EMPLOYEES_PATH = '/dashboard/hr/employees?paired=true';

/** Everything the Attendance app keeps on the phone (R9.3–R9.4); nothing else is written. */
export const PHONE_STORED_ITEMS: readonly string[] = [
  'The pairing id that connects the phone to your employee record',
  'A pair of security keys made inside the phone’s secure hardware; the private key never leaves the phone',
  'The shop’s name and your name',
  'The shop’s Location check settings, as last received from the server',
  'Check-ins and check-outs made without network, until they are sent',
  'Your own check-ins and check-outs from the last 31 days, for the history screen',
];

/** What the server keeps for each check-in or check-out from the app (R9.1–R9.2). */
export const SERVER_STORED_PER_PUNCH: readonly string[] = [
  'The date and time of the check-in or check-out',
  'Whether it was a check-in or a check-out',
  'How far from the shop you were, in metres, and how accurate the phone’s location was; never your exact position',
  'Any flags: Outside shop, Location unclear, Fake location or Recorded offline',
  'That it came from the Attendance app, and the phone model recorded when it was paired',
  'Never your fingerprint, your face or any measurement of them: the phone only tells the server that its own check passed',
];

/** How long each item is kept (R9.11, R3.10, R9.5). */
export const RETENTION_ITEMS: readonly string[] = [
  'A pairing code is deleted when it is used, or 15 minutes after it was made, whichever comes first',
  'Check-ins and check-outs are kept as long as the shop’s other attendance records, under the same HR retention rules',
  'After a phone is unpaired, its pairing record is deleted 90 days later; HR history entries that mention it are kept like all HR history',
  'A check-in saved on the phone without network is deleted from the phone as soon as the server has answered it',
  'When a phone is unpaired, the app deletes everything it kept on the phone',
];

/** The worker's right to be unpaired (R3.1, R3.7). */
export const UNPAIR_RIGHT =
  'You can ask the shop to unpair your phone at any time, and you can remove the phone yourself from the app’s settings screen. After that the phone cannot record attendance until it is paired again.';
