import { useEffect, useRef, useState } from 'react';

/**
 * Smoothly counts (odometer-style) from the previous value to `target`.
 * - Uses requestAnimationFrame internally — no dependencies.
 * - Returns a display string with `decimals` decimal places.
 */
export function useCountUp(
  target: number,
  decimals = 2,
  duration = 600,
  easing: (t: number) => number = easeOutQuart
): string {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const delta = target - from;

    // If no change, no animation needed
    if (Math.abs(delta) < 0.001) {
      fromRef.current = target;
      setDisplay(target);
      return;
    }

    startTimeRef.current = null;

    const tick = (now: number) => {
      if (startTimeRef.current === null) startTimeRef.current = now;
      const elapsed = now - startTimeRef.current;
      const t = Math.min(elapsed / duration, 1);
      const easedT = easing(t);
      const current = from + delta * easedT;
      setDisplay(current);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
        setDisplay(target);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, easing]);

  return display.toFixed(decimals);
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}
