/** Initials chip. Colour comes from the person's group so the same human
    reads the same way on the calendar, in the log and in the header. */
export default function Avatar({ name, color, size = 'md' }) {
  const cls = size === 'lg' ? 'avatar avatar--lg' : size === 'sm' ? 'avatar avatar--sm' : 'avatar';
  const tint = color || 'var(--accent)';
  const initials = String(name || '?')
    .split(/[\s+]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';
  return (
    <span
      className={cls}
      style={{ background: `linear-gradient(150deg, ${tint}, color-mix(in srgb, ${tint} 52%, #000))` }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
