import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AppShell from './components/AppShell.jsx';
import SettingsSheet from './components/SettingsSheet.jsx';
import TowelBanner from './components/TowelBanner.jsx';
import WelcomeTip from './components/WelcomeTip.jsx';
import AuthScreen from './screens/AuthScreen.jsx';
import CalendarScreen from './screens/CalendarScreen.jsx';
import HelpScreen from './screens/HelpScreen.jsx';
import AdminScreen from './screens/AdminScreen.jsx';
import ToastStack from './ui/Toast.jsx';
import { useToasts } from './hooks/useToasts.js';
import { applyAccessibility, applyTheme } from './lib/themes.js';
import {
  ensureAccounts,
  pushChanges,
  seedIfEmpty,
  subscribePortal,
  trackPresence,
} from './lib/sync.js';
import { groupForUser, nextTowelDay } from './lib/schedule.js';
import { todayKey } from './lib/date.js';
import {
  ADMIN_USER,
  defaultState,
  loadSession,
  loadState,
  recordSignIn,
  saveSession,
  saveState,
  SESSION_KEY,
  STORAGE_KEY,
  userLabel,
} from './lib/store.js';

export default function App() {
  const [state, setState] = useState(loadState);
  const [sessionId, setSessionId] = useState(() => loadSession()?.userId || null);
  const [view, setView] = useState('calendar');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [bannerHidden, setBannerHidden] = useState(false);
  const [status, setStatus] = useState('connecting');
  const [, setStamp] = useState(todayKey);

  const { toasts, push, dismiss } = useToasts();
  const writing = useRef(false);
  const applyingRemote = useRef(false);

  // Always the newest state, so dispatch can return a result synchronously.
  const stateRef = useRef(state);
  stateRef.current = state;
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  /* ---- Persistence ----------------------------------------------------- */

  /* localStorage is a cache, not the source of truth. It paints the last
     known schedule instantly on load and keeps the app usable offline; the
     database overwrites it as soon as the first snapshot lands. */
  useEffect(() => { saveState(state); }, [state]);

  useEffect(() => { saveSession(sessionId); }, [sessionId]);

  /* The live subscription. Remote snapshots are applied with the echo guard
     set so they are never pushed straight back to the database. */
  useEffect(() => {
    setStatus('connecting');
    const stop = subscribePortal({
      userId: sessionId,
      fallback: stateRef.current,
      onStatus: setStatus,
      onState: (remote) => {
        applyingRemote.current = true;
        stateRef.current = remote;
        setState(remote);
        applyingRemote.current = false;
      },
    });
    return stop;
  }, [sessionId]);

  /* Seed an empty database from whatever this device already has, so the
     first person to open the portal populates it rather than finding it
     blank. Runs once. */
  useEffect(() => {
    const seeded = defaultState();
    seedIfEmpty(stateRef.current)
      .then(() => ensureAccounts(seeded.users))
      .catch(() => {});
  }, []);

  useEffect(() => trackPresence(sessionId), [sessionId]);

  /* Other tabs on this device stay in step even while offline. */
  useEffect(() => {
    function onStorage(event) {
      if (event.key === STORAGE_KEY && !writing.current) setState(loadState());
      if (event.key === SESSION_KEY) setSessionId(loadSession()?.userId || null);
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  /* Theme and accessibility live on the root element. */
  useEffect(() => { applyTheme(state.settings.theme); }, [state.settings.theme]);
  useEffect(() => {
    applyAccessibility({
      textScale: state.settings.textScale,
      highContrast: state.settings.highContrast,
      reduceMotion: state.settings.reduceMotion,
    });
  }, [state.settings.textScale, state.settings.highContrast, state.settings.reduceMotion]);

  /* Roll the calendar over when the date changes or the tab regains focus. */
  useEffect(() => {
    const sync = () => setStamp((prev) => (prev === todayKey() ? prev : todayKey()));
    const interval = setInterval(sync, 60000);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', sync);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  /* ---- Derived --------------------------------------------------------- */

  const viewer = useMemo(() => {
    const user = state.users.find((u) => u.id === sessionId);
    return user && user.pin ? user : null;
  }, [state.users, sessionId]);

  const group = useMemo(
    () => (viewer ? groupForUser(state, viewer.id) : null),
    [state, viewer]
  );

  const towel = useMemo(
    () => (viewer ? nextTowelDay(state, viewer.id) : null),
    [state, viewer]
  );

  /**
   * The single mutation point. Mutators are pure, so the result is available
   * immediately for the toast while the write goes out in the background.
   *
   * Pushing here rather than from an effect on state is what keeps remote
   * snapshots from bouncing back to the database as fresh local writes.
   */
  const commit = useCallback((next, actorId) => {
    const prev = stateRef.current;
    stateRef.current = next;
    setState(next);
    if (!applyingRemote.current) {
      pushChanges(prev, next, actorId).then((out) => {
        if (!out.ok && out.reason !== 'offline') setStatus('error');
      });
    }
  }, []);

  const dispatch = useCallback(
    (mutator) => {
      const { state: next, result } = mutator(stateRef.current);
      if (result.ok) commit(next, stateRef.current.users.find((u) => u.id === sessionIdRef.current)?.id);
      return result;
    },
    [commit]
  );

  const isAdmin = viewer?.id === ADMIN_USER;

  useEffect(() => {
    if (view === 'admin' && !isAdmin) setView('calendar');
  }, [view, isAdmin]);

  function signIn(id) {
    commit(recordSignIn(stateRef.current, id), id);
    setSessionId(id);
    setView('calendar');
    setBannerHidden(false);
    setTipOpen(true);
  }

  /* ---- Render ---------------------------------------------------------- */

  if (!viewer) {
    return (
      <>
        <AuthScreen state={state} dispatch={dispatch} push={push} onSignedIn={signIn} />
        <ToastStack toasts={toasts} onDismiss={dismiss} />
      </>
    );
  }

  return (
    <>
      <AppShell
        viewerName={userLabel(state, viewer.id)}
        viewerColor={group?.color}
        householdName={state.settings.householdName}
        view={view}
        onNavigate={setView}
        showAdmin={isAdmin}
        status={status}
        onOpenSettings={() => setSettingsOpen(true)}
        onSignOut={() => {
          setSessionId(null);
          setView('calendar');
          push('Signed out.', 'info');
        }}
      >
        {view === 'calendar' ? (
          <>
            {!bannerHidden ? (
              <TowelBanner towel={towel} onDismiss={() => setBannerHidden(true)} />
            ) : null}
            <CalendarScreen state={state} viewer={viewer} dispatch={dispatch} push={push} />
          </>
        ) : null}

        {view === 'help' ? <HelpScreen /> : null}

        {view === 'admin' && isAdmin ? (
          <AdminScreen state={state} viewer={viewer} dispatch={dispatch} push={push} />
        ) : null}
      </AppShell>

      {settingsOpen ? (
        <SettingsSheet
          state={state}
          viewer={viewer}
          dispatch={dispatch}
          push={push}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}

      {tipOpen ? (
        <WelcomeTip
          name={viewer.firstName || viewer.id}
          onHelp={() => { setTipOpen(false); setView('help'); }}
          onClose={() => setTipOpen(false)}
        />
      ) : null}

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
