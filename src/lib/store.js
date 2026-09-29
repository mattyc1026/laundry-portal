/* ==========================================================================
   Store

   One versioned localStorage record. Every state transition is a pure
   function taking state and returning { state, result }, so a rule is
   written once and cannot drift between the calendar, the day sheet and the
   admin view.

   Note on PINs: they are stored as entered. The portal holds a laundry
   schedule and nothing else, which is a deliberate call
   rather than an oversight.
   ========================================================================== */

import { isValidKey, todayKey } from './date.js';
import { applyBooking, conflictsFor, DAY_END, DAY_START, formatSlot } from './time.js';
import { THEMES, DEFAULT_THEME } from './themes.js';
import {
  activeGroups,
  autoTowels,
  bookingsOf,
  findGroup,
  groupForUser,
  groupLabel,
  isTowelMode,
  newBookingId,
  resolveDay,
  TOWEL_MODES,
} from './schedule.js';

export const STORAGE_KEY = 'cflp.v3';
export const SESSION_KEY = 'cflp.session.v3';
export const SCHEMA_VERSION = 3;

/** Only this username sees the Admin tab. */
export const ADMIN_USER = 'matthewc';

export const MAX_LOG = 400;

/* ---- Defaults ------------------------------------------------------------ */

export function defaultState() {
  return {
    version: SCHEMA_VERSION,
    users: [
      { id: 'matthewc', firstName: 'Matthew', lastName: 'Cunning', pin: '7420', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'miker', firstName: 'Michael', lastName: 'Reaves', pin: '1473', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'malakail', firstName: 'Malakai', lastName: 'Liverpool', pin: '1111', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'scottc', firstName: 'Scott', lastName: 'Cunning', pin: '5244', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'starlac', firstName: 'Starla', lastName: 'Cunning', pin: '4698', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'alyssac', firstName: 'Alyssa', lastName: 'Cunning', pin: '6842', createdAt: '2026-01-01T00:00:00.000Z' },
    ],
    // How people appear on the calendar. Pairs render as one booking.
    groups: [
      { id: 'malakai', label: 'MALAKAI', members: ['malakail'], color: '#ff375f', towels: 'a', archived: false },
      { id: 'scott-starla', label: 'SCOTT + STARLA', members: ['scottc', 'starlac'], color: '#c8b400', towels: 'a', archived: false },
      { id: 'alyssa-josiah', label: 'ALYSSA + JOSIAH', members: ['alyssac'], color: '#30d158', towels: 'b', archived: false },
      { id: 'matthew-michael', label: 'MATTHEW + MICHAEL', members: ['matthewc', 'miker'], color: '#00b8c4', towels: 'b', archived: false },
    ],
    // Index 0 is Sunday.
    rotation: [
      'malakai',
      null,
      null,
      'scott-starla',
      'alyssa-josiah',
      null,
      'matthew-michael',
    ],
    overrides: {},
    log: [],
    settings: {
      towelRotation: true,
      householdName: 'Cunning Family',
      theme: 'dark',
      textScale: 1,
      highContrast: false,
      reduceMotion: false,
    },
  };
}

/* ---- Validation ---------------------------------------------------------- */

function sanitizeBooking(raw, groupIds) {
  if (!raw || typeof raw !== 'object') return null;
  if (!groupIds.has(raw.groupId)) return null;
  const start = Number(raw.start);
  const end = Number(raw.end);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  const s = Math.max(DAY_START, Math.min(DAY_END, Math.round(start)));
  const e = Math.max(DAY_START, Math.min(DAY_END, Math.round(end)));
  if (e - s <= 0) return null;
  return {
    id: String(raw.id || newBookingId()),
    groupId: raw.groupId,
    start: s,
    end: e,
    note: typeof raw.note === 'string' ? raw.note.slice(0, 200) : '',
  };
}

/**
 * Realtime Database hands back a list with gaps as an object keyed by index,
 * and drops empty lists altogether. This turns either shape into an array.
 */
function asList(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => value[k]);
  }
  return [];
}

