import { useEffect, useMemo, useState } from 'react';
import Segmented from '../ui/Segmented.jsx';
import Icon from '../ui/Icon.jsx';
import DaySheet from '../components/DaySheet.jsx';
import {
  DAY_ABBR,
  addDays,
  formatLongDate,
  formatWeekRange,
  startOfWeek,
  toKey,
  todayKey,
} from '../lib/date.js';
import { formatMinutes, formatSlot } from '../lib/time.js';
import { groupForUser, resolveDay, resolveWeek, windowWeeks } from '../lib/schedule.js';
import { haptic } from '../lib/haptics.js';

const VIEWS = [
  { value: 'six', label: '6 Weeks' },
  { value: 'week', label: 'Week' },
  { value: 'day', label: 'Day' },
];

/* ---- One booking line. Never more than a single row, whatever the day holds. */
function BookingLine({ booking, mine }) {
  return (
    <span
      className={`bkg${mine ? ' bkg--mine' : ''}`}
      style={{ '--slot-color': booking.group?.color || 'var(--accent)' }}
    >
      <span className="bkg__name">{booking.label}</span>
      {booking.towels ? (
        <span className="towel-badge">
          <Icon name="towel" size={9} strokeWidth={2.4} />
          Towels
        </span>
      ) : null}
      <span className={`bkg__time${booking.allDay ? ' bkg__time--allday' : ''}`}>
        {formatSlot(booking)}
      </span>
    </span>
  );
}

function DayCell({ day, myGroupId, onOpen }) {
  const classes = [
    'daycell',
    day.isPast ? 'daycell--past' : '',
    day.isToday ? 'daycell--today' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classes}
      onClick={() => {
        haptic('light');
        onOpen(day.key);
      }}
      aria-label={`${DAY_ABBR[day.dow]} ${day.date.getDate()}, ${
        day.blocked ? 'blocked' : day.bookings.map((b) => b.label).join(', ') || 'open'
      }`}
    >
      <span className="daycell__date">
        <span className="daycell__dow">{DAY_ABBR[day.dow]}</span>
        <span className="daycell__num">{day.date.getDate()}</span>
      </span>
      <span className="daycell__stack">
        {day.blocked ? (
          <span className="daycell__blocked">
            <Icon name="ban" size={12} strokeWidth={2.2} />
            Blocked
          </span>
        ) : day.bookings.length === 0 ? (
          <span className="daycell__empty">Tap to book</span>
        ) : (
          day.bookings.map((b) => (
            <BookingLine key={b.id} booking={b} mine={b.groupId === myGroupId} />
          ))
        )}
      </span>
    </button>
  );
}

function WeekCard({ weekStart, days, myGroupId, onOpen, tag, delay }) {
  return (
    <section className="week" style={{ animationDelay: `${delay}ms` }}>
      <header className="week__head">
        <h2 className="week__label">{formatWeekRange(weekStart)}</h2>
        {tag ? <span className="week__tag">{tag}</span> : null}
      </header>
      {days.map((day) => (
        <DayCell key={day.key} day={day} myGroupId={myGroupId} onOpen={onOpen} />
      ))}
    </section>
  );
}

/* ---- Day view: bookings as blocks spanning their allotted time ------------ */

const HOUR_H = 52;
const START_HOUR = 6;
const END_HOUR = 24;

