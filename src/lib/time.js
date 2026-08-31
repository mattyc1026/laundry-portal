/* ==========================================================================
   Time slots

   A slot is minutes from local midnight: { start, end } with 0 <= start <
   end <= 1440. A whole day is { start: 0, end: 1440 }.

   Minutes avoid every timezone and parsing problem that comes with storing
   clock strings, and make overlap arithmetic plain integer comparison.
   ========================================================================== */

export const DAY_START = 0;
export const DAY_END = 1440;

export function isAllDay(slot) {
  return slot.start <= DAY_START && slot.end >= DAY_END;
}

/** "9:00 AM", "12:30 PM", "Midnight". */
export function formatMinutes(mins) {
  const m = ((Math.round(mins) % DAY_END) + DAY_END) % DAY_END;
  if (m === 0) return '12:00 AM';
  const hour24 = Math.floor(m / 60);
  const minute = m % 60;
  const suffix = hour24 < 12 ? 'AM' : 'PM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

/** "All day" or "9:00 AM - 12:00 PM". */
export function formatSlot(slot) {
  if (isAllDay(slot)) return 'All day';
  const end = slot.end >= DAY_END ? 'Midnight' : formatMinutes(slot.end);
  return `${formatMinutes(slot.start)} - ${end}`;
}

/** Minutes to "HH:MM" for a native time input. */
export function toTimeValue(mins) {
  const m = Math.max(0, Math.min(DAY_END - 1, Math.round(mins)));
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function fromTimeValue(value) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value || '');
  if (!m) return null;
  const mins = Number(m[1]) * 60 + Number(m[2]);
  return mins >= 0 && mins <= DAY_END ? mins : null;
}

export function overlaps(a, b) {
  return a.start < b.end && b.start < a.end;
}

/** How the incoming slot sits against an existing one. */
export function relation(existing, incoming) {
  if (!overlaps(existing, incoming)) return 'none';
  if (incoming.start <= existing.start && incoming.end >= existing.end) {
    return 'covers';
  }
  if (incoming.start > existing.start && incoming.end < existing.end) {
    return 'splits';
  }
  return incoming.start <= existing.start ? 'trims-start' : 'trims-end';
}

/**
 * Applies an incoming booking to a list, resolving every conflict.
 *
 * The interesting case is 'splits': a slot landing inside someone else's
 * larger slot leaves them with the time before and the time after, which is
 * how the calendar ends up reading user1, user2, user1 down the day.
 *
 * Returns the new list plus what happened, so the caller can describe the
 * outcome accurately rather than guessing.
 */
export function applyBooking(bookings, incoming) {
  const next = [];
  const displaced = [];
  let didSplit = false;

  bookings.forEach((existing) => {
    if (existing.id === incoming.id) return; // replacing itself
    const how = relation(existing, incoming);

    if (how === 'none') {
      next.push(existing);
      return;
    }
    if (how === 'covers') {
      displaced.push({ booking: existing, how });
      return;
    }
    if (how === 'splits') {
      didSplit = true;
      displaced.push({ booking: existing, how });
      next.push({ ...existing, id: `${existing.id}-a`, end: incoming.start });
      next.push({ ...existing, id: `${existing.id}-b`, start: incoming.end });
      return;
    }
    displaced.push({ booking: existing, how });
    if (how === 'trims-start') next.push({ ...existing, start: incoming.end });
    else next.push({ ...existing, end: incoming.start });
  });

  next.push(incoming);

  // A trim can leave a zero or negative length fragment. Drop those rather
  // than rendering an empty row on the calendar.
  const cleaned = next.filter((b) => b.end - b.start > 0);
  cleaned.sort((a, b) => a.start - b.start || a.groupId.localeCompare(b.groupId));
  return { bookings: cleaned, displaced, didSplit };
}

/** Everyone whose time would be affected by this booking. */
export function conflictsFor(bookings, incoming, ignoreId = null) {
  return bookings.filter(
    (b) => b.id !== ignoreId && b.id !== incoming.id && overlaps(b, incoming)
  );
}

/** Free gaps in a day, used to offer sensible default times. */
export function openGaps(bookings) {
  const busy = [...bookings].sort((a, b) => a.start - b.start);
  const gaps = [];
  let cursor = DAY_START;
  busy.forEach((b) => {
    if (b.start > cursor) gaps.push({ start: cursor, end: b.start });
    cursor = Math.max(cursor, b.end);
  });
  if (cursor < DAY_END) gaps.push({ start: cursor, end: DAY_END });
  return gaps.filter((g) => g.end - g.start >= 30);
}

/** A reasonable default slot: the largest free gap, capped at three hours. */
export function suggestSlot(bookings) {
  const gaps = openGaps(bookings);
  if (gaps.length === 0) return { start: 540, end: 720 };
  const biggest = gaps.reduce((a, b) => (b.end - b.start > a.end - a.start ? b : a));
  const start = biggest.start;
  return { start, end: Math.min(biggest.end, start + 180) };
}
