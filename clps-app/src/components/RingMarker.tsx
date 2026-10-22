import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface RingMarkerProps {
  lat: number;
  lon: number;
  radius?: number;
  active?: boolean;
  color?: string;
}

export function latLonToVector3(lat: number, lon: number, radius = 12.08): THREE.Vector3 {
  const phi = THREE.MathUtils.degToRad(lat);
  const theta = THREE.MathUtils.degToRad(lon);

  const x = radius * Math.cos(phi) * Math.sin(theta);
  const y = radius * Math.sin(phi);
  const z = radius * Math.cos(phi) * Math.cos(theta);

  return new THREE.Vector3(x, y, z);
}

export default function RingMarker({
  lat,
  lon,
  radius = 12.08,
  active = false,
  color = '#ffffff',
}: RingMarkerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const ringMatRef = useRef<THREE.MeshBasicMaterial>(null);

  const pos = latLonToVector3(lat, lon, radius);

  useFrame((state) => {
    if (!ringRef.current || !ringMatRef.current) return;
    const time = state.clock.getElapsedTime();

    // Pulse animation
    const speed = active ? 3.5 : 1.8;
    const t = (time * speed) % 1;
    const scale = 1 + t * 1.5;
    ringRef.current.scale.set(scale, scale, 1);
    ringMatRef.current.opacity = Math.max(0, 1 - t * 0.9);
  });

  // Calculate rotation to orient normal outward from sphere center
  const normal = pos.clone().normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);

  return (
    <group ref={groupRef} position={pos} quaternion={quaternion}>
      {/* Center dot */}
      <mesh>
        <circleGeometry args={[active ? 0.25 : 0.15, 16]} />
        <meshBasicMaterial color={active ? '#c1ff00' : color} side={THREE.DoubleSide} />
      </mesh>

      {/* Expanding ping ring */}
      <mesh ref={ringRef}>
        <ringGeometry args={[0.2, 0.35, 32]} />
        <meshBasicMaterial
          ref={ringMatRef}
          color={active ? '#c1ff00' : color}
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
