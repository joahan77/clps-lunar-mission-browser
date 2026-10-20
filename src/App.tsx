import { useState, useEffect, useCallback } from 'react';
import { Loader2, Rocket, AlertTriangle, RefreshCw } from 'lucide-react';
import Dashboard from './Dashboard';
import { landingSites } from './data';
import type { LandingSite, DataPoint } from './data';

export default function App() {
  const [selectedSite, setSelectedSite] = useState<LandingSite>(landingSites[0]);
  const [telemetryData, setTelemetryData] = useState<DataPoint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSiteFetching, setIsSiteFetching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTelemetry = useCallback((site: LandingSite, isInitial = false) => {
    if (isInitial) {
      setIsLoading(true);
    } else {
      setIsSiteFetching(true);
    }
    setError(null);

    const jsonPath = `/${site.dataFile || `${site.id}_data.json`}`;

    fetch(jsonPath)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Failed to fetch ephemeris dataset from ${jsonPath}`);
        }
        return res.json();
      })
      .then((raw) => {
        const points: DataPoint[] = Array.isArray(raw) ? raw : (raw?.data || []);
        if (!points || points.length === 0) {
          throw new Error(`Received empty or malformed telemetry dataset for ${site.name}`);
        }
        setTelemetryData(points);
        setIsLoading(false);
        setIsSiteFetching(false);
      })
      .catch((err) => {
        console.error('Telemetry fetch error:', err);
        setError(err.message || 'Unknown error occurred while loading telemetry.');
        setIsLoading(false);
        setIsSiteFetching(false);
      });
  }, []);

  useEffect(() => {
    fetchTelemetry(selectedSite, true);
  }, []);

  const handleSelectSite = (site: LandingSite) => {
    if (site.id === selectedSite.id && !error) return;
    setSelectedSite(site);
    fetchTelemetry(site, false);
  };

  // Loading Screen with NASA space theme spinner
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-gray-950 text-gray-100 font-mono select-none">
        {/* Orbital animation graphic */}
        <div className="relative flex items-center justify-center mb-8">
          <div className="absolute w-28 h-28 rounded-full border border-blue-500/20 animate-ping" />
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-blue-400/50 animate-spin" />
          <div className="absolute p-3 rounded-full bg-blue-500/10 border border-blue-400/40 text-blue-400">
            <Rocket className="w-8 h-8 animate-pulse" />
          </div>
        </div>

        {/* Text readouts */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-sm font-bold tracking-widest uppercase text-blue-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>INITIALIZING CLPS TELEMETRY FEED</span>
          </div>
          <p className="text-xs text-gray-400">
            Streaming 30-Day NASA JPL DE421 Ephemeris ({selectedSite.dataFile})...
          </p>
          <div className="inline-block px-3 py-1 rounded-full bg-gray-900 border border-gray-800 text-[10px] text-gray-500 mt-2">
            720 Hourly Ephemeris Steps • 8 Lunar South Pole Landing Sites
          </div>
        </div>
      </div>
    );
  }

  // Error Screen
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
          <p className="text-[11px] text-gray-500">
            Please ensure <code className="text-blue-300">public/{selectedSite.dataFile}</code> exists and is accessible.
          </p>
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
    <Dashboard
      telemetryData={telemetryData}
      selectedSite={selectedSite}
      onSelectSite={handleSelectSite}
      isSiteFetching={isSiteFetching}
    />
  );
}
