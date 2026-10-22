import { useEffect, useRef, useState } from 'react';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$+-=/\\|';

/**
 * Scrambles text character-by-character then resolves to the real string.
 * Ideal for site names and coordinates.
 */
export function useDecodeScramble(
  text: string,
  duration = 800,
  delay = 0
): string {
  const [output, setOutput] = useState(() => scramble(text));
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const textRef = useRef(text);

  useEffect(() => {
    textRef.current = text;
    let delayTimer: ReturnType<typeof setTimeout>;
    setOutput(scramble(text));

    delayTimer = setTimeout(() => {
      startRef.current = null;

      const tick = (now: number) => {
        if (startRef.current === null) startRef.current = now;
        const elapsed = now - startRef.current;
        const t = Math.min(elapsed / duration, 1);

        // Reveal chars left-to-right as t progresses
        const revealCount = Math.floor(t * textRef.current.length);
        const chars = textRef.current
          .split('')
          .map((ch, i) =>
            i < revealCount
              ? ch
              : ch === ' '
              ? ' '
              : CHARS[Math.floor(Math.random() * CHARS.length)]
          )
          .join('');

        setOutput(chars);

        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          setOutput(textRef.current);
        }
      };

      rafRef.current = requestAnimationFrame(tick);
    }, delay);

    return () => {
      clearTimeout(delayTimer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [text, duration, delay]);

  return output;
}

function scramble(text: string): string {
  return text
    .split('')
    .map((ch) => (ch === ' ' ? ' ' : CHARS[Math.floor(Math.random() * CHARS.length)]))
    .join('');
}
