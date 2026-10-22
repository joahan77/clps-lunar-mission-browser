import { useState, useEffect } from 'react';

/**
 * Ticking mission clock starting from an epoch.
 * Increments each second, formatted as: "MET +DDd HH:MM:SS" or "Day DD, HH:MM:SS"
 */
export function useMissionClock(initialDay = 1, initialHour = 0, initialMinute = 0) {
  const [seconds, setSeconds] = useState(
    initialDay * 86400 + initialHour * 3600 + initialMinute * 60
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  return {
    day: d,
    hour: h,
    minute: m,
    second: s,
    formatted: `Day ${pad(d)}, ${pad(h)}:${pad(m)}:${pad(s)}`,
    met: `MET +${pad(d)}d ${pad(h)}:${pad(m)}:${pad(s)}`,
  };
}
