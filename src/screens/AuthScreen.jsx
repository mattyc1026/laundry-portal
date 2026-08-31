import { useState } from 'react';
import Segmented from '../ui/Segmented.jsx';
import PinField from '../ui/PinField.jsx';
import Icon from '../ui/Icon.jsx';
import { resetPin, signUp } from '../lib/store.js';
import { haptic } from '../lib/haptics.js';
import iconUrl from '../assets/app-icon.png';

const MODES = [
  { value: 'signin', label: 'Sign In' },
  { value: 'register', label: 'Register' },
  { value: 'reset', label: 'Reset PIN' },
];

export default function AuthScreen({ state, dispatch, push, onSignedIn }) {
  const [mode, setMode] = useState('signin');
  const [shake, setShake] = useState(false);

  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');

  function reject(message) {
    setShake(true);
    haptic('error');
    push(message, 'error');
    setTimeout(() => setShake(false), 460);
  }

  function switchMode(next) {
    setMode(next);
    setPin('');
    setPin2('');
  }

  function handleSignIn(event) {
    event.preventDefault();
    const id = username.trim().toLowerCase();
    const user = state.users.find((u) => u.id === id);
    if (!user || !user.pin || user.pin !== pin) {
      setPin('');
      reject('That username and PIN do not match.');
      return;
    }
    haptic('success');
    onSignedIn(user.id);
  }

  function handleRegister(event) {
    event.preventDefault();
    if (pin !== pin2) {
      reject('Those PINs do not match.');
      return;
    }
    const result = dispatch((s) =>
      signUp(s, { id: username, firstName: first, lastName: last, pin })
    );
    if (!result.ok) {
      reject(result.message);
      return;
    }
    push(result.message, 'success');
    haptic('success');
    onSignedIn(username.trim().toLowerCase());
  }

  function handleReset(event) {
    event.preventDefault();
    const id = username.trim().toLowerCase();
    if (!state.users.some((u) => u.id === id)) {
      reject('No account with that username.');
      return;
    }
    if (pin !== pin2) {
      reject('Those PINs do not match.');
      return;
    }
    const result = dispatch((s) => resetPin(s, id, pin));
    if (!result.ok) {
      reject(result.message);
      return;
    }
    push('PIN reset. You can sign in now.', 'success');
    haptic('success');
    switchMode('signin');
  }

  const usernameField = (
    <div className="field">
      <label className="field__label" htmlFor="username">Username</label>
      <input
        id="username"
        className="input"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck="false"
      />
    </div>
  );

  return (
    <div className="auth">
      <div className={`auth__card${shake ? ' pin--error' : ''}`}>
        <div className="auth__logo">
          <img className="auth__mark" src={iconUrl} alt="" width="78" height="78" />
          <div>
            <h1 className="auth__title">{state.settings.householdName}</h1>
            <p className="auth__sub">Laundry Portal</p>
          </div>
        </div>

        <Segmented options={MODES} value={mode} onChange={switchMode} label="Sign in, register or reset" />

        {mode === 'signin' ? (
          <form className="auth__form" onSubmit={handleSignIn}>
            {usernameField}
            <PinField label="4 digit PIN" value={pin} onChange={setPin} />
            <button type="submit" className="btn btn--primary btn--lg btn--block pressable">
              <Icon name="lock" size={16} />
              Sign In
            </button>
          </form>
        ) : null}

        {mode === 'register' ? (
          <form className="auth__form" onSubmit={handleRegister}>
            <div className="auth__grid2">
              <div className="field">
                <label className="field__label" htmlFor="first">First name</label>
                <input id="first" className="input" value={first} onChange={(e) => setFirst(e.target.value)} autoComplete="given-name" />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="last">Last name</label>
                <input id="last" className="input" value={last} onChange={(e) => setLast(e.target.value)} autoComplete="family-name" />
              </div>
            </div>
            {usernameField}
            <p className="field__hint" style={{ marginTop: -6 }}>
              If your name is already on the calendar, use the username the
              household set up so your days stay yours.
            </p>
            <PinField label="Create a PIN" value={pin} onChange={setPin} autoComplete="new-password" />
            <PinField label="Confirm your PIN" value={pin2} onChange={setPin2} autoComplete="new-password" />
            <button type="submit" className="btn btn--primary btn--lg btn--block pressable">
              <Icon name="sparkle" size={16} />
              Create Account
            </button>
          </form>
        ) : null}

        {mode === 'reset' ? (
          <form className="auth__form" onSubmit={handleReset}>
            {usernameField}
            <PinField label="New PIN" value={pin} onChange={setPin} autoComplete="new-password" />
            <PinField label="Confirm new PIN" value={pin2} onChange={setPin2} autoComplete="new-password" />
            <button type="submit" className="btn btn--primary btn--lg btn--block pressable">
              <Icon name="refresh" size={16} />
              Reset My PIN
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