/** Recurring weekday slots by index, whatever shape the database returned. */
function rotationSlots(value) {
  const slots = Array.from({ length: 7 }, () => null);
  if (Array.isArray(value)) {
    value.forEach((v, i) => {
      if (i < 7) slots[i] = v;
    });
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([k, v]) => {
      const i = Number(k);
      if (Number.isInteger(i) && i >= 0 && i < 7) slots[i] = v;
    });
  }
  return slots;
}

/**
 * What the old automatic towel rotation did for a group, so data saved before
 * towels became a per group setting keeps behaving exactly the same. Groups
 * shared the duty in blocks of two, alternating week to week.
 */
function legacyTowelMode(index, count) {
  if (count <= 0) return 'off';
  const perWeek = Math.max(1, Math.ceil(count / 2));
  const blocks = Math.ceil(count / perWeek);
  if (blocks <= 1) return 'weekly';
  return Math.floor(index / perWeek) === 0 ? 'a' : 'b';
}

export function normalize(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') return base;

  const users = (Array.isArray(raw.users) ? raw.users : base.users)
    .map((u) => {
      if (!u || typeof u.id !== 'string' || !u.id.trim()) return null;
      return {
        id: u.id.trim().toLowerCase(),
        firstName: typeof u.firstName === 'string' ? u.firstName : '',
        lastName: typeof u.lastName === 'string' ? u.lastName : '',
        pin: typeof u.pin === 'string' ? u.pin : '',
        createdAt: u.createdAt || null,
      };
    })
    .filter(Boolean);

  // The admin account must always exist or nobody can reach the admin tab.
  if (!users.some((u) => u.id === ADMIN_USER)) {
    users.push(base.users.find((u) => u.id === ADMIN_USER));
  }

  const userIds = new Set(users.map((u) => u.id));
  const groups = asList(raw.groups && (Array.isArray(raw.groups) || typeof raw.groups === 'object') ? raw.groups : base.groups)
    .map((g, i) => {
      if (!g || typeof g.id !== 'string' || !g.label) return null;
      return {
        id: g.id,
        label: String(g.label).slice(0, 40),
        members: asList(g.members).filter((m) => userIds.has(m)),
        color: typeof g.color === 'string' ? g.color : base.groups[i % base.groups.length].color,
        towels: isTowelMode(g.towels) ? g.towels : null,
        archived: g.archived === true,
      };
    })
    .filter(Boolean);

  // Data saved before towels were a per group setting has no value yet. Fill
  // it in from what the old automatic rotation would have done.
  const inUse = groups.filter((g) => !g.archived);
  groups.forEach((g) => {
    if (g.towels !== null) return;
    g.towels = g.archived ? 'off' : legacyTowelMode(inUse.indexOf(g), inUse.length);
  });

  // An archived group holds no recurring day, no members and no towel duty,
  // but stays so its one off bookings keep their name and colour.
  groups.forEach((g) => {
    if (g.archived) {
      g.members = [];
      g.towels = 'off';
    }
  });

  const groupIds = new Set(groups.map((g) => g.id));
  const activeIds = new Set(inUse.map((g) => g.id));

  const rotation = rotationSlots(raw.rotation === undefined || raw.rotation === null ? base.rotation : raw.rotation).map(
    (v) => (typeof v === 'string' && activeIds.has(v) ? v : null)
  );

  const overrides = {};
  Object.entries(raw.overrides && typeof raw.overrides === 'object' ? raw.overrides : {}).forEach(
    ([key, value]) => {
      if (!isValidKey(key) || !value || typeof value !== 'object') return;
      const entry = {};
      if (Array.isArray(value.bookings)) {
        entry.bookings = value.bookings.map((b) => sanitizeBooking(b, groupIds)).filter(Boolean);
      }
      if (value.blocked === true) entry.blocked = true;
      if (value.cleared === true) entry.cleared = true;
      if (value.towels && typeof value.towels === 'object') {
        const towels = {};
        Object.entries(value.towels).forEach(([groupId, on]) => {
          if (groupIds.has(groupId) && typeof on === 'boolean') towels[groupId] = on;
        });
        if (Object.keys(towels).length > 0) entry.towels = towels;
      }
      if (Object.keys(entry).length > 0) overrides[key] = entry;
    }
  );

  const log = (Array.isArray(raw.log) ? raw.log : [])
    .filter((e) => e && typeof e === 'object' && e.action)
    .slice(0, MAX_LOG)
    .map((e) => ({
      id: String(e.id || Math.random()),
      at: e.at || new Date().toISOString(),
      actorId: typeof e.actorId === 'string' ? e.actorId : 'unknown',
      action: String(e.action).slice(0, 40),
      detail: typeof e.detail === 'string' ? e.detail.slice(0, 240) : '',
    }));

  const s = raw.settings && typeof raw.settings === 'object' ? raw.settings : {};
  const scale = Number(s.textScale);

  return {
    version: SCHEMA_VERSION,
    users,
    groups,
    rotation,
    overrides,
    log,
    settings: {
      towelRotation: s.towelRotation !== false,
      householdName:
        typeof s.householdName === 'string' && s.householdName.trim()
          ? s.householdName.trim().slice(0, 40)
          : base.settings.householdName,
      // A theme that has since been retired falls back to the default.
      theme: typeof s.theme === 'string' && THEMES[s.theme] ? s.theme : DEFAULT_THEME,
      textScale: Number.isFinite(scale) && scale >= 0.85 && scale <= 1.5 ? scale : 1,
      highContrast: s.highContrast === true,
      reduceMotion: s.reduceMotion === true,
    },
  };
}

