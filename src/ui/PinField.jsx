import { useId } from 'react';

/**
 * PIN entry drawn as four filling dots. A real input sits invisibly on top,
 * so hardware keyboards, the iOS numeric keypad, password managers and
 * screen readers all keep working while the visuals stay native-feeling.
 */
export default function PinField({
  value,
  onChange,
  label,
  length = 4,
  autoComplete = 'current-password',
  error = false,
  autoFocus = false,
  onComplete,
}) {
  const id = useId();

  function handleChange(event) {
    const digits = event.target.value.replace(/\D/g, '').slice(0, length);
    onChange(digits);
    if (digits.length === length) onComplete?.(digits);
  }

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className={`pin${error ? ' pin--error' : ''}`}>
        <input
          id={id}
          className="pin__input"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={autoComplete}
          maxLength={length}
          value={value}
          onChange={handleChange}
          autoFocus={autoFocus}
          aria-label={label}
        />
        <div className="pin__dots" aria-hidden="true">
          {Array.from({ length }, (_, i) => (
            <span
              key={i}
              className={`pin__dot${i < value.length ? ' pin__dot--filled' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
