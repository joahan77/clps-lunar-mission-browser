import React from 'react';
import { Canvas } from '@react-three/fiber';
import { View, Preload } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../store/useAppStore';

interface GlobalCanvasProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export default function GlobalCanvas({ containerRef }: GlobalCanvasProps) {
  const { lowQuality } = useAppStore();

  return (
    <div id="persistent-canvas-root" className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <Canvas
        eventSource={containerRef as any}
        className="w-full h-full pointer-events-none"
        dpr={[1, Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, lowQuality ? 1.0 : 2.0)]}
        performance={{ min: 0.5 }}
        gl={{
          antialias: !lowQuality,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.82,
        }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault(), false);
        }}
      >
        <color attach="background" args={['#000000']} />
        <View.Port />
        <Preload all />
      </Canvas>
    </div>
  );
}