/* ---- Persistence --------------------------------------------------------- */

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch {
    // Corrupt record. A clean install beats a blank screen.
  }
  return defaultState();
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(userId) {
  try {
    if (userId) localStorage.setItem(SESSION_KEY, JSON.stringify({ userId }));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // Private browsing. They sign in again next visit.
  }
}

/* ---- Helpers ------------------------------------------------------------- */

function ok(state, message, type = 'success') {
  return { state, result: { ok: true, message, type } };
}
function fail(state, message) {
  return { state, result: { ok: false, message, type: 'error' } };
}

/** Appends to the activity history the admin tab reads. */
function logged(state, actorId, action, detail) {
  const entry = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    actorId,
    action,
    detail,
  };
  return { ...state, log: [entry, ...state.log].slice(0, MAX_LOG) };
}

function setBookings(state, key, bookings) {
  const overrides = { ...state.overrides };
  const prev = overrides[key] || {};
  if (bookings.length === 0) {
    overrides[key] = { ...prev, bookings: [], cleared: true };
  } else {
    overrides[key] = { ...prev, bookings, cleared: false };
  }
  delete overrides[key].blocked;
  return { ...state, overrides };
}

export function userLabel(state, userId) {
  const user = state.users.find((u) => u.id === userId);
  if (!user) return userId;
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.id;
}

/* ---- Booking ------------------------------------------------------------- */

/**
 * Places a booking on a day, resolving any conflict.
 *
 * `mode` decides what happens to whoever is already there:
 *   'free'    nothing was in the way
 *   'replace' the incoming group takes the time, splitting or trimming the
 *             existing booking as needed
 *   'swap'    same as replace, and the displaced group is given the
 *             incoming group's chosen day in exchange
 *
 * `acknowledged` must be true for anything that displaces someone. The UI
 * sets it only after the person confirms they have permission.
 */
export function isAdminId(actorId) {
  return actorId === ADMIN_USER;
}

