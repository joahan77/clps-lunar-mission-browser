import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { useMission } from '../context/MissionContext';
import { Play, Pause, Square, SkipBack, SkipForward } from 'lucide-react';

export interface TourStep {
  id: string;
  durationSec: number;
  route: string;
  title: string;
  caption: string;
  action?: () => void;
  onUpdate?: (elapsedSec: number, durationSec: number) => void;
  onExit?: () => void;
}

export default function DemoTour() {
  const navigate = useNavigate();
  const location = useLocation();
  const { SITES, setSelectedSite } = useMission();

  const {
    demoMode,
    setDemoMode,
    demoStep,
    setDemoStep,
    demoPaused,
    setDemoPaused,
    demoPreviousRoute,
    setDemoPreviousRoute,
    setDemoSliderIndex,
    setDemoShowRadarModal,
    viewReady,
    setViewReady,
  } = useAppStore();

  const [stepProgress, setStepProgress] = useState(0);
  const [stepSecondsLeft, setStepSecondsLeft] = useState(0);

  // Synchronized refs to avoid closure staleness and re-render interval thrashing
  const demoModeRef = useRef(demoMode);
  demoModeRef.current = demoMode;

  const demoStepRef = useRef(demoStep);
  demoStepRef.current = demoStep;

  const demoPausedRef = useRef(demoPaused);
  demoPausedRef.current = demoPaused;

  const viewReadyRef = useRef(viewReady);
  viewReadyRef.current = viewReady;

  const locationPathRef = useRef(location.pathname);
  locationPathRef.current = location.pathname;

  const previousRouteRef = useRef<string | null>(demoPreviousRoute);
  previousRouteRef.current = demoPreviousRoute;

  const stepElapsedRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const rAFRef = useRef<number | null>(null);

  // Declarative tour steps
  const TOUR_STEPS: TourStep[] = useMemo(() => [
    {
      id: 'orbital-recon',
      durationSec: 5.0,
      route: '/',
      title: 'ORBITAL RECONNAISSANCE',
      caption: 'Surveying candidate Artemis CLPS landing sites along the Moon’s South Pole under real UTC solar illumination.',
    },
    {
      id: 'target-acquisition',
      durationSec: 4.5,
      route: '/',
      title: 'TARGET ACQUISITION: SHACKLETON RIM',
      caption: 'Centering coordinates: 89.9°S, 0.0°E. Initiating autonomous descent vector into lunar terrain.',
      action: () => {
        const shackleton = SITES.find((s: any) => s.id === 'shackleton') || SITES[0];
        setSelectedSite(shackleton);
      },
    },
    {
      id: 'terrain-touchdown',
      durationSec: 5.5,
      route: '/mission/shackleton',
      title: '3D TERRAIN TOUCHDOWN',
      caption: 'High-resolution USGS/LOLA 5m/px DEM topography with real-time grazing solar elevation and earthshine.',
      action: () => {
        setDemoSliderIndex(0);
      },
    },
    {
      id: 'scrub-to-live',
      durationSec: 7.5,
      route: '/mission/shackleton',
      title: 'SCRUB-TO-LIVE: 30-DAY SOLAR EPHEMERIS',
      caption: 'Scrubbing NASA JPL DE421 ephemeris in real time. Dynamic grazing shadows lengthen across crater ridges.',
      onUpdate: (elapsed, duration) => {
        const pct = Math.min(Math.max(elapsed / duration, 0), 1);
        const idx = Math.min(Math.floor(pct * 719), 719);
        setDemoSliderIndex(idx);
      },
      onExit: () => {
        setDemoSliderIndex(null);
      },
    },
    {
      id: 'mission-planner',
      durationSec: 5.5,
      route: '/compare',
      title: 'MISSION PLANNER: SITE RANKING',
      caption: 'Ranking all 8 candidate Artemis sites by continuous sunlight survival hours, comms line-of-sight, and solar flux.',
    },
    {
      id: 'radar-profile',
      durationSec: 5.5,
      route: '/compare',
      title: 'MULTI-SITE RADAR TRADE-OFFS',
      caption: 'Analyzing multi-parameter trade-offs between crater floor volatile cold-traps and sunlit mountain ridges.',
      action: () => {
        setDemoShowRadarModal(true);
      },
      onExit: () => {
        setDemoShowRadarModal(false);
      },
    },
    {
      id: 'tour-complete',
      durationSec: 2.5,
      route: '/',
      title: 'MISSION TOUR COMPLETE',
      caption: 'Returning to orbit command deck. Press D or click Demo Tour anytime to replay.',
    },
  ], [SITES, setSelectedSite, setDemoSliderIndex, setDemoShowRadarModal]);

  // Clean cancellation & restore previous view
  const stopTour = useCallback((cleanEnd = false) => {
    if (!demoModeRef.current) return;

    if (rAFRef.current) {
      cancelAnimationFrame(rAFRef.current);
      rAFRef.current = null;
    }

    const currentStep = TOUR_STEPS[demoStepRef.current];
    if (currentStep?.onExit) {
      currentStep.onExit();
    }

    setDemoMode(false);
    setDemoPaused(false);
    setDemoSliderIndex(null);
    setDemoShowRadarModal(false);

    const prev = previousRouteRef.current;
    setDemoPreviousRoute(null);

    // Restore previous route if available
    if (prev && locationPathRef.current !== prev) {
      navigate(prev);
    } else if (cleanEnd && locationPathRef.current !== '/') {
      navigate('/');
    }
  }, [TOUR_STEPS, navigate, setDemoMode, setDemoPaused, setDemoSliderIndex, setDemoShowRadarModal, setDemoPreviousRoute]);

  // Start tour from any starting view
  const startTour = useCallback(() => {
    // Record current route as previous route
    const currentPath = locationPathRef.current || '/';
    setDemoPreviousRoute(currentPath);
    previousRouteRef.current = currentPath;

    stepElapsedRef.current = 0;
    lastTimeRef.current = performance.now();

    setDemoStep(0);
    demoStepRef.current = 0;
    setDemoPaused(false);
    demoPausedRef.current = false;
    setDemoMode(true);
    demoModeRef.current = true;

    // Requirement 9: Starting from ANY view must first navigate to step 0's route
    const targetRoute = TOUR_STEPS[0].route;
    if (locationPathRef.current !== targetRoute) {
      setViewReady(false);
      viewReadyRef.current = false;
      navigate(targetRoute);
    } else {
      // Already on target route
      setViewReady(true);
      viewReadyRef.current = true;
      if (TOUR_STEPS[0].action) {
        TOUR_STEPS[0].action();
      }
    }
  }, [TOUR_STEPS, navigate, setDemoMode, setDemoPaused, setDemoPreviousRoute, setDemoStep, setViewReady]);

  // Step transition helper
  const goToStep = useCallback((newIndex: number) => {
    if (newIndex < 0 || newIndex >= TOUR_STEPS.length) return;

    const oldStep = TOUR_STEPS[demoStepRef.current];
    if (oldStep?.onExit) {
      oldStep.onExit();
    }

    stepElapsedRef.current = 0;
    lastTimeRef.current = performance.now();
    setStepProgress(0);

    const nextStep = TOUR_STEPS[newIndex];
    setDemoStep(newIndex);
    demoStepRef.current = newIndex;

    // If step requires route navigation, wait for view ready signal
    if (locationPathRef.current !== nextStep.route) {
      setViewReady(false);
      viewReadyRef.current = false;
      navigate(nextStep.route);
    } else {
      setViewReady(true);
      viewReadyRef.current = true;
      if (nextStep.action) {
        nextStep.action();
      }
    }
  }, [TOUR_STEPS, navigate, setDemoStep, setViewReady]);

  const nextStep = useCallback(() => {
    if (demoStepRef.current < TOUR_STEPS.length - 1) {
      goToStep(demoStepRef.current + 1);
    } else {
      stopTour(true);
    }
  }, [TOUR_STEPS.length, goToStep, stopTour]);

  const prevStep = useCallback(() => {
    if (stepElapsedRef.current > 1.5) {
      // Restart current step
      stepElapsedRef.current = 0;
      lastTimeRef.current = performance.now();
      setStepProgress(0);
    } else if (demoStepRef.current > 0) {
      goToStep(demoStepRef.current - 1);
    }
  }, [goToStep]);

  const togglePause = useCallback(() => {
    const nextPaused = !demoPausedRef.current;
    setDemoPaused(nextPaused);
    demoPausedRef.current = nextPaused;
    lastTimeRef.current = performance.now();
  }, [setDemoPaused]);

  // Detect route arrival and trigger action when view is ready
  useEffect(() => {
    if (!demoMode) return;
    const currentStep = TOUR_STEPS[demoStep];
    if (!currentStep) return;

    // Check if we arrived at step route and view is ready
    if (location.pathname === currentStep.route && viewReady) {
      if (currentStep.action) {
        currentStep.action();
      }
    }
  }, [demoMode, demoStep, location.pathname, viewReady, TOUR_STEPS]);

  // Main high-precision animation frame loop (performance.now() deltas)
  useEffect(() => {
    if (!demoMode) return;

    lastTimeRef.current = performance.now();

    const loop = () => {
      const now = performance.now();
      let deltaSec = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      // When tab is hidden/backgrounded, freeze delta to avoid skipping steps
      if (document.hidden) {
        rAFRef.current = requestAnimationFrame(loop);
        return;
      }

      // Clamp delta to prevent time-dilation leaps on tab refocus
      deltaSec = Math.min(deltaSec, 0.1);

      const currentStep = TOUR_STEPS[demoStepRef.current];
      if (!currentStep) {
        rAFRef.current = requestAnimationFrame(loop);
        return;
      }

      // Check if current route matches step route AND view is ready
      const onCorrectRoute = locationPathRef.current === currentStep.route;
      const isReady = onCorrectRoute && viewReadyRef.current;

      if (!demoPausedRef.current && isReady) {
        stepElapsedRef.current += deltaSec;
        const duration = currentStep.durationSec;
        const progress = Math.min(stepElapsedRef.current / duration, 1);
        setStepProgress(progress);
        setStepSecondsLeft(Math.max(0, Math.ceil(duration - stepElapsedRef.current)));

        if (currentStep.onUpdate) {
          currentStep.onUpdate(stepElapsedRef.current, duration);
        }

        if (stepElapsedRef.current >= duration) {
          if (demoStepRef.current < TOUR_STEPS.length - 1) {
            goToStep(demoStepRef.current + 1);
          } else {
            // Tour complete reached: hold frame and restore previous route
            stopTour(true);
            return;
          }
        }
      }

      rAFRef.current = requestAnimationFrame(loop);
    };

    rAFRef.current = requestAnimationFrame(loop);

    return () => {
      if (rAFRef.current) {
        cancelAnimationFrame(rAFRef.current);
        rAFRef.current = null;
      }
    };
  }, [demoMode, TOUR_STEPS, goToStep, stopTour]);

  // Global Keyboard listener
  useEffect(() => {
    const isTextInput = (el: any): boolean => {
      if (!el || typeof el.tagName !== 'string') return false;
      const tag = el.tagName.toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag)) return true;
      if (el.isContentEditable) return true;
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when Cmd/Ctrl/Alt is held
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Ignore when focused in text inputs
      if (isTextInput(document.activeElement) || isTextInput(e.target as Element)) return;

      // Toggle Demo Tour with 'd' or 'D'
      if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        if (demoModeRef.current) {
          stopTour();
        } else {
          startTour();
        }
        return;
      }

      // All remaining keys only apply when tour is active
      if (!demoModeRef.current) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        stopTour();
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePause();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextStep();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevStep();
      } else {
        // Any non-tour key cancels the tour and restores previous view
        stopTour();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [startTour, stopTour, togglePause, nextStep, prevStep]);

  // Global User Input Cancellation listener (pointerdown, wheel, NOT mousemove)
  useEffect(() => {
    if (!demoMode) return;

    const isTourControl = (target: EventTarget | null): boolean => {
      return !!(target as Element)?.closest?.('[data-demo-control="true"]');
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (isTourControl(e.target)) return;
      stopTour();
    };

    const handleWheel = (e: WheelEvent) => {
      if (isTourControl(e.target)) return;
      stopTour();
    };

    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [demoMode, stopTour]);

  // Unactivated floating button
  if (!demoMode) {
    return (
      <button
        onClick={startTour}
        data-demo-control="true"
        title="Start Guided Demo Tour (Press D)"
        className="fixed bottom-3 right-4 z-50 flex items-center gap-1.5 px-3 py-1.5 bg-black/75 backdrop-blur-[6px] border border-t2-ash-border rounded-t2-md text-t2-caption font-t2-nbarchitekt text-t2-pale-mist hover:text-t2-ghost-white hover:border-t2-smoke transition-all shadow-lg active:scale-95"
      >
        <Play className="w-3.5 h-3.5 text-data-nominal-text fill-data-nominal-text" />
        <span className="font-medium tracking-wide">DEMO TOUR</span>
        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-mono text-t2-smoke border border-white/10">D</kbd>
      </button>
    );
  }

  const activeStep = TOUR_STEPS[demoStep] || TOUR_STEPS[0];

  return (
    <div
      data-demo-control="true"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-xl w-full px-4 select-none pointer-events-auto"
    >
      <div className="bg-black/90 backdrop-blur-[10px] border border-data-nominal/60 rounded-t2-xl p-3.5 shadow-2xl space-y-2.5">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-t2-ash-border/50 pb-2">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${demoPaused ? 'bg-amber-400' : 'bg-data-nominal-text animate-pulse'}`} />
            <span className="font-t1-unbounded text-[11px] font-bold text-t1-pure-white tracking-[2px] uppercase">
              GUIDED TOUR
            </span>
            <span className="font-mono text-[10px] text-t2-smoke ml-1">
              ({demoStep + 1}/{TOUR_STEPS.length})
            </span>
            {demoPaused && (
              <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 text-[9px] font-mono font-bold tracking-wider uppercase border border-amber-400/40">
                PAUSED
              </span>
            )}
            {!viewReady && (
              <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 text-[9px] font-mono tracking-wider uppercase border border-blue-500/40 animate-pulse">
                SYNCING VIEW...
              </span>
            )}
          </div>

          {/* Interactive controls inside HUD */}
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-t2-smoke">
            <span className="tabular-nums font-bold text-t2-ghost-white mr-1.5">
              {stepSecondsLeft}s
            </span>

            {/* Previous Step button */}
            <button
              onClick={prevStep}
              data-demo-control="true"
              disabled={demoStep === 0}
              className="p-1 hover:text-t2-ghost-white disabled:opacity-30 disabled:hover:text-t2-smoke transition-colors"
              title="Previous Step (Left Arrow)"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            {/* Pause / Resume button */}
            <button
              onClick={togglePause}
              data-demo-control="true"
              className="p-1 hover:text-t2-ghost-white transition-colors"
              title={demoPaused ? 'Resume Tour (Space)' : 'Pause Tour (Space)'}
            >
              {demoPaused ? (
                <Play className="w-3.5 h-3.5 text-data-nominal-text fill-data-nominal-text" />
              ) : (
                <Pause className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Next Step button */}
            <button
              onClick={nextStep}
              data-demo-control="true"
              className="p-1 hover:text-t2-ghost-white transition-colors"
              title="Next Step (Right Arrow)"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            <span className="w-px h-3 bg-t2-ash-border/60 mx-1" />

            {/* Stop button */}
            <button
              onClick={() => stopTour()}
              data-demo-control="true"
              className="p-1 hover:text-red-400 text-t2-pale-mist transition-colors"
              title="Stop Tour and Restore View (Esc)"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Dynamic Caption */}
        <div>
          <div className="font-t1-unbounded text-xs font-semibold text-data-nominal-text tracking-[1.5px] uppercase">
            {activeStep.title}
          </div>
          <p className="font-t2-nbarchitekt text-t2-caption text-t2-ghost-white mt-1 leading-relaxed">
            {activeStep.caption}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 bg-t2-ash-border/40 rounded-full overflow-hidden">
          <div
            className="h-full bg-data-nominal-text transition-all duration-75"
            style={{ width: `${Math.min(stepProgress * 100, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
