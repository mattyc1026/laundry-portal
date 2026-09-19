/**
 * The layers each theme paints its moving backdrop onto: rain, light,
 * bubbles, pistons, sparkles and so on. They are empty boxes here. What
 * they show, if anything, is decided entirely by styles/themes.css for the
 * active theme.
 */
const LAYERS = [1, 2, 3, 4, 5, 6];

export default function ThemeFx() {
  return (
    <div className="fx" aria-hidden="true">
      {LAYERS.map((n) => (
        <i key={n} className={`fx__l fx__${n}`} />
      ))}
    </div>
  );
}