export function book(state, { key, groupId, start, end, actorId, mode = 'free', acknowledged = false, swapWith = null }) {
  // The admin has full control: past days, anyone's time, no permission step.
  const admin = isAdminId(actorId);
  if (!isValidKey(key)) return fail(state, 'That date is not valid.');
  const day = resolveDay(state, key);
  if (!day) return fail(state, 'That date is not valid.');
  if (day.blocked) return fail(state, 'That day is blocked. Unblock it first.');
  if (day.isPast && !admin) return fail(state, 'That day has already passed.');
  if (!findGroup(state, groupId)) return fail(state, 'That user no longer exists.');
  if (end - start <= 0) return fail(state, 'The end time has to be after the start time.');

  const current = bookingsOf(state, key);
  const incoming = { id: newBookingId(), groupId, start, end, note: '' };
  const clashes = conflictsFor(current, incoming);

  if (clashes.length > 0 && !acknowledged && !admin) {
    return fail(state, 'Confirm you have their permission before taking this time.');
  }
  if (!admin && clashes.some((c) => c.groupId === groupId)) {
    return fail(state, 'That group already has overlapping time on this day.');
  }

  const { bookings, displaced, didSplit } = applyBooking(current, incoming);
  let next = setBookings(state, key, bookings);

  const label = groupLabel(state, groupId);
  const displacedLabels = [...new Set(displaced.map((d) => groupLabel(state, d.booking.groupId)))];

  if (mode === 'swap') {
    if (!swapWith || !isValidKey(swapWith.key)) {
      return fail(state, 'Pick one of your days to give in exchange.');
    }
    const otherGroupId = displaced[0]?.booking.groupId;
    if (!otherGroupId) return fail(state, 'There is nobody to swap with on that day.');

    const swapDay = resolveDay(next, swapWith.key);
    if (!swapDay || (swapDay.isPast && !admin) || swapDay.blocked) {
      return fail(state, 'That day is not available to give away.');
    }
    const swapCurrent = bookingsOf(next, swapWith.key);
    const mine = swapCurrent.find((b) => b.id === swapWith.bookingId || b.groupId === groupId);
    if (!mine) return fail(state, `${label} does not have a booking on the day offered.`);

    const handover = { ...mine, id: newBookingId(), groupId: otherGroupId };
    const applied = applyBooking(
      swapCurrent.filter((b) => b.id !== mine.id),
      handover
    );
    next = setBookings(next, swapWith.key, applied.bookings);
    next = logged(
      next,
      actorId,
      'swap',
      `${label} took ${formatSlot(incoming)} on ${key} from ${displacedLabels.join(', ')} and gave them ${swapWith.key}`
    );
    return ok(next, `Swapped. ${displacedLabels.join(', ')} now has ${swapWith.key}.`);
  }

  if (displaced.length > 0) {
    next = logged(
      next,
      actorId,
      'replace',
      `${label} took ${formatSlot(incoming)} on ${key} from ${displacedLabels.join(', ')}${didSplit ? ' (their time was split around it)' : ''}`
    );
    return ok(
      next,
      didSplit
        ? `Booked. ${displacedLabels.join(', ')} keeps the time either side.`
        : `Booked. ${displacedLabels.join(', ')} was removed from that time.`
    );
  }

  next = logged(next, actorId, 'book', `${label} booked ${formatSlot(incoming)} on ${key}`);
  return ok(next, admin ? `${label} booked.` : 'Booked.');
}

export function removeBooking(state, key, bookingId, actorId) {
  const current = bookingsOf(state, key);
  const target = current.find((b) => b.id === bookingId);
  if (!target) return fail(state, 'That booking is gone.');
  const next = setBookings(state, key, current.filter((b) => b.id !== bookingId));
  return ok(
    logged(next, actorId, 'remove', `${groupLabel(state, target.groupId)} removed from ${key}`),
    'Removed.'
  );
}

