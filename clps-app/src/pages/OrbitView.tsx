import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMission } from '../context/MissionContext';
import { Canvas, useFrame } from '@react-three/fiber';
import { CameraControls, Sphere, Stars, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../store/useAppStore';
import MoonMarker3D from '../components/MoonMarker3D';
import SouthPoleMiniMap from '../components/SouthPoleMiniMap';
import SitesDrawer from '../components/SitesDrawer';
import HeatmapLegendWidget from '../components/HeatmapLegendWidget';
import MoonHeatmap from '../components/MoonHeatmap';
import BootSequence from '../components/BootSequence';
import DescentOverlay from '../components/DescentOverlay';
import DemoMode from '../components/DemoMode';
import FpsMonitor from '../components/FpsMonitor';
import FooterAttribution from '../components/FooterAttribution';
import { getLunarLightingForDate } from '../utils/lunarLighting';
import { useCountUp } from '../hooks/useCountUp';
import { latLonToVector3 } from '../components/RingMarker';
import { Sun, Compass } from 'lucide-react';

// Separate component for the 3D Moon sphere with texture
function MoonSphere() {
  const moonTexture = useTexture("https://threejs.org/examples/textures/planets/moon_1024.jpg");

  return (
    <Sphere args={[12, 64, 64]} position={[0, 0, 0]}>
      <meshStandardMaterial 
        map={moonTexture} 
        roughness={0.84} 
        metalness={0.06} 
      />
    </Sphere>
  );
}

// Interactive Moon group with idle drift and surface-anchored markers
function MoonGroup({
  targetSite,
  hoveredSite,
  isDescending,
  showHeatmap,
  sites,
  onHover,
  onSelect,
}: {
  targetSite: any | null;
  hoveredSite: any | null;
  isDescending: boolean;
  showHeatmap: boolean;
  sites: any[];
  onHover: (site: any | null) => void;
  onSelect: (site: any) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { reducedMotion } = useAppStore();

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Slow idle rotation when no site is targeted/descending
    if (!isDescending && !hoveredSite && !targetSite && !reducedMotion) {
      groupRef.current.rotation.y += delta * 0.04;
      // Idle southern tilt showcasing the South Pole towards viewer
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, -0.65, 0.05);
    }

    // When a site is hovered or targeted, gently rotate so it faces front (towards Z+)
    const activeSite = targetSite || hoveredSite;
    if (activeSite && !reducedMotion) {
      // Calculate target Y rotation from site's longitude so it faces camera
      const targetY = -THREE.MathUtils.degToRad(activeSite.lon);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetY, 0.08);

      // Southern tilt to showcase the landing site's polar latitude
      const targetX = -0.75 - THREE.MathUtils.degToRad(activeSite.lat + 90) * 0.5;
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetX, 0.08);
    } else if (!isDescending && !reducedMotion) {
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, -0.65, 0.05);
    }
  });

  return (
    <group ref={groupRef}>
      <MoonSphere />
      {/* 30-day illumination heatmap overlay */}
      <MoonHeatmap active={showHeatmap} opacity={0.85} />

      {/* Surface-anchored 3D site markers directly on Moon surface */}
      {sites.map((site: any) => (
        <MoonMarker3D
          key={site.id}
          site={site}
          radius={12.10}
          isHovered={hoveredSite?.id === site.id}
          isTargeted={targetSite?.id === site.id}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}

export default function OrbitView() {
  const navigate = useNavigate();
  const { SITES, setSelectedSite } = useMission();
  const {
    phase,
    setPhase,
    overlayOpacity,
    setOverlayOpacity,
    reducedMotion,
    setReducedMotion,
    lowQuality,
    bootComplete,
  } = useAppStore();

  const cameraControlsRef = useRef<CameraControls | null>(null);

  const [hoveredSite, setHoveredSite] = useState<any | null>(null);
  const [targetSite, setTargetSite] = useState<any | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showBoot, setShowBoot] = useState(!bootComplete && !reducedMotion);

  // Real astronomical lighting for today's UTC date
  const lighting = useMemo(() => getLunarLightingForDate(new Date()), []);

  // Real data stat strip count-up
  const animatedSiteCount = useCountUp(8, 0, 600);
  const animatedHours = useCountUp(720, 0, 800);

  // Check prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [setReducedMotion]);

  // Initial fade-in overlay
  useEffect(() => {
    setOverlayOpacity(1);
    const timer = setTimeout(() => setOverlayOpacity(0), 100);
    return () => clearTimeout(timer);
  }, [setOverlayOpacity]);

  // Cancel descent if user grabs or controls camera
  const handleControlStart = () => {
    if (phase === 'descending') {
      setPhase('idle');
      setTargetSite(null);
      setOverlayOpacity(0);
    }
  };

  // ── THE DESCENT SEQUENCE (Unchanged core logic) ──
  const handleSelect = (site: any) => {
    setSelectedSite(site);
    setTargetSite(site);

    // If reduced-motion is preferred, bypass 3D camera travel with an instant fade
    if (reducedMotion) {
      setOverlayOpacity(1);
      setTimeout(() => navigate(`/mission/${site.id}`), 250);
      return;
    }

    setPhase('descending');

    if (cameraControlsRef.current) {
      // 1. Calculate target vector on sphere
      const sitePos = latLonToVector3(site.lat, site.lon, 12);
      
      // 2. Rotate to face the target coordinates (1.2s smooth ease)
      const normal = sitePos.clone().normalize();
      const approachCamPos = normal.clone().multiplyScalar(13.8);

      cameraControlsRef.current.setLookAt(
        approachCamPos.x,
        approachCamPos.y,
        approachCamPos.z,
        sitePos.x,
        sitePos.y,
        sitePos.z,
        true // enable transition
      );

      // 3. Dolly in through the surface into the terrain view
      setTimeout(() => {
        if (cameraControlsRef.current) {
          cameraControlsRef.current.dollyTo(12.5, true);
        }
      }, 1200);

      // 4. Crossfade into the 3D terrain view at touchdown
      setTimeout(() => {
        setOverlayOpacity(1);
      }, 1800);

      setTimeout(() => {
        navigate(`/mission/${site.id}`);
      }, 2200);
    } else {
      navigate(`/mission/${site.id}`);
    }
  };

  return (
    <div className="h-screen w-full bg-t2-void-black text-t2-ghost-white relative overflow-hidden select-none">
      {/* ── Skippable Boot Sequence (Fast <10s intro, auto-disabled under reduced motion) ── */}
      {showBoot && <BootSequence onComplete={() => setShowBoot(false)} />}

      {/* ── Crossfade Descent Overlay ── */}
      <DescentOverlay onCancel={() => setTargetSite(null)} />

      {/* ── 3D Moon Canvas with Real Astronomical Terminator ── */}
      <div className="absolute inset-0 z-0">
        <Canvas
          camera={{ position: [0, 0, 35], fov: 45 }}
          dpr={[1, lowQuality ? 1.0 : 1.5]}
          performance={{ min: 0.5 }}
          gl={{
            antialias: !lowQuality,
            toneMapping: THREE.ACESFilmicToneMapping,
            powerPreference: 'high-performance',
          }}
        >
          <Suspense fallback={null}>
            {/* Real Sun Directional Light for Today's UTC Date */}
            <directionalLight
              position={[
                lighting.sunVector[0] * 50,
                lighting.sunVector[1] * 50,
                lighting.sunVector[2] * 50,
              ]}
              intensity={3.2}
              color="#fffcf2"
            />

            {/* Faint Earthshine (cool blue fill light from sub-Earth coordinates) */}
            <directionalLight
              position={[
                lighting.earthVector[0] * 40,
                lighting.earthVector[1] * 40,
                lighting.earthVector[2] * 40,
              ]}
              intensity={0.22}
              color="#93c5fd"
            />

            {/* Deep space ambient baseline */}
            <ambientLight intensity={0.06} />

            <Stars radius={110} depth={50} count={4000} factor={4} saturation={0} fade speed={0.5} />

            {/* Moon sphere & surface-anchored site markers */}
            <MoonGroup
              targetSite={targetSite}
              hoveredSite={hoveredSite}
              isDescending={phase === 'descending'}
              showHeatmap={showHeatmap}
              sites={SITES}
              onHover={setHoveredSite}
              onSelect={handleSelect}
            />

            {/* CameraControls */}
            <CameraControls
              ref={cameraControlsRef}
              makeDefault
              smoothTime={0.35}
              minDistance={14}
              maxDistance={70}
              minPolarAngle={Math.PI / 2 - 0.35}
              maxPolarAngle={Math.PI / 2 + 0.35}
              onStart={handleControlStart}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* ── Redesigned UI Overlay (Zero backdrop blur on canvas) ── */}
      <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 sm:p-6 pointer-events-none">
        {/* Top Header Bar: Thesis & Stat Strip (Left) + Primary CTA & Accessible Drawer (Right) */}
        <header className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pointer-events-auto">
          {/* Active Theory Thesis Panel (Positioned away from Moon, AA contrast) */}
          <div className="bg-black/80 border border-t2-ash-border rounded-t2-xl p-3.5 sm:p-4 max-w-lg shadow-none space-y-2">
            <h1 className="font-t1-unbounded text-xs sm:text-sm font-bold text-t1-pure-white tracking-[2.38px] uppercase leading-snug">
              Where on the Moon can a lander survive the night?
            </h1>
            
            <p className="font-t2-nbarchitekt text-[10px] text-t2-smoke flex items-center gap-1.5">
              <Sun className="w-3 h-3 text-amber-400" />
              <span>Terminator computed for {lighting.dateUtcString} UTC (NASA SPICE)</span>
            </p>

            {/* Real Data Stat Strip */}
            <div className="pt-2 border-t border-zinc-800 flex items-center gap-4 text-xs font-t2-nbarchitekt text-t2-pale-mist tabular-nums">
              <div>
                <span className="font-t1-unbounded font-bold text-white text-sm">
                  {animatedSiteCount}
                </span>{' '}
                <span className="text-[10px] text-t2-smoke uppercase">Sites</span>
              </div>
              <span className="text-zinc-700">•</span>
              <div>
                <span className="font-bold text-white font-mono">
                  85.4°S – 89.9°S
                </span>{' '}
                <span className="text-[10px] text-t2-smoke uppercase">Span</span>
              </div>
              <span className="text-zinc-700">•</span>
              <div>
                <span className="font-bold text-white font-mono">
                  {animatedHours}h
                </span>{' '}
                <span className="text-[10px] text-t2-smoke uppercase">Ephemeris</span>
              </div>
            </div>
          </div>

          {/* Top-Right Action Controls */}
          <div className="flex items-center gap-2.5">
            {/* Primary CTA: Dusk Violet Pill with White Label */}
            <button
              onClick={() => navigate('/compare')}
              className="bg-t2-dusk-violet text-t2-ghost-white rounded-full px-5 sm:px-6 py-2.5 font-t2-nbarchitekt text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-all border border-t2-dusk-violet shadow-none focus:outline-none focus:ring-1 focus:ring-white"
            >
              Compare sites →
            </button>

            {/* Collapsed Accessible Sites Drawer */}
            <SitesDrawer
              sites={SITES}
              hoveredSite={hoveredSite}
              targetSite={targetSite}
              onHover={setHoveredSite}
              onSelect={handleSelect}
            />
          </div>
        </header>

        {/* Bottom Interactive Area: South Pole Mini-Map (Left) + Heatmap Layer Widget (Right) */}
        <div className="w-full flex items-end justify-between gap-4 pointer-events-auto">
          {/* South-Pole Polar Mini-Map */}
          <SouthPoleMiniMap
            sites={SITES}
            hoveredSite={hoveredSite}
            targetSite={targetSite}
            onHover={setHoveredSite}
            onSelect={handleSelect}
          />

          {/* Illumination Heatmap Layer Toggle with Perceptual Ramp Legend */}
          <HeatmapLegendWidget
            active={showHeatmap}
            onToggle={() => setShowHeatmap(!showHeatmap)}
          />
        </div>

        {/* Global Footer Attribution Bar */}
        <div className="w-full pointer-events-auto -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 pt-3">
          <FooterAttribution />
        </div>
      </div>

      {/* FPS & Quality Monitor HUD */}
      <FpsMonitor />

      {/* Guided Tour Demo Mode integration */}
      <DemoMode />
    </div>
  );
}
