import { useRef } from 'react';
import { Routes, Route } from 'react-router-dom';
import OrbitView from './pages/OrbitView';
import MissionControl from './pages/MissionControl';
import ComparisonView from './pages/ComparisonView';
import Styleguide from './pages/Styleguide';
import MetricExplainerModal from './components/MetricExplainerModal';
import DataMethodsModal from './components/DataMethodsModal';
import DemoTour from './components/DemoTour';
import GlobalCanvas from './components/GlobalCanvas';

function App() {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="relative w-screen h-screen overflow-hidden">
      {/* ── Single Persistent WebGL Canvas (Zero unmounts between views) ── */}
      <GlobalCanvas containerRef={containerRef} />

      <Routes>
        <Route path="/" element={<OrbitView />} />
        <Route path="/mission/:siteId" element={<MissionControl />} />
        <Route path="/compare" element={<ComparisonView />} />
        <Route path="/styleguide" element={<Styleguide />} />
      </Routes>
      <MetricExplainerModal />
      <DataMethodsModal />
      <DemoTour />
    </div>
  );
}

export default App;