export function editBooking(state, key, bookingId, patch, actorId) {
  const current = bookingsOf(state, key);
  const target = current.find((b) => b.id === bookingId);
  if (!target) return fail(state, 'That booking is gone.');
  const updated = { ...target, ...patch };
  if (!findGroup(state, updated.groupId)) return fail(state, 'That user no longer exists.');
  if (updated.end - updated.start <= 0) {
    return fail(state, 'The end time has to be after the start time.');
  }
  const { bookings } = applyBooking(
    current.filter((b) => b.id !== bookingId),
    updated
  );
  const next = setBookings(state, key, bookings);
  const changes = [];
  if (updated.groupId !== target.groupId) {
    changes.push(`moved from ${groupLabel(state, target.groupId)} to ${groupLabel(state, updated.groupId)}`);
  }
  if (updated.start !== target.start || updated.end !== target.end) {
    changes.push(`time changed to ${formatSlot(updated)}`);
  }
  const detail = changes.length
    ? `${groupLabel(state, updated.groupId)} on ${key}: ${changes.join(', ')}`
    : `${groupLabel(state, updated.groupId)} on ${key} saved without changes`;
  return ok(logged(next, actorId, 'edit', detail), 'Updated.');
}

/**
 * Admin only. Switches the towel badge on or off for one group on one date.
 * Choosing what the rotation would have said anyway drops the override, so
 * the date quietly follows the rotation again.
 */
export function setTowels(state, key, groupId, on, actorId) {
  if (!isAdminId(actorId)) return fail(state, 'Only the admin can change towel duty.');
  if (!isValidKey(key)) return fail(state, 'That date is not valid.');
  if (!findGroup(state, groupId)) return fail(state, 'That user no longer exists.');

  const overrides = { ...state.overrides };
  const prev = { ...(overrides[key] || {}) };
  const towels = { ...(prev.towels || {}) };
  if (Boolean(on) === autoTowels(state, key, groupId)) delete towels[groupId];
  else towels[groupId] = Boolean(on);

  if (Object.keys(towels).length > 0) prev.towels = towels;
  else delete prev.towels;

  if (Object.keys(prev).length > 0) overrides[key] = prev;
  else delete overrides[key];

  const label = groupLabel(state, groupId);
  const next = logged(
    { ...state, overrides },
    actorId,
    on ? 'towels-on' : 'towels-off',
    `${label} towels ${on ? 'on' : 'off'} for ${key}`
  );
  return ok(next, on ? `Towels on for ${label}.` : `Towels off for ${label}.`);
}

/** Blocking hides the day. Unblocking leaves it open, not back on rotation. */
export function setBlocked(state, key, blocked, actorId) {
  if (!isValidKey(key)) return fail(state, 'That date is not valid.');
  const overrides = { ...state.overrides };
  const prev = overrides[key] || {};
  if (blocked) {
    overrides[key] = { ...prev, blocked: true, bookings: [], cleared: true };
  } else {
    const { blocked: _drop, ...rest } = prev;
    // Stays cleared on purpose: an unblocked day is open for anyone.
    overrides[key] = { ...rest, bookings: [], cleared: true };
  }
  const next = { ...state, overrides };
  return ok(
    logged(next, actorId, blocked ? 'block' : 'unblock', `${key} ${blocked ? 'blocked' : 'unblocked and left open'}`),
    blocked ? 'Day blocked.' : 'Day unblocked and left open.'
  );
}

/** Puts a day back on the recurring rotation. */
export function resetDay(state, key, actorId) {
  const overrides = { ...state.overrides };
  delete overrides[key];
  const next = { ...state, overrides };
  return ok(logged(next, actorId, 'reset', `${key} reset to the recurring schedule`), 'Back on the recurring schedule.');
}

/* ---- Groups (admin only) --------------------------------------------------
   One panel in Admin controls everything about how a group shows up: its
   name, its calendar colour, which weekday it auto books, its towel duty,
   and who its members are. Dismantling a group never touches any booking
   that is already on the calendar, only its recurring weekday going forward.
   ---------------------------------------------------------------------- */

function newGroupId(state) {
  const used = new Set(state.groups.map((g) => g.id));
  let n = state.groups.length + 1;
  let id = `group-${n}`;
  while (used.has(id)) {
    n += 1;
    id = `group-${n}`;
  }
  return id;
}

/**
 * Creates a group out of one or more users who are not already in another
 * active group. Starts with no recurring day and towels off; the admin sets
 * those afterward the same way as for any other group.
 */
