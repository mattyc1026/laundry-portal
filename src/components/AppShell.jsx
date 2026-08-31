import { useEffect, useState } from 'react';
import Icon from '../ui/Icon.jsx';
import Avatar from '../ui/Avatar.jsx';
import { haptic } from '../lib/haptics.js';
import iconUrl from '../assets/app-icon.png';

const SYNC_LABEL = {
  online: 'Synced with everyone',
  connecting: 'Connecting',
  offline: 'Offline, changes saved on this device',
  error: 'Sync problem, changes saved on this device',
};

/** Small live indicator so people can tell whether others are seeing their
    changes yet. */
function SyncDot({ status }) {
  return (
    <span
      className={`syncdot syncdot--${status}`}
      title={SYNC_LABEL[status] || status}
      role="status"
      aria-label={SYNC_LABEL[status] || status}
    />
  );
}

export default function AppShell({
  viewerName, viewerColor, householdName, view, onNavigate,
  showAdmin, status, onOpenSettings, onSignOut, children,
}) {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const tabs = [
    { id: 'calendar', label: 'Calendar', icon: 'calendar' },
    { id: 'help', label: 'Help', icon: 'help' },
    ...(showAdmin ? [{ id: 'admin', label: 'Admin', icon: 'people' }] : []),
  ];

  function go(id) {
    if (id !== view) haptic('light');
    onNavigate(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="shell">
      <header className="topbar" data-stuck={stuck}>
        <div className="brand">
          <img className="brand__mark" src={iconUrl} alt="" width="38" height="38" />
          <div className="u-truncate">
            <div className="brand__title u-truncate">{householdName}</div>
            <div className="brand__sub u-truncate">Laundry Portal</div>
          </div>
        </div>

        <nav className="topnav" aria-label="Main">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className="topnav__item pressable"
              aria-current={view === tab.id ? 'page' : undefined}
              onClick={() => go(tab.id)}
            >
              <Icon name={tab.icon} size={16} />
              {tab.label}
            </button>
          ))}
        </nav>

        <SyncDot status={status} />
        <button type="button" className="iconbtn pressable" onClick={onOpenSettings} aria-label="Settings">
          <Icon name="gear" size={18} />
        </button>
        <button type="button" className="iconbtn pressable" onClick={onSignOut} aria-label="Sign out">
          <Icon name="logout" size={17} />
        </button>
        <Avatar name={viewerName} color={viewerColor} />
      </header>

      <main className="main">{children}</main>

      <nav className="tabbar" aria-label="Main">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className="tabbar__item"
            aria-current={view === tab.id ? 'page' : undefined}
            onClick={() => go(tab.id)}
          >
            <span className="tabbar__icon">
              <Icon name={tab.icon} size={22} strokeWidth={view === tab.id ? 2.1 : 1.7} />
            </span>
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
