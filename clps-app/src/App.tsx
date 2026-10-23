import { Routes, Route } from 'react-router-dom';
import OrbitView from './pages/OrbitView';
import MissionControl from './pages/MissionControl';
import ComparisonView from './pages/ComparisonView';
import Styleguide from './pages/Styleguide';
import MetricExplainerModal from './components/MetricExplainerModal';
import DataMethodsModal from './components/DataMethodsModal';
import DemoTour from './components/DemoTour';

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<OrbitView />} />
        <Route path="/mission/:siteId" element={<MissionControl />} />
        <Route path="/compare" element={<ComparisonView />} />
        <Route path="/styleguide" element={<Styleguide />} />
      </Routes>
      <MetricExplainerModal />
      <DataMethodsModal />
      <DemoTour />
    </>
  );
}

export default App;
