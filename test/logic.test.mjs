import assert from 'node:assert/strict';
import test from 'node:test';

import { addDays, startOfWeek, toKey } from '../src/lib/date.js';
import {
  applyBooking,
  formatSlot,
  openGaps,
  relation,
  suggestSlot,
} from '../src/lib/time.js';
import {
  groupForUser,
  resolveDay,
  towelGroupsFor,
  windowWeeks,
} from '../src/lib/schedule.js';
import {
  book,
  defaultState,
  normalize,
  removeBooking,
  resetDay,
  resetPin,
  setBlocked,
  signUp,
} from '../src/lib/store.js';

const AM9 = 540;
const PM12 = 720;
const PM3 = 900;
const PM6 = 1080;

/** Next occurrence of a weekday, at least 3 days out. */
function future(dow, minAhead = 3) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + minAhead);
  while (d.getDay() !== dow) d.setDate(d.getDate() + 1);
  return toKey(d);
}

/* ---- slot arithmetic ----------------------------------------------------- */

test('relation classifies every overlap shape', () => {
  const base = { start: AM9, end: PM6 };
  assert.equal(relation(base, { start: 0, end: AM9 }), 'none');
  assert.equal(relation(base, { start: 0, end: 1440 }), 'covers');
  assert.equal(relation(base, { start: PM12, end: PM3 }), 'splits');
  assert.equal(relation(base, { start: 0, end: PM12 }), 'trims-start');
  assert.equal(relation(base, { start: PM3, end: 1440 }), 'trims-end');
});

test('a slot inside another splits it into before and after', () => {
  const existing = [{ id: 'x', groupId: 'malakai', start: 0, end: 1440 }];
  const incoming = { id: 'y', groupId: 'scott-starla', start: PM12, end: PM3 };
  const { bookings, didSplit } = applyBooking(existing, incoming);

  assert.equal(didSplit, true);
  assert.equal(bookings.length, 3, 'user1, user2, user1');
  assert.deepEqual(
    bookings.map((b) => [b.groupId, b.start, b.end]),
    [
      ['malakai', 0, PM12],
      ['scott-starla', PM12, PM3],
      ['malakai', PM3, 1440],
    ]
  );
});

test('a covering slot removes the old one entirely', () => {
  const existing = [{ id: 'x', groupId: 'malakai', start: AM9, end: PM3 }];
  const { bookings, displaced } = applyBooking(existing, {
    id: 'y', groupId: 'malakai2', start: 0, end: 1440,
  });
  assert.equal(bookings.length, 1);
  assert.equal(displaced.length, 1);
  assert.equal(displaced[0].how, 'covers');
});

test('trimming never leaves a zero length fragment', () => {
  const existing = [{ id: 'x', groupId: 'a', start: AM9, end: PM12 }];
  const { bookings } = applyBooking(existing, { id: 'y', groupId: 'b', start: AM9, end: PM3 });
  assert.equal(bookings.length, 1);
  assert.equal(bookings[0].groupId, 'b');
});

test('bookings always come back sorted by start time', () => {
  const existing = [{ id: 'x', groupId: 'a', start: PM3, end: PM6 }];
  const { bookings } = applyBooking(existing, { id: 'y', groupId: 'b', start: AM9, end: PM12 });
  assert.deepEqual(bookings.map((b) => b.start), [AM9, PM3]);
});

test('slots format for humans', () => {
  assert.equal(formatSlot({ start: 0, end: 1440 }), 'All day');
  assert.equal(formatSlot({ start: AM9, end: PM12 }), '9:00 AM - 12:00 PM');
  assert.equal(formatSlot({ start: PM6, end: 1440 }), '6:00 PM - Midnight');
});

test('gaps and suggestions avoid occupied time', () => {
  const busy = [{ id: 'x', groupId: 'a', start: AM9, end: PM12 }];
  assert.deepEqual(openGaps(busy), [
    { start: 0, end: AM9 },
    { start: PM12, end: 1440 },
  ]);
  const s = suggestSlot(busy);
  assert.equal(s.start, PM12, 'suggests the largest free gap');
  assert.ok(s.end <= 1440);
});

/* ---- recurring schedule -------------------------------------------------- */

test('the recurring schedule matches the household', () => {
  const state = defaultState();
  const expected = [
    [0, 'MALAKAI'],
    [3, 'SCOTT + STARLA'],
    [4, 'ALYSSA + JOSIAH'],
    [6, 'MATTHEW + MICHAEL'],
  ];
  for (const [dow, label] of expected) {
    const day = resolveDay(state, future(dow));
    assert.equal(day.bookings.length, 1, `dow ${dow}`);
    assert.equal(day.bookings[0].label, label);
    assert.equal(day.bookings[0].allDay, true);
  }
  assert.equal(resolveDay(state, future(1)).isFree, true, 'Monday is open');
});