export function createGroup(state, { label, members, color }, actorId) {
  if (!isAdminId(actorId)) return fail(state, 'Only the admin can create groups.');
  const name = (label || '').trim();
  if (!name) return fail(state, 'Give the group a name.');
  const ids = [...new Set((members || []).filter((m) => state.users.some((u) => u.id === m)))];
  if (ids.length === 0) return fail(state, 'Pick at least one person for the group.');
  const taken = ids.filter((m) => groupForUser(state, m));
  if (taken.length > 0) {
    return fail(state, `${taken.map((m) => userLabel(state, m)).join(', ')} ${taken.length > 1 ? 'are' : 'is'} already in a group.`);
  }
  const group = {
    id: newGroupId(state),
    label: name.slice(0, 40),
    members: ids,
    color: color || '#0a84ff',
    towels: 'off',
    archived: false,
  };
  const next = logged({ ...state, groups: [...state.groups, group] }, actorId, 'group-create', `Created group ${group.label}`);
  return ok(next, `${group.label} created.`);
}

/** Renames a group, or changes its calendar colour, or both. */
export function updateGroup(state, groupId, patch, actorId) {
  if (!isAdminId(actorId)) return fail(state, 'Only the admin can edit groups.');
  const group = findGroup(state, groupId);
  if (!group || group.archived) return fail(state, 'That group no longer exists.');
  const label = patch.label !== undefined ? String(patch.label).trim().slice(0, 40) : group.label;
  if (!label) return fail(state, 'A group needs a name.');
  const color = patch.color !== undefined ? patch.color : group.color;
  const groups = state.groups.map((g) => (g.id === groupId ? { ...g, label, color } : g));
  const next = logged({ ...state, groups }, actorId, 'group-edit', `${group.label} updated`);
  return ok(next, 'Saved.');
}

/** Sets a group's towel duty mode: off, weekly, or alternating A/B. */
export function setGroupTowels(state, groupId, towels, actorId) {
  if (!isAdminId(actorId)) return fail(state, 'Only the admin can change towel duty.');
  if (!isTowelMode(towels)) return fail(state, 'That is not a valid towel setting.');
  const group = findGroup(state, groupId);
  if (!group || group.archived) return fail(state, 'That group no longer exists.');
  const groups = state.groups.map((g) => (g.id === groupId ? { ...g, towels } : g));
  const label = TOWEL_MODES.find((m) => m.value === towels)?.label || towels;
  const next = logged({ ...state, groups }, actorId, 'group-towels', `${group.label} towel duty set to ${label}`);
  return ok(next, 'Saved.');
}

/**
 * Sets which weekday a group auto books, 0 (Sunday) through 6 (Saturday), or
 * null for no recurring day. If another group already has that day, the two
 * groups trade: the other group takes whatever day (or none) this group had.
 */
export function setGroupDay(state, groupId, dow, actorId) {
  if (!isAdminId(actorId)) return fail(state, 'Only the admin can change the recurring schedule.');
  const group = findGroup(state, groupId);
  if (!group || group.archived) return fail(state, 'That group no longer exists.');
  if (dow !== null && (!Number.isInteger(dow) || dow < 0 || dow > 6)) {
    return fail(state, 'That is not a valid day.');
  }

  const rotation = [...state.rotation];
  const previousDow = rotation.findIndex((g) => g === groupId);
  const holder = dow !== null ? rotation[dow] : null;

  if (previousDow >= 0) rotation[previousDow] = null;
  if (dow !== null) rotation[dow] = groupId;
  if (holder && holder !== groupId && previousDow >= 0) rotation[previousDow] = holder;

  const DOW_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const detail =
    dow === null
      ? `${group.label} recurring day removed`
      : holder && holder !== groupId
        ? `${group.label} moved to ${DOW_NAMES[dow]}, swapped with ${groupLabel(state, holder)}`
        : `${group.label} recurring day set to ${DOW_NAMES[dow]}`;

  const next = logged({ ...state, rotation }, actorId, 'group-day', detail);
  return ok(next, 'Saved.');
}

