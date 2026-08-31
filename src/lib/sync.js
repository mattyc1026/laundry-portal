/* ==========================================================================
   Realtime sync

   One listener on the portal subtree keeps every signed-in device current.
   Writes are path scoped by diffState, so two people working at the same
   time only collide if they touch the same date, and even then the day write
   runs as a transaction that merges non overlapping bookings.
   ========================================================================== */

import {
  onValue,
  ref,
  runTransaction,
  update,
  serverTimestamp,
  onDisconnect,
  set,
} from 'firebase/database';
import { database, ROOT } from './firebase.js';
import { diffState, isEmptyDiff, mergeDay, stateFromSnapshot } from './sync-diff.js';
import { normalize } from './store.js';

/**
 * Subscribes to the whole portal plus this account's personal preferences.
 * Calls onState with fully normalised state every time anything changes.
 * Returns an unsubscribe function.
 */
export function subscribePortal({ userId, fallback, onState, onStatus }) {
  const db = database();
  if (!db) {
    onStatus?.('offline');
    return () => {};
  }

  let shared = null;
  let personal = {};

  const emit = () => {
    if (shared === null) return;
    onState(normalize(stateFromSnapshot(shared, fallback, personal)));
  };

  const stopShared = onValue(
    ref(db, ROOT),
    (snap) => {
      shared = snap.val() || {};
      onStatus?.('online');
      emit();
    },
    (error) => {
      console.error('Sync read failed', error);
      onStatus?.('error');
    }
  );

  const stopPersonal = userId
    ? onValue(ref(db, `${ROOT}/prefs/${userId}`), (snap) => {
        personal = snap.val() || {};
        emit();
      })
    : () => {};

  // Connection state drives the indicator in the header.
  const stopInfo = onValue(ref(db, '.info/connected'), (snap) => {
    onStatus?.(snap.val() ? 'online' : 'connecting');
  });

  return () => {
    stopShared();
    stopPersonal();
    stopInfo();
  };
}

/**
 * Writes only what changed.
 *
 * Day paths are split out and written as transactions so a booking landing
 * at the same moment as someone else's on the same date merges rather than
 * clobbers. Everything else goes in one atomic multi-location update.
 */
export async function pushChanges(prev, next, actorId) {
  const db = database();
  if (!db) return { ok: false, reason: 'offline' };

  const updates = diffState(prev, next, actorId);
  if (isEmptyDiff(updates)) return { ok: true, wrote: 0 };

  const dayPaths = Object.keys(updates).filter((p) => p.startsWith('overrides/'));
  const rest = {};
  Object.entries(updates).forEach(([path, value]) => {
    if (!path.startsWith('overrides/')) rest[path] = value;
  });

  try {
    await Promise.all(
      dayPaths.map((path) =>
        runTransaction(ref(db, `${ROOT}/${path}`), (remote) => {
          const local = updates[path];
          if (local === null) return null; // a deliberate clear wins
          return mergeDay(remote, local);
        })
      )
    );

    if (Object.keys(rest).length > 0) {
      await update(ref(db, ROOT), rest);
    }
    return { ok: true, wrote: Object.keys(updates).length };
  } catch (error) {
    console.error('Sync write failed', error);
    return { ok: false, reason: error?.message || 'write failed' };
  }
}

/** Marks who is currently in the portal, cleared automatically on disconnect. */
export function trackPresence(userId) {
  const db = database();
  if (!db || !userId) return () => {};
  const here = ref(db, `${ROOT}/presence/${userId}`);
  try {
    onDisconnect(here).remove();
    set(here, { at: serverTimestamp() });
  } catch (error) {
    console.error('Presence failed', error);
  }
  return () => {
    try {
      set(here, null);
    } catch {
      // Nothing useful to do if the socket has already gone.
    }
  };
}

/** One time upload of local data into an empty database. */
export async function seedIfEmpty(state) {
  const db = database();
  if (!db) return false;
  const { get } = await import('firebase/database');
  const snap = await get(ref(db, ROOT));
  if (snap.exists()) return false;
  const users = {};
  state.users.forEach((u) => {
    users[u.id] = u;
  });
  await update(ref(db, ROOT), {
    users,
    groups: state.groups,
    rotation: state.rotation,
    overrides: state.overrides,
    'settings/towelRotation': state.settings.towelRotation,
    'settings/householdName': state.settings.householdName,
  });
  return true;
}