test('usernames map to their calendar pair', () => {
  const state = defaultState();
  assert.equal(groupForUser(state, 'malakail').label, 'MALAKAI');
  assert.equal(groupForUser(state, 'scottc').label, 'SCOTT + STARLA');
  assert.equal(groupForUser(state, 'starlac').label, 'SCOTT + STARLA');
  assert.equal(groupForUser(state, 'alyssac').label, 'ALYSSA + JOSIAH');
  assert.equal(groupForUser(state, 'matthewc').label, 'MATTHEW + MICHAEL');
  assert.equal(groupForUser(state, 'miker').label, 'MATTHEW + MICHAEL');
});

test('the six week window starts this week and rolls forward', () => {
  const weeks = windowWeeks();
  assert.equal(weeks.length, 6);
  assert.equal(toKey(weeks[0]), toKey(startOfWeek(new Date())));
  assert.equal(toKey(weeks[5]), toKey(addDays(startOfWeek(new Date()), 35)));
  for (const w of weeks) assert.equal(w.getDay(), 0, 'every week starts Sunday');
});

/* ---- towels -------------------------------------------------------------- */

test('towel duty covers two groups a week and alternates', () => {
  const state = defaultState();
  const weeks = windowWeeks(6).map((w) => towelGroupsFor(state, toKey(w)));
  for (const w of weeks) assert.equal(w.length, 2, 'two groups every week');
  assert.notDeepEqual(weeks[0], weeks[1], 'consecutive weeks differ');
  assert.deepEqual(weeks[0], weeks[2], 'and it alternates back');
  assert.deepEqual(weeks[1], weeks[3]);
  const combined = new Set([...weeks[0], ...weeks[1]]);
  assert.equal(combined.size, 4, 'all four groups covered across two weeks');
});

test('towel badges land on the right bookings', () => {
  const state = defaultState();
  const weekKey = toKey(startOfWeek(new Date()));
  const onDuty = towelGroupsFor(state, weekKey);
  for (let dow = 0; dow < 7; dow += 1) {
    const day = resolveDay(state, future(dow, 0));
    day.bookings.forEach((b) => {
      if (day.key >= weekKey && day.key < toKey(addDays(startOfWeek(new Date()), 7))) {
        assert.equal(b.towels, onDuty.includes(b.groupId));
      }
    });
  }
});

/* ---- booking flow -------------------------------------------------------- */

test('taking occupied time requires acknowledgement', () => {
  const state = defaultState();
  const sunday = future(0);
  const attempt = book(state, {
    key: sunday, groupId: 'matthew-michael', start: PM12, end: PM3,
    actorId: 'matthewc', mode: 'replace', acknowledged: false,
  });
  assert.equal(attempt.result.ok, false);
  assert.match(attempt.result.message, /permission/i);
});

test('replacing splits the existing booking around the new one', () => {
  const state = defaultState();
  const sunday = future(0);
  const out = book(state, {
    key: sunday, groupId: 'matthew-michael', start: PM12, end: PM3,
    actorId: 'matthewc', mode: 'replace', acknowledged: true,
  });
  assert.equal(out.result.ok, true);
  const day = resolveDay(out.state, sunday);
  assert.deepEqual(day.bookings.map((b) => b.label), [
    'MALAKAI', 'MATTHEW + MICHAEL', 'MALAKAI',
  ]);
  assert.equal(out.state.log[0].action, 'replace');
});

test('booking free time needs no acknowledgement', () => {
  const state = defaultState();
  const monday = future(1);
  const out = book(state, {
    key: monday, groupId: 'malakai', start: AM9, end: PM12, actorId: 'malakail',
  });
  assert.equal(out.result.ok, true);
  assert.equal(resolveDay(out.state, monday).bookings.length, 1);
  assert.equal(out.state.log[0].action, 'book');
});

test('a swap hands the displaced group the offered day', () => {
  let state = defaultState();
  const sunday = future(0);
  const saturday = future(6);

  const out = book(state, {
    key: sunday, groupId: 'matthew-michael', start: 0, end: 1440,
    actorId: 'matthewc', mode: 'swap', acknowledged: true,
    swapWith: { key: saturday },
  });
  assert.equal(out.result.ok, true, out.result.message);
  state = out.state;

  assert.deepEqual(resolveDay(state, sunday).bookings.map((b) => b.label), ['MATTHEW + MICHAEL']);
  assert.deepEqual(resolveDay(state, saturday).bookings.map((b) => b.label), ['MALAKAI']);
  assert.equal(state.log[0].action, 'swap');
});

test('a group cannot double book itself', () => {
  const state = defaultState();
  const sunday = future(0);
  const out = book(state, {
    key: sunday, groupId: 'malakai', start: PM12, end: PM3,
    actorId: 'malakail', acknowledged: true,
  });
  assert.equal(out.result.ok, false);
});

test('past and blocked days refuse bookings', () => {
  let state = defaultState();
  const past = toKey(new Date(Date.now() - 3 * 86400000));
  assert.equal(
    book(state, { key: past, groupId: 'malakai', start: 0, end: 1440, actorId: 'malakail' }).result.ok,
    false
  );

  const monday = future(1);
  state = setBlocked(state, monday, true, 'matthewc').state;
  assert.equal(
    book(state, { key: monday, groupId: 'malakai', start: 0, end: 1440, actorId: 'malakail' }).result.ok,
    false
  );
});

