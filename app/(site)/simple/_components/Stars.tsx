/** Lehmer generator, so the star field is identical on every render. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function Stars({ count = 90, seed = 7 }: { count?: number; seed?: number }) {
  const rand = seeded(seed);
  const stars = Array.from({ length: count }, (_, i) => ({
    x: rand() * 100,
    y: rand() * 100,
    r: rand() < 0.9 ? 0.6 + rand() * 0.6 : 1.3 + rand() * 0.6,
    opacity: 0.25 + rand() * 0.6,
    twinkle: i % 8 === 0,
    delay: rand() * 4,
  }));

  return (
    <svg className="stars" preserveAspectRatio="none" aria-hidden="true">
      {stars.map((s, i) => (
        <circle
          key={i}
          cx={`${s.x.toFixed(3)}%`}
          cy={`${s.y.toFixed(3)}%`}
          r={s.r.toFixed(3)}
          fill="currentColor"
          opacity={s.opacity.toFixed(3)}
          className={s.twinkle ? "stars__twinkle" : undefined}
          style={s.twinkle ? { animationDelay: `${s.delay.toFixed(2)}s` } : undefined}
        />
      ))}
    </svg>
  );
}
