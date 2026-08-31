import { haptic } from '../lib/haptics.js';

export default function Switch({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      className="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        haptic('light');
        onChange(!checked);
      }}
    >
      <span className="switch__knob" />
    </button>
  );
}
