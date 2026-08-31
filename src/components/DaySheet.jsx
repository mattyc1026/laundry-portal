import { useMemo, useState } from 'react';
import Sheet from '../ui/Sheet.jsx';
import Icon from '../ui/Icon.jsx';
import Switch from '../ui/Switch.jsx';
import { formatLongDate, formatShortDate, relativeLabel } from '../lib/date.js';
import {
  DAY_END,
  DAY_START,
  conflictsFor,
  formatSlot,
  fromTimeValue,
  suggestSlot,
  toTimeValue,
} from '../lib/time.js';
import { bookingsOf, groupForUser, myUpcomingBookings } from '../lib/schedule.js';
import { book, removeBooking, resetDay, setBlocked } from '../lib/store.js';
import { haptic } from '../lib/haptics.js';

/**
 * Everything you can do to a date lives here: book all day or a slot, take
 * time that belongs to someone else, block the day, or clear it. There are
 * no separate admin screens for this, so whoever opens a day sees the same
 * controls.
 */
export default function DaySheet({ day, state, viewer, dispatch, push, onClose }) {
  const myGroup = groupForUser(state, viewer.id);
  const current = useMemo(() => bookingsOf(state, day.key), [state, day.key]);

  const [mode, setMode] = useState('idle'); // idle | allday | slot
  const [slot, setSlot] = useState(() => suggestSlot(current));
  const [acknowledged, setAcknowledged] = useState(false);
  const [resolution, setResolution] = useState('replace'); // replace | swap
  const [swapKey, setSwapKey] = useState('');

  const incoming =
    mode === 'allday'
      ? { start: DAY_START, end: DAY_END, groupId: myGroup?.id }
      : { ...slot, groupId: myGroup?.id };

  const clashes = useMemo(
    () => (mode === 'idle' || !myGroup ? [] : conflictsFor(current, incoming)),
    [current, incoming, mode, myGroup]
  );

  const clashLabels = [
    ...new Set(
      clashes.map((c) => state.groups.find((g) => g.id === c.groupId)?.label || 'someone')
    ),
  ];

  const myOtherDays = useMemo(
    () => myUpcomingBookings(state, viewer.id).filter((b) => b.day.key !== day.key),
    [state, viewer.id, day.key]
  );

  function run(mutator, close = true) {
    const result = dispatch(mutator);
    push(result.message, result.type);
    haptic(result.ok ? 'success' : 'error');
    if (result.ok && close) onClose();
    return result;
  }

  function submit() {
    if (!myGroup) {
      push('Your account is not on the calendar yet.', 'error');
      return;
    }
    run((s) =>
      book(s, {
        key: day.key,
        groupId: myGroup.id,
        start: incoming.start,
        end: incoming.end,
        actorId: viewer.id,
        mode: clashes.length === 0 ? 'free' : resolution,
        acknowledged: clashes.length === 0 ? true : acknowledged,
        swapWith: resolution === 'swap' && swapKey ? { key: swapKey } : null,
      })
    );
  }

  const canSubmit =
    mode !== 'idle' &&
    incoming.end > incoming.start &&
    (clashes.length === 0 ||
      (acknowledged && (resolution === 'replace' || (resolution === 'swap' && swapKey))));

  return (
    <Sheet
      title={formatLongDate(day.key)}
      onClose={onClose}
      footer={
        mode === 'idle' ? null : (
          <>
            <button type="button" className="btn btn--secondary pressable" onClick={() => setMode('idle')}>
              Back
            </button>
            <button type="button" className="btn btn--primary pressable" disabled={!canSubmit} onClick={submit}>
              <Icon name="check" size={16} />
              {clashes.length === 0
                ? 'Confirm booking'
                : resolution === 'swap'
                  ? 'Confirm swap'
                  : 'Take this time'}
            </button>
          </>
        )
      }
    >
      {/* ---- Who is on this day ------------------------------------------- */}
      <p className="sheet__text" style={{ marginBottom: 10 }}>
        {relativeLabel(day.key)}
        {day.isPast ? ' - this day has passed' : ''}
      </p>

      {day.blocked ? (
        <div className="callout" style={{ marginBottom: 15 }}>
          <div className="callout__title">This day is blocked</div>
          Nobody can be scheduled until it is unblocked.
        </div>
      ) : current.length === 0 ? (
        <div className="empty" style={{ marginBottom: 15, padding: '26px 20px' }}>
          <p className="empty__title">Nobody scheduled</p>
          <p className="empty__text">This whole day is free.</p>
        </div>
      ) : (
        <div className="preview-strip" style={{ marginBottom: 15 }}>
          {day.bookings.map((b) => (
            <div
              key={b.id}
              className="bkg"
              style={{ '--slot-color': b.group?.color || 'var(--accent)' }}
            >
              <span className="bkg__name">{b.label}</span>
              {b.towels ? (
                <span className="towel-badge">
                  <Icon name="towel" size={9} strokeWidth={2.4} />
                  Towels
                </span>
              ) : null}
              <span className={`bkg__time${b.allDay ? ' bkg__time--allday' : ''}`}>
                {formatSlot(b)}
              </span>
              {!day.isPast ? (
                <button
                  type="button"
                  className="iconbtn pressable"
                  style={{ width: 24, height: 24 }}
                  aria-label={`Remove ${b.label}`}
                  onClick={() => run((s) => removeBooking(s, day.key, b.id, viewer.id), false)}
                >
                  <Icon name="x" size={12} strokeWidth={2.4} />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/* ---- Booking entry point ------------------------------------------ */}
      {mode === 'idle' && !day.isPast && !day.blocked ? (
        <div className="sheet__stack">
          <button type="button" className="btn btn--primary btn--block pressable" onClick={() => setMode('allday')}>
            <Icon name="calendar" size={16} />
            Book the whole day
          </button>
          <button
            type="button"
            className="btn btn--secondary btn--block pressable"
            onClick={() => {
              setSlot(suggestSlot(current));
              setMode('slot');
            }}
          >
            <Icon name="clock" size={16} />
            Book a time slot
          </button>
        </div>
      ) : null}

      {/* ---- Slot picker --------------------------------------------------- */}
      {mode === 'slot' ? (
        <div className="sheet__stack">
          <div className="auth__grid2">
            <div className="field">
              <label className="field__label" htmlFor="slot-start">Start</label>
              <input
                id="slot-start"
                className="input"
                type="time"
                step="900"
                value={toTimeValue(slot.start)}
                onChange={(e) => {
                  const v = fromTimeValue(e.target.value);
                  if (v !== null) setSlot((p) => ({ ...p, start: v }));
                }}
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="slot-end">End</label>
              <input
                id="slot-end"
                className="input"
                type="time"
                step="900"
                value={toTimeValue(slot.end >= DAY_END ? DAY_END - 1 : slot.end)}
                onChange={(e) => {
                  const v = fromTimeValue(e.target.value);
                  if (v !== null) setSlot((p) => ({ ...p, end: v === DAY_END - 1 ? DAY_END : v }));
                }}
              />
            </div>
          </div>
          {incoming.end <= incoming.start ? (
            <p className="field__hint" style={{ color: 'var(--danger)' }}>
              The end time has to be after the start time.
            </p>
          ) : (
            <p className="field__hint">You are booking {formatSlot(incoming)}.</p>
          )}
        </div>
      ) : null}

      {/* ---- Conflict resolution ------------------------------------------ */}
      {mode !== 'idle' && clashes.length > 0 ? (
        <div className="sheet__stack" style={{ marginTop: 16 }}>
          <div className="callout">
            <div className="callout__title">This time is taken</div>
            {clashLabels.join(' and ')} {clashLabels.length > 1 ? 'have' : 'has'} this time.
            Only continue if you have already asked them and they agreed.
          </div>

          <div className="field">
            <span className="field__label">What should happen to their booking?</span>
            <div className="rows">
              <button
                type="button"
                className="row pressable"
                aria-pressed={resolution === 'replace'}
                onClick={() => setResolution('replace')}
              >
                <Icon name={resolution === 'replace' ? 'check' : 'square'} size={17} />
                <div className="row__body">
                  <div className="row__title">Replace their name</div>
                  <div className="row__sub">
                    They give up this time and get nothing back
                  </div>
                </div>
              </button>
              <button
                type="button"
                className="row pressable"
                aria-pressed={resolution === 'swap'}
                disabled={myOtherDays.length === 0}
                onClick={() => setResolution('swap')}
              >
                <Icon name={resolution === 'swap' ? 'check' : 'square'} size={17} />
                <div className="row__body">
                  <div className="row__title">Swap with one of my days</div>
                  <div className="row__sub">
                    {myOtherDays.length === 0
                      ? 'You have no other days to offer'
                      : 'They take a day of yours in exchange'}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {resolution === 'swap' ? (
            <div className="field">
              <label className="field__label" htmlFor="swap-day">Give them</label>
              <select
                id="swap-day"
                className="select"
                value={swapKey}
                onChange={(e) => setSwapKey(e.target.value)}
              >
                <option value="">Pick one of your days</option>
                {myOtherDays.map(({ day: d, booking }) => (
                  <option key={`${d.key}-${booking.id}`} value={d.key}>
                    {formatShortDate(d.key)} · {formatSlot(booking)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <label className="check-row">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
            />
            <span>
              I have {clashLabels.join(' and ')}&apos;s permission to take this time.
            </span>
          </label>
        </div>
      ) : null}

      {/* ---- Day controls, open to everyone -------------------------------- */}
      {mode === 'idle' && !day.isPast ? (
        <>
          <div className="section-head">
            <h3 className="section-title">Day controls</h3>
          </div>
          <div className="rows">
            <div className="row">
              <Icon name="ban" size={17} />
              <div className="row__body">
                <div className="row__title">Block this day</div>
                <div className="row__sub">Nobody can be scheduled. Unblocking leaves it open.</div>
              </div>
              <Switch
                checked={day.blocked}
                label="Block this day"
                onChange={(next) => run((s) => setBlocked(s, day.key, next, viewer.id), false)}
              />
            </div>
            <button
              type="button"
              className="row pressable"
              onClick={() => run((s) => resetDay(s, day.key, viewer.id))}
            >
              <Icon name="refresh" size={17} />
              <div className="row__body">
                <div className="row__title">Restore the recurring schedule</div>
                <div className="row__sub">Puts this date back to whoever normally has it</div>
              </div>
            </button>
          </div>
        </>
      ) : null}
    </Sheet>
  );
}
