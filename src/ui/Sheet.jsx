import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useOverlay } from '../hooks/useOverlay.js';
import { haptic } from '../lib/haptics.js';
import Icon from './Icon.jsx';

const CLOSE_MS = 240;
const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 0.55;

/**
 * One overlay component for the whole app. On narrow screens it is an iOS
 * style bottom sheet you can pull down to dismiss; from 720px up it becomes
 * a centred dialog. Closing always plays the exit animation first so nothing
 * ever pops out of existence.
 */
export default function Sheet({
  title,
  children,
  footer,
  onClose,
  labelledBy = 'sheet-title',
}) {
  const [closing, setClosing] = useState(false);
  const [drag, setDrag] = useState(null);
  const gesture = useRef(null);
  const timer = useRef(null);
  const closingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Deliberately has no dependencies. If this handler changed identity while
  // closing, the overlay effect would tear down and re-arm mid-animation,
  // yanking focus back into a sheet that is on its way out.
  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    timer.current = setTimeout(() => onCloseRef.current?.(), CLOSE_MS);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const overlayRef = useOverlay(true, requestClose);

  function onPointerDown(event) {
    // Mouse users get the close button and Escape; dragging is for touch.
    if (event.pointerType === 'mouse') return;
    gesture.current = {
      startY: event.clientY,
      startedAt: performance.now(),
      id: event.pointerId,
    };
    setDrag(0);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event) {
    if (!gesture.current || gesture.current.id !== event.pointerId) return;
    const dy = event.clientY - gesture.current.startY;
    // Resist upward pull so the sheet feels attached at the top.
    setDrag(dy > 0 ? dy : dy / 5);
  }

  function onPointerUp(event) {
    if (!gesture.current || gesture.current.id !== event.pointerId) return;
    const dy = event.clientY - gesture.current.startY;
    const elapsed = Math.max(1, performance.now() - gesture.current.startedAt);
    const velocity = dy / elapsed;
    gesture.current = null;

    if (dy > DISMISS_DISTANCE || velocity > DISMISS_VELOCITY) {
      haptic('light');
      setDrag(null);
      requestClose();
      return;
    }
    setDrag('settle');
    setTimeout(() => setDrag(null), CLOSE_MS);
  }

  const dragging = typeof drag === 'number';
  const sheetClass = [
    'sheet',
    closing ? 'sheet--closing' : '',
    dragging ? 'sheet--dragging' : '',
    drag === 'settle' ? 'sheet--settling' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const node = (
    <>
      <div
        className={`scrim${closing ? ' scrim--closing' : ''}`}
        onClick={requestClose}
        aria-hidden="true"
      />
      <div className="sheet-wrap">
        <div
          className={sheetClass}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          ref={overlayRef}
          tabIndex={-1}
          style={
            dragging
              ? { transform: `translate3d(0, ${Math.max(0, drag)}px, 0)` }
              : undefined
          }
        >
          <div
            className="sheet__grabber"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            aria-hidden="true"
          />
          <div
            className="sheet__head"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <h2 className="sheet__title u-truncate" id={labelledBy}>
              {title}
            </h2>
            <button
              type="button"
              className="sheet__close pressable"
              onClick={requestClose}
              aria-label="Close"
            >
              <Icon name="x" size={15} strokeWidth={2.2} />
            </button>
          </div>
          <div className="sheet__body">{children}</div>
          {footer ? <div className="sheet__foot">{footer}</div> : null}
        </div>
      </div>
    </>
  );

  return createPortal(node, document.body);
}
