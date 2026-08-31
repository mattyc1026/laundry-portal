import Sheet from '../ui/Sheet.jsx';
import Icon from '../ui/Icon.jsx';

/**
 * The only tip in the portal. It fires once per sign-in and points at Help.
 * Every other popup hint has been removed on purpose.
 */
export default function WelcomeTip({ name, onHelp, onClose }) {
  return (
    <Sheet
      title={`Welcome back, ${name}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--secondary pressable" onClick={onClose}>
            Got it
          </button>
          <button type="button" className="btn btn--primary pressable" onClick={onHelp}>
            <Icon name="help" size={16} />
            Open Help
          </button>
        </>
      }
    >
      <div className="callout callout--info">
        <div className="callout__title">Questions about how something works?</div>
        The Help tab covers booking a day, taking a slot someone else has,
        swaps, towel duty and resetting your PIN.
      </div>
      <p className="sheet__text" style={{ marginTop: 14, marginBottom: 0 }}>
        Everything else happens on the calendar. Tap any day to book it, share
        it, or block it.
      </p>
    </Sheet>
  );
}
