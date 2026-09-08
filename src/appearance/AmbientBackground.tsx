/**
 * Ambient animated background scenes (site-wide, z-index -1).
 * Variant comes from the user's appearance settings (data-bg on <html>).
 */
import type { CSSProperties } from "react";

export type AmbientStyle = "none" | "aurora" | "stars" | "bubbles" | "snow" | "mesh";

/** deterministic pseudo-random — stable across renders and reloads */
const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const STARS = Array.from({ length: 42 }, (_, i) => ({
  x: `${(rand(i + 1) * 98).toFixed(1)}%`,
  y: `${(rand(i + 51) * 96).toFixed(1)}%`,
  s: 1.5 + Math.round(rand(i + 101) * 3),
  d: `${(2.5 + rand(i + 151) * 4.5).toFixed(1)}s`,
  dl: `${(rand(i + 201) * 5).toFixed(1)}s`,
}));

const BUBBLES = Array.from({ length: 16 }, (_, i) => ({
  x: `${(rand(i + 301) * 96).toFixed(1)}%`,
  s: 4 + Math.round(rand(i + 351) * 8),
  d: `${(10 + rand(i + 401) * 10).toFixed(1)}s`,
  dl: `${(rand(i + 451) * 12).toFixed(1)}s`,
  o: (0.25 + rand(i + 501) * 0.4).toFixed(2),
}));

const FLAKES = Array.from({ length: 26 }, (_, i) => ({
  x: `${(rand(i + 601) * 98).toFixed(1)}%`,
  s: 2.5 + Math.round(rand(i + 651) * 4),
  d: `${(8 + rand(i + 701) * 9).toFixed(1)}s`,
  dl: `${(rand(i + 751) * 14).toFixed(1)}s`,
  o: (0.35 + rand(i + 801) * 0.45).toFixed(2),
  sx: `${((rand(i + 851) - 0.5) * 8).toFixed(1)}vw`,
}));

export default function AmbientBackground({ variant }: { variant: AmbientStyle }) {
  if (variant === "none") return null;
  return (
    <div aria-hidden className="ab-scene">
      {variant === "aurora" && (
        <>
          <div className="ab-orb ab-orb-1" />
          <div className="ab-orb ab-orb-2" />
          <div className="ab-orb ab-orb-3" />
        </>
      )}
      {variant === "mesh" && <div className="ab-mesh" />}
      {variant === "stars" &&
        STARS.map((s, i) => (
          <span
            key={i}
            className="ab-star"
            style={{ left: s.x, top: s.y, width: s.s, height: s.s, "--d": s.d, "--dl": s.dl } as CSSProperties}
          />
        ))}
      {variant === "bubbles" &&
        BUBBLES.map((b, i) => (
          <span
            key={i}
            className="ab-bubble"
            style={{ insetInlineStart: b.x, width: b.s, height: b.s, "--d": b.d, "--dl": b.dl, "--o": b.o } as CSSProperties}
          />
        ))}
      {variant === "snow" &&
        FLAKES.map((f, i) => (
          <span
            key={i}
            className="ab-flake"
            style={{ insetInlineStart: f.x, width: f.s, height: f.s, "--d": f.d, "--dl": f.dl, "--o": f.o, "--sx": f.sx } as CSSProperties}
          />
        ))}
    </div>
  );
}