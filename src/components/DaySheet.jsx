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
import { bookingsOf, groupForUser, groupUpcomingBookings } from '../lib/schedule.js';
import {
  ADMIN_USER,
  book,
  editBooking,
  removeBooking,
  resetDay,
  setBlocked,
  setTowels,
} from '../lib/store.js';
import { haptic } from '../lib/haptics.js';

/** Start and end inputs shared by booking and editing. */
function TimeFields({ value, onChange, idPrefix }) {
  return (
    <div className="auth__grid2">
      <div className="field">
        <label className="field__label" htmlFor={`${idPrefix}-start`}>Start</label>
        <input
          id={`${idPrefix}-start`}
          className="input"
          type="time"
          step="900"
          value={toTimeValue(value.start)}
          onChange={(e) => {
            const v = fromTimeValue(e.target.value);
            if (v !== null) onChange({ ...value, start: v });
          }}
        />
      </div>
      <div className="field">
        <label className="field__label" htmlFor={`${idPrefix}-end`}>End</label>
        <input
          id={`${idPrefix}-end`}
          className="input"
          type="time"
          step="900"
          value={toTimeValue(value.end >= DAY_END ? DAY_END - 1 : value.end)}
          onChange={(e) => {
            const v = fromTimeValue(e.target.value);
            if (v !== null) onChange({ ...value, end: v === DAY_END - 1 ? DAY_END : v });
          }}
        />
      </div>
    </div>
  );
}

/**
 * Everything you can do to a date lives here: book all day or a slot, or
 * take time that belongs to someone else once you have their permission.
 *
 * The admin gets full control on top of that, on any day including past
 * ones: book as anyone, edit anyone's time or move it to someone else,
 * remove anyone, switch towel duty on or off, block and restore.
 */
