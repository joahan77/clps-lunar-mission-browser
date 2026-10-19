import { useState, useEffect } from 'react';
import { Loader2, Rocket, AlertTriangle, RefreshCw } from 'lucide-react';
import Dashboard from './Dashboard';
import type { DataPoint } from './data';

export default function App() {
  const [telemetryData, setTelemetryData] = useState<DataPoint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTelemetry = () => {
    setIsLoading(true);
    setError(null);

    fetch('/shackleton_data.json')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Failed to fetch ephemeris dataset`);
        }
        return res.json() as Promise<DataPoint[]>;
      })
      .then((data) => {
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error('Received empty or malformed telemetry dataset');
        }
        setTelemetryData(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Telemetry fetch error:', err);
        setError(err.message || 'Unknown error occurred while loading telemetry.');
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchTelemetry();
  }, []);

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
            Streaming 30-Day NASA JPL DE421 Ephemeris (/shackleton_data.json)...
          </p>
          <div className="inline-block px-3 py-1 rounded-full bg-gray-900 border border-gray-800 text-[10px] text-gray-500 mt-2">
            720 Hourly Ephemeris Steps • Lunar South Pole Orbit
          </div>
        </div>
      </div>
    );
  }

  // Error Screen
  if (error) {
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
            Please ensure <code className="text-blue-300">public/shackleton_data.json</code> exists and is accessible.
          </p>
          <button
            onClick={fetchTelemetry}
            className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Telemetry Ingestion
          </button>
        </div>
      </div>
    );
  }

  return <Dashboard telemetryData={telemetryData} />;
}
