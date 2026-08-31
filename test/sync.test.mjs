import assert from 'node:assert/strict';
import test from 'node:test';

import { diffState, mergeDay, stateFromSnapshot, isEmptyDiff } from '../src/lib/sync-diff.js';
import { book, defaultState, resetPin, updateSettings } from '../src/lib/store.js';
import { toKey } from '../src/lib/date.js';

function future(dow, minAhead = 3) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + minAhead);
  while (d.getDay() !== dow) d.setDate(d.getDate() + 1);
  return toKey(d);
}

test('an unchanged state produces no writes at all', () => {
  const s = defaultState();
  assert.equal(isEmptyDiff(diffState(s, s, 'matthewc')), true);
});

test('booking one day writes only that day', () => {
  const prev = defaultState();
  const monday = future(1);
  const next = book(prev, {
    key: monday, groupId: 'malakai', start: 540, end: 720, actorId: 'malakail',
  }).state;

  const updates = diffState(prev, next, 'malakail');
  const paths = Object.keys(updates);

  assert.ok(paths.includes(`overrides/${monday}`), 'writes the booked day');
  assert.equal(
    paths.filter((p) => p.startsWith('overrides/')).length,
    1,
    'and no other day is touched'
  );
  assert.ok(paths.some((p) => p.startsWith('log/')), 'plus the log entry');
  assert.ok(!paths.includes('rotation'), 'rotation is untouched');
  assert.ok(!paths.includes('groups'));
});

test('two people booking different days do not overlap writes', () => {
  const base = defaultState();
  const monday = future(1);
  const tuesday = future(2);

  const aliceState = book(base, {
    key: monday, groupId: 'malakai', start: 0, end: 1440, actorId: 'malakail',
  }).state;
  const bobState = book(base, {
    key: tuesday, groupId: 'scott-starla', start: 0, end: 1440, actorId: 'scottc',
  }).state;

  const aliceWrites = Object.keys(diffState(base, aliceState, 'malakail'))
    .filter((p) => p.startsWith('overrides/'));
  const bobWrites = Object.keys(diffState(base, bobState, 'scottc'))
    .filter((p) => p.startsWith('overrides/'));

  assert.deepEqual(aliceWrites, [`overrides/${monday}`]);
  assert.deepEqual(bobWrites, [`overrides/${tuesday}`]);
  const shared = aliceWrites.filter((p) => bobWrites.includes(p));
  assert.equal(shared.length, 0, 'no shared path means neither can clobber the other');
});

test('a theme change is personal and never written to the shared tree', () => {
  const prev = defaultState();
  const next = updateSettings(prev, { theme: 'cyberpunk' }).state;
  const updates = diffState(prev, next, 'matthewc');

  assert.deepEqual(Object.keys(updates), ['prefs/matthewc/theme']);
  assert.equal(updates['prefs/matthewc/theme'], 'cyberpunk');
  assert.ok(!('settings/theme' in updates), 'must not push a theme onto everyone');
});

test('a household setting is shared, not personal', () => {
  const prev = defaultState();
  const next = updateSettings(prev, { towelRotation: false }).state;
  const updates = diffState(prev, next, 'matthewc');
  assert.equal(updates['settings/towelRotation'], false);
  assert.ok(!Object.keys(updates).some((p) => p.startsWith('prefs/')));
});

test('a PIN change writes only that user', () => {
  const prev = defaultState();
  const next = resetPin(prev, 'malakail', '2468').state;
  const updates = diffState(prev, next, 'malakail');
  assert.equal(updates['users/malakail'].pin, '2468');
  assert.equal(
    Object.keys(updates).filter((p) => p.startsWith('users/')).length,
    1
  );
});

test('log entries append and are never rewritten', () => {
  const prev = defaultState();
  const a = resetPin(prev, 'malakail', '1111').state;
  const b = resetPin(a, 'malakail', '2222').state;

  const updates = diffState(a, b, 'malakail');
  const logPaths = Object.keys(updates).filter((p) => p.startsWith('log/'));
  assert.equal(logPaths.length, 1, 'only the new entry is written');
  assert.equal(updates[logPaths[0]].id, b.log[0].id);
});

test('a deleted day is written as null so it clears remotely', () => {
  const monday = future(1);
  const prev = { ...defaultState(), overrides: { [monday]: { bookings: [], cleared: true } } };
  const next = { ...defaultState(), overrides: {} };
  const updates = diffState(prev, next, 'matthewc');
  assert.equal(updates[`overrides/${monday}`], null);
});

/* ---- concurrent same-day merge ------------------------------------------ */

test('two non overlapping slots on the same day both survive a merge', () => {
  const remote = {
    bookings: [{ id: 'r1', groupId: 'malakai', start: 540, end: 720 }],
  };
  const local = {
    bookings: [{ id: 'l1', groupId: 'scott-starla', start: 780, end: 900 }],
  };
  const merged = mergeDay(remote, local);
  assert.equal(merged.bookings.length, 2, 'nobody loses their slot');
  assert.deepEqual(merged.bookings.map((b) => b.groupId), ['malakai', 'scott-starla']);
});

test('an overlapping slot resolves to the write that arrived second', () => {
  const remote = {
    bookings: [{ id: 'r1', groupId: 'malakai', start: 540, end: 900 }],
  };
  const local = {
    bookings: [{ id: 'l1', groupId: 'scott-starla', start: 600, end: 720 }],
  };
  const merged = mergeDay(remote, local);
  assert.equal(merged.bookings.length, 1);
  assert.equal(merged.bookings[0].groupId, 'scott-starla');
});

test('a block always wins the merge', () => {
  const remote = { bookings: [{ id: 'r1', groupId: 'malakai', start: 0, end: 1440 }] };
  const local = { blocked: true, bookings: [] };
  assert.equal(mergeDay(remote, local).blocked, true);
});

test('merging against an empty remote keeps the local day', () => {
  const local = { bookings: [{ id: 'l1', groupId: 'malakai', start: 0, end: 1440 }] };
  assert.deepEqual(mergeDay(null, local), local);
});

/* ---- snapshot rehydration ------------------------------------------------ */

test('a snapshot rebuilds state with personal preferences layered on top', () => {
  const fallback = defaultState();
  const snapshot = {
    users: { matthewc: { id: 'matthewc', firstName: 'Matthew', pin: '7420' } },
    rotation: fallback.rotation,
    groups: fallback.groups,
    overrides: { '2099-01-02': { bookings: [] } },
    settings: { towelRotation: false, householdName: 'Cunning Family' },
    log: {
      b: { id: 'b', at: '2026-02-02T00:00:00Z', actorId: 'matthewc', action: 'book' },
      a: { id: 'a', at: '2026-01-01T00:00:00Z', actorId: 'matthewc', action: 'signin' },
    },
  };
  const state = stateFromSnapshot(snapshot, fallback, { theme: 'vaporwave', textScale: 1.15 });

  assert.equal(state.users.length, 1);
  assert.equal(state.settings.towelRotation, false, 'shared settings come from the database');
  assert.equal(state.settings.theme, 'vaporwave', 'personal preferences win');
  assert.equal(state.settings.textScale, 1.15);
  assert.deepEqual(state.log.map((e) => e.id), ['b', 'a'], 'log is newest first');
});

test('an empty database falls back to the seeded household', () => {
  const fallback = defaultState();
  const state = stateFromSnapshot({}, fallback, {});
  assert.equal(state.users.length, fallback.users.length);
  assert.deepEqual(state.rotation, fallback.rotation);
  assert.deepEqual(state.overrides, {});
});
