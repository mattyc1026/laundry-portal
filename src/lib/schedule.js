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

/**
 * Groups that are currently in use. A dismantled group is kept in the data
 * (marked archived) so any one-off bookings it already holds keep their name
 * and colour, but it never appears in a picker and has no recurring day.
 */
export function activeGroups(state) {
  return state.groups.filter((g) => !g.archived);
}

/** The group a signed-in username belongs to. */
export function groupForUser(state, userId) {
  return activeGroups(state).find((g) => g.members.includes(userId)) || null;
}

export function groupLabel(state, groupId) {
  return findGroup(state, groupId)?.label || 'Unassigned';
}

/** Groups a person may book on behalf of. Everyone books as their own group. */
export function bookableGroups(state) {
  return activeGroups(state);
}

/* ---- Week generation ----------------------------------------------------- */

/** Six week starts beginning with the current week. */
export function windowWeeks(count = WEEKS_IN_VIEW, from = new Date()) {
  const first = startOfWeek(from);
  return Array.from({ length: count }, (_, i) => addDays(first, i * 7));
}

/* ---- Towels -------------------------------------------------------------- */

/**
 * Each group has a towel setting chosen by the admin:
 *   off     never on towel duty
 *   weekly  on towel duty every week
 *   a       on towel duty in "A" weeks
 *   b       on towel duty in "B" weeks
 * A and B weeks alternate.
 */
export const TOWEL_MODES = [
  { value: 'off', label: 'Off' },
  { value: 'weekly', label: 'Every week' },
  { value: 'a', label: 'Alternating, A weeks' },
  { value: 'b', label: 'Alternating, B weeks' },
];

export function isTowelMode(value) {
  return TOWEL_MODES.some((m) => m.value === value);
}

/**
 * Which alternating block a week falls in: 0 for A weeks, 1 for B weeks.
 * Anchored to the epoch week so the cycle is stable across devices and does
 * not shift when the app is opened on a different day.
 */
export function towelBlockFor(weekStartKey) {
  const weekIndex = Math.floor(
    Date.UTC(
      Number(weekStartKey.slice(0, 4)),
      Number(weekStartKey.slice(5, 7)) - 1,
      Number(weekStartKey.slice(8, 10))
    ) / 604800000
  );
  return ((weekIndex % 2) + 2) % 2;
}

export function towelGroupsFor(state, weekStartKey) {
  const block = towelBlockFor(weekStartKey);
  return activeGroups(state)
    .filter(
      (g) =>
        g.towels === 'weekly' ||
        (g.towels === 'a' && block === 0) ||
        (g.towels === 'b' && block === 1)
    )
    .map((g) => g.id);
}

/** What the weekly rotation alone says, ignoring any admin override. */
export function autoTowels(state, dateKey, groupId) {
  if (!state.settings.towelRotation) return false;
  const weekStartKey = toKey(startOfWeek(new Date(`${dateKey}T12:00:00`)));
  return towelGroupsFor(state, weekStartKey).includes(groupId);
}

/** The admin's manual choice for this group on this date, if there is one. */
export function towelOverride(state, dateKey, groupId) {
  const manual = state.overrides[dateKey]?.towels;
  return manual && typeof manual[groupId] === 'boolean' ? manual[groupId] : null;
}

/**
 * The rotation decides by default. The admin can switch the badge on or off
 * for any group on any single date, and that choice wins for that date only,
 * so the rotation carries on untouched every other day.
 */
export function hasTowels(state, dateKey, groupId) {
  const manual = towelOverride(state, dateKey, groupId);
  if (manual !== null) return manual;
  return autoTowels(state, dateKey, groupId);
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
      towelsManual: towelOverride(state, key, b.groupId) !== null,
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
  return day.bookings.map(({ group, label, allDay, towels, towelsManual, ...b }) => ({
    ...b,
    // A rotation default becomes a real booking the moment it is edited. Its
    // id stays the same stable rotation id, so removing or editing it by id
    // finds it. A fresh id here used to make those fail with "gone".
    id: b.id,
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
  if (!group) return null;
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
  return groupUpcomingBookings(state, group.id, weeks);
}

/** Days a given group holds. The admin uses this to swap on anyone's behalf. */
export function groupUpcomingBookings(state, groupId, weeks = WEEKS_IN_VIEW) {
  const group = findGroup(state, groupId);
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
