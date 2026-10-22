import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Play, Square, FastForward } from 'lucide-react';

interface TourStep {
  timeSec: number;
  route: string;
  title: string;
  caption: string;
  action?: () => void;
}

export default function DemoMode({ onSliderScrub }: { onSliderScrub?: (index: number) => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { demoMode, setDemoMode, demoStep, setDemoStep } = useAppStore();
  const [elapsed, setElapsed] = useState(0);

  const TOUR_STEPS: TourStep[] = [
    {
      timeSec: 0,
      route: '/',
      title: 'ORBITAL RECONNAISSANCE',
      caption: 'Surveying 8 candidate Artemis CLPS landing sites along the lunar South Pole.',
    },
    {
      timeSec: 7,
      route: '/',
      title: 'TARGET ACQUISITION: SHACKLETON RIM',
      caption: 'Centering coordinates: 89.9°S, 0.0°E. Initiating autonomous descent vector.',
    },
    {
      timeSec: 13,
      route: '/mission/shackleton',
      title: 'TOUCHDOWN: SHACKLETON CRATER INTERIOR',
      caption: 'High-resolution USGS DEM terrain with grazing solar elevation angle simulation.',
    },
    {
      timeSec: 22,
      route: '/mission/shackleton',
      title: 'SCRUB-TO-LIVE: 30-DAY SOLAR EPHEMERIS',
      caption: 'Scrubbing JPL DE421 ephemeris. Notice dynamic shadow sweep and sub-horizon Earth line-of-sight.',
    },
    {
      timeSec: 36,
      route: '/compare',
      title: 'MISSION PLANNER: SITE COMPARISON',
      caption: 'Analyzing all 8 landing sites for cumulative sunlight hours, comms uptime, and solar flux.',
    },
    {
      timeSec: 50,
      route: '/compare',
      title: 'RADAR MULTI-TARGET COMPARISON',
      caption: 'Evaluating trade-offs between crater floor volatile ice access vs mountain peak solar continuous power.',
    },
    {
      timeSec: 58,
      route: '/',
      title: 'TOUR COMPLETE',
      caption: 'Returning to orbit command deck. Press D anytime to restart.',
    },
  ];

  // Listen for keyboard 'D' toggle or Escape to exit
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.key === 'd' || e.key === 'D') && !['input', 'textarea'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) {
        e.preventDefault();
        setDemoMode(!demoMode);
        setElapsed(0);
        setDemoStep(0);
      } else if (e.key === 'Escape' && demoMode) {
        setDemoMode(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [demoMode, setDemoMode, setDemoStep]);

  // Demo timer
  useEffect(() => {
    if (!demoMode) return;

    const interval = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= 60) {
          setDemoMode(false);
          navigate('/');
          return 0;
        }

        // Find active step
        const currentStepIndex = TOUR_STEPS.slice().reverse().findIndex((s) => next >= s.timeSec);
        const activeIdx = currentStepIndex !== -1 ? TOUR_STEPS.length - 1 - currentStepIndex : 0;
        setDemoStep(activeIdx);

        // Check if route change needed
        const targetStep = TOUR_STEPS[activeIdx];
        if (targetStep && location.pathname !== targetStep.route) {
          navigate(targetStep.route);
        }

        // Automated slider scrub during steps 22-35
        if (next >= 23 && next <= 35 && onSliderScrub) {
          const scrubFraction = (next - 23) / 12;
          onSliderScrub(Math.floor(scrubFraction * 719));
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [demoMode, location.pathname, navigate, setDemoMode, setDemoStep, onSliderScrub]);

  if (!demoMode) {
    return (
      <button
        onClick={() => {
          setDemoMode(true);
          setElapsed(0);
          setDemoStep(0);
          navigate('/');
        }}
        title="Start Guided Demo Tour (Press D)"
        className="fixed bottom-3 right-4 z-50 flex items-center gap-1.5 px-2.5 py-1 bg-black/60 backdrop-blur-[4px] border border-t2-ash-border rounded-t2-md text-t2-caption font-t2-nbarchitekt text-t2-pale-mist hover:text-t2-ghost-white hover:border-t2-smoke transition-colors"
      >
        <Play className="w-3 h-3 text-data-nominal-text" />
        <span>DEMO TOUR</span>
        <kbd className="px-1 py-0.2 rounded bg-white/10 text-[9px] font-mono text-t2-smoke">D</kbd>
      </button>
    );
  }

  const activeStep = TOUR_STEPS[demoStep] || TOUR_STEPS[0];

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-xl w-full px-4 select-none pointer-events-auto">
      <div className="bg-black/85 backdrop-blur-[8px] border border-data-nominal/60 rounded-t2-xl p-3 shadow-2xl space-y-2">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-t2-ash-border/50 pb-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-data-nominal-text animate-pulse" />
            <span className="font-t1-unbounded text-[11px] font-bold text-t1-pure-white tracking-[2px] uppercase">
              GUIDED COMPETITION TOUR
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-t2-smoke">
            <span>{60 - elapsed}s</span>
            <button
              onClick={() => setDemoMode(false)}
              className="p-1 hover:text-t2-ghost-white transition-colors"
              title="Stop Tour (Esc)"
            >
              <Square className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Dynamic caption */}
        <div>
          <div className="font-t1-unbounded text-xs font-semibold text-data-nominal-text tracking-[1.5px]">
            {activeStep.title}
          </div>
          <p className="font-t2-nbarchitekt text-t2-caption text-t2-pale-mist mt-0.5 leading-snug">
            {activeStep.caption}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 bg-t2-ash-border/40 rounded-full overflow-hidden">
          <div
            className="h-full bg-data-nominal-text transition-all duration-1000"
            style={{ width: `${(elapsed / 60) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
