import { useMemo, useState } from 'react';
import Segmented from '../ui/Segmented.jsx';
import Icon from '../ui/Icon.jsx';
import Avatar from '../ui/Avatar.jsx';
import { formatTimestamp } from '../lib/date.js';
import { activeGroups, findGroup, groupForUser, TOWEL_MODES } from '../lib/schedule.js';
import {
  clearLog,
  createGroup,
  dismantleGroup,
  setGroupDay,
  setGroupTowels,
  setUserGroup,
  updateGroup,
  userLabel,
} from '../lib/store.js';
import { haptic } from '../lib/haptics.js';

const TABS = [
  { value: 'people', label: 'Users' },
  { value: 'groups', label: 'Groups' },
  { value: 'history', label: 'History' },
];

const DOW_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const COLOR_SWATCHES = [
  '#ff375f', '#ff9f0a', '#c8b400', '#30d158',
  '#00b8c4', '#0a84ff', '#5e5ce6', '#bf5af2',
];

/** Which weekday, if any, a group currently auto books. */
function dayFor(state, groupId) {
  const i = state.rotation.findIndex((g) => g === groupId);
  return i >= 0 ? i : null;
}

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
  'towels-on': 'Turned towels on',
  'towels-off': 'Turned towels off',
  'group-create': 'Created a group',
  'group-edit': 'Edited a group',
  'group-day': 'Changed a recurring day',
  'group-towels': 'Changed group towel duty',
  'group-member': 'Moved someone between groups',
  'group-dismantle': 'Dismantled a group',
};

/**
 * Oversight for matthewc. Schedule changes, including the admin's full
 * control over everyone's bookings and towels, happen from the day itself.
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

      {tab === 'groups' ? (
        <GroupsPanel state={state} viewer={viewer} dispatch={dispatch} push={push} />
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
            <div className="rows history-scroll" tabIndex={0} aria-label="Activity history">
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

/**
 * Everything the admin can control about how a group shows up on the
 * calendar: its name, colour, recurring weekday, towel duty, and members.
 * Dismantling a group here never touches any booking already on the
 * calendar, only the recurring day going forward.
 */
function GroupsPanel({ state, viewer, dispatch, push }) {
  const groups = useMemo(() => activeGroups(state), [state]);
  const unassigned = useMemo(
    () => state.users.filter((u) => u.pin && !groupForUser(state, u.id)),
    [state]
  );
  const [creating, setCreating] = useState(false);

  function run(action) {
    const r = dispatch((s) => action(s, viewer.id));
    push(r.message, r.type);
    haptic(r.ok === false ? 'warning' : 'light');
    return r;
  }

  return (
    <div style={{ marginTop: 18 }}>
      <div className="section-head">
        <h2 className="section-title">Groups</h2>
        <button
          type="button"
          className="btn btn--ghost btn--sm pressable"
          onClick={() => setCreating((v) => !v)}
        >
          <Icon name="plus" size={14} />
          New group
        </button>
      </div>

      {creating ? (
        <NewGroupForm
          state={state}
          unassigned={unassigned}
          onCancel={() => setCreating(false)}
          onCreate={(fields) => {
            const r = run((s, actorId) => createGroup(s, fields, actorId));
            if (r.ok !== false) setCreating(false);
          }}
        />
      ) : null}

      <div className="rows">
        {groups.map((group) => (
          <GroupCard
            key={group.id}
            state={state}
            group={group}
            unassigned={unassigned}
            run={run}
          />
        ))}
      </div>

      {unassigned.length > 0 ? (
        <>
          <div className="section-head" style={{ marginTop: 18 }}>
            <h2 className="section-title">Not in a group</h2>
          </div>
          <p className="field__hint">
            {unassigned.map((u) => userLabel(state, u.id)).join(', ')} do not appear on the
            calendar until added to a group.
          </p>
        </>
      ) : null}
    </div>
  );
}

