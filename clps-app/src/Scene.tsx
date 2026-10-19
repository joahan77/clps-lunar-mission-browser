import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Grid, useTexture } from '@react-three/drei';
import * as THREE from 'three';

interface SceneProps {
  sunElevation: number; // in degrees (e.g. +1.34° to +1.57°)
  earthElevation: number; // in degrees (e.g. -6.74° to +6.37°)
}

/**
 * Calculates Sun directional light and sphere position using exact standard trigonometry:
 * - y = sin(elevation_rad) * distance
 * - xz = cos(elevation_rad) * distance
 *
 * For tiny lunar South Pole elevation angles (1.34° - 1.57°), this positions the light
 * almost completely horizontal just above the horizon plane, casting dramatic, long shadows.
 */
function calculateSunPosition(elevation: number): [number, number, number] {
  const rad = THREE.MathUtils.degToRad(elevation);
  const distance = 65;
  const y = Math.sin(rad) * distance;
  const xz = Math.cos(rad) * distance;
  const x = xz * 0.8;
  const z = xz * 0.6;
  return [x, y, z];
}

/**
 * Calculates Earth position using topocentric elevation angle relative to lunar horizon:
 * - When earthElevation < 0: y is negative (-9.4 to 0), placing Earth beneath the horizon plane.
 * - When earthElevation > 0: y is positive (0 to +8.9), rising into the sky for line-of-sight communication.
 */
function calculateEarthPosition(elevation: number): [number, number, number] {
  const rad = THREE.MathUtils.degToRad(elevation);
  const distance = 80;
  const y = Math.sin(rad) * distance;
  const xz = Math.cos(rad) * distance;
  // Position Earth at distinct azimuth (north/north-west) relative to South Pole
  const x = -xz * 0.7;
  const z = xz * 0.7;
  return [x, y, z];
}

/** 3D Lunar terrain plane displaced using real Shackleton crater heightmap */
function LunarSurface() {
  const heightmap = useTexture('/heightmaps/shackleton_heightmap.png');

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow castShadow>
      <planeGeometry args={[80, 80, 256, 256]} />
      <meshStandardMaterial
        color="#71717a"
        roughness={0.88}
        metalness={0.06}
        displacementMap={heightmap}
        displacementScale={8.0}
        flatShading={true}
      />
    </mesh>
  );
}

/** Directional Light representing the grazing Sun with broad shadow frustum */
function SunDirectionalLight({ sunElevation }: { sunElevation: number }) {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const targetPos = useMemo(() => calculateSunPosition(sunElevation), [sunElevation]);

  // Smoothly interpolate position towards target
  useFrame(() => {
    if (lightRef.current) {
      lightRef.current.position.lerp(new THREE.Vector3(...targetPos), 0.1);
    }
  });

  return (
    <directionalLight
      ref={lightRef}
      position={targetPos}
      intensity={3.2}
      color="#fffbeb"
      castShadow
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
      shadow-camera-near={0.5}
      shadow-camera-far={160}
      shadow-camera-left={-45}
      shadow-camera-right={45}
      shadow-camera-top={45}
      shadow-camera-bottom={-45}
      shadow-bias={-0.0008}
    />
  );
}

/** Visual representation of the Sun sphere (radius 2.5, glowing #ffdd55 with corona bloom) */
function SunOrb({ sunElevation }: { sunElevation: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const targetPos = useMemo(() => calculateSunPosition(sunElevation), [sunElevation]);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.lerp(new THREE.Vector3(...targetPos), 0.1);
    }
  });

  return (
    <group ref={groupRef} position={targetPos}>
      {/* Core Glowing Sun Sphere */}
      <mesh>
        <sphereGeometry args={[2.5, 32, 32]} />
        <meshBasicMaterial color="#ffdd55" />
      </mesh>

      {/* Primary Solar Corona Bloom Ring */}
      <mesh scale={1.25}>
        <sphereGeometry args={[2.5, 32, 32]} />
        <meshBasicMaterial
          color="#ffe066"
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Outer Soft Radiant Glow */}
      <mesh scale={1.7}>
        <sphereGeometry args={[2.5, 32, 32]} />
        <meshBasicMaterial
          color="#ffaa00"
          transparent
          opacity={0.15}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/** Visual representation of Earth (blue sphere, radius 1.5, position driven by earthElevation) */
function EarthOrb({ earthElevation }: { earthElevation: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const targetPos = useMemo(() => calculateEarthPosition(earthElevation), [earthElevation]);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.lerp(new THREE.Vector3(...targetPos), 0.1);
    }
  });

  return (
    <group ref={groupRef} position={targetPos}>
      {/* Core Earth Blue Sphere */}
      <mesh>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshBasicMaterial color="#4488ff" />
      </mesh>

      {/* Atmospheric Rayleigh Scattering Glow Halo */}
      <mesh scale={1.25}>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshBasicMaterial
          color="#60a5fa"
          transparent
          opacity={0.32}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Outer Subtle Atmospheric Bloom */}
      <mesh scale={1.6}>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/** Procedural Lunar Lander marker on the surface */
function LunarLander() {
  return (
    <group position={[0, 4.0, 0]}>
      {/* Lander Core */}
      <mesh castShadow receiveShadow position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.6, 0.8, 0.7, 8]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Top Foil Module */}
      <mesh castShadow position={[0, 0.9, 0]}>
        <octahedronGeometry args={[0.5]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Antenna */}
      <mesh position={[0, 1.4, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.6, 8]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>
      {/* Landing legs */}
      {[
        [0.7, 0, 0.7],
        [-0.7, 0, 0.7],
        [0.7, 0, -0.7],
        [-0.7, 0, -0.7],
      ].map((pos, idx) => (
        <mesh key={idx} position={pos as [number, number, number]} castShadow>
          <cylinderGeometry args={[0.04, 0.08, 0.5, 6]} />
          <meshStandardMaterial color="#64748b" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

export default function Scene({ sunElevation, earthElevation }: SceneProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 30, 50], fov: 45 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      className="w-full h-full"
    >
      {/* Space background & subtle distant fog */}
      <color attach="background" args={['#030712']} />
      <fog attach="fog" args={['#030712', 120, 320]} />

      {/* Balanced ambient light allowing deep shadow contrast */}
      <ambientLight intensity={0.45} color="#cbd5e1" />

      {/* Low horizontal grazing Sun with long shadows */}
      <SunDirectionalLight sunElevation={sunElevation} />
      <SunOrb sunElevation={sunElevation} />

      {/* 3D Earth Sphere driven by earthElevation */}
      <EarthOrb earthElevation={earthElevation} />

      {/* Upgraded 5,000-star starfield */}
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      {/* 3D Lunar Terrain Surface (displaced by real heightmap with 8.0 scale & flatShading) */}
      <Suspense fallback={null}>
        <LunarSurface />
      </Suspense>

      {/* Coordinate reference grid */}
      <Grid
        args={[80, 80]}
        position={[0, -0.05, 0]}
        cellSize={2}
        cellThickness={0.5}
        cellColor="#1e293b"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#334155"
        fadeDistance={65}
        infiniteGrid
      />

      {/* Lunar Lander */}
      <LunarLander />

      {/* OrbitControls for camera manipulation */}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={180}
        target={[0, 2, 0]}
        maxPolarAngle={THREE.MathUtils.degToRad(89.5)} // prevent going underneath ground plane
      />
    </Canvas>
  );
}
