import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMission } from '../context/MissionContext';
import { Canvas, useFrame } from '@react-three/fiber';
import { CameraControls, Sphere, Stars, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../store/useAppStore';
import RingMarker, { latLonToVector3 } from '../components/RingMarker';
import MoonHeatmap from '../components/MoonHeatmap';
import BootSequence from '../components/BootSequence';
import DescentOverlay from '../components/DescentOverlay';
import DemoMode from '../components/DemoMode';
import FpsMonitor from '../components/FpsMonitor';

// Separate component for the 3D Moon sphere with texture
function MoonSphere() {
  const moonTexture = useTexture("https://threejs.org/examples/textures/planets/moon_1024.jpg");

  return (
    <Sphere args={[12, 64, 64]} position={[0, 0, 0]}>
      <meshStandardMaterial 
        map={moonTexture} 
        roughness={0.82} 
        metalness={0.08} 
      />
    </Sphere>
  );
}

// Interactive Moon group with idle drift and programmatic targeting
function MoonGroup({
  targetSite,
  hoveredSite,
  isDescending,
  showHeatmap,
}: {
  targetSite: any | null;
  hoveredSite: any | null;
  isDescending: boolean;
  showHeatmap: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { reducedMotion } = useAppStore();

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Slow idle rotation when no site is targeted/descending
    if (!isDescending && !hoveredSite && !targetSite && !reducedMotion) {
      groupRef.current.rotation.y += delta * 0.04;
    }

    // When a site is hovered or targeted, gently rotate so it faces front (towards Z+)
    const activeSite = targetSite || hoveredSite;
    if (activeSite && !reducedMotion) {
      // Calculate target Y rotation from site's longitude so it faces camera
      const targetY = -THREE.MathUtils.degToRad(activeSite.lon);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetY, 0.08);

      // Adjust tilt slightly so latitude is visible
      const targetX = THREE.MathUtils.degToRad(activeSite.lat + 90) * 0.4;
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetX, 0.08);
    } else if (!isDescending) {
      // Smoothly return X tilt to 0
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.05);
    }
  });

  return (
    <group ref={groupRef}>
      <MoonSphere />
      {/* 30-day illumination heatmap overlay */}
      <MoonHeatmap active={showHeatmap} opacity={0.85} />
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
  } = useAppStore();

  const cameraControlsRef = useRef<CameraControls | null>(null);

  const [hoveredSite, setHoveredSite] = useState<any | null>(null);
  const [targetSite, setTargetSite] = useState<any | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showBoot, setShowBoot] = useState(true);

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

  // ── THE DESCENT SEQUENCE ──
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
      // Camera moves closer along the normal towards the surface
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
      {/* ── Boot Sequence (First Load) ── */}
      {showBoot && <BootSequence onComplete={() => setShowBoot(false)} />}

      {/* ── Crossfade Descent Overlay ── */}
      <DescentOverlay onCancel={() => setTargetSite(null)} />

      {/* ── 3D Moon Canvas with CameraControls ── */}
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
            <ambientLight intensity={0.4} />
            <directionalLight position={[10, 10, 10]} intensity={3} />
            <Stars radius={110} depth={50} count={4000} factor={4} saturation={0} fade speed={0.5} />

            {/* Moon sphere & procedural 30-day illumination heatmap */}
            <MoonGroup
              targetSite={targetSite}
              hoveredSite={hoveredSite}
              isDescending={phase === 'descending'}
              showHeatmap={showHeatmap}
            />

            {/* Ring markers for all landing sites on the sphere surface */}
            {SITES.map((site: any) => {
              const isActive = (targetSite?.id === site.id) || (hoveredSite?.id === site.id);
              return (
                <RingMarker
                  key={site.id}
                  lat={site.lat}
                  lon={site.lon}
                  radius={12.06}
                  active={isActive}
                  color={isActive ? '#c1ff00' : '#ffffff'}
                />
              );
            })}

            {/*
              CameraControls: Replaces OrbitControls while preserving:
              - damping (smooth inertia)
              - minDistance / maxDistance
              - polar angles
              - interruptibility on drag
            */}
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

      {/* ── UI Overlay ── */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-between p-t2-18 md:p-t2-28 pointer-events-none">
        {/* Title Header */}
        <header className="text-center mt-t2-12 md:mt-t2-18 pointer-events-auto">
          <h1 className="font-t1-unbounded text-t1-heading-sm md:text-t1-display font-bold text-t1-pure-white tracking-[2.55px] uppercase">
            CLPS MISSION BROWSER
          </h1>
          <p className="font-t2-nbarchitekt text-t2-body-sm text-t2-pale-mist uppercase mt-t2-6 tracking-normal">
            SELECT A LANDING SITE TO INITIATE DESCENT
          </p>
        </header>

        {/* 8 Site Cards Grid (Active Theory ghost cards + OHZI typography) */}
        <nav
          aria-label="Landing site targets"
          className="grid grid-cols-2 md:grid-cols-4 gap-t2-12 md:gap-t2-16 max-w-5xl w-full px-t2-12 pointer-events-auto my-auto"
        >
          {SITES.map((site: any) => {
            const isHovered = hoveredSite?.id === site.id;
            const isTargeted = targetSite?.id === site.id;

            return (
              <button
                key={site.id}
                onClick={() => handleSelect(site)}
                onMouseEnter={() => setHoveredSite(site)}
                onMouseLeave={() => setHoveredSite(null)}
                className={`bg-black/50 backdrop-blur-[4px] border rounded-t2-xl p-t2-18 text-left transition-all cursor-pointer group focus:outline-none focus:ring-1 focus:ring-t2-ghost-white ${
                  isTargeted
                    ? 'border-data-nominal bg-data-nominal/20 scale-[1.02]'
                    : isHovered
                    ? 'border-t2-smoke bg-white/[0.08]'
                    : 'border-t2-ash-border hover:border-t2-smoke'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-t1-unbounded text-t1-caption md:text-t1-body-sm font-semibold text-t1-pure-white tracking-[3.01px] truncate uppercase">
                    {site.name}
                  </h2>
                  <span
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      isTargeted
                        ? 'bg-data-nominal animate-ping'
                        : isHovered
                        ? 'bg-t2-ghost-white'
                        : 'bg-transparent'
                    }`}
                  />
                </div>
                <div className="font-t2-nbarchitekt text-t2-caption text-t2-pale-mist mt-t2-6 space-y-0.5">
                  <p>{Math.abs(site.lat).toFixed(1)}°S</p>
                  <p>
                    {site.lon >= 0
                      ? `${site.lon.toFixed(1)}°E`
                      : `${Math.abs(site.lon).toFixed(1)}°W`}
                  </p>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <footer className="flex flex-wrap items-center justify-center gap-t2-12 pointer-events-auto mb-t2-6">
          <button
            onClick={() => navigate('/compare')}
            className="font-t2-nbarchitekt text-t2-body-sm text-t2-ghost-white border border-t2-ash-border rounded-t2-md px-t2-14 py-t2-6 bg-transparent hover:bg-white/[0.08] hover:border-t2-smoke transition-colors focus:outline-none focus:ring-1 focus:ring-t2-ghost-white"
          >
            [ View Mission Planner Comparison ]
          </button>

          {/* Illumination Heatmap Toggle */}
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`font-t2-nbarchitekt text-t2-body-sm border rounded-t2-md px-t2-14 py-t2-6 transition-colors ${
              showHeatmap
                ? 'bg-t3-electric-indigo/20 border-t3-electric-indigo text-t2-ghost-white'
                : 'border-t2-ash-border text-t2-pale-mist hover:text-t2-ghost-white'
            }`}
          >
            {showHeatmap ? '● Illumination Heatmap (Active)' : '○ Illumination Heatmap'}
          </button>

          <button
            onClick={() => navigate('/styleguide')}
            className="font-t2-nbarchitekt text-t2-body-sm text-t2-pale-mist border border-transparent rounded-t2-md px-t2-14 py-t2-6 hover:text-t2-ghost-white transition-colors focus:outline-none"
          >
            System Styleguide →
          </button>
        </footer>
      </div>

      {/* FPS & Quality Monitor HUD */}
      <FpsMonitor />

      {/* Guided Tour Demo Mode integration */}
      <DemoMode />
    </div>
  );
}
