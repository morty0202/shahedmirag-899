/**
 * Night-mode nature background for the Hero section.
 * Real Unsplash night photograph with animated fireflies, petals, and shimmer.
 * White text overlays naturally on the dark scene.
 */

const animCss = `
@keyframes panSlow {
  0% { transform: scale(1.06) translate(0, 0); }
  50% { transform: scale(1.1) translate(-1%, -0.3%); }
  100% { transform: scale(1.06) translate(0, 0); }
}
@keyframes petalDrift {
  0% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
  10% { opacity: 0.7; }
  90% { opacity: 0.5; }
  100% { transform: translate(var(--dx), var(--dy)) rotate(var(--rot)); opacity: 0; }
}
@keyframes fireflyGlow {
  0%, 100% { opacity: 0; transform: scale(0.4); }
  50% { opacity: 1; transform: scale(1.3); }
}
@keyframes starTwinkle {
  0%, 100% { opacity: 0.2; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}
@keyframes moonGlow {
  0%, 100% { box-shadow: 0 0 30px 10px rgba(253,230,138,0.15), 0 0 60px 20px rgba(253,230,138,0.08); }
  50% { box-shadow: 0 0 40px 15px rgba(253,230,138,0.25), 0 0 80px 30px rgba(253,230,138,0.12); }
}
@keyframes shimmerLine {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(250%); }
}

.hero-night * { animation-timing-function: cubic-bezier(0.25, 0.1, 0.25, 1); }

.hero-night-img {
  animation: panSlow 30s ease-in-out infinite;
  will-change: transform;
}

.hero-petal {
  position: absolute;
  border-radius: 50% 0 50% 0;
  animation: petalDrift var(--dur) ease-in-out infinite;
  animation-delay: var(--delay);
  pointer-events: none;
}

.hero-firefly {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(253,230,138,1) 0%, rgba(253,222,100,0.6) 40%, transparent 70%);
  animation: fireflyGlow var(--dur) ease-in-out infinite;
  animation-delay: var(--delay);
  pointer-events: none;
}

.hero-star {
  position: absolute;
  border-radius: 50%;
  background: white;
  animation: starTwinkle var(--dur) ease-in-out infinite;
  animation-delay: var(--delay);
  pointer-events: none;
}

.hero-shimmer {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}
.hero-shimmer::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 30%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.025), transparent);
  animation: shimmerLine 10s ease-in-out infinite;
}
`;

const petals = [
  { x: '8%', y: '18%', w: 7, h: 4, color: '#e8b4c8', dur: '8s', delay: '0s', dx: '35px', dy: '55px', rot: '110deg' },
  { x: '25%', y: '10%', w: 5, h: 3, color: '#d4a0b0', dur: '10s', delay: '2s', dx: '-25px', dy: '70px', rot: '-80deg' },
  { x: '58%', y: '14%', w: 6, h: 3.5, color: '#c9a0b8', dur: '9s', delay: '4s', dx: '20px', dy: '60px', rot: '130deg' },
  { x: '78%', y: '22%', w: 4, h: 2.5, color: '#e0c0d0', dur: '11s', delay: '1s', dx: '-18px', dy: '50px', rot: '-50deg' },
  { x: '42%', y: '8%', w: 5, h: 3, color: '#d8b0c0', dur: '9.5s', delay: '3s', dx: '30px', dy: '65px', rot: '95deg' },
  { x: '90%', y: '12%', w: 4, h: 2.5, color: '#e0c8d4', dur: '12s', delay: '5s', dx: '-40px', dy: '75px', rot: '-110deg' },
  { x: '16%', y: '28%', w: 6, h: 3.5, color: '#d0a8b8', dur: '10.5s', delay: '6s', dx: '28px', dy: '45px', rot: '75deg' },
];

