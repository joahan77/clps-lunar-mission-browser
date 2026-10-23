import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { ASSET_MANIFEST, preloadAllAssets, type PreloadProgressEvent } from '../utils/assetPreloader';

interface BootSequenceProps {
  onComplete: () => void;
}

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'INIT' | 'LOAD' | 'SYNC' | 'CONFIRM';
  text: string;
  sizeTag: string;
  isOk: boolean;
}

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*+=-/';

/** Single log item with dynamic decode/scramble reveal */
function ScrambleLogLine({ entry }: { entry: LogEntry }) {
  const [displayText, setDisplayText] = useState(() =>
    entry.text
      .split('')
      .map((ch) => (ch === ' ' ? ' ' : CHARS[Math.floor(Math.random() * CHARS.length)]))
      .join('')
  );

  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const duration = 320; // Fast 320ms decode

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const revealedLength = Math.floor(progress * entry.text.length);

      const resolved = entry.text
        .split('')
        .map((ch, i) =>
          i < revealedLength
            ? ch
            : ch === ' '
            ? ' '
            : CHARS[Math.floor(Math.random() * CHARS.length)]
        )
        .join('');

      setDisplayText(resolved);

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setDisplayText(entry.text);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [entry.text]);

  return (
    <div className="flex items-center justify-between gap-3 text-[11px] font-mono leading-relaxed select-none">
      <div className="flex items-center gap-2 truncate">
        <span className="text-t2-smoke/70 tabular-nums">[{entry.timestamp}]</span>
        <span
          className={
            entry.type === 'INIT'
              ? 'text-t2-dusk-violet font-semibold'
              : entry.type === 'SYNC'
              ? 'text-data-earth font-semibold'
              : 'text-t2-pale-mist'
          }
        >
          {entry.type}
        </span>
        <span className="text-t2-ghost-white truncate">{displayText}</span>
      </div>
      <div className="flex-shrink-0 flex items-center gap-1.5 font-bold">
        <span className="text-data-nominal-text">[{entry.isOk ? 'OK' : 'PEND'}]</span>
        <span className="text-t2-smoke/90 tabular-nums">{entry.sizeTag}</span>
      </div>
    </div>
  );
}

