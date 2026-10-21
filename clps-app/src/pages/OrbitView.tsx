import { useNavigate } from 'react-router-dom';
import { useMission } from '../context/MissionContext';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sphere, Stars, useTexture } from '@react-three/drei';
import { Suspense } from 'react';

// A separate component just for the 3D Moon
function MoonModel() {
  // Load a high-res moon texture from Three.js examples
  const moonTexture = useTexture("https://threejs.org/examples/textures/planets/moon_1024.jpg");

  return (
    <Sphere args={[12, 64, 64]} position={[0, 0, 0]}>
      <meshStandardMaterial 
        map={moonTexture} 
        roughness={0.8} 
        metalness={0.1} 
      />
    </Sphere>
  );
}

export default function OrbitView() {
  const navigate = useNavigate();
  const { SITES, setSelectedSite } = useMission();

  const handleSelect = (site: any) => {
    setSelectedSite(site);
    navigate(`/mission/${site.id}`);
  };

  return (
    <div className="h-screen w-full bg-black text-white relative overflow-hidden font-sans">
      
      {/* 🚨 THE 3D MOON BACKGROUND 🚨 */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 35], fov: 45 }}>
          <Suspense fallback={null}>
            <ambientLight intensity={0.4} />
            {/* The Sun lighting up the moon */}
            <directionalLight position={[10, 10, 10]} intensity={3} />
            <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
            
            <MoonModel />
            
            {/* Let the user spin the moon with their mouse, but don't let them zoom too far in/out */}
            <OrbitControls 
              enableZoom={false} 
              enablePan={false} 
              autoRotate 
              autoRotateSpeed={0.5} 
              minPolarAngle={Math.PI / 2 - 0.2} 
              maxPolarAngle={Math.PI / 2 + 0.2} 
            />
          </Suspense>
        </Canvas>
      </div>

      {/* 🚨 THE UI OVERLAY 🚨 */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
        
        {/* Title */}
        <div className="text-center mb-12 mt-10">
          <h1 className="text-5xl font-bold mb-4 tracking-widest font-mono text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
            CLPS MISSION BROWSER
          </h1>
          <p className="text-blue-400 font-mono tracking-widest text-sm drop-shadow-md">
            SELECT A LANDING SITE TO INITIATE DESCENT
          </p>
        </div>

        {/* 8 Site Buttons */}
        {/* pointer-events-auto is crucial so the buttons are clickable, but the space between them lets you drag the 3D moon */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl px-6 pointer-events-auto">
          {SITES.map((site: any) => (
            <button
              key={site.id}
              onClick={() => handleSelect(site)}
              className="bg-slate-900/60 backdrop-blur-xl border border-white/10 p-5 rounded-xl hover:bg-blue-900/40 hover:border-blue-400 transition-all text-left shadow-2xl group"
            >
              <h3 className="font-bold text-sm text-white group-hover:text-blue-300 transition-colors">{site.name}</h3>
              <p className="text-xs text-gray-400 font-mono mt-2">{site.lat}</p>
              <p className="text-xs text-gray-400 font-mono">{site.lon}</p>
            </button>
          ))}
        </div>
        
        {/* Bottom Compare Button */}
        <div className="absolute bottom-8 flex gap-6 pointer-events-auto">
            <button onClick={() => navigate('/compare')} className="text-sm font-mono text-gray-400 hover:text-white border-b border-transparent hover:border-white transition-all drop-shadow-md">
              [ View Mission Planner Comparison ]
            </button>
        </div>
        
      </div>
    </div>
  );
}