const fireflies = [
  { x: '10%', y: '35%', size: 5, dur: '3.5s', delay: '0s' },
  { x: '22%', y: '50%', size: 4, dur: '4s', delay: '0.8s' },
  { x: '38%', y: '42%', size: 6, dur: '3s', delay: '1.6s' },
  { x: '55%', y: '55%', size: 4.5, dur: '4.5s', delay: '2.4s' },
  { x: '70%', y: '38%', size: 5, dur: '3.8s', delay: '0.4s' },
  { x: '85%', y: '48%', size: 4, dur: '4.2s', delay: '3.2s' },
  { x: '30%', y: '62%', size: 3.5, dur: '5s', delay: '1.2s' },
  { x: '62%', y: '65%', size: 4.5, dur: '3.6s', delay: '2s' },
  { x: '48%', y: '28%', size: 3, dur: '4.8s', delay: '0.6s' },
  { x: '78%', y: '58%', size: 5, dur: '3.2s', delay: '1.8s' },
  { x: '5%', y: '45%', size: 3.5, dur: '4.4s', delay: '2.8s' },
  { x: '92%', y: '32%', size: 4, dur: '3.9s', delay: '3.6s' },
];

const stars = [
  { x: '5%', y: '5%', size: 2, dur: '3s', delay: '0s' },
  { x: '15%', y: '12%', size: 1.5, dur: '4s', delay: '0.5s' },
  { x: '30%', y: '4%', size: 2.5, dur: '2.5s', delay: '1s' },
  { x: '45%', y: '8%', size: 1.5, dur: '3.5s', delay: '1.5s' },
  { x: '55%', y: '3%', size: 2, dur: '4.5s', delay: '0.3s' },
  { x: '70%', y: '10%', size: 1.5, dur: '3.2s', delay: '2s' },
  { x: '82%', y: '5%', size: 2, dur: '2.8s', delay: '0.8s' },
  { x: '92%', y: '14%', size: 1.5, dur: '3.8s', delay: '1.2s' },
  { x: '20%', y: '18%', size: 1, dur: '5s', delay: '2.5s' },
  { x: '65%', y: '16%', size: 1, dur: '4.2s', delay: '3s' },
  { x: '38%', y: '20%', size: 1.5, dur: '3.6s', delay: '0.7s' },
  { x: '75%', y: '22%', size: 1, dur: '4.8s', delay: '1.8s' },
];

export default function Illustration() {
  return (
    <>
      <style>{animCss}</style>

      {/* Real night landscape photograph */}
      <div className="hero-night absolute inset-0 overflow-hidden" aria-hidden="true">
        <img
          src="https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1600&q=85&auto=format&fit=crop"
          alt=""
          className="hero-night-img h-full w-full object-cover"
          loading="eager"
        />
        {/* Dark overlay for text contrast */}
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Moon glow */}
      <div
        className="hero-night absolute"
        style={{
          top: '6%',
          right: '12%',
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(253,230,138,0.9) 0%, rgba(253,222,100,0.4) 40%, transparent 70%)',
          animation: 'moonGlow 5s ease-in-out infinite',
        }}
      />

      {/* Stars */}
      {stars.map((s, i) => (
        <div
          key={`star-${i}`}
          className="hero-star"
          style={{
            left: s.x,
            top: s.y,
            width: s.size,
            height: s.size,
            '--dur': s.dur,
            '--delay': s.delay,
          } as React.CSSProperties}
        />
      ))}

      {/* Floating petals */}
      {petals.map((p, i) => (
        <div
          key={`petal-${i}`}
          className="hero-petal"
          style={{
            left: p.x,
            top: p.y,
            width: p.w,
            height: p.h,
            background: p.color,
            '--dur': p.dur,
            '--delay': p.delay,
            '--dx': p.dx,
            '--dy': p.dy,
            '--rot': p.rot,
          } as React.CSSProperties}
        />
      ))}

      {/* Fireflies */}
      {fireflies.map((f, i) => (
        <div
          key={`ff-${i}`}
          className="hero-firefly"
          style={{
            left: f.x,
            top: f.y,
            width: f.size,
            height: f.size,
            '--dur': f.dur,
            '--delay': f.delay,
          } as React.CSSProperties}
        />
      ))}

      {/* Shimmer */}
      <div className="hero-shimmer" />
    </>
  );
}