function NewGroupForm({ state, unassigned, onCancel, onCreate }) {
  const [label, setLabel] = useState('');
  const [color, setColor] = useState(COLOR_SWATCHES[0]);
  const [members, setMembers] = useState([]);

  return (
    <div className="card card--pad" style={{ marginBottom: 14 }}>
      <div className="field">
        <label className="field__label" htmlFor="new-group-name">Group name</label>
        <input
          id="new-group-name"
          className="input"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Scott + Starla + Michael"
        />
      </div>

      <div className="field">
        <span className="field__label">Color</span>
        <ColorSwatches value={color} onChange={setColor} />
      </div>

      <div className="field">
        <span className="field__label">Members</span>
        {unassigned.length === 0 ? (
          <p className="field__hint">Everyone is already in a group.</p>
        ) : (
          <div className="rows">
            {unassigned.map((u) => (
              <label className="check-row" key={u.id}>
                <input
                  type="checkbox"
                  checked={members.includes(u.id)}
                  onChange={(e) =>
                    setMembers((prev) =>
                      e.target.checked ? [...prev, u.id] : prev.filter((m) => m !== u.id)
                    )
                  }
                />
                {userLabel(state, u.id)}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="btn-row">
        <button
          type="button"
          className="btn btn--primary btn--sm pressable"
          disabled={!label.trim() || members.length === 0}
          onClick={() => onCreate({ label, color, members })}
        >
          Create
        </button>
        <button type="button" className="btn btn--ghost btn--sm pressable" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function ColorSwatches({ value, onChange }) {
  return (
    <div className="chip-row" role="group" aria-label="Color">
      {COLOR_SWATCHES.map((c) => (
        <button
          key={c}
          type="button"
          className="iconbtn pressable"
          aria-label={c}
          aria-pressed={value === c}
          onClick={() => onChange(c)}
          style={{
            background: c,
            borderRadius: '50%',
            width: 28,
            height: 28,
            border: value === c ? '2px solid var(--text)' : '2px solid transparent',
          }}
        />
      ))}
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Custom color"
        style={{ width: 28, height: 28, padding: 0, border: 'none', background: 'none' }}
      />
    </div>
  );
}

function GroupCard({ state, group, unassigned, run }) {
  const [label, setLabel] = useState(group.label);
  const [confirmDismantle, setConfirmDismantle] = useState(false);
  const [addingMember, setAddingMember] = useState('');
  const day = dayFor(state, group.id);

  function saveLabelIfChanged() {
    const trimmed = label.trim();
    if (trimmed && trimmed !== group.label) {
      run((s, actorId) => updateGroup(s, group.id, { label: trimmed }, actorId));
    } else {
      setLabel(group.label);
    }
  }

  return (
    <div className="card card--pad" style={{ marginBottom: 14 }}>
      <div className="field">
        <label className="field__label" htmlFor={`label-${group.id}`}>Name</label>
        <input
          id={`label-${group.id}`}
          className="input"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={saveLabelIfChanged}
        />
      </div>

      <div className="field">
        <span className="field__label">Color</span>
        <ColorSwatches
          value={group.color}
          onChange={(color) => run((s, actorId) => updateGroup(s, group.id, { color }, actorId))}
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor={`day-${group.id}`}>Recurring day</label>
        <select
          id={`day-${group.id}`}
          className="select"
          value={day === null ? '' : String(day)}
          onChange={(e) => {
            const v = e.target.value;
            run((s, actorId) => setGroupDay(s, group.id, v === '' ? null : Number(v), actorId));
          }}
        >
          <option value="">None</option>
          {DOW_LABELS.map((d, i) => (
            <option key={d} value={i}>{d}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="field__label" htmlFor={`towels-${group.id}`}>Towel duty</label>
        <select
          id={`towels-${group.id}`}
          className="select"
          value={group.towels}
          onChange={(e) =>
            run((s, actorId) => setGroupTowels(s, group.id, e.target.value, actorId))
          }
        >
          {TOWEL_MODES.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <span className="field__label">Members</span>
        <div className="rows">
          {group.members.map((m) => (
            <div className="row" key={m}>
              <Avatar name={userLabel(state, m)} color={group.color} size="sm" />
              <div className="row__body">
                <div className="row__title">{userLabel(state, m)}</div>
              </div>
              <button
                type="button"
                className="iconbtn pressable"
                aria-label={`Remove ${userLabel(state, m)} from ${group.label}`}
                onClick={() => run((s, actorId) => setUserGroup(s, m, null, actorId))}
              >
                <Icon name="x" size={16} />
              </button>
            </div>
          ))}
        </div>

        {unassigned.length > 0 ? (
          <div className="btn-row" style={{ marginTop: 8 }}>
            <select
              className="select"
              value={addingMember}
              onChange={(e) => setAddingMember(e.target.value)}
              aria-label={`Add someone to ${group.label}`}
            >
              <option value="">Add someone…</option>
              {unassigned.map((u) => (
                <option key={u.id} value={u.id}>{userLabel(state, u.id)}</option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn--secondary btn--sm pressable"
              disabled={!addingMember}
              onClick={() => {
                run((s, actorId) => setUserGroup(s, addingMember, group.id, actorId));
                setAddingMember('');
              }}
            >
              Add
            </button>
          </div>
        ) : null}
      </div>

      <div className="btn-row" style={{ marginTop: 4 }}>
        {confirmDismantle ? (
          <>
            <button
              type="button"
              className="btn btn--danger btn--sm pressable"
              onClick={() => {
                run((s, actorId) => dismantleGroup(s, group.id, actorId));
                setConfirmDismantle(false);
              }}
            >
              Confirm dismantle
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm pressable"
              onClick={() => setConfirmDismantle(false)}
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn btn--ghost btn--sm pressable"
            onClick={() => setConfirmDismantle(true)}
          >
            <Icon name="trash" size={14} />
            Dismantle group
          </button>
        )}
      </div>
      <p className="field__hint">
        Dismantling removes this group's recurring day and members only. Bookings already on the
        calendar are not changed.
      </p>
    </div>
  );
}