/**
 * Moves a person into a group, taking them out of whatever active group they
 * were in first. Does not touch any booking already on the calendar.
 */
export function setUserGroup(state, userId, groupId, actorId) {
  if (!isAdminId(actorId)) return fail(state, 'Only the admin can move people between groups.');
  if (!state.users.some((u) => u.id === userId)) return fail(state, 'That user does not exist.');
  const target = groupId ? findGroup(state, groupId) : null;
  if (groupId && (!target || target.archived)) return fail(state, 'That group no longer exists.');

  const groups = state.groups.map((g) => {
    if (g.archived) return g;
    const members = g.members.filter((m) => m !== userId);
    if (g.id === groupId) members.push(userId);
    return { ...g, members };
  });

  const detail = target
    ? `${userLabel(state, userId)} moved to ${target.label}`
    : `${userLabel(state, userId)} removed from their group`;
  const next = logged({ ...state, groups }, actorId, 'group-member', detail);
  return ok(next, 'Saved.');
}

/**
 * Dismantles a group: it stops appearing in pickers, its recurring day opens
 * up, and its members become unassigned. Every booking that already exists,
 * including one off bookings and past history, is left exactly as it was;
 * the group record itself stays (marked archived) so those bookings keep
 * showing its name and colour instead of turning into "Unassigned".
 */
export function dismantleGroup(state, groupId, actorId) {
  if (!isAdminId(actorId)) return fail(state, 'Only the admin can dismantle a group.');
  const group = findGroup(state, groupId);
  if (!group || group.archived) return fail(state, 'That group no longer exists.');

  const groups = state.groups.map((g) =>
    g.id === groupId ? { ...g, members: [], towels: 'off', archived: true } : g
  );
  const rotation = state.rotation.map((g) => (g === groupId ? null : g));

  const next = logged({ ...state, groups, rotation }, actorId, 'group-dismantle', `${group.label} dismantled`);
  return ok(next, `${group.label} dismantled. Existing bookings are unchanged.`);
}

/* ---- Accounts ------------------------------------------------------------ */

export function signUp(state, { id, firstName, lastName, pin }) {
  const username = (id || '').trim().toLowerCase();
  if (!/^[a-z0-9]{3,20}$/.test(username)) {
    return fail(state, 'Usernames are 3 to 20 letters or numbers.');
  }
  if (!firstName.trim()) return fail(state, 'Enter your first name.');
  if (!/^\d{4}$/.test(pin)) return fail(state, 'Your PIN needs to be 4 digits.');

  const existing = state.users.find((u) => u.id === username);
  if (existing && existing.pin) return fail(state, 'That username is taken.');

  const record = {
    id: username,
    firstName: firstName.trim(),
    lastName: (lastName || '').trim(),
    pin,
    createdAt: new Date().toISOString(),
  };
  const users = existing
    ? state.users.map((u) => (u.id === username ? { ...u, ...record } : u))
    : [...state.users, record];

  const next = logged({ ...state, users }, username, 'signup', `${record.firstName} registered as ${username}`);
  return ok(next, `Welcome, ${record.firstName}.`);
}

export function resetPin(state, userId, pin) {
  if (!/^\d{4}$/.test(pin)) return fail(state, 'Your PIN needs to be 4 digits.');
  const user = state.users.find((u) => u.id === userId);
  if (!user) return fail(state, 'That account does not exist.');
  const next = logged(
    { ...state, users: state.users.map((u) => (u.id === userId ? { ...u, pin } : u)) },
    userId,
    'pin-reset',
    'PIN reset'
  );
  return ok(next, 'PIN updated.');
}

export function recordSignIn(state, userId) {
  return logged(state, userId, 'signin', 'Signed in');
}

/* ---- Settings ------------------------------------------------------------ */

export function updateSettings(state, patch) {
  return ok({ ...state, settings: { ...state.settings, ...patch } }, 'Saved.');
}

export function clearLog(state, actorId) {
  return ok(logged({ ...state, log: [] }, actorId, 'clear-log', 'History cleared'), 'History cleared.');
}

export { todayKey };
