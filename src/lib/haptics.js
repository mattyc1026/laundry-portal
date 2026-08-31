/* Small vibration cues on devices that support them. Silently does nothing
   everywhere else, and never fires when the user has asked for reduced
   motion, since that setting is also honoured for tactile feedback. */

function allowed() {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return false;
  }
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

const PATTERNS = {
  light: 8,
  medium: 14,
  success: [10, 40, 18],
  warning: [14, 60, 14],
  error: [22, 50, 22, 50, 22],
};

export function haptic(kind = 'light') {
  if (!allowed()) return;
  try {
    navigator.vibrate(PATTERNS[kind] ?? PATTERNS.light);
  } catch {
    // Some browsers throw when the page is not visible. Not worth surfacing.
  }
}
