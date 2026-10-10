/** `still`-tier fallback: a deterministic SVG starfield over a black-to-charcoal gradient. No WebGL, no motion. */
// Built once at module scope, not per render: the seed is a literal, so the field is a
// constant — and a render-phase `let` reassignment trips react-hooks/immutability.
const STARS = (() => {
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from({ length: 80 }, () => ({
    cx: (rand() * 100).toFixed(2),
    cy: (rand() * 100).toFixed(2),
    r: (0.05 + rand() * 0.18).toFixed(3),
    o: (0.1 + rand() * 0.25).toFixed(2),
  }));
})();

export default function StillSky() {
  const stars = STARS;
  return (
    <div className="voyage-scene voyage-still" aria-hidden="true">
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="voyage-still__svg">
        {stars.map((s, i) => (
          <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="#fff" opacity={s.o} />
        ))}
      </svg>
      <div className="voyage-still__destination" />
    </div>
  );
}