export default function DaySheet({ day, state, viewer, dispatch, push, onClose }) {
  const myGroup = groupForUser(state, viewer.id);
  const isAdmin = viewer.id === ADMIN_USER;
  const current = useMemo(() => bookingsOf(state, day.key), [state, day.key]);
  const canChange = !day.isPast || isAdmin;

  const [mode, setMode] = useState('idle'); // idle | allday | slot | edit
  const [slot, setSlot] = useState(() => suggestSlot(current));
  const [acknowledged, setAcknowledged] = useState(false);
  const [resolution, setResolution] = useState('replace'); // replace | swap
  const [swapKey, setSwapKey] = useState('');
  // The admin can book on behalf of anyone. Everyone else books as themselves.
  const [bookAs, setBookAs] = useState(() => myGroup?.id || state.groups[0]?.id || '');
  // The booking the admin is editing, held by its position in the day.
  const [editing, setEditing] = useState(null); // { index, groupId, start, end }

  const actingGroupId = isAdmin ? bookAs : myGroup?.id;
  const actingGroup = state.groups.find((g) => g.id === actingGroupId) || null;

  const incoming =
    mode === 'allday'
      ? { start: DAY_START, end: DAY_END, groupId: actingGroupId }
      : { ...slot, groupId: actingGroupId };

  const clashes = useMemo(
    () =>
      mode === 'idle' || mode === 'edit' || !actingGroupId
        ? []
        : conflictsFor(current, incoming).filter((c) => !isAdmin || c.groupId !== actingGroupId),
    [current, incoming, mode, actingGroupId, isAdmin]
  );

  const clashLabels = [
    ...new Set(
      clashes.map((c) => state.groups.find((g) => g.id === c.groupId)?.label || 'someone')
    ),
  ];

  const otherDays = useMemo(
    () =>
      actingGroupId
        ? groupUpcomingBookings(state, actingGroupId).filter((b) => b.day.key !== day.key)
        : [],
    [state, actingGroupId, day.key]
  );

  function run(mutator, close = true) {
    const result = dispatch(mutator);
    push(result.message, result.type);
    haptic(result.ok ? 'success' : 'error');
    if (result.ok && close) onClose();
    return result;
  }

  function submit() {
    if (!actingGroupId) {
      push('Your account is not on the calendar yet.', 'error');
      return;
    }
    run((s) =>
      book(s, {
        key: day.key,
        groupId: actingGroupId,
        start: incoming.start,
        end: incoming.end,
        actorId: viewer.id,
        mode: clashes.length === 0 ? 'free' : resolution,
        acknowledged: clashes.length === 0 || isAdmin ? true : acknowledged,
        swapWith: resolution === 'swap' && swapKey ? { key: swapKey } : null,
      })
    );
  }

  function startEdit(index) {
    const b = day.bookings[index];
    setEditing({ index, groupId: b.groupId, start: b.start, end: b.end });
    setMode('edit');
  }

  function saveEdit() {
    const target = current[editing.index];
    if (!target) {
      push('That booking is gone.', 'error');
      setMode('idle');
      return;
    }
    run((s) => {
      // Re-materialise inside the mutator so the id matches the live state.
      const live = bookingsOf(s, day.key)[editing.index];
      if (!live) return { state: s, result: { ok: false, message: 'That booking is gone.', type: 'error' } };
      return editBooking(
        s,
        day.key,
        live.id,
        { groupId: editing.groupId, start: editing.start, end: editing.end },
        viewer.id
      );
    });
  }

  function removeAt(index) {
    run((s) => {
      const live = bookingsOf(s, day.key)[index];
      if (!live) return { state: s, result: { ok: false, message: 'That booking is gone.', type: 'error' } };
      return removeBooking(s, day.key, live.id, viewer.id);
    }, mode === 'edit');
  }

  const canSubmit =
    (mode === 'allday' || mode === 'slot') &&
    Boolean(actingGroupId) &&
    incoming.end > incoming.start &&
    (clashes.length === 0 ||
      ((acknowledged || isAdmin) && (resolution === 'replace' || (resolution === 'swap' && swapKey))));

  const editValid = editing && editing.end > editing.start;
  const editedBooking = mode === 'edit' && editing ? day.bookings[editing.index] : null;

  let footer = null;
  if (mode === 'allday' || mode === 'slot') {
    footer = (
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
    );
  } else if (mode === 'edit') {
    footer = (
      <>
        <button type="button" className="btn btn--secondary pressable" onClick={() => setMode('idle')}>
          Back
        </button>
        <button type="button" className="btn btn--primary pressable" disabled={!editValid} onClick={saveEdit}>
          <Icon name="check" size={16} />
          Save changes
        </button>
      </>
    );
  }

  return (
    <Sheet title={formatLongDate(day.key)} onClose={onClose} footer={footer}>
      {/* ---- Who is on this day ------------------------------------------- */}
      <p className="sheet__text" style={{ marginBottom: 10 }}>
        {relativeLabel(day.key)}
        {day.isPast ? ' - this day has passed' : ''}
        {day.isPast && isAdmin ? '. As admin you can still change it.' : ''}
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
      ) : mode !== 'edit' ? (
        <div className="preview-strip" style={{ marginBottom: 15 }}>
          {day.bookings.map((b, index) => (
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
              {isAdmin ? (
                <button
                  type="button"
                  className="iconbtn pressable"
                  style={{ width: 28, height: 28 }}
                  aria-label={`Edit ${b.label}`}
                  onClick={() => startEdit(index)}
                >
                  <Icon name="pencil" size={13} strokeWidth={2.2} />
                </button>
              ) : null}
              {canChange ? (
                <button
                  type="button"
                  className="iconbtn pressable"
                  style={{ width: 28, height: 28 }}
                  aria-label={`Remove ${b.label}`}
                  onClick={() => removeAt(index)}
                >
                  <Icon name="x" size={12} strokeWidth={2.4} />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {/* ---- Admin: towel duty for everyone on this day -------------------- */}
      {mode === 'idle' && isAdmin && !day.blocked && day.bookings.length > 0 ? (
        <>
          <div className="section-head" style={{ marginTop: 6 }}>
            <h3 className="section-title">Towels on this day</h3>
          </div>
          <div className="rows" style={{ marginBottom: 15 }}>
            {[...new Map(day.bookings.map((b) => [b.groupId, b])).values()].map((b) => (
              <div className="row" key={`towel-${b.groupId}`}>
                <Icon name="towel" size={17} />
                <div className="row__body">
                  <div className="row__title">{b.label}</div>
                  <div className="row__sub">
                    {b.towelsManual ? 'Set by you for this day' : 'Following the weekly rotation'}
                  </div>
                </div>
                <Switch
                  checked={b.towels}
                  label={`Towels for ${b.label}`}
                  onChange={(on) => run((s) => setTowels(s, day.key, b.groupId, on, viewer.id), false)}
                />
              </div>
            ))}
          </div>
        </>
      ) : null}

      {/* ---- Admin: editing one booking ------------------------------------ */}
      {mode === 'edit' && editing ? (
        <div className="sheet__stack">
          <div className="field">
            <label className="field__label" htmlFor="edit-group">User</label>
            <select
              id="edit-group"
              className="select"
              value={editing.groupId}
              onChange={(e) => setEditing((p) => ({ ...p, groupId: e.target.value }))}
            >
              {state.groups.map((g) => (
                <option key={g.id} value={g.id}>{g.label}</option>
              ))}
            </select>
          </div>
          <TimeFields
            idPrefix="edit"
            value={editing}
            onChange={(v) => setEditing((p) => ({ ...p, start: v.start, end: v.end }))}
          />
          <button
            type="button"
            className="btn btn--secondary btn--sm pressable"
            onClick={() => setEditing((p) => ({ ...p, start: DAY_START, end: DAY_END }))}
          >
            <Icon name="calendar" size={14} />
            Make it all day
          </button>
          {editValid ? (
            <p className="field__hint">
              {state.groups.find((g) => g.id === editing.groupId)?.label} · {formatSlot(editing)}.
              Anyone else in that time is trimmed around it.
            </p>
          ) : (
            <p className="field__hint" style={{ color: 'var(--danger)' }}>
              The end time has to be after the start time.
            </p>
          )}
          {editedBooking ? (
            <div className="rows">
              <div className="row">
                <Icon name="towel" size={17} />
                <div className="row__body">
                  <div className="row__title">Towels</div>
                  <div className="row__sub">
                    For {editedBooking.label} on this day. Applies right away.
                  </div>
                </div>
                <Switch
                  checked={editedBooking.towels}
                  label="Towels"
                  onChange={(on) =>
                    run((s) => setTowels(s, day.key, editedBooking.groupId, on, viewer.id), false)
                  }
                />
              </div>
            </div>
          ) : null}
          <button
            type="button"
            className="btn btn--danger btn--block pressable"
            onClick={() => removeAt(editing.index)}
          >
            <Icon name="trash" size={16} />
            Remove this booking
          </button>
        </div>
      ) : null}

      {/* ---- Booking entry point ------------------------------------------ */}
      {mode === 'idle' && canChange && !day.blocked ? (
        <div className="sheet__stack">
          {isAdmin ? (
            <div className="field">
              <label className="field__label" htmlFor="book-as">Book for</label>
              <select
                id="book-as"
                className="select"
                value={bookAs}
                onChange={(e) => setBookAs(e.target.value)}
              >
                {state.groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.label}</option>
                ))}
              </select>
            </div>
          ) : null}
          <button type="button" className="btn btn--primary btn--block pressable" onClick={() => setMode('allday')}>
            <Icon name="calendar" size={16} />
            {isAdmin && actingGroup ? `Book ${actingGroup.label} all day` : 'Book the whole day'}
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
            {isAdmin && actingGroup ? `Book ${actingGroup.label} a time slot` : 'Book a time slot'}
          </button>
        </div>
      ) : null}

      {/* ---- Slot picker --------------------------------------------------- */}
      {mode === 'slot' ? (
        <div className="sheet__stack">
          <TimeFields idPrefix="slot" value={slot} onChange={setSlot} />
          {incoming.end <= incoming.start ? (
            <p className="field__hint" style={{ color: 'var(--danger)' }}>
              The end time has to be after the start time.
            </p>
          ) : (
            <p className="field__hint">
              {isAdmin && actingGroup ? `Booking ${actingGroup.label}` : 'You are booking'} {formatSlot(incoming)}.
            </p>
          )}
        </div>
      ) : null}

      {/* ---- Conflict resolution ------------------------------------------ */}
      {(mode === 'allday' || mode === 'slot') && clashes.length > 0 ? (
        <div className="sheet__stack" style={{ marginTop: 16 }}>
          <div className="callout">
            <div className="callout__title">This time is taken</div>
            {clashLabels.join(' and ')} {clashLabels.length > 1 ? 'have' : 'has'} this time.
            {isAdmin
              ? ' As admin you can take it without asking.'
              : ' Only continue if you have already asked them and they agreed.'}
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
                disabled={otherDays.length === 0}
                onClick={() => setResolution('swap')}
              >
                <Icon name={resolution === 'swap' ? 'check' : 'square'} size={17} />
                <div className="row__body">
                  <div className="row__title">
                    {isAdmin && actingGroup ? `Swap with one of ${actingGroup.label}'s days` : 'Swap with one of my days'}
                  </div>
                  <div className="row__sub">
                    {otherDays.length === 0
                      ? 'There are no other days to offer'
                      : 'They take that day in exchange'}
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
                <option value="">Pick a day</option>
                {otherDays.map(({ day: d, booking }) => (
                  <option key={`${d.key}-${booking.id}`} value={d.key}>
                    {formatShortDate(d.key)} · {formatSlot(booking)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {!isAdmin ? (
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
          ) : null}
        </div>
      ) : null}

      {/* ---- Admin only. Blocking and restoring change the schedule for
           everyone, unlike booking, which only affects the people involved. */}
      {mode === 'idle' && isAdmin ? (
        <>
          <div className="section-head">
            <h3 className="section-title">Admin controls</h3>
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
                <div className="row__sub">Puts this date back to whoever normally has it, with rotation towels</div>
              </div>
            </button>
          </div>
        </>
      ) : null}
    </Sheet>
  );
}
