import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const HeatmapShader = {
  uniforms: {
    uTime: { value: 0 },
    uOpacity: { value: 0.85 },
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uOpacity;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;

    // Perceptual Ramp Colors
    // 0.0 -> Void Black (#000000) PSR permanently shadowed
    // 0.2 -> Deep Cold Violet (#1a1040)
    // 0.4 -> Cool Violet (#2d1b8a)
    // 0.6 -> Purple/Magenta (#7c3aed)
    // 0.75 -> Warm Amber (#f97316)
    // 0.9 -> Warm Yellow (#fbbf24)
    // 1.0 -> White Hot (#ffffff)

    vec3 getRampColor(float t) {
      if (t < 0.05) {
        return vec3(0.0, 0.0, 0.0); // PSR Blackout
      } else if (t < 0.25) {
        float f = (t - 0.05) / 0.20;
        return mix(vec3(0.10, 0.06, 0.25), vec3(0.18, 0.11, 0.54), f);
      } else if (t < 0.55) {
        float f = (t - 0.25) / 0.30;
        return mix(vec3(0.18, 0.11, 0.54), vec3(0.49, 0.23, 0.93), f);
      } else if (t < 0.80) {
        float f = (t - 0.55) / 0.25;
        return mix(vec3(0.49, 0.23, 0.93), vec3(0.98, 0.45, 0.09), f);
      } else if (t < 0.95) {
        float f = (t - 0.80) / 0.15;
        return mix(vec3(0.98, 0.45, 0.09), vec3(0.98, 0.75, 0.14), f);
      } else {
        float f = (t - 0.95) / 0.05;
        return mix(vec3(0.98, 0.75, 0.14), vec3(1.0, 1.0, 1.0), f);
      }
    }

    void main() {
      // Normalize position to unit sphere
      vec3 p = normalize(vPosition);
      
      // South pole focus: p.y is negative near south pole (-1.0 at south pole)
      float southPolarFactor = clamp((-p.y - 0.5) / 0.5, 0.0, 1.0);

      // Procedural synthetic illumination pattern matching Artemis South Pole topology
      // Simulates rotating low-grazing sun with deep crater shadowing
      float angle = atan(p.x, p.z);
      float craterNoise = sin(angle * 7.0 + uTime * 0.2) * 0.18 + cos(angle * 13.0 - uTime * 0.1) * 0.12;
      
      // Peaks (Malapert, Mons Mouton) receive high solar exposure
      float elevation = (1.0 - abs(p.y)) * 0.5 + craterNoise;
      
      // Deep crater floors (y < -0.95) stay near zero (Permanently Shadowed Regions)
      float psrMask = smoothstep(-0.92, -0.97, p.y);
      float illumination = clamp((elevation + 0.3) * (1.0 - psrMask * 0.95), 0.0, 1.0);

      // Add time oscillation
      float diurnalCycle = sin(angle + uTime * 0.4) * 0.2 + 0.5;
      float finalExposure = clamp(illumination * 0.75 + diurnalCycle * 0.25, 0.0, 1.0);

      // Only show heatmap intensely in the south polar region
      vec3 color = getRampColor(finalExposure);
      float alpha = southPolarFactor * uOpacity;

      if (alpha < 0.01) discard;

      gl_FragColor = vec4(color, alpha);
    }
  `,
};

export default function MoonHeatmap({ active = true, opacity = 0.75 }: { active?: boolean; opacity?: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  useFrame((state) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
      matRef.current.uniforms.uOpacity.value = active ? opacity : 0.0;
    }
  });

  if (!active) return null;

  return (
    <mesh position={[0, 0, 0]}>
      <sphereGeometry args={[12.04, 64, 64]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={HeatmapShader.vertexShader}
        fragmentShader={HeatmapShader.fragmentShader}
        uniforms={HeatmapShader.uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
