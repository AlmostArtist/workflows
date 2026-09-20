'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * §4.7 / §6.6 — the one deliberate motion in the system. Counters roll up once on first
 * paint and never again; `prefers-reduced-motion` snaps straight to the final value.
 */
export function Odometer({
  value,
  duration = 1200,
  className = '',
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || value <= 0) {
      setDisplay(value);
      return;
    }

    setDisplay(0);
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutExpo — fast off the line, settles rather than decelerating linearly.
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setDisplay(Math.round(value * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return (
    <span className={`tnum ${className}`} suppressHydrationWarning>
      {display.toLocaleString('en-US')}
    </span>
  );
}