test('an unblocked day stays open instead of returning to the rotation', () => {
  let state = defaultState();
  const sunday = future(0);
  assert.equal(resolveDay(state, sunday).bookings.length, 1);

  state = setBlocked(state, sunday, true, 'matthewc').state;
  assert.equal(resolveDay(state, sunday).blocked, true);

  state = setBlocked(state, sunday, false, 'matthewc').state;
  const day = resolveDay(state, sunday);
  assert.equal(day.blocked, false);
  assert.equal(day.isFree, true, 'unblocking must leave the day open');

  // and it can still be put back deliberately
  state = resetDay(state, sunday, 'matthewc').state;
  assert.equal(resolveDay(state, sunday).bookings[0].label, 'MALAKAI');
});

test('removing a booking leaves the day open', () => {
  let state = defaultState();
  const sunday = future(0);
  const id = resolveDay(state, sunday).bookings[0].id;
  const materialised = book(state, {
    key: sunday, groupId: 'matthew-michael', start: PM12, end: PM3,
    actorId: 'matthewc', mode: 'replace', acknowledged: true,
  }).state;
  const first = resolveDay(materialised, sunday).bookings[0];
  const out = removeBooking(materialised, sunday, first.id, 'matthewc');
  assert.equal(out.result.ok, true);
  assert.ok(!resolveDay(out.state, sunday).bookings.some((b) => b.id === first.id));
  assert.ok(id);
});

/* ---- accounts ------------------------------------------------------------ */

test('sign up validates input and refuses a taken username', () => {
  const state = defaultState();
  assert.equal(signUp(state, { id: 'ab', firstName: 'A', lastName: 'B', pin: '1234' }).result.ok, false, 'username too short');
  assert.equal(signUp(state, { id: 'newguy', firstName: 'New', lastName: 'Guy', pin: '12' }).result.ok, false, 'PIN too short');
  assert.equal(signUp(state, { id: 'newguy', firstName: '', lastName: 'Guy', pin: '1234' }).result.ok, false, 'no first name');

  // Every household account is already registered, so none can be claimed.
  ['matthewc', 'miker', 'malakail', 'scottc', 'starlac', 'alyssac'].forEach((id) => {
    assert.equal(
      signUp(state, { id, firstName: 'X', lastName: 'Y', pin: '9999' }).result.ok,
      false,
      `${id} is already taken`
    );
  });

  // A genuinely new person can still join.
  const out = signUp(state, { id: 'newguy', firstName: 'New', lastName: 'Guy', pin: '4321' });
  assert.equal(out.result.ok, true);
  assert.equal(out.state.users.length, 7);
});

test('anyone can reset their own PIN', () => {
  const state = defaultState();
  assert.equal(resetPin(state, 'malakail', '999').result.ok, false);
  const out = resetPin(state, 'malakail', '2468');
  assert.equal(out.result.ok, true);
  assert.equal(out.state.users.find((u) => u.id === 'malakail').pin, '2468');
  assert.equal(out.state.log[0].action, 'pin-reset');
});

/* ---- resilience ---------------------------------------------------------- */

test('normalize repairs damaged records', () => {
  const state = normalize({
    users: [{ id: 'ONE', firstName: 'One' }, null],
    groups: [{ id: 'g', label: 'G', members: ['nope'] }],
    rotation: ['ghost', 'g', 7],
    overrides: {
      'bad-key': { bookings: [] },
      '2099-01-01': { bookings: [{ groupId: 'g', start: 600, end: 300 }] },
    },
    settings: { textScale: 99 },
  });
  assert.ok(state.users.some((u) => u.id === 'matthewc'), 'admin is always present');
  assert.equal(state.users[0].id, 'one', 'usernames normalise to lower case');
  assert.equal(state.rotation[0], null);
  assert.equal(state.rotation[1], 'g');
  assert.ok(!('bad-key' in state.overrides));
  assert.equal(state.overrides['2099-01-01'].bookings.length, 0, 'end before start is dropped');
  assert.equal(state.settings.textScale, 1, 'out of range scale resets');
});

test('the activity log is capped and newest first', () => {
  let state = defaultState();
  for (let i = 0; i < 5; i += 1) {
    state = resetPin(state, 'malakail', String(1000 + i)).state;
  }
  assert.equal(state.log.length, 5);
  assert.ok(state.log[0].at >= state.log[4].at);
});

test('every household member is registered and can sign in', () => {
  const state = defaultState();
  const expected = {
    matthewc: '7420',
    miker: '1473',
    malakail: '1111',
    scottc: '5244',
    starlac: '4698',
    alyssac: '6842',
  };
  Object.entries(expected).forEach(([id, pin]) => {
    const user = state.users.find((u) => u.id === id);
    assert.ok(user, `${id} exists`);
    assert.equal(user.pin, pin, `${id} signs in with ${pin}`);
    assert.ok(user.createdAt, `${id} counts as registered`);
    assert.ok(groupForUser(state, id), `${id} is on the calendar`);
  });
  assert.equal(state.users.length, 6);
});
