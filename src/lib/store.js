/* ==========================================================================
   Store

   One versioned localStorage record. Every state transition is a pure
   function taking state and returning { state, result }, so a rule is
   written once and cannot drift between the calendar, the day sheet and the
   admin view.

   Note on PINs: they are stored as entered. The portal holds a laundry
   schedule and nothing else, and that is a deliberate call by the household
   rather than an oversight.
   ========================================================================== */

import { isValidKey, todayKey } from './date.js';
import { applyBooking, conflictsFor, DAY_END, DAY_START, formatSlot } from './time.js';
import {
  bookingsOf,
  findGroup,
  groupLabel,
  newBookingId,
  resolveDay,
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
      { id: 'malakai', label: 'MALAKAI', members: ['malakail'], color: '#ff375f' },
      { id: 'scott-starla', label: 'SCOTT + STARLA', members: ['scottc', 'starlac'], color: '#c8b400' },
      { id: 'alyssa-josiah', label: 'ALYSSA + JOSIAH', members: ['alyssac'], color: '#30d158' },
      { id: 'matthew-michael', label: 'MATTHEW + MICHAEL', members: ['matthewc', 'miker'], color: '#00b8c4' },
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
  const groups = (Array.isArray(raw.groups) ? raw.groups : base.groups)
    .map((g, i) => {
      if (!g || typeof g.id !== 'string' || !g.label) return null;
      return {
        id: g.id,
        label: String(g.label).slice(0, 40),
        members: (Array.isArray(g.members) ? g.members : []).filter((m) => userIds.has(m)),
        color: typeof g.color === 'string' ? g.color : base.groups[i % base.groups.length].color,
      };
    })
    .filter(Boolean);

  const groupIds = new Set(groups.map((g) => g.id));

  const rotation = Array.from({ length: 7 }, (_, i) => {
    const v = Array.isArray(raw.rotation) ? raw.rotation[i] : base.rotation[i];
    return typeof v === 'string' && groupIds.has(v) ? v : null;
  });

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
      theme: typeof s.theme === 'string' ? s.theme : base.settings.theme,
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
export function book(state, { key, groupId, start, end, actorId, mode = 'free', acknowledged = false, swapWith = null }) {
  if (!isValidKey(key)) return fail(state, 'That date is not valid.');
  const day = resolveDay(state, key);
  if (!day) return fail(state, 'That date is not valid.');
  if (day.blocked) return fail(state, 'That day is blocked.');
  if (day.isPast) return fail(state, 'That day has already passed.');
  if (!findGroup(state, groupId)) return fail(state, 'That household entry no longer exists.');
  if (end - start <= 0) return fail(state, 'The end time has to be after the start time.');

  const current = bookingsOf(state, key);
  const incoming = { id: newBookingId(), groupId, start, end, note: '' };
  const clashes = conflictsFor(current, incoming);

  if (clashes.length > 0 && !acknowledged) {
    return fail(state, 'Confirm you have their permission before taking this time.');
  }
  if (clashes.some((c) => c.groupId === groupId)) {
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
    if (!swapDay || swapDay.isPast || swapDay.blocked) {
      return fail(state, 'That day is not available to give away.');
    }
    const swapCurrent = bookingsOf(next, swapWith.key);
    const mine = swapCurrent.find((b) => b.id === swapWith.bookingId || b.groupId === groupId);
    if (!mine) return fail(state, 'You do not have a booking on the day you offered.');

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
  return ok(next, 'Booked.');
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
  if (updated.end - updated.start <= 0) {
    return fail(state, 'The end time has to be after the start time.');
  }
  const { bookings } = applyBooking(
    current.filter((b) => b.id !== bookingId),
    updated
  );
  const next = setBookings(state, key, bookings);
  return ok(
    logged(next, actorId, 'edit', `${groupLabel(state, updated.groupId)} time changed on ${key}`),
    'Updated.'
  );
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
