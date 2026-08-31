import { useEffect, useRef } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

let lockCount = 0;

/**
 * Everything a modal surface needs to behave: Escape closes it, background
 * scroll is locked without the page jumping, focus moves inside and is
 * trapped, and focus returns to whatever opened it on close.
 *
 * None of this existed in the original build, where a modal could be left
 * open behind a scrolled page and keyboard focus stayed on the content
 * underneath.
 */
export function useOverlay(active, onClose) {
  const ref = useRef(null);
  const restoreTo = useRef(null);

  useEffect(() => {
    if (!active) return undefined;

    restoreTo.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    // Compensate for the disappearing scrollbar so content does not shift.
    const gap = window.innerWidth - document.documentElement.clientWidth;
    if (lockCount === 0) {
      document.body.classList.add('is-locked');
      if (gap > 0) document.body.style.paddingRight = `${gap}px`;
    }
    lockCount += 1;

    const node = ref.current;
    const first = node?.querySelector(FOCUSABLE);
    // Prefer a real control, otherwise focus the container itself.
    if (first instanceof HTMLElement) first.focus({ preventScroll: true });
    else node?.focus({ preventScroll: true });

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose?.();
        return;
      }
      if (event.key !== 'Tab' || !node) return;
      const items = Array.from(node.querySelectorAll(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
      if (items.length === 0) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.classList.remove('is-locked');
        document.body.style.paddingRight = '';
      }
      restoreTo.current?.focus?.({ preventScroll: true });
    };
  }, [active, onClose]);

  return ref;
}
