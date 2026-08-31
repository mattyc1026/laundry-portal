# Cunning Family Laundry Portal

A household laundry calendar. Anyone can take a whole day or a time slot, two
people can share a day as long as their times do not overlap, and taking time
that already belongs to someone is done directly between the people involved
rather than through an approval queue.

```bash
npm install
npm run dev
npm test          # 24 logic tests, no build step needed
npm run build
npm run deploy    # publishes dist/ to GitHub Pages
```

## Views

- **6 Weeks** always shows the current week plus five ahead. As a week ends it
  drops off the top and a new one appears at the bottom, so the window never
  runs out and never needs topping up.
- **Week** is a single week you can step through.
- **Day** draws each booking as a block spanning its allotted time, against an
  hour ruler, with a live now line on today.

In the six week and week views every booking is exactly one line, so a day
shared by three people is three stacked lines and never more.

## Booking

Tap any day. Take the whole day, or pick a start and end time.

If the time is free it is yours immediately. If it belongs to someone else you
must first tick that you have their permission, then choose:

- **Replace their name** they give up that time and get nothing back.
- **Swap** they take one of your days in exchange.

A slot booked inside someone else's larger booking splits theirs around yours,
so the day reads user1, user2, user1. That is handled by `applyBooking` in
`lib/time.js` and is covered by tests.

There are no requests, no approvals and no notifications. The conversation
happens between people; the portal just records the outcome.

## The recurring schedule

| Day | Shows as | Usernames |
|---|---|---|
| Sunday | MALAKAI | `malakail` |
| Wednesday | SCOTT + STARLA | `scottc`, `starlac` |
| Thursday | ALYSSA + JOSIAH | `alyssac` |
| Saturday | MATTHEW + MICHAEL | `matthewc`, `miker` |

Pairs are one entry on the calendar but separate sign-ins. Either member can
act for the pair.

These are defaults only. Any date can be changed, and any date can be put back
with **Restore the recurring schedule**.

## Towels

Towel duty covers two households per week and alternates: two of them one
week, the other two the next. It is shown as a badge beside the name on the
calendar, and as a banner at the top explaining what is expected.

## Blocking

Blocking a day stops anyone being scheduled. **Unblocking leaves the day
open** rather than handing it back to whoever normally has it.

Blocking and restoring a day are admin only, since they change the schedule
for the whole household. Booking, swapping and releasing are open to
everyone.

## Admin

The Admin tab is visible only to `matthewc`. Michael signs in separately as
`miker` and does not see it, even though they share one calendar entry.

The tab itself is read only: who has signed up and a history of every action
taken in the portal. The admin's extra powers appear on the day sheet, where
blocking and restoring a day are shown only to them.

## Settings

The gear icon opens 27 themes in three groups, plus text size, high contrast
and reduced motion. Themes are the 21 recovered from the previous deployment
plus Aurora, Vaporwave, Terminal, Candy, Valentine's Day and St. Patrick's Day.

Every theme defines the same 39 custom properties, so switching is one pass
over the root element and no theme can render half applied. The previous build
themed only `--day4` through `--day7`; days 1 to 3 are now derived from each
theme's accents so the whole week responds.

## Layout

```
src/
  lib/        date, time, schedule, store, themes. No React in here.
  hooks/      toast queue, overlay behaviour
  ui/         Sheet, Toast, Segmented, Switch, PinField, Avatar, Icon
  components/ AppShell, DaySheet, SettingsSheet, TowelBanner, WelcomeTip
  screens/    Auth, Calendar, Help, Admin
  styles/     base, components
test/         logic tests
```

Every state change is a pure function in `lib/store.js` returning
`{ state, result }`, so a rule is written once and cannot drift between the
calendar, the day sheet and the admin view.

## PINs

PINs are stored as entered. The portal holds a laundry schedule and nothing
else, which is a deliberate call by the household. Anyone can reset their own
PIN from the sign-in screen or from Settings, with no admin involved.

## Storage

Everything lives in `localStorage` under `cflp.v3` on the device it runs on.
The previous deployment synced through Firebase Realtime Database; that source
was lost, so this build is single device. Re-adding sync means writing the
same state object to a backend and is isolated to `lib/store.js`.

## Deployment

`vite.config.js` sets `base` to `/laundry-portal/` for production builds
because the site is served from a GitHub Pages sub-path. `public/.nojekyll`
stops Pages running Jekyll over the output.

Commit your source. The previous version was lost because `gh-pages -d dist`
publishes only the build, never the code.

---

## Realtime sync

The portal syncs live across devices through the household's existing
Firebase Realtime Database project, `laundry-portal-12662`, recovered from
the previous deployment.

```bash
npm install          # firebase is now a dependency
npm run dev
```

### How writes avoid clobbering each other

Sending the whole state object on every change would mean last writer wins:
Malakai booking Tuesday would wipe out Alyssa booking Friday if the two
writes landed together.

Instead `lib/sync-diff.js` reduces each change to the narrowest set of paths
that actually changed:

| What changed | Path written |
|---|---|
| A booking on one date | `overrides/2026-09-14` |
| A PIN or profile | `users/malakail` |
| A theme or text size | `prefs/malakail/theme` |
| Towel rotation, household name | `settings/...` |
| Any action | `log/{id}` (append only) |

Two people booking different days write to different paths and cannot
collide at all. Two people booking the *same* day go through a database
transaction that merges non-overlapping bookings, so both slots survive; a
genuine overlap resolves to whichever write landed second. All of this is
covered by tests in `test/sync.test.mjs`.

Themes are per account rather than shared, so changing yours follows you to
your phone without repainting everyone else's portal.

### Offline

`localStorage` is a cache, not the source of truth. It paints the last known
schedule instantly on load and keeps the app usable with no connection; the
first snapshot from the database replaces it. The dot in the header shows
green when synced, amber while connecting, and red if a write failed.

### Security rules

`database.rules.json` is in the project root. Apply it with:

```bash
npx firebase deploy --only database
```

Or paste it into Firebase Console, Realtime Database, Rules.

The rules keep the tree readable and writable by the household, matching your
call that a laundry schedule holds nothing sensitive, while validating that
date keys are real dates, that slot times fall within a day, that a user
record matches its own key, and that log entries cannot be edited after the
fact.

If you later want it locked down, the change is to add Firebase Anonymous or
Email auth and swap `".read": true` for `"auth != null"`. Nothing in the app
outside `lib/firebase.js` and `lib/sync.js` would need to change.

### Pointing at a different project

Copy `.env.example` to `.env` and fill in any values you want to override.
`VITE_FB_ROOT` controls which subtree is used, so you can start clean without
disturbing what the old deployment left behind.