export default function BootSequence({ onComplete }: BootSequenceProps) {
  const { bootComplete, setBootComplete, reducedMotion } = useAppStore();
  const [progress, setProgress] = useState(0);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [sweepActive, setSweepActive] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [utcTime, setUtcTime] = useState(() => new Date().toISOString().substring(11, 19) + ' UTC');

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const setBootCompleteRef = useRef(setBootComplete);
  setBootCompleteRef.current = setBootComplete;

  // Live ticking UTC clock
  useEffect(() => {
    const timer = setInterval(() => {
      setUtcTime(new Date().toISOString().substring(11, 19) + ' UTC');
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Instant skip on user input
  const handleSkip = useRef(() => {
    setBootCompleteRef.current(true);
    onCompleteRef.current();
  });

  useEffect(() => {
    if (bootComplete || reducedMotion) {
      onCompleteRef.current();
      return;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      // Don't intercept modifier shortcuts like Cmd+R
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      handleSkip.current();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [bootComplete, reducedMotion]);

  // Real asset loading orchestration over 4.8s duration
  useEffect(() => {
    if (bootComplete || reducedMotion) return;

    let isMounted = true;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    // Helper to format current UTC timestamp
    const nowTime = () => new Date().toISOString().substring(11, 19);

    // Initial system boot log
    setLogEntries([
      {
        id: 'boot-init',
        timestamp: nowTime(),
        type: 'INIT',
        text: 'CLPS POLAR EXPLORATION SYSTEM v2.4 KERNEL',
        sizeTag: 'INIT',
        isOk: true,
      },
    ]);

    // Schedule real asset loading sequentially across the 4.2s window
    const manifest = ASSET_MANIFEST;
    const stepDuration = 440; // ~440ms per real asset load

    manifest.forEach((asset, idx) => {
      const t = setTimeout(async () => {
        if (!isMounted) return;

        // Perform real fetch / image cache
        try {
          if (asset.type === 'json') {
            const res = await fetch(asset.url);
            await res.json();
          } else {
            const img = new Image();
            img.src = asset.url;
          }
        } catch {
          // Non-blocking
        }

        if (!isMounted) return;

        const kb = Math.round(asset.expectedBytes / 1024);
        const currentPct = Math.round(((idx + 1) / (manifest.length + 1)) * 95);
        setProgress(currentPct);

        setLogEntries((prev) => [
          ...prev.slice(-6), // Keep most recent 7 lines
          {
            id: asset.id,
            timestamp: nowTime(),
            type: asset.type === 'json' ? 'SYNC' : 'LOAD',
            text: asset.label,
            sizeTag: `${kb} KB`,
            isOk: true,
          },
        ]);
      }, 350 + idx * stepDuration);

      timeouts.push(t);
    });

    // Final step: WebGL Shader pipeline & texture mipmaps (at ~3.9s)
    const finalAssetTime = 350 + manifest.length * stepDuration;
    const tFinal = setTimeout(() => {
      if (!isMounted) return;

      setProgress(100);
      setLogEntries((prev) => [
        ...prev.slice(-6),
        {
          id: 'webgl-warmup',
          timestamp: nowTime(),
          type: 'INIT',
          text: 'WEBGL2 SHADER PIPELINE & 16X ANISOTROPY',
          sizeTag: 'COMPILED',
          isOk: true,
        },
      ]);

      // Trigger 100% sunlight sweep across wireframe
      setSweepActive(true);

      // Fade overlay into resolved textured moon
      const tFade = setTimeout(() => {
        if (!isMounted) return;
        setFadeOut(true);

        const tDone = setTimeout(() => {
          if (!isMounted) return;
          setBootCompleteRef.current(true);
          onCompleteRef.current();
        }, 550);
        timeouts.push(tDone);
      }, 650);
      timeouts.push(tFade);
    }, finalAssetTime);
    timeouts.push(tFinal);

    return () => {
      isMounted = false;
      timeouts.forEach(clearTimeout);
    };
  }, [bootComplete, reducedMotion]);

  if (bootComplete || reducedMotion) return null;

  // Calculate SVG strokeDashoffset based on real progress
  const ringDashOffset = 600 - (600 * progress) / 100;

  return (
    <div
      onClick={() => handleSkip.current()}
      className={`fixed inset-0 z-50 bg-[#000000] text-t2-ghost-white flex flex-col justify-between p-6 sm:p-10 select-none cursor-pointer transition-opacity duration-500 ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* ── Background Starfield Drift ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40">
        {[...Array(35)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: i % 4 === 0 ? '2px' : '1px',
              height: i % 4 === 0 ? '2px' : '1px',
              top: `${(i * 19.3) % 100}%`,
              left: `${(i * 27.7) % 100}%`,
              opacity: 0.3 + (i % 5) * 0.15,
            }}
          />
        ))}
      </div>

      {/* ── Top Header Strip ── */}
      <header className="relative z-10 flex items-start justify-between text-xs font-mono text-t2-smoke tracking-wider">
        <div className="space-y-1">
          <div className="text-t1-pure-white font-bold tracking-[2px] uppercase">
            NASA CLPS • SOUTH POLE EXPLORATION
          </div>
          <div className="text-[11px] text-t2-ash-border">
            MISSION PLANNING & SOLAR IRRADIANCE TELEMETRY
          </div>
        </div>

        <div className="text-right space-y-1">
          <div className="text-t1-pure-white font-bold tabular-nums">{utcTime}</div>
          <div className="text-[11px] text-t2-ash-border">
            WINDOW: OCT 23 – NOV 22, 2026 (720H)
          </div>
        </div>
      </header>

      {/* ── Center Stage: Wireframe Moon + Live Log Stream ── */}
      <main className="relative z-10 my-auto w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        {/* Left: Wireframe Moon with Lat/Lon Circles & Orbit Ring */}
        <div className="md:col-span-5 flex flex-col items-center justify-center">
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
            {/* SVG Wireframe Sphere */}
            <svg
              className="w-full h-full"
              viewBox="0 0 240 240"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <clipPath id="moon-sphere-clip">
                  <circle cx="120" cy="120" r="92" />
                </clipPath>
                {/* Sunlight Dawn Sweep Gradient */}
                <linearGradient id="sunlight-sweep-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="transparent" />
                  <stop offset="35%" stopColor="rgba(245, 158, 11, 0.45)" />
                  <stop offset="50%" stopColor="rgba(255, 255, 255, 0.95)" />
                  <stop offset="65%" stopColor="rgba(251, 191, 36, 0.5)" />
                  <stop offset="100%" stopColor="transparent" />
                </linearGradient>
              </defs>

              {/* Sphere Background Glow & Baseline Rim */}
              <circle
                cx="120"
                cy="120"
                r="92"
                stroke="rgba(255, 255, 255, 0.2)"
                strokeWidth="1.2"
                fill="#000000"
              />

              {/* Group clipped inside lunar sphere */}
              <g clipPath="url(#moon-sphere-clip)">
                {/* Concentric Latitude Circles (Polar perspective) */}
                <ellipse
                  cx="120"
                  cy="120"
                  rx="92"
                  ry="24"
                  stroke="rgba(255, 255, 255, 0.35)"
                  strokeWidth="0.8"
                  strokeDasharray="600"
                  strokeDashoffset={ringDashOffset}
                />
                <ellipse
                  cx="120"
                  cy="80"
                  rx="82"
                  ry="20"
                  stroke="rgba(255, 255, 255, 0.28)"
                  strokeWidth="0.8"
                  strokeDasharray="600"
                  strokeDashoffset={ringDashOffset}
                />
                <ellipse
                  cx="120"
                  cy="50"
                  rx="62"
                  ry="15"
                  stroke="rgba(255, 255, 255, 0.24)"
                  strokeWidth="0.8"
                  strokeDasharray="600"
                  strokeDashoffset={ringDashOffset}
                />
                <ellipse
                  cx="120"
                  cy="160"
                  rx="82"
                  ry="20"
                  stroke="rgba(255, 255, 255, 0.28)"
                  strokeWidth="0.8"
                  strokeDasharray="600"
                  strokeDashoffset={ringDashOffset}
                />
                <ellipse
                  cx="120"
                  cy="190"
                  rx="62"
                  ry="15"
                  stroke="rgba(255, 255, 255, 0.24)"
                  strokeWidth="0.8"
                  strokeDasharray="600"
                  strokeDashoffset={ringDashOffset}
                />

                {/* Meridian Longitude Arcs */}
                <line
                  x1="120"
                  y1="28"
                  x2="120"
                  y2="212"
                  stroke="rgba(255, 255, 255, 0.4)"
                  strokeWidth="0.8"
                  strokeDasharray="600"
                  strokeDashoffset={ringDashOffset}
                />
                <ellipse
                  cx="120"
                  cy="120"
                  rx="46"
                  ry="92"
                  stroke="rgba(255, 255, 255, 0.28)"
                  strokeWidth="0.8"
                  strokeDasharray="600"
                  strokeDashoffset={ringDashOffset}
                />
                <ellipse
                  cx="120"
                  cy="120"
                  rx="76"
                  ry="92"
                  stroke="rgba(255, 255, 255, 0.24)"
                  strokeWidth="0.8"
                  strokeDasharray="600"
                  strokeDashoffset={ringDashOffset}
                />

                {/* South Pole Target Marker (Pulsing ring) */}
                <circle
                  cx="120"
                  cy="204"
                  r="4"
                  stroke="#34d399"
                  strokeWidth="1.2"
                  fill="none"
                  className="animate-pulse"
                />
                <circle cx="120" cy="204" r="1.5" fill="#34d399" />

                {/* 100% Sunlight Sweep Across the Wireframe */}
                {sweepActive && (
                  <rect
                    x="-240"
                    y="0"
                    width="240"
                    height="240"
                    fill="url(#sunlight-sweep-grad)"
                    className="animate-[sweep_0.65s_cubic-bezier(0.16,1,0.3,1)_forwards]"
                  />
                )}
              </g>

              {/* Rotating Orbit Ring (Inclined polar trajectory) */}
              <ellipse
                cx="120"
                cy="120"
                rx="112"
                ry="44"
                transform="rotate(-28 120 120)"
                stroke="rgba(255, 255, 255, 0.45)"
                strokeWidth="1"
                strokeDasharray="4 6"
                className="animate-[spin_14s_linear_infinite] origin-[120px_120px]"
              />

              {/* Thin Center Target Crosshair */}
              <line x1="106" y1="120" x2="134" y2="120" stroke="rgba(255, 255, 255, 0.7)" strokeWidth="0.8" />
              <line x1="120" y1="106" x2="120" y2="134" stroke="rgba(255, 255, 255, 0.7)" strokeWidth="0.8" />
              <circle cx="120" cy="120" r="1.5" fill="#ffffff" />
            </svg>
          </div>

          <div className="mt-3 font-mono text-[10px] text-t2-smoke tracking-widest uppercase flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-data-nominal animate-ping" />
            <span>POLAR TARGET: 89.9°S 0.0°E (SHACKLETON)</span>
          </div>
        </div>

        {/* Right: Monospace Real-Asset Streaming Log & Large Percentage */}
        <div className="md:col-span-7 flex flex-col justify-between h-72 sm:h-80 border-t md:border-t-0 md:border-l border-t2-ash-border/40 pt-4 md:pt-0 md:pl-8">
          {/* Top of log container: Real Loading Stream */}
          <div className="space-y-1.5 overflow-hidden font-mono flex-1">
            <div className="text-[10px] text-t2-smoke uppercase tracking-wider mb-2 flex items-center justify-between border-b border-t2-ash-border/30 pb-1">
              <span>REAL TELEMETRY INGESTION STREAM</span>
              <span className="text-data-nominal-text tabular-nums">{logEntries.length}/8 LOADED</span>
            </div>

            <div className="space-y-1">
              {logEntries.map((entry) => (
                <ScrambleLogLine key={entry.id} entry={entry} />
              ))}
            </div>
          </div>

          {/* Bottom of log container: Large Unbounded Percentage & Progress Bar */}
          <div className="pt-4 border-t border-t2-ash-border/40 mt-auto">
            <div className="flex items-baseline justify-between mb-2">
              <div className="font-t1-unbounded text-5xl sm:text-6xl font-light text-t1-pure-white tabular-nums tracking-tight">
                {progress}
                <span className="text-2xl sm:text-3xl font-light text-t2-smoke ml-1">%</span>
              </div>
              <div className="text-right">
                <div className="text-xs font-mono uppercase tracking-widest text-data-nominal-text font-semibold">
                  {progress === 100 ? 'ORBITAL INSERTION CONFIRMED' : 'DOWNLINK ACTIVE'}
                </div>
                <div className="text-[10px] font-mono text-t2-smoke tracking-wider">
                  {progress === 100 ? 'INITIALIZING INTERACTIVE VIEWPORT' : 'SYNCHRONIZING WITH NAIF SPICE'}
                </div>
              </div>
            </div>

            {/* Hairline Progress Bar */}
            <div className="w-full h-1 bg-black/60 rounded-full border border-t2-ash-border/50 overflow-hidden">
              <div
                className="h-full bg-t1-pure-white transition-all duration-150 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </main>

      {/* ── Bottom Footer Strip ── */}
      <footer className="relative z-10 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-t2-smoke/80 tracking-wider gap-2">
        <div>
          SOURCES: NASA JPL NAIF SPICE DE421 • LRO LOLA PDS • USGS ASTROGEOLOGY
        </div>
        <div className="text-t2-ash-border hover:text-white transition-colors cursor-pointer text-[10px] uppercase tracking-widest">
          [PRESS ANY KEY OR CLICK TO ENTER]
        </div>
      </footer>
    </div>
  );
}
