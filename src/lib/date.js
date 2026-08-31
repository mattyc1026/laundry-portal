/* ==========================================================================
   Date helpers
   Every date in this app is identified by a local "YYYY-MM-DD" key. Parsing
   is always done at local noon so a daylight-saving shift can never roll a
   key onto the wrong calendar day.
   ========================================================================== */

export const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAY_INITIAL = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const DAY_FULL = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
export const MONTH_ABBR = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const MS_PER_DAY = 86400000;

/** Local midnight for a Date, stripped of any time component. */
export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** "YYYY-MM-DD" in local time. */
export function toKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse a key back to a Date at local noon. Returns null when malformed. */
export function fromKey(key) {
  if (typeof key !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
  // Guards against impossible dates such as 2026-02-31 rolling into March.
  if (d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) {
    return null;
  }
  return d;
}

export function isValidKey(key) {
  return fromKey(key) !== null;
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/** Sunday of the week containing `date`, at local midnight. */
export function startOfWeek(date) {
  const d = startOfDay(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export function todayKey() {
  return toKey(new Date());
}

/**
 * Whole calendar days from key A to key B. Computed from UTC midnights of the
 * local dates so the result is never off by one across a DST boundary.
 */
export function daysBetween(keyA, keyB) {
  const a = fromKey(keyA);
  const b = fromKey(keyB);
  if (!a || !b) return 0;
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ub - ua) / MS_PER_DAY);
}

/** Whole weeks from the Sunday of week A to the Sunday of week B. */
export function weeksBetween(keyA, keyB) {
  const a = fromKey(keyA);
  const b = fromKey(keyB);
  if (!a || !b) return 0;
  return Math.round(
    daysBetween(toKey(startOfWeek(a)), toKey(startOfWeek(b))) / 7
  );
}

/** "May 24 - 30" or "May 31 - Jun 6" */
export function formatWeekRange(startDate) {
  const end = addDays(startDate, 6);
  const sm = MONTH_ABBR[startDate.getMonth()];
  const em = MONTH_ABBR[end.getMonth()];
  if (startDate.getMonth() === end.getMonth()) {
    return `${sm} ${startDate.getDate()} - ${end.getDate()}`;
  }
  return `${sm} ${startDate.getDate()} - ${em} ${end.getDate()}`;
}

/** "Sat, Jun 20" */
export function formatShortDate(key) {
  const d = fromKey(key);
  if (!d) return key;
  return `${DAY_ABBR[d.getDay()]}, ${MONTH_ABBR[d.getMonth()]} ${d.getDate()}`;
}

/** "Saturday, June 20" */
export function formatLongDate(key) {
  const d = fromKey(key);
  if (!d) return key;
  const month = d.toLocaleDateString(undefined, { month: 'long' });
  return `${DAY_FULL[d.getDay()]}, ${month} ${d.getDate()}`;
}

/** Human distance from today: "Today", "Tomorrow", "in 5 days", "3 days ago". */
export function relativeLabel(key, reference = todayKey()) {
  const diff = daysBetween(reference, key);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1 && diff < 7) return `In ${diff} days`;
  if (diff >= 7 && diff < 14) return 'Next week';
  if (diff > 0) return `In ${Math.round(diff / 7)} weeks`;
  if (diff > -7) return `${Math.abs(diff)} days ago`;
  return `${Math.round(Math.abs(diff) / 7)} weeks ago`;
}

/** Compact "2h ago" / "Mar 4" stamp for request timelines. */
export function formatTimestamp(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${MONTH_ABBR[d.getMonth()]} ${d.getDate()}`;
}

/** The seven date keys of the week beginning at `weekStart`. */
export function weekKeys(weekStart) {
  return Array.from({ length: 7 }, (_, i) => toKey(addDays(weekStart, i)));
}
