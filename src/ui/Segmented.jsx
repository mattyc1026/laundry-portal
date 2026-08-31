import { useLayoutEffect, useRef, useState } from 'react';
import { haptic } from '../lib/haptics.js';

/**
 * Segmented control with a thumb that slides between options, measured from
 * the real DOM so it stays correct at any label length or container width.
 */
export default function Segmented({ options, value, onChange, label }) {
  const listRef = useRef(null);
  const [thumb, setThumb] = useState(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return undefined;

    function measure() {
      const index = options.findIndex((o) => o.value === value);
      if (index < 0) {
        setThumb(null); // value is not one of the options; hide the thumb
        return;
      }
      const el = list.children[index + 1]; // child 0 is the thumb
      if (!el) return;
      setThumb({ left: el.offsetLeft, width: el.offsetWidth });
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [options, value]);

  function onKeyDown(event) {
    const index = options.findIndex((o) => o.value === value);
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const delta = event.key === 'ArrowRight' ? 1 : -1;
      const next = (index + delta + options.length) % options.length;
      onChange(options[next].value);
      haptic('light');
    }
  }

  return (
    <div
      className="segmented"
      role="tablist"
      aria-label={label}
      ref={listRef}
      onKeyDown={onKeyDown}
    >
      <span
        className="segmented__thumb"
        style={thumb ? { transform: `translateX(${thumb.left - 3}px)`, width: thumb.width } : { opacity: 0 }}
        aria-hidden="true"
      />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          className="segmented__item"
          aria-selected={option.value === value}
          tabIndex={option.value === value ? 0 : -1}
          onClick={() => {
            if (option.value !== value) haptic('light');
            onChange(option.value);
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
