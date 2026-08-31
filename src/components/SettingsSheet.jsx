import { useState } from 'react';
import Sheet from '../ui/Sheet.jsx';
import Segmented from '../ui/Segmented.jsx';
import Switch from '../ui/Switch.jsx';
import Icon from '../ui/Icon.jsx';
import PinField from '../ui/PinField.jsx';
import { THEME_CATEGORIES, THEMES, previewOf, themesIn } from '../lib/themes.js';
import { ADMIN_USER, resetPin, updateSettings, userLabel } from '../lib/store.js';
import { groupForUser } from '../lib/schedule.js';
import { haptic } from '../lib/haptics.js';

const SCALES = [
  { value: 0.9, label: 'S' },
  { value: 1, label: 'M' },
  { value: 1.15, label: 'L' },
  { value: 1.3, label: 'XL' },
];

/**
 * A miniature of the app drawn in the theme's own colours. Hovering it runs
 * a small shimmer, so the picker previews the theme rather than just naming
 * it.
 */
function ThemeCard({ id, label, selected, onPick }) {
  const p = previewOf(id);
  return (
    <button
      type="button"
      className="theme-card pressable"
      aria-pressed={selected}
      onClick={() => {
        haptic('light');
        onPick(id);
      }}
    >
      <span className="theme-card__preview" style={{ background: p.background }}>
        <span className="theme-card__bar" style={{ background: p.card, border: `1px solid ${p.border}` }} />
        <span className="theme-card__rows">
          <i style={{ background: p.dots[0] }} />
          <i style={{ background: p.dots[1], width: '72%' }} />
          <i style={{ background: p.border, width: '54%' }} />
        </span>
        <span className="theme-card__dots">
          {p.dots.map((c, i) => (
            <i key={i} style={{ background: c }} />
          ))}
        </span>
      </span>
      <span className="theme-card__label">
        {label}
        {selected ? ' · Active' : ''}
      </span>
    </button>
  );
}

export default function SettingsSheet({ state, viewer, dispatch, push, onClose }) {
  const [tab, setTab] = useState('theme');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const s = state.settings;

  const group = groupForUser(state, viewer.id);
  // Text size, contrast and theme are personal. Towel rotation changes the
  // schedule for everyone, so it stays with the admin.
  const isAdmin = viewer.id === ADMIN_USER;

  function set(patch) {
    const r = dispatch((st) => updateSettings(st, patch));
    if (!r.ok) push(r.message, r.type);
  }

  function changePin(event) {
    event.preventDefault();
    if (pin !== pin2) {
      push('Those PINs do not match.', 'error');
      haptic('error');
      return;
    }
    const r = dispatch((st) => resetPin(st, viewer.id, pin));
    push(r.message, r.type);
    haptic(r.ok ? 'success' : 'error');
    if (r.ok) {
      setPin('');
      setPin2('');
    }
  }

  return (
    <Sheet title="Settings" onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 16 }}>
        <Icon name="user" size={17} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="row__title">{userLabel(state, viewer.id)}</div>
          <div className="row__sub">
            @{viewer.id}
            {group ? ` · ${group.label}` : ''}
          </div>
        </div>
      </div>

      <Segmented
        options={[
          { value: 'theme', label: 'Themes' },
          { value: 'access', label: 'Display' },
          { value: 'account', label: 'Account' },
        ]}
        value={tab}
        onChange={setTab}
        label="Settings sections"
      />

      {tab === 'theme' ? (
        <div style={{ marginTop: 16 }}>
          {THEME_CATEGORIES.map((cat) => (
            <div key={cat.id}>
              <div className="section-head">
                <h3 className="section-title">{cat.label}</h3>
              </div>
              <div className="theme-grid">
                {themesIn(cat.id).map((theme) => (
                  <ThemeCard
                    key={theme.id}
                    id={theme.id}
                    label={theme.label}
                    selected={s.theme === theme.id}
                    onPick={(id) => set({ theme: id })}
                  />
                ))}
              </div>
            </div>
          ))}
          <p className="field__hint" style={{ marginTop: 14 }}>
            {Object.keys(THEMES).length} themes. Your pick is saved to your account.
          </p>
        </div>
      ) : null}

      {tab === 'access' ? (
        <div style={{ marginTop: 16 }}>
          <div className="field" style={{ marginBottom: 16 }}>
            <span className="field__label">Text size</span>
            <Segmented
              options={SCALES.map((x) => ({ value: String(x.value), label: x.label }))}
              value={String(s.textScale)}
              onChange={(v) => set({ textScale: Number(v) })}
              label="Text size"
            />
            <p className="field__hint">Scales every text size in the portal at once.</p>
          </div>

          <div className="rows">
            <div className="row">
              <Icon name="contrast" size={17} />
              <div className="row__body">
                <div className="row__title">High contrast</div>
                <div className="row__sub">Stronger borders and brighter text</div>
              </div>
              <Switch
                checked={s.highContrast}
                label="High contrast"
                onChange={(v) => set({ highContrast: v })}
              />
            </div>
            <div className="row">
              <Icon name="sparkle" size={17} />
              <div className="row__body">
                <div className="row__title">Reduce motion</div>
                <div className="row__sub">Turns off animation and background drift</div>
              </div>
              <Switch
                checked={s.reduceMotion}
                label="Reduce motion"
                onChange={(v) => set({ reduceMotion: v })}
              />
            </div>
            {isAdmin ? (
              <div className="row">
                <Icon name="towel" size={17} />
                <div className="row__body">
                  <div className="row__title">Towel rotation</div>
                  <div className="row__sub">
                    Turns towel duty on or off for the whole household
                  </div>
                </div>
                <Switch
                  checked={s.towelRotation}
                  label="Towel rotation"
                  onChange={(v) => set({ towelRotation: v })}
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === 'account' ? (
        <form className="sheet__stack" style={{ marginTop: 16 }} onSubmit={changePin}>
          <PinField label="New PIN" value={pin} onChange={setPin} autoComplete="new-password" />
          <PinField label="Confirm new PIN" value={pin2} onChange={setPin2} autoComplete="new-password" />
          <button
            type="submit"
            className="btn btn--primary btn--block pressable"
            disabled={pin.length !== 4 || pin2.length !== 4}
          >
            <Icon name="lock" size={16} />
            Update my PIN
          </button>
        </form>
      ) : null}
    </Sheet>
  );
}
