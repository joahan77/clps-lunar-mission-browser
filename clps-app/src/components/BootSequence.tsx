import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Loader2 } from 'lucide-react';

interface BootSequenceProps {
  onComplete: () => void;
}

export default function BootSequence({ onComplete }: BootSequenceProps) {
  const [progress, setProgress] = useState(0);
  const [stageText, setStageText] = useState('CALIBRATING SENSORS');
  const [fadeOut, setFadeOut] = useState(false);
  const { bootComplete, setBootComplete, reducedMotion } = useAppStore();

  useEffect(() => {
    if (bootComplete || reducedMotion) {
      onComplete();
      return;
    }

    // Exact ~5.0s total sequence (4.2s count up + 0.3s confirm hold + 0.5s smooth fade)
    const DURATION_MS = 4200;
    const startTime = Date.now();

    const handleKeyDown = () => {
      setBootComplete(true);
      onComplete();
    };
    window.addEventListener('keydown', handleKeyDown);

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.floor((elapsed / DURATION_MS) * 100));

      setProgress(pct);

      if (pct >= 100) {
        clearInterval(interval);
        setStageText('ORBITAL INSERTION CONFIRMED');
        setTimeout(() => {
          setFadeOut(true);
          setTimeout(() => {
            setBootComplete(true);
            onComplete();
          }, 500);
        }, 300);
      } else if (pct > 75) {
        setStageText('SYNCHRONIZING NASA JPL DE421 EPHEMERIS');
      } else if (pct > 48) {
        setStageText('ACQUIRING SOUTH POLE TARGET GRIDS');
      } else if (pct > 22) {
        setStageText('LOADING LOLA 5M/PX DEM TOPOGRAPHY');
      } else {
        setStageText('CALIBRATING SENSORS & IMU TELEMETRY');
      }
    }, 40);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [bootComplete, reducedMotion, onComplete, setBootComplete]);

  if (bootComplete || reducedMotion) return null;

  return (
    <div
      onClick={() => {
        setBootComplete(true);
        onComplete();
      }}
      className={`fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 select-none transition-opacity duration-400 cursor-pointer ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="max-w-md w-full space-y-6 text-center">
        {/* Terminal Header */}
        <div className="space-y-2">
          <div className="font-t1-unbounded text-t1-heading-sm font-bold text-t1-pure-white tracking-[2.61px] uppercase">
            INITIATING DESCENT
          </div>
          <p className="font-t2-nbarchitekt text-t2-caption text-t2-pale-mist tracking-widest uppercase flex items-center justify-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin text-data-nominal-text" />
            <span>{stageText}</span>
          </p>
        </div>

        {/* Progress Bar & Percentage */}
        <div className="space-y-2">
          <div className="w-full h-1 bg-t2-ash-border rounded-t2-full overflow-hidden">
            <div
              className="h-full bg-t2-ghost-white transition-all duration-75"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className="flex justify-between font-t2-nbarchitekt text-t2-caption text-t2-smoke tabular-nums">
            <span>SYS_INIT</span>
            <span className="font-bold text-t2-ghost-white">{Math.min(progress, 100)}%</span>
            <span>CLPS_DE421</span>
          </div>
        </div>

        <div className="text-[10px] font-t2-nbarchitekt text-t2-smoke tracking-wider uppercase">
          Click or Press any key to skip
        </div>
      </div>
    </div>
  );
}
