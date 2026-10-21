import { useState, useEffect, useCallback } from 'react';
import { Loader2, Rocket, AlertTriangle, RefreshCw } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import Dashboard from '../Dashboard';
import { useMission } from '../context/MissionContext';
import type { DataPoint } from '../data';

export default function MissionControl() {
  const { siteId } = useParams();
  const navigate = useNavigate();
  const { SITES, selectedSite, setSelectedSite } = useMission();

  const [telemetryData, setTelemetryData] = useState<DataPoint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSiteFetching, setIsSiteFetching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Sync URL to Context (e.g. if you refresh the page)
  useEffect(() => {
    const siteFromUrl = SITES.find((s: any) => s.id === siteId);
    if (siteFromUrl && siteFromUrl.id !== selectedSite.id) {
      setSelectedSite(siteFromUrl);
    }
  }, [siteId, SITES, selectedSite.id, setSelectedSite]);

  // 2. Fetch Data
  const fetchTelemetry = useCallback((site: any, isInitial = false) => {
    if (isInitial) {
      setIsLoading(true);
    } else {
      setIsSiteFetching(true);
    }
    setError(null);

    const jsonPath = `/${site.id}_data.json`;

    fetch(jsonPath)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Failed to fetch dataset from ${jsonPath}`);
        }
        return res.json();
      })
      .then((raw) => {
        const points: DataPoint[] = Array.isArray(raw) ? raw : (raw?.data || []);
        if (!points || points.length === 0) {
          throw new Error(`Received empty dataset for ${site.name}`);
        }
        setTelemetryData(points);
        setIsLoading(false);
        setIsSiteFetching(false);
      })
      .catch((err) => {
        console.error('Telemetry fetch error:', err);
        setError(err.message || 'Unknown error occurred.');
        setIsLoading(false);
        setIsSiteFetching(false);
      });
  }, []);

  // 3. Initial Fetch
  useEffect(() => {
    fetchTelemetry(selectedSite, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 4. Handle Dropdown Change inside the Dashboard
  const handleSelectSite = (site: any) => {
    if (site.id === selectedSite.id && !error) return;
    setSelectedSite(site);
    navigate(`/mission/${site.id}`); // Update the URL
    fetchTelemetry(site, false);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-gray-950 text-gray-100 font-mono select-none">
        <div className="relative flex items-center justify-center mb-8">
          <div className="absolute w-28 h-28 rounded-full border border-blue-500/20 animate-ping" />
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-blue-400/50 animate-spin" />
          <div className="absolute p-3 rounded-full bg-blue-500/10 border border-blue-400/40 text-blue-400">
            <Rocket className="w-8 h-8 animate-pulse" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-sm font-bold tracking-widest uppercase text-blue-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>INITIALIZING CLPS TELEMETRY FEED</span>
          </div>
          <p className="text-xs text-gray-400">
            Streaming 30-Day NASA JPL DE421 Ephemeris ({selectedSite.id}_data.json)...
          </p>
        </div>
      </div>
    );
  }

  if (error && telemetryData.length === 0) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-gray-950 text-gray-100 font-mono p-6">
        <div className="max-w-md w-full p-6 rounded-2xl bg-gray-900 border border-red-500/30 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 border border-red-500/40 flex items-center justify-center text-red-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-100">Telemetry Feed Offline</h2>
            <p className="text-xs text-red-400 mt-1">{error}</p>
          </div>
          <button
            onClick={() => fetchTelemetry(selectedSite, true)}
            className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Telemetry Ingestion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full relative">
      {/* TOP NAVIGATION BUTTONS */}
      <div className="absolute top-4 left-4 z-50">
         <button onClick={() => navigate('/')} className="bg-slate-800 text-white px-4 py-2 rounded font-mono text-sm hover:bg-slate-700 transition-colors shadow-lg">
            ← Back to Orbit
         </button>
      </div>
      <div className="absolute top-4 right-4 z-50">
         <button onClick={() => navigate('/compare')} className="bg-blue-600 text-white px-4 py-2 rounded font-mono text-sm hover:bg-blue-500 transition-colors shadow-lg">
            Compare Sites
         </button>
      </div>

      <Dashboard
        telemetryData={telemetryData}
        selectedSite={selectedSite}
        onSelectSite={handleSelectSite}
        isSiteFetching={isSiteFetching}
      />
    </div>
  );
}