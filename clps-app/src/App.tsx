import { Routes, Route } from 'react-router-dom';
import OrbitView from './pages/OrbitView';
import MissionControl from './pages/MissionControl';
import ComparisonView from './pages/ComparisonView';

function App() {
  return (
    <Routes>
      <Route path="/" element={<OrbitView />} />
      <Route path="/mission/:siteId" element={<MissionControl />} />
      <Route path="/compare" element={<ComparisonView />} />
    </Routes>
  );
}

export default App;