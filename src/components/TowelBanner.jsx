import Icon from '../ui/Icon.jsx';
import { formatShortDate, relativeLabel } from '../lib/date.js';

/**
 * Sits at the top of the calendar whenever the signed-in user has towel
 * duty coming up, with what is actually expected of them. This is the only
 * banner in the app.
 */
export default function TowelBanner({ towel, onDismiss }) {
  if (!towel) return null;
  const { day } = towel;
  return (
    <div className="banner" role="status">
      <span className="banner__icon">
        <Icon name="towel" size={22} strokeWidth={1.9} />
      </span>
      <div className="banner__body">
        <p className="banner__eyebrow">Towel duty</p>
        <h2 className="banner__title">
          {relativeLabel(day.key)} · {formatShortDate(day.key)}
        </h2>
        <p className="banner__text">
          On top of your own laundry, wash, dry, fold and put away a load of
          household towels.
        </p>
      </div>
      <button type="button" className="banner__close pressable" onClick={onDismiss} aria-label="Dismiss">
        <Icon name="x" size={16} strokeWidth={2.2} />
      </button>
    </div>
  );
}
