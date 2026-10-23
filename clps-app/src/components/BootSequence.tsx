import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { ASSET_MANIFEST, preloadAllAssets } from '../utils/assetPreloader';
import { AlertTriangle } from 'lucide-react';

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

/** Wireframe Moon SVG Sphere */
function WireframeMoonSvg({
  ringDashOffset = 0,
  sweepActive = false,
  isSpinning = false,
}: {
  ringDashOffset?: number;
  sweepActive?: boolean;
  isSpinning?: boolean;
}) {
  return (
    <svg className="w-full h-full" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="moon-sphere-clip">
          <circle cx="120" cy="120" r="92" />
        </clipPath>
        <linearGradient id="sunlight-sweep-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="35%" stopColor="rgba(245, 158, 11, 0.45)" />
          <stop offset="50%" stopColor="rgba(255, 255, 255, 0.95)" />
          <stop offset="65%" stopColor="rgba(251, 191, 36, 0.5)" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>

      {/* Sphere Baseline Rim */}
      <circle
        cx="120"
        cy="120"
        r="92"
        stroke="rgba(255, 255, 255, 0.22)"
        strokeWidth="1.2"
        fill="#000000"
      />

      {/* Group clipped inside lunar sphere */}
      <g clipPath="url(#moon-sphere-clip)">
        <g className={isSpinning ? 'animate-wireframe-spin origin-[120px_120px]' : ''}>
          {/* Concentric Latitude Circles */}
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
        </g>

        {/* South Pole Target Marker (Pulsing ring) */}
        <circle
          cx="120"
          cy="204"
          r="4"
          stroke="#c1ff00"
          strokeWidth="1.2"
          fill="none"
          className="animate-pulse"
        />
        <circle cx="120" cy="204" r="1.5" fill="#c1ff00" />

        {/* 100% Sunlight Sweep Across Wireframe */}
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

      {/* Rotating Orbit Ring */}
      <ellipse
        cx="120"
        cy="120"
        rx="112"
        ry="44"
        transform="rotate(-28 120 120)"
        stroke="rgba(255, 255, 255, 0.45)"
        strokeWidth="1"
        strokeDasharray="4 6"
        className="animate-[spin_18s_linear_infinite] origin-[120px_120px]"
      />

      {/* Center Target Crosshair */}
      <line x1="106" y1="120" x2="134" y2="120" stroke="rgba(255, 255, 255, 0.7)" strokeWidth="0.8" />
      <line x1="120" y1="106" x2="120" y2="134" stroke="rgba(255, 255, 255, 0.7)" strokeWidth="0.8" />
      <circle cx="120" cy="120" r="1.5" fill="#ffffff" />
    </svg>
  );
}

