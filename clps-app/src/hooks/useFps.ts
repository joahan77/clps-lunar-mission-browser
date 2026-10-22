import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';

/**
 * High-performance frame rate monitor with rolling 500ms average.
 * Automatically respects visibilityState to pause offscreen work.
 */
export function useFps() {
  const [fps, setFpsState] = useState(60);
  const setStoreFps = useAppStore((s) => s.setFps);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const loop = (now: number) => {
      frameCountRef.current++;
      const elapsed = now - lastTimeRef.current;

      if (elapsed >= 500) {
        const currentFps = Math.round((frameCountRef.current * 1000) / elapsed);
        setFpsState(currentFps);
        setStoreFps(currentFps);
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    const handleVisibility = () => {
      if (document.hidden && rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      } else {
        lastTimeRef.current = performance.now();
        frameCountRef.current = 0;
        rafRef.current = requestAnimationFrame(loop);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [setStoreFps]);

  return fps;
}
