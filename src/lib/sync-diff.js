/* ==========================================================================
   Sync diffing

   The whole point of this module is that two people using the portal at the
   same time must not overwrite each other.

   Writing the entire state object on every change would mean last writer
   wins across the board: Malakai booking Tuesday would wipe out Alyssa
   booking Friday if their writes landed together. So instead every change is
   reduced to the narrowest set of database paths that actually changed, and
   only those are written.

   The output is a flat map of path to value, which is exactly the shape
   Realtime Database multi-location update() takes. A value of null deletes
   that path.

   This file is deliberately free of any Firebase import so the logic can be
   tested on plain node.
   ========================================================================== */

/** Fields that live per account rather than being shared by everyone. */
export const PERSONAL_SETTINGS = ['theme', 'textScale', 'highContrast', 'reduceMotion'];

/** Fields everyone shares. */
export const SHARED_SETTINGS = ['towelRotation', 'householdName'];

function shallowEqual(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => JSON.stringify(a[k]) === JSON.stringify(b[k]));
}

function deepEqual(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/**
 * Produces the update map for going from `prev` to `next`.
 *
 * `actorId` scopes personal settings so one person changing their theme does
 * not push it onto everyone else's devices.
 */
export function diffState(prev, next, actorId) {
  const updates = {};

  /* ---- Users, one path each ------------------------------------------- */
  const prevUsers = new Map((prev.users || []).map((u) => [u.id, u]));
  const nextUsers = new Map((next.users || []).map((u) => [u.id, u]));

  nextUsers.forEach((user, id) => {
    if (!deepEqual(prevUsers.get(id), user)) updates[`users/${id}`] = user;
  });
  prevUsers.forEach((_user, id) => {
    if (!nextUsers.has(id)) updates[`users/${id}`] = null;
  });

  /* ---- Days, one path each. This is the important one ------------------ */
  const prevDays = prev.overrides || {};
  const nextDays = next.overrides || {};

  Object.keys(nextDays).forEach((key) => {
    if (!deepEqual(prevDays[key], nextDays[key])) {
      updates[`overrides/${key}`] = nextDays[key];
    }
  });
  Object.keys(prevDays).forEach((key) => {
    if (!(key in nextDays)) updates[`overrides/${key}`] = null;
  });

  /* ---- Shared structures ----------------------------------------------- */
  if (!deepEqual(prev.rotation, next.rotation)) updates.rotation = next.rotation;
  if (!deepEqual(prev.groups, next.groups)) updates.groups = next.groups;

  SHARED_SETTINGS.forEach((field) => {
    if (prev.settings?.[field] !== next.settings?.[field]) {
      updates[`settings/${field}`] = next.settings[field];
    }
  });

  /* ---- Personal settings, scoped to the signed-in account -------------- */
  if (actorId) {
    const changed = {};
    PERSONAL_SETTINGS.forEach((field) => {
      if (prev.settings?.[field] !== next.settings?.[field]) {
        changed[field] = next.settings[field];
      }
    });
    Object.entries(changed).forEach(([field, value]) => {
      updates[`prefs/${actorId}/${field}`] = value;
    });
  }

  /* ---- Log entries are append only ------------------------------------- */
  const prevIds = new Set((prev.log || []).map((e) => e.id));
  (next.log || [])
    .filter((entry) => !prevIds.has(entry.id))
    .forEach((entry) => {
      updates[`log/${entry.id}`] = entry;
    });

  return updates;
}

/**
 * Rebuilds app state from a raw database snapshot.
 *
 * `personal` comes from prefs/{userId} and is layered over the shared
 * settings, so a theme follows the account across devices without leaking
 * onto anyone else's.
 */
export function stateFromSnapshot(snapshot, fallback, personal = {}) {
  const raw = snapshot || {};
  return {
    ...fallback,
    users: raw.users ? Object.values(raw.users) : fallback.users,
    groups: raw.groups || fallback.groups,
    rotation: raw.rotation || fallback.rotation,
    overrides: raw.overrides || {},
    log: raw.log
      ? Object.values(raw.log).sort((a, b) => String(b.at).localeCompare(String(a.at)))
      : [],
    settings: {
      ...fallback.settings,
      ...(raw.settings || {}),
      ...personal,
    },
  };
}

/**
 * Merges a remote day into a local one when both changed at once.
 *
 * Used inside the database transaction that writes a day. Bookings are keyed
 * by id, so two people adding different slots to the same date both survive.
 * A genuine overlap is resolved in favour of the write that arrives second,
 * which is the one the person is watching happen.
 */
export function mergeDay(remote, local) {
  if (!remote) return local;
  if (!local) return remote;
  if (local.blocked || remote.blocked) {
    return { ...local, blocked: Boolean(local.blocked) };
  }

  const remoteBookings = remote.bookings || [];
  const localBookings = local.bookings || [];
  const localIds = new Set(localBookings.map((b) => b.id));

  // Anything the remote has that we never saw and that does not collide with
  // what we just wrote is kept.
  const survivors = remoteBookings.filter(
    (r) =>
      !localIds.has(r.id) &&
      !localBookings.some((l) => l.start < r.end && r.start < l.end)
  );

  return {
    ...local,
    bookings: [...survivors, ...localBookings].sort((a, b) => a.start - b.start),
  };
}

export function isEmptyDiff(updates) {
  return Object.keys(updates).length === 0;
}

/**
 * Reconciles the seeded user accounts against the database.
 *
 * seedIfEmpty only ever fires on a completely empty tree, so a database
 * seeded by an earlier build keeps whatever it was given first, even after
 * the defaults are corrected. That is how accounts ended up in the portal
 * with no PIN.
 *
 * This fills in any user account the database is missing or that has no
 * usable PIN. An account with a PIN already set is never touched, so nobody
 * who has changed theirs gets reset back to the default.
 */
export function seedAccountUpdates(remoteUsers, defaults) {
  const updates = {};
  const fixed = [];
  const remote = remoteUsers && typeof remoteUsers === 'object' ? remoteUsers : {};

  defaults.forEach((user) => {
    const existing = remote[user.id];
    const hasPin = existing && typeof existing.pin === 'string' && /^\d{4}$/.test(existing.pin);
    if (hasPin) return;
    updates[`users/${user.id}`] = { ...existing, ...user };
    fixed.push(user.id);
  });

  return { updates, fixed };
}
