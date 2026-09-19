/* ==========================================================================
   Theme motion

   Multicolor is the one theme whose colours are alive. A small loop rolls a
   five colour palette around the colour wheel, each colour slowly fading
   into the next, while the whole palette "breathes": saturation and
   lightness swell and settle like a slow breath.

   The same moving gradient field is painted through every surface that
   opts in (see styles/themes.css), fixed to the viewport, so the colours
   visibly travel from one card to the next as they flow across the screen.

   Every tap or click reshuffles the flow: a new colour order, a new
   direction and a new speed, eased in so it never jumps.

   Everything else is pure CSS. Nothing here runs unless Multicolor is the
   active theme, and it freezes when motion is reduced.
   ========================================================================== */

const FRAME_MS = 1000 / 30;
const COUNT = 5;

let rafId = 0;
let onPointer = null;
let last = 0;

const flow = {
  base: Math.random() * 360,
  offsets: [0, 72, 144, 216, 288],
  targets: [0, 72, 144, 216, 288],
  angle: 135,
  targetAngle: 135,
  speed: 1,
  targetSpeed: 1,
  dir: 1,
  x: 0,
  y: 0,
  t: 0,
};

function hslToRgb(h, s, l) {
  const hue = ((h % 360) + 360) % 360;
  const sat = s / 100;
  const lig = l / 100;
  const k = (n) => (n + hue / 30) % 12;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n) => lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255));
}

const hex = (rgb) => `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`;

/** Moves an angle toward a target along the shorter way round. */
function approachAngle(current, target, rate) {
  const diff = ((((target - current) % 360) + 540) % 360) - 180;
  return current + diff * rate;
}

function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function reduced(root) {
  if (root.dataset.motion === 'reduced') return true;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function paint(root, dt) {
  const f = flow;
  const ease = Math.min(1, dt / 900);

  f.speed += (f.targetSpeed - f.speed) * ease * 1.6;
  f.angle = approachAngle(f.angle, f.targetAngle, ease * 1.4);
  f.offsets = f.offsets.map((o, i) => approachAngle(o, f.targets[i], ease * 1.2));
  f.t += dt / 1000;

  // The palette rolls around the wheel so each colour becomes the next.
  f.base += f.dir * f.speed * 16 * (dt / 1000);

  // One breath roughly every seven seconds.
  const breath = (Math.sin((f.t / 7) * Math.PI * 2) + 1) / 2;
  const sat = 88 + breath * 12;
  const light = 56 + breath * 12;

  // The field drifts in the flow direction, which is what makes the
  // colours travel from one surface to the next.
  const rad = (f.angle * Math.PI) / 180;
  f.x = (f.x + Math.cos(rad) * f.speed * 3.2 * (dt / 1000) + 100) % 100;
  f.y = (f.y + Math.sin(rad) * f.speed * 3.2 * (dt / 1000) + 100) % 100;

  const colours = f.offsets.map((o) => hslToRgb(f.base + o, sat, light));
  const style = root.style;
  colours.forEach((rgb, i) => style.setProperty(`--mc-${i + 1}`, hex(rgb)));
  const [a, b, c, d, e] = colours;
  style.setProperty('--accent', hex(a));
  style.setProperty('--accent-rgb', a.join(','));
  style.setProperty('--accent-light', hex(hslToRgb(f.base + f.offsets[0], sat, light + 14)));
  style.setProperty('--accent2', hex(b));
  style.setProperty('--accent2-rgb', b.join(','));
  style.setProperty('--accent2-light', hex(hslToRgb(f.base + f.offsets[1], sat, light + 14)));
  style.setProperty('--day1', hex(a));
  style.setProperty('--day2', hex(b));
  style.setProperty('--day3', hex(c));
  style.setProperty('--day4', hex(d));
  style.setProperty('--day5', hex(e));
  style.setProperty('--mc-angle', `${f.angle.toFixed(1)}deg`);
  style.setProperty('--mc-x', `${f.x.toFixed(2)}%`);
  style.setProperty('--mc-y', `${f.y.toFixed(2)}%`);
  style.setProperty('--mc-breath', breath.toFixed(3));
}

/** A soft burst of colour where the screen was touched. */
function burst(event, root) {
  if (typeof document === 'undefined' || reduced(root)) return;
  const el = document.createElement('span');
  el.className = 'mc-burst';
  el.style.left = `${event.clientX}px`;
  el.style.top = `${event.clientY}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1300);
}

function reshuffle() {
  const f = flow;
  const order = shuffle([0, 1, 2, 3, 4]);
  const spread = 360 / COUNT;
  const jitter = Math.random() * spread;
  f.targets = order.map((slot) => slot * spread + jitter);
  f.targetAngle = Math.random() * 360;
  f.targetSpeed = 0.6 + Math.random() * 1.6;
  f.dir = Math.random() < 0.5 ? -1 : 1;
}

export function stopThemeMotion() {
  if (typeof window === 'undefined') return;
  if (rafId) window.cancelAnimationFrame(rafId);
  rafId = 0;
  if (onPointer) window.removeEventListener('pointerdown', onPointer, true);
  onPointer = null;
}

/** Starts the loop for themes that move in JavaScript, stops it otherwise. */
export function startThemeMotion(id) {
  stopThemeMotion();
  if (id !== 'multicolor') return;
  if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') return;

  const root = document.documentElement;
  last = performance.now();
  paint(root, 16);

  const tick = (now) => {
    rafId = window.requestAnimationFrame(tick);
    const dt = now - last;
    if (dt < FRAME_MS) return;
    last = now;
    if (reduced(root)) return;
    paint(root, Math.min(dt, 120));
  };
  rafId = window.requestAnimationFrame(tick);

  onPointer = (event) => {
    reshuffle();
    burst(event, root);
  };
  window.addEventListener('pointerdown', onPointer, true);
}