function DayView({ day, myGroupId, onOpen }) {
  const hours = [];
  for (let h = START_HOUR; h <= END_HOUR; h += 1) hours.push(h);

  const top = (mins) => ((Math.max(mins, START_HOUR * 60) - START_HOUR * 60) / 60) * HOUR_H;
  const height = (b) =>
    Math.max(22, top(Math.min(b.end, END_HOUR * 60)) - top(Math.max(b.start, START_HOUR * 60)));

  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const showNow = day.isToday && nowMins >= START_HOUR * 60;

  return (
    <div className="dayview">
      <header className="dayview__head">
        <h2 className="dayview__title">{formatLongDate(day.key)}</h2>
        <button
          type="button"
          className="btn btn--primary btn--sm pressable"
          style={{ marginLeft: 'auto' }}
          onClick={() => onOpen(day.key)}
        >
          <Icon name="plus" size={14} />
          Book
        </button>
      </header>

      {day.blocked ? (
        <div className="daycell__blocked" style={{ padding: '20px' }}>
          <Icon name="ban" size={15} strokeWidth={2.2} />
          This day is blocked
        </div>
      ) : (
        <div className="dayview__body">
          <div className="hours">
            {hours.map((h) => (
              <div className="hour" key={h} style={{ height: HOUR_H }}>
                <span>{formatMinutes(h * 60).replace(':00', '')}</span>
              </div>
            ))}
          </div>
          <div className="track" style={{ height: (END_HOUR - START_HOUR) * HOUR_H }}>
            {hours.map((h, i) => (
              <div className="track__line" key={h} style={{ top: i * HOUR_H }} />
            ))}
            {showNow ? <div className="track__now" style={{ top: top(nowMins) }} /> : null}

            {day.bookings.map((b) => {
              const h = height(b);
              return (
                <button
                  type="button"
                  key={b.id}
                  className={`tblock${h < 44 ? ' tblock--tight' : ''}`}
                  style={{
                    top: top(Math.max(b.start, START_HOUR * 60)),
                    height: h,
                    '--slot-color': b.group?.color || 'var(--accent)',
                  }}
                  onClick={() => {
                    haptic('light');
                    onOpen(day.key);
                  }}
                >
                  <span className="tblock__name">{b.label}</span>
                  <span className="tblock__meta">
                    {formatSlot(b)}
                    {b.towels ? (
                      <span className="towel-badge">
                        <Icon name="towel" size={9} strokeWidth={2.4} />
                        Towels
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}

            {day.bookings.length === 0 ? (
              <div className="daycell__empty" style={{ padding: 20 }}>
                Nothing booked. Tap Book to take this day.
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Screen -------------------------------------------------------------- */

export default function CalendarScreen({ state, viewer, dispatch, push }) {
  const [view, setView] = useState('six');
  const [cursor, setCursor] = useState(() => todayKey());
  const [openKey, setOpenKey] = useState(null);

  const today = todayKey();
  const myGroup = groupForUser(state, viewer.id);
  const myGroupId = myGroup?.id || null;

  // The six week window is always anchored to the current week, so a week
  // that ends drops off the top and a new one appears at the bottom.
  const weeks = useMemo(
    () =>
      windowWeeks(6).map((weekStart) => ({
        weekStart,
        key: toKey(weekStart),
        days: resolveWeek(state, weekStart, today),
      })),
    [state, today]
  );

  const weekOfCursor = useMemo(() => {
    const start = startOfWeek(new Date(`${cursor}T12:00:00`));
    return { weekStart: start, days: resolveWeek(state, start, today) };
  }, [state, cursor, today]);

  const dayOfCursor = useMemo(() => resolveDay(state, cursor, today), [state, cursor, today]);

  // Live day read from state, so an edit inside the sheet shows immediately.
  const activeDay = useMemo(
    () => (openKey ? resolveDay(state, openKey, today) : null),
    [openKey, state, today]
  );

  useEffect(() => {
    if (view !== 'six' && cursor < today) setCursor(today);
  }, [view, cursor, today]);

  function step(days) {
    haptic('light');
    setCursor(toKey(addDays(new Date(`${cursor}T12:00:00`), days)));
  }

  return (
    <div className="screen">
      <div className="page-head">
        <h1 className="page-title">Schedule</h1>
        <p className="page-sub">Tap any day to book it, take a slot, or block it.</p>
      </div>

      <Segmented options={VIEWS} value={view} onChange={setView} label="Calendar view" />

      {view !== 'six' ? (
        <div className="btn-row" style={{ margin: '14px 0 0', flexWrap: 'nowrap' }}>
          <button
            type="button"
            className="btn btn--secondary btn--sm pressable"
            style={{ flex: '0 0 auto' }}
            onClick={() => step(view === 'day' ? -1 : -7)}
            aria-label="Previous"
          >
            <Icon name="arrowLeft" size={15} />
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm pressable"
            onClick={() => setCursor(today)}
          >
            Today
          </button>
          <button
            type="button"
            className="btn btn--secondary btn--sm pressable"
            style={{ flex: '0 0 auto' }}
            onClick={() => step(view === 'day' ? 1 : 7)}
            aria-label="Next"
          >
            <Icon name="chevronRight" size={15} />
          </button>
        </div>
      ) : null}

      <div style={{ marginTop: 16 }}>
        {view === 'six' ? (
          <div className="cal-grid">
            {weeks.map((w, i) => (
              <WeekCard
                key={w.key}
                weekStart={w.weekStart}
                days={w.days}
                myGroupId={myGroupId}
                onOpen={setOpenKey}
                tag={i === 0 ? 'This week' : null}
                delay={Math.min(i * 45, 260)}
              />
            ))}
          </div>
        ) : null}

        {view === 'week' ? (
          <div className="cal-grid cal-grid--single">
            <WeekCard
              weekStart={weekOfCursor.weekStart}
              days={weekOfCursor.days}
              myGroupId={myGroupId}
              onOpen={setOpenKey}
              tag={toKey(weekOfCursor.weekStart) === toKey(startOfWeek(new Date())) ? 'This week' : null}
              delay={0}
            />
          </div>
        ) : null}

        {view === 'day' && dayOfCursor ? (
          <DayView day={dayOfCursor} myGroupId={myGroupId} onOpen={setOpenKey} />
        ) : null}
      </div>

      {activeDay ? (
        <DaySheet
          day={activeDay}
          state={state}
          viewer={viewer}
          dispatch={dispatch}
          push={push}
          onClose={() => setOpenKey(null)}
        />
      ) : null}
    </div>
  );
}
