/* ==========================================================================
   Schedule

   The calendar is a recurring rotation plus per date overrides, generated
   relative to today. As a week ends it drops off the top of the six week
   view and a new week appears at the bottom, so the window always holds six
   weeks and never runs out.

   A "group" is who shows on the calendar. Some groups are one person
   (MALAKAI), some are a pair (MATTHEW + MICHAEL). Any member of a group can
   act for that group, which is why Matthew and Mike both appear as one
   booking but sign in separately.
   ========================================================================== */

import { addDays, startOfWeek, toKey, todayKey, weekKeys } from './date.js';
import { DAY_END, DAY_START, isAllDay } from './time.js';

export const WEEKS_IN_VIEW = 6;

/* ---- Groups -------------------------------------------------------------- */

export function findGroup(state, groupId) {
  return state.groups.find((g) => g.id === groupId) || null;
}

/** The group a signed-in username belongs to. */
export function groupForUser(state, userId) {
  return state.groups.find((g) => g.members.includes(userId)) || null;
}

export function groupLabel(state, groupId) {
  return findGroup(state, groupId)?.label || 'Unassigned';
}

/** Groups a person may book on behalf of. Everyone books as their own group. */
export function bookableGroups(state) {
  return state.groups;
}

/* ---- Week generation ----------------------------------------------------- */

/** Six week starts beginning with the current week. */
export function windowWeeks(count = WEEKS_IN_VIEW, from = new Date()) {
  const first = startOfWeek(from);
  return Array.from({ length: count }, (_, i) => addDays(first, i * 7));
}

/* ---- Towels -------------------------------------------------------------- */

/**
 * Towel duty covers two groups per week and alternates. With four groups in
 * the rotation, the first two share one week and the other two share the
 * next, then it repeats.
 */
export function rotationGroups(state) {
  const seen = [];
  state.rotation.forEach((groupId) => {
    if (groupId && !seen.includes(groupId)) seen.push(groupId);
  });
  return seen;
}

export function towelGroupsFor(state, weekStartKey) {
  const groups = rotationGroups(state);
  if (groups.length === 0) return [];
  const perWeek = Math.max(1, Math.ceil(groups.length / 2));
  const blocks = Math.ceil(groups.length / perWeek);
  // Anchored to the epoch week so the cycle is stable across devices and
  // does not shift when the app is opened on a different day.
  const weekIndex = Math.floor(
    Date.UTC(
      Number(weekStartKey.slice(0, 4)),
      Number(weekStartKey.slice(5, 7)) - 1,
      Number(weekStartKey.slice(8, 10))
    ) / 604800000
  );
  const block = ((weekIndex % blocks) + blocks) % blocks;
  return groups.slice(block * perWeek, block * perWeek + perWeek);
}

export function hasTowels(state, dateKey, groupId) {
  if (!state.settings.towelRotation) return false;
  const weekStartKey = toKey(startOfWeek(new Date(`${dateKey}T12:00:00`)));
  return towelGroupsFor(state, weekStartKey).includes(groupId);
}

/* ---- Day resolution ------------------------------------------------------ */

let bookingSeq = 0;
export function newBookingId(prefix = 'b') {
  bookingSeq += 1;
  return `${prefix}${Date.now().toString(36)}${bookingSeq.toString(36)}`;
}

/**
 * The single source of truth for a date. Every view reads days through here
 * so the six week grid, the week view, the day view and the editing sheet
 * can never disagree about who has what.
 */
export function resolveDay(state, key, reference = todayKey()) {
  const date = new Date(`${key}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  const dow = date.getDay();
  const override = state.overrides[key] || null;
  const blocked = override?.blocked === true;

  let bookings = [];
  if (!blocked) {
    if (override && Array.isArray(override.bookings)) {
      bookings = override.bookings;
    } else if (!override?.cleared && state.rotation[dow]) {
      // The recurring default, materialised only for display.
      bookings = [
        {
          id: `rotation-${key}`,
          groupId: state.rotation[dow],
          start: DAY_START,
          end: DAY_END,
          fromRotation: true,
        },
      ];
    }
  }

  const enriched = bookings
    .filter((b) => findGroup(state, b.groupId))
    .map((b) => ({
      ...b,
      group: findGroup(state, b.groupId),
      label: groupLabel(state, b.groupId),
      allDay: isAllDay(b),
      towels: hasTowels(state, key, b.groupId),
    }))
    .sort((a, b) => a.start - b.start);

  return {
    key,
    date,
    dow,
    bookings: enriched,
    blocked,
    isPast: key < reference,
    isToday: key === reference,
    isFree: !blocked && enriched.length === 0,
    fromRotation: enriched.some((b) => b.fromRotation),
  };
}

export function resolveWeek(state, weekStart, reference = todayKey()) {
  return weekKeys(weekStart)
    .map((key) => resolveDay(state, key, reference))
    .filter(Boolean);
}

/** Materialise a day's bookings so they can be edited. */
export function bookingsOf(state, key) {
  const day = resolveDay(state, key);
  if (!day) return [];
  return day.bookings.map(({ group, label, allDay, towels, ...b }) => ({
    ...b,
    // A rotation default becomes a real booking the moment it is edited.
    id: b.fromRotation ? newBookingId() : b.id,
    fromRotation: false,
  }));
}

/* ---- Viewer helpers ------------------------------------------------------ */

export function isMine(state, booking, userId) {
  const group = groupForUser(state, userId);
  return Boolean(group && booking.groupId === group.id);
}

/** The viewer's next upcoming day, for the towel banner and the hero. */
export function nextDayFor(state, userId, weeks = 8) {
  const group = groupForUser(state, userId);
  if (!group) return null;
  const reference = todayKey();
  for (const weekStart of windowWeeks(weeks)) {
    for (const day of resolveWeek(state, weekStart, reference)) {
      if (day.isPast || day.blocked) continue;
      const mine = day.bookings.find((b) => b.groupId === group.id);
      if (mine) return { day, booking: mine };
    }
  }
  return null;
}

/** The viewer's next towel day, which drives the banner at the top. */
export function nextTowelDay(state, userId, weeks = 8) {
  const group = groupForUser(state, userId);
  if (!group || !state.settings.towelRotation) return null;
  const reference = todayKey();
  for (const weekStart of windowWeeks(weeks)) {
    for (const day of resolveWeek(state, weekStart, reference)) {
      if (day.isPast || day.blocked) continue;
      const mine = day.bookings.find((b) => b.groupId === group.id && b.towels);
      if (mine) return { day, booking: mine };
    }
  }
  return null;
}

/** Days the viewer holds, offered as swap candidates. */
export function myUpcomingBookings(state, userId, weeks = WEEKS_IN_VIEW) {
  const group = groupForUser(state, userId);
  if (!group) return [];
  const reference = todayKey();
  const out = [];
  windowWeeks(weeks).forEach((weekStart) => {
    resolveWeek(state, weekStart, reference).forEach((day) => {
      if (day.isPast || day.blocked) return;
      day.bookings
        .filter((b) => b.groupId === group.id)
        .forEach((booking) => out.push({ day, booking }));
    });
  });
  return out;
}
