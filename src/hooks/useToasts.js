import { useCallback, useEffect, useRef, useState } from 'react';

const LIFETIME = 3200;
const EXIT = 180;
const MAX_VISIBLE = 3;

/**
 * A real queue rather than the original single-slot toast, whose shared
 * setTimeout meant a second message cancelled the first one's timer and the
 * banner could be dismissed early or linger. Timers are tracked and cleared
 * on unmount so nothing writes to state after teardown.
 */
export function useToasts() {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const handles = timers.current.get(id);
    if (handles) {
      handles.forEach(clearTimeout);
      timers.current.delete(id);
    }
  }, []);

  const dismiss = useCallback(
    (id) => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, leaving: true } : t))
      );
      const handle = setTimeout(() => remove(id), EXIT);
      const existing = timers.current.get(id) || [];
      timers.current.set(id, [...existing, handle]);
    },
    [remove]
  );

  const push = useCallback(
    (message, type = 'success') => {
      if (!message) return;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), { id, message, type }]);
      const handle = setTimeout(() => {
        setToasts((prev) =>
          prev.map((t) => (t.id === id ? { ...t, leaving: true } : t))
        );
        const exitHandle = setTimeout(() => remove(id), EXIT);
        const existing = timers.current.get(id) || [];
        timers.current.set(id, [...existing, exitHandle]);
      }, LIFETIME);
      timers.current.set(id, [handle]);
    },
    [remove]
  );

  /** Convenience for store mutators, which all return a `result` object. */
  const report = useCallback(
    (result) => {
      if (result?.message) push(result.message, result.type || 'success');
    },
    [push]
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((handles) => handles.forEach(clearTimeout));
      map.clear();
    };
  }, []);

  return { toasts, push, report, dismiss };
}
