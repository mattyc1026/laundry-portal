import { useMemo, useState } from 'react';
import Segmented from '../ui/Segmented.jsx';
import Icon from '../ui/Icon.jsx';
import Avatar from '../ui/Avatar.jsx';
import { formatTimestamp } from '../lib/date.js';
import { groupForUser } from '../lib/schedule.js';
import { clearLog, userLabel } from '../lib/store.js';
import { haptic } from '../lib/haptics.js';

const TABS = [
  { value: 'people', label: 'Users' },
  { value: 'history', label: 'History' },
];

const ACTION_LABEL = {
  book: 'Booked',
  replace: 'Took time',
  swap: 'Swapped',
  remove: 'Removed a booking',
  edit: 'Edited a booking',
  block: 'Blocked a day',
  unblock: 'Unblocked a day',
  reset: 'Restored a day',
  signup: 'Registered',
  signin: 'Signed in',
  'pin-reset': 'Reset a PIN',
  'clear-log': 'Cleared history',
};

/**
 * Read-only oversight for matthewc. Everything that changes the schedule is
 * done from the day itself, by whoever needs it, so nothing here edits the
 * calendar.
 */
export default function AdminScreen({ state, viewer, dispatch, push }) {
  const [tab, setTab] = useState('people');
  const [confirmClear, setConfirmClear] = useState(false);

  const registered = useMemo(() => state.users.filter((u) => u.pin), [state.users]);
  const pending = useMemo(() => state.users.filter((u) => !u.pin), [state.users]);

  return (
    <div className="screen">
      <div className="page-head">
        <h1 className="page-title">Admin</h1>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <div className="stat__value">{registered.length}</div>
          <div className="stat__label">Registered</div>
        </div>
        <div className="stat">
          <div className="stat__value">{pending.length}</div>
          <div className="stat__label">Not signed up</div>
        </div>
        <div className="stat">
          <div className="stat__value">{state.log.length}</div>
          <div className="stat__label">Logged actions</div>
        </div>
      </div>

      <Segmented options={TABS} value={tab} onChange={setTab} label="Admin sections" />

      {tab === 'people' ? (
        <div style={{ marginTop: 18 }}>
          <div className="section-head"><h2 className="section-title">Signed up</h2></div>
          <div className="rows">
            {registered.map((user) => {
              const group = groupForUser(state, user.id);
              return (
                <div className="row" key={user.id}>
                  <Avatar name={userLabel(state, user.id)} color={group?.color} size="sm" />
                  <div className="row__body">
                    <div className="row__title">{userLabel(state, user.id)}</div>
                    <div className="row__sub">
                      @{user.id}
                      {group ? ` · shows as ${group.label}` : ' · not on the calendar'}
                    </div>
                  </div>
                  {user.createdAt ? (
                    <span className="bkg__time">{formatTimestamp(user.createdAt)}</span>
                  ) : (
                    <span className="bkg__time">seeded</span>
                  )}
                </div>
              );
            })}
          </div>

          {pending.length > 0 ? (
            <>
              <div className="section-head"><h2 className="section-title">Yet to sign up</h2></div>
              <div className="rows">
                {pending.map((user) => (
                  <div className="row" key={user.id}>
                    <Icon name="user" size={17} />
                    <div className="row__body">
                      <div className="row__title">{userLabel(state, user.id)}</div>
                      <div className="row__sub">@{user.id} · no PIN set yet</div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="field__hint" style={{ marginTop: 8 }}>
                These usernames are reserved. Each person claims theirs by registering.
              </p>
            </>
          ) : null}
        </div>
      ) : null}

      {tab === 'history' ? (
        <div style={{ marginTop: 18 }}>
          <div className="section-head">
            <h2 className="section-title">Activity</h2>
            {state.log.length > 0 ? (
              confirmClear ? (
                <div className="btn-row">
                  <button
                    type="button"
                    className="btn btn--danger btn--sm pressable"
                    onClick={() => {
                      const r = dispatch((s) => clearLog(s, viewer.id));
                      push(r.message, r.type);
                      haptic('warning');
                      setConfirmClear(false);
                    }}
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm pressable"
                    onClick={() => setConfirmClear(false)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm pressable"
                  onClick={() => setConfirmClear(true)}
                >
                  <Icon name="trash" size={14} />
                  Clear
                </button>
              )
            ) : null}
          </div>

          {state.log.length === 0 ? (
            <div className="empty">
              <span className="empty__icon"><Icon name="history" size={22} /></span>
              <p className="empty__title">Nothing logged yet</p>
              <p className="empty__text">Bookings, swaps and blocks will appear here.</p>
            </div>
          ) : (
            <div className="rows">
              {state.log.map((entry) => (
                <div className="logline" key={entry.id}>
                  <span className="logline__dot" />
                  <div className="logline__body">
                    <div className="logline__top">
                      <strong>{userLabel(state, entry.actorId)}</strong>{' '}
                      {(ACTION_LABEL[entry.action] || entry.action).toLowerCase()}
                    </div>
                    <div className="logline__meta">
                      {entry.detail} · {formatTimestamp(entry.at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