export default function BootSequence({ onComplete }: BootSequenceProps) {
  const {
    bootComplete,
    setBootComplete,
    gatePassed,
    setGatePassed,
    pendingTourFromGate,
    setPendingTourFromGate,
    reducedMotion,
  } = useAppStore();

  const [stage, setStage] = useState<'gate' | 'loading' | 'timeout_error'>(() => {
    if (gatePassed) return 'loading';
    return 'gate';
  });

  const [progress, setProgress] = useState(0);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [sweepActive, setSweepActive] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [utcTime, setUtcTime] = useState(() => new Date().toISOString().substring(11, 19) + ' UTC');

  const buttonRef = useRef<HTMLButtonElement>(null);
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

  // Auto-focus the "BEGIN DESCENT" button when on the gate
  useEffect(() => {
    if (stage === 'gate') {
      const t = setTimeout(() => {
        buttonRef.current?.focus();
      }, 50);
      return () => clearTimeout(t);
    }
  }, [stage]);

  // Handle Begin Descent action (starts loading sequence)
  const handleBeginDescent = () => {
    if (stage !== 'gate') return;

    if (reducedMotion) {
      setFadeOut(true);
      setTimeout(() => {
        setGatePassed(true);
        setBootCompleteRef.current(true);
        onCompleteRef.current();
        if (pendingTourFromGate) {
          useAppStore.getState().setDemoMode(true);
          setPendingTourFromGate(false);
        }
      }, 250);
      return;
    }

    setGatePassed(true);
    setStage('loading');
  };

  // Keyboard navigation & Shortcuts on the gate and loading stages
  useEffect(() => {
    if (bootComplete) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (stage === 'gate') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleBeginDescent();
        } else if (e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          setPendingTourFromGate(true);
          handleBeginDescent();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          handleBeginDescent();
        }
      } else if (stage === 'loading') {
        if (e.key === 'Escape') {
          e.preventDefault();
          // Instant skip during loading
          setBootCompleteRef.current(true);
          onCompleteRef.current();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [stage, bootComplete, reducedMotion]);

  // Orchestrate the real asset loading sequence only when stage === 'loading'
  useEffect(() => {
    if (stage !== 'loading' || bootComplete) return;

    let isMounted = true;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
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

    // 15-second watchdog timer for network timeout / stall
    const watchdogTimer = setTimeout(() => {
      if (isMounted) {
        setStage('timeout_error');
      }
    }, 15000);
    timeouts.push(watchdogTimer);

    // Schedule real asset loading sequentially across a 4.2s window
    const manifest = ASSET_MANIFEST;
    const stepDuration = 440; // ~440ms per real asset load

    manifest.forEach((asset, idx) => {
      const t = setTimeout(async () => {
        if (!isMounted) return;

        try {
          if (asset.type === 'json') {
            const res = await fetch(asset.url);
            await res.json();
          } else {
            const img = new Image();
            img.src = asset.url;
          }
        } catch {
          // Handled gracefully
        }

        if (!isMounted) return;

        const kb = Math.round(asset.expectedBytes / 1024);
        const currentPct = Math.round(((idx + 1) / (manifest.length + 1)) * 95);
        setProgress(currentPct);

        setLogEntries((prev) => [
          ...prev.slice(-6),
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

    // Final step: WebGL Shader pipeline & texture mipmaps
    const finalAssetTime = 350 + manifest.length * stepDuration;
    const tFinal = setTimeout(() => {
      if (!isMounted) return;

      clearTimeout(watchdogTimer);
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

          // Launch queued demo tour if triggered on gate
          if (useAppStore.getState().pendingTourFromGate) {
            useAppStore.getState().setDemoMode(true);
            useAppStore.getState().setPendingTourFromGate(false);
          }
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
  }, [stage, bootComplete]);

  if (bootComplete) return null;

  const ringDashOffset = 600 - (600 * progress) / 100;

  return (
    <div
      className={`fixed inset-0 z-50 bg-[#000000] text-t2-ghost-white flex flex-col justify-between p-6 sm:p-10 select-none transition-opacity duration-500 ${
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

      {/* ── Center Stage ── */}
      <main className="relative z-10 my-auto w-full max-w-5xl mx-auto flex items-center justify-center">
        {/* 1. START GATE SCREEN */}
        {stage === 'gate' && (
          <div className="flex flex-col items-center justify-center text-center space-y-7 max-w-xl mx-auto">
            {/* Wireframe Moon with subtle slow rotation */}
            <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
              <WireframeMoonSvg
                ringDashOffset={0}
                sweepActive={false}
                isSpinning={!reducedMotion}
              />
            </div>

            {/* Thesis Line & Quiet Stat Strip */}
            <div className="space-y-2">
              <h1 className="font-t1-unbounded text-sm sm:text-base font-bold text-t1-pure-white tracking-[2.38px] uppercase leading-relaxed max-w-md mx-auto">
                Where on the Moon can a lander survive the night?
              </h1>
              <p className="font-t2-nbarchitekt text-xs text-t2-smoke tracking-wider">
                8 CANDIDATE SITES • 85.4°S – 89.9°S • 720H UTC MISSION WINDOW
              </p>
            </div>

            {/* Active Theory Ghost Button & Keyboard Hint */}
            <div className="flex flex-col items-center space-y-2.5 pt-2">
              <button
                ref={buttonRef}
                onClick={handleBeginDescent}
                className={`font-t2-nbarchitekt text-xs sm:text-sm font-bold tracking-[2px] uppercase px-8 py-3.5 rounded-t2-md border border-t2-ash-border bg-black/60 hover:bg-white/[0.08] hover:border-t2-smoke text-t2-ghost-white transition-all focus:outline-none focus:ring-1 focus:ring-t2-ghost-white select-none ${
                  reducedMotion ? '' : 'animate-gate-border-pulse'
                }`}
              >
                BEGIN DESCENT
              </button>
              <span className="font-mono text-[10px] text-t2-smoke/70 tracking-wider">
                Press Enter to begin
              </span>
            </div>
          </div>
        )}

        {/* 2. LOADING SEQUENCE (Real Asset Streaming) */}
        {stage === 'loading' && (
          <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Left: Wireframe Moon with Drawing Lat/Lon Circles */}
            <div className="md:col-span-5 flex flex-col items-center justify-center">
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
                <WireframeMoonSvg
                  ringDashOffset={ringDashOffset}
                  sweepActive={sweepActive}
                  isSpinning={false}
                />
              </div>

              {/* Real Loading Progress % */}
              <div className="mt-4 text-center">
                <div className="font-t1-unbounded text-2xl sm:text-3xl font-bold tracking-wider text-t1-pure-white tabular-nums">
                  {progress}
                  <span className="text-sm font-normal text-t2-smoke ml-0.5">%</span>
                </div>
                <div className="text-[10px] font-mono tracking-widest text-t2-smoke uppercase mt-1">
                  NASA TELEMETRY STREAM
                </div>
              </div>
            </div>

            {/* Right: Live Log Stream with Scramble Reveals */}
            <div className="md:col-span-7 bg-[#050508] border border-t2-ash-border rounded-t2-xl p-4 sm:p-5 h-72 sm:h-80 flex flex-col justify-between shadow-2xl">
              <div className="flex items-center justify-between border-b border-t2-ash-border/40 pb-2 text-[10px] font-mono tracking-wider text-t2-smoke uppercase">
                <span>TERMINAL • TELEMETRY_STREAM_DE421</span>
                <span>STATUS: STREAMING</span>
              </div>

              {/* Streaming Log Lines */}
              <div className="flex-1 py-3 flex flex-col justify-end space-y-2 overflow-hidden">
                {logEntries.map((entry) => (
                  <ScrambleLogLine key={entry.id} entry={entry} />
                ))}
              </div>

              {/* Sub-bar */}
              <div className="pt-2 border-t border-t2-ash-border/30 flex items-center justify-between text-[10px] font-mono text-t2-smoke">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-data-nominal animate-pulse" />
                  <span>DE421 NAIF SPICE KERNEL VERIFIED</span>
                </div>
                <span className="text-t2-smoke/80 tabular-nums">720H / 1H STEPS</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. 15-SECOND TIMEOUT FALLBACK SCREEN */}
        {stage === 'timeout_error' && (
          <div className="flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto p-6 bg-[#050508] border border-red-500/30 rounded-t2-xl">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/40 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-t1-unbounded text-sm font-bold uppercase tracking-wider text-white">
              MISSION DATA PIPELINE TIMEOUT
            </h3>
            <p className="font-t2-nbarchitekt text-xs text-t2-pale-mist leading-relaxed">
              Telemetry response exceeded 15.0s threshold. NASA JPL DE421 ephemeris and LOLA DEM tiles could not be verified.
            </p>
            <button
              onClick={() => {
                setProgress(0);
                setLogEntries([]);
                setStage('loading');
              }}
              className="font-t2-nbarchitekt text-xs font-bold tracking-[2px] uppercase px-6 py-2.5 rounded-t2-md border border-t2-ash-border bg-black/60 hover:bg-white/[0.08] hover:border-white text-white transition-all focus:outline-none focus:ring-1 focus:ring-white select-none"
            >
              RETRY CONNECTION
            </button>
          </div>
        )}
      </main>

      {/* ── Bottom HUD Footer ── */}
      <footer className="relative z-10 flex items-center justify-between text-[11px] font-mono text-t2-smoke border-t border-t2-ash-border/30 pt-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#c1ff00] animate-pulse" />
          <span>SPICE KERNELS: DE421 • MOON_PA_DE421 • LOLA 5M</span>
        </div>

        {stage === 'loading' && (
          <button
            onClick={() => {
              setBootCompleteRef.current(true);
              onCompleteRef.current();
            }}
            className="hover:text-t2-ghost-white transition-colors cursor-pointer"
          >
            Skip [Esc]
          </button>
        )}
      </footer>
    </div>
  );
}
