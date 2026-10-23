import { create } from 'zustand';

export type AppPhase = 'boot' | 'idle' | 'descending' | 'terrain' | 'returning';

interface AppState {
  // Navigation phase
  phase: AppPhase;
  setPhase: (p: AppPhase) => void;

  // Descent
  pendingNavSiteId: string | null;
  setPendingNavSiteId: (id: string | null) => void;

  // Orbit hover
  hoveredSiteId: string | null;
  setHoveredSiteId: (id: string | null) => void;

  // Demo mode
  demoMode: boolean;
  demoStep: number;
  demoPaused: boolean;
  demoPreviousRoute: string | null;
  demoSliderIndex: number | null;
  demoShowRadarModal: boolean;
  viewReady: boolean;
  setDemoMode: (on: boolean) => void;
  setDemoStep: (n: number) => void;
  setDemoPaused: (paused: boolean) => void;
  setDemoPreviousRoute: (route: string | null) => void;
  setDemoSliderIndex: (idx: number | null) => void;
  setDemoShowRadarModal: (show: boolean) => void;
  setViewReady: (ready: boolean) => void;

  // Overlay (crossfade)
  overlayOpacity: number;
  setOverlayOpacity: (v: number) => void;

  // Performance / quality
  fps: number;
  setFps: (v: number) => void;
  showFps: boolean;
  setShowFps: (v: boolean) => void;
  lowQuality: boolean;
  setLowQuality: (v: boolean) => void;

  // Accessibility
  reducedMotion: boolean;
  setReducedMotion: (v: boolean) => void;

  // Boot
  bootComplete: boolean;
  setBootComplete: (v: boolean) => void;

  // Terrain Vertical Exaggeration (1.0x Realistic, 1.5x, 2.0x Enhanced, 3.0x Dramatic)
  verticalExaggeration: number;
  setVerticalExaggeration: (v: number) => void;

  // Scientific Transparency Modals
  dataMethodsModalOpen: boolean;
  setDataMethodsModalOpen: (open: boolean) => void;
  activeExplainerMetric: string | null;
  setActiveExplainerMetric: (metric: string | null) => void;

  // Radar chart selection (comparison view)
  radarSelectedIds: string[];
  toggleRadarSite: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  phase: 'boot',
  setPhase: (p) => set({ phase: p }),

  pendingNavSiteId: null,
  setPendingNavSiteId: (id) => set({ pendingNavSiteId: id }),

  hoveredSiteId: null,
  setHoveredSiteId: (id) => set({ hoveredSiteId: id }),

  demoMode: false,
  demoStep: 0,
  demoPaused: false,
  demoPreviousRoute: null,
  demoSliderIndex: null,
  demoShowRadarModal: false,
  viewReady: false,
  setDemoMode: (on) => set({ demoMode: on, demoStep: 0, demoPaused: false, demoSliderIndex: null, demoShowRadarModal: false }),
  setDemoStep: (n) => set({ demoStep: n, demoSliderIndex: null }),
  setDemoPaused: (paused) => set({ demoPaused: paused }),
  setDemoPreviousRoute: (route) => set({ demoPreviousRoute: route }),
  setDemoSliderIndex: (idx) => set({ demoSliderIndex: idx }),
  setDemoShowRadarModal: (show) => set({ demoShowRadarModal: show }),
  setViewReady: (ready) => set({ viewReady: ready }),

  overlayOpacity: 1,
  setOverlayOpacity: (v) => set({ overlayOpacity: v }),

  fps: 60,
  setFps: (v) => set({ fps: v }),
  showFps: false,
  setShowFps: (v) => set({ showFps: v }),
  lowQuality: false,
  setLowQuality: (v) => set({ lowQuality: v }),

  reducedMotion: false,
  setReducedMotion: (v) => set({ reducedMotion: v }),

  bootComplete: false,
  setBootComplete: (v) => set({ bootComplete: v }),

  verticalExaggeration: 1.5,
  setVerticalExaggeration: (v) => set({ verticalExaggeration: v }),

  dataMethodsModalOpen: false,
  setDataMethodsModalOpen: (open) => set({ dataMethodsModalOpen: open }),
  activeExplainerMetric: null,
  setActiveExplainerMetric: (metric) => set({ activeExplainerMetric: metric }),

  radarSelectedIds: [],
  toggleRadarSite: (id) =>
    set((s) => {
      const has = s.radarSelectedIds.includes(id);
      if (has) return { radarSelectedIds: s.radarSelectedIds.filter((x) => x !== id) };
      if (s.radarSelectedIds.length >= 3) return s;
      return { radarSelectedIds: [...s.radarSelectedIds, id] };
    }),
}));
