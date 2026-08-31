import { createPortal } from 'react-dom';
import Icon from './Icon.jsx';

const ICONS = { success: 'check', error: 'x', info: 'info' };

/** Live region so screen readers announce outcomes the same way sighted
    users see them. */
export default function ToastStack({ toasts, onDismiss }) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast toast--${t.type}${t.leaving ? ' toast--leaving' : ''}`}
          onClick={() => onDismiss(t.id)}
        >
          <span className="toast__icon">
            <Icon name={ICONS[t.type] || 'info'} size={13} strokeWidth={2.6} />
          </span>
          <span className="toast__msg">{t.message}</span>
        </div>
      ))}
    </div>,
    document.body
  );
}
