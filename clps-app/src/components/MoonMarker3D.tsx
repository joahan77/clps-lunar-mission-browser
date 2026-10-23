import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { latLonToVector3 } from './RingMarker';

interface MoonMarker3DProps {
  site: any;
  radius?: number;
  isHovered: boolean;
  isTargeted: boolean;
  onHover: (site: any | null) => void;
  onSelect: (site: any) => void;
}

export default function MoonMarker3D({
  site,
  radius = 12.04,
  isHovered,
  isTargeted,
  onHover,
  onSelect,
}: MoonMarker3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const ringMatRef = useRef<THREE.MeshBasicMaterial>(null);

  // Position relative to Moon center
  const pos = React.useMemo(() => latLonToVector3(site.lat, site.lon, radius), [site.lat, site.lon, radius]);

  // Normal oriented outward from sphere surface
  const quaternion = React.useMemo(() => {
    const normal = pos.clone().normalize();
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  }, [pos]);

  const isActive = isHovered || isTargeted;

  // Far-side occlusion check: hides markers when on the lunar hemisphere facing away from camera
  useFrame((state) => {
    if (!groupRef.current) return;

    const worldPos = new THREE.Vector3();
    groupRef.current.getWorldPosition(worldPos);

    // Normal in world coordinates
    const worldNormal = worldPos.clone().normalize();
    // Direction from marker towards camera
    const camDir = state.camera.position.clone().sub(worldPos).normalize();

    // Dot product: positive when facing camera, negative on far side
    const isFacing = worldNormal.dot(camDir) > 0.08;
    groupRef.current.visible = isFacing;

    // Subtle white pulse animation on hovered/selected site
    if (ringRef.current && ringMatRef.current) {
      if (isActive) {
        const t = (state.clock.getElapsedTime() * 2.2) % 1;
        const scale = 1.0 + t * 0.45;
        ringRef.current.scale.set(scale, scale, 1);
        ringMatRef.current.opacity = Math.max(0, 0.9 - t * 0.8);
      } else {
        ringRef.current.scale.set(1, 1, 1);
        ringMatRef.current.opacity = 0.4;
      }
    }
  });

  return (
    <group ref={groupRef} position={pos} quaternion={quaternion}>
      {/* Invisible Interactive Hit Sphere for effortless mouse targeting */}
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(site);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onHover(null);
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(site);
        }}
      >
        <sphereGeometry args={[0.45, 8, 8]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Surface Hairline Center Dot (Pure White) */}
      <mesh position={[0, 0, 0.02]}>
        <circleGeometry args={[isActive ? 0.12 : 0.08, 16]} />
        <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Surface Hairline Ring (Pure White, 0 yellow) */}
      <mesh ref={ringRef} position={[0, 0, 0.02]}>
        <ringGeometry args={[0.22, 0.32, 32]} />
        <meshBasicMaterial
          ref={ringMatRef}
          color="#ffffff"
          transparent
          opacity={isActive ? 0.9 : 0.65}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Small Label plus Leader Line on Hover */}
      {isActive && (
        <Html
          position={[0, 0, 0.2]}
          center={false}
          distanceFactor={24}
          style={{ pointerEvents: 'none' }}
        >
          <div className="relative select-none animate-in fade-in zoom-in-95 duration-150">
            {/* 45-degree hairline leader line */}
            <div className="absolute bottom-0 left-0 w-8 h-8 pointer-events-none">
              <svg className="w-8 h-8 overflow-visible" viewBox="0 0 32 32">
                <line x1="0" y1="32" x2="16" y2="16" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.8" />
                <line x1="16" y1="16" x2="32" y2="16" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.8" />
                <circle cx="0" cy="32" r="1.5" fill="#ffffff" />
              </svg>
            </div>

            {/* Label callout badge */}
            <div className="ml-8 -mt-6 bg-black/90 border border-t2-ash-border rounded-md px-2.5 py-1.5 shadow-none whitespace-nowrap">
              <p className="font-t1-unbounded text-[10px] font-bold text-t1-pure-white tracking-[1.5px] uppercase">
                {site.name}
              </p>
              <p className="font-t2-nbarchitekt text-[9px] text-t2-pale-mist tracking-tight mt-0.5">
                {Math.abs(site.lat).toFixed(1)}°S, {site.lon >= 0 ? `${site.lon.toFixed(1)}°E` : `${Math.abs(site.lon).toFixed(1)}°W`}
              </p>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
