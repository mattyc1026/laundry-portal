import assert from 'node:assert/strict';
import test from 'node:test';
import { THEMES, applyTheme } from '../src/lib/themes.js';

/* A minimal document stand-in so applyTheme can run outside a browser. */
function fakeDom() {
  const props = new Map();
  globalThis.document = {
    documentElement: {
      dataset: {},
      style: { setProperty: (k, v) => props.set(k, v) },
    },
    querySelector: () => null,
  };
  return props;
}

function toRgb(v) {
  let h = String(v || '').trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
function lum(rgb) {
  const s = rgb.map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
}
function ratio(a, b) {
  const la = lum(toRgb(a));
  const lb = lum(toRgb(b));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

const AA = 4.5;

test('every theme produces readable badges', () => {
  const failures = [];
  Object.keys(THEMES).forEach((id) => {
    const props = fakeDom();
    applyTheme(id);
    const v = THEMES[id].vars;
    const get = (k) => props.get(k);

    const pairs = [
      ['towel badge', get('--on-towel'), v['--towel-bg']],
      ['time badge', get('--on-input'), v['--bg-input']],
      ['all day badge', get('--on-accent'), get('--accent-badge')],
      ['open tag', get('--on-accent2'), get('--accent2-badge')],
      ['danger badge', get('--on-danger'), get('--danger-badge')],
    ];

    pairs.forEach(([what, fg, bg]) => {
      if (!toRgb(fg) || !toRgb(bg)) return;
      const r = ratio(fg, bg);
      if (r < AA) failures.push(`${id} ${what} ${r.toFixed(2)}`);
    });
  });
  assert.deepEqual(failures, [], `unreadable: ${failures.join(', ')}`);
});

test('every theme produces readable secondary text', () => {
  const failures = [];
  Object.keys(THEMES).forEach((id) => {
    const props = fakeDom();
    applyTheme(id);
    const card = THEMES[id].vars['--bg-card'];
    [['muted', props.get('--text-muted-safe'), AA],
     ['faint', props.get('--text-faint-safe'), 4.0]].forEach(([what, fg, target]) => {
      if (!toRgb(fg) || !toRgb(card)) return;
      const r = ratio(fg, card);
      if (r < target) failures.push(`${id} ${what} ${r.toFixed(2)}`);
    });
  });
  assert.deepEqual(failures, [], `unreadable: ${failures.join(', ')}`);
});

test('the derived colours are set for all 27 themes', () => {
  Object.keys(THEMES).forEach((id) => {
    const props = fakeDom();
    applyTheme(id);
    ['--on-accent', '--on-accent2', '--on-towel', '--on-input', '--on-danger']
      .forEach((k) => assert.ok(props.get(k), `${id} is missing ${k}`));
  });
});
