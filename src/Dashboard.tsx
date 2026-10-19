import { useState, useCallback, useMemo } from 'react';
import {
  Sun,
  Globe,
  Clock,
  MapPin,
  Rocket,
  Compass,
  Radio,
  ChevronRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import Scene from './Scene';
import { landingSites } from './data';
import type { LandingSite, DataPoint } from './data';

interface DashboardProps {
  telemetryData: DataPoint[];
}

export default function Dashboard({ telemetryData }: DashboardProps) {
  const [selectedSite, setSelectedSite] = useState<LandingSite>(landingSites[0]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Active telemetry reading
  const currentPoint = useMemo<DataPoint>(() => {
    if (!telemetryData || telemetryData.length === 0) {
      return { time: '00:00', sunElevation: 0, earthElevation: 0 };
    }
    const idx = Math.min(Math.max(currentIndex, 0), telemetryData.length - 1);
    return telemetryData[idx];
  }, [telemetryData, currentIndex]);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentIndex(parseInt(e.target.value, 10));
  }, []);

  // Compute a clean tick interval for the 30-day timeline (~8-10 ticks)
  const xAxisInterval = useMemo(() => {
    if (!telemetryData || telemetryData.length === 0) return 1;
    return Math.max(Math.floor(telemetryData.length / 10), 1);
  }, [telemetryData]);

  const totalPoints = telemetryData.length;
  const startTime = telemetryData[0]?.time ?? 'Start';
  const endTime = telemetryData[totalPoints - 1]?.time ?? 'End';

  return (
    <div className="flex h-screen w-screen bg-gray-900 text-gray-100 font-sans select-none overflow-hidden">
      {/* ── Left Sidebar (300px) ── */}
      <aside className="w-[300px] flex-shrink-0 border-r border-gray-800 bg-gray-900/95 flex flex-col justify-between z-10 shadow-2xl">
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Header */}
          <div className="p-4 border-b border-gray-800 bg-gray-950/40">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-400">
                <Rocket className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-wider text-gray-100">
                  CLPS LUNAR
                </h1>
                <p className="text-[10px] tracking-widest uppercase text-blue-400/80 font-mono">
                  Mission Browser
                </p>
              </div>
            </div>
          </div>

          {/* Landing Sites */}
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                Landing Sites
              </span>
              <span className="text-[10px] font-mono text-gray-500">
                {landingSites.length} Targets
              </span>
            </div>

            <div className="space-y-1.5">
              {landingSites.map((site) => {
                const isSelected = selectedSite.id === site.id;
                return (
                  <button
                    key={site.id}
                    onClick={() => setSelectedSite(site)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all duration-150 flex items-center justify-between border ${
                      isSelected
                        ? 'bg-blue-600/20 text-blue-200 border-blue-500/40 shadow-sm shadow-blue-500/10'
                        : 'bg-gray-800/40 text-gray-400 border-gray-800/60 hover:bg-gray-800 hover:text-gray-200'
                    }`}
                  >
                    <span className="font-medium truncate">{site.label}</span>
                    <ChevronRight
                      className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${
                        isSelected ? 'rotate-90 text-blue-400' : 'text-gray-600'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Selected Site Details */}
            <div className="mt-3 p-2.5 bg-gray-950/50 rounded-lg border border-gray-800/80 text-[11px] font-mono space-y-1 text-gray-400">
              <div className="flex justify-between">
                <span className="text-gray-500">Target:</span>
                <span className="text-gray-200 font-medium">{selectedSite.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Coordinates:</span>
                <span className="text-blue-300">
                  {selectedSite.lat.toFixed(1)}°S, {selectedSite.lon.toFixed(1)}°E
                </span>
              </div>
            </div>
          </div>

          {/* Mission Timeline Slider (Hourly steps across 30-day dataset) */}
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Mission Timeline
              </span>
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded">
                {currentPoint.time}
              </span>
            </div>

            <input
              type="range"
              min={0}
              max={Math.max(totalPoints - 1, 0)}
              step={1}
              value={currentIndex}
              onChange={handleSliderChange}
              className="w-full h-1.5 bg-gray-700/80 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none"
            />

            <div className="flex justify-between text-[10px] font-mono text-gray-500 mt-1.5">
              <span>{startTime}</span>
              <span className="text-blue-400">Step {currentIndex + 1}/{totalPoints}</span>
              <span>{endTime}</span>
            </div>
          </div>

          {/* Current Elevation Telemetry Cards */}
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-gray-400">
                Telemetry ({currentPoint.time})
              </span>
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            </div>

            {/* Sun Elevation Card */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-amber-300/80 font-medium flex items-center gap-1.5">
                  <Sun className="w-4 h-4 text-amber-400" />
                  Sun Elevation
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">
                  {currentPoint.sunElevation >= 0 ? 'DAYLIGHT' : 'ECLIPSE'}
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold font-mono text-amber-400">
                  {currentPoint.sunElevation > 0 ? '+' : ''}
                  {currentPoint.sunElevation.toFixed(2)}
                </span>
                <span className="text-xs font-mono text-amber-400/70">deg</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                Sun altitude relative to the local lunar horizon.
              </p>
            </div>

            {/* Earth Elevation Card */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-blue-300/80 font-medium flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-blue-400" />
                  Earth Elevation
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                  {currentPoint.earthElevation >= 0 ? 'LOS ACTIVE' : 'NO COMM'}
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold font-mono text-blue-400">
                  {currentPoint.earthElevation > 0 ? '+' : ''}
                  {currentPoint.earthElevation.toFixed(2)}
                </span>
                <span className="text-xs font-mono text-blue-400/70">deg</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                Line-of-sight elevation to Earth for direct communication.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-800 bg-gray-950/60 flex items-center justify-between text-[10px] font-mono text-gray-500">
          <div className="flex items-center gap-1.5">
            <Compass className="w-3 h-3 text-gray-400" />
            <span>NASA JPL DE421 Ephemeris</span>
          </div>
          <span className="text-emerald-400">● {totalPoints} PTS</span>
        </div>
      </aside>

      {/* ── Right Main Area (Flex-grow) ── */}
      <main className="flex-1 flex flex-col h-full min-w-0">
        {/* Top Section (3D View - 60% height) */}
        <div className="relative w-full h-[60%] bg-black overflow-hidden">
          <Scene
            sunElevation={currentPoint.sunElevation}
            earthElevation={currentPoint.earthElevation}
          />

          {/* Top Left Overlay Badge */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-gray-900/80 backdrop-blur border border-gray-700/60 shadow-lg flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-mono font-medium text-gray-200">
                {selectedSite.label} (3D View)
              </span>
            </div>
          </div>

          {/* Top Right Overlay: Sun Elevation Status */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-gray-900/80 backdrop-blur border border-gray-700/60 shadow-lg flex items-center gap-3 text-xs font-mono">
              <span className="text-gray-400 flex items-center gap-1">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                Sun: <strong className="text-amber-300">{currentPoint.sunElevation.toFixed(2)}°</strong>
              </span>
              <span className="text-gray-500">|</span>
              <span className="text-gray-400 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                Earth: <strong className="text-blue-300">{currentPoint.earthElevation.toFixed(2)}°</strong>
              </span>
              <span className="text-gray-500">|</span>
              <span className="text-gray-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                Time: <strong className="text-emerald-300">{currentPoint.time}</strong>
              </span>
            </div>
          </div>

          {/* Bottom Right Controls Tip */}
          <div className="absolute bottom-3 right-4 z-10 text-[10px] font-mono text-gray-500 bg-gray-950/60 backdrop-blur px-2.5 py-1 rounded border border-gray-800">
            Rotate: Left Click + Drag | Pan: Right Click | Zoom: Scroll
          </div>
        </div>

        {/* Bottom Section (Charts - 40% height) */}
        <div className="w-full h-[40%] border-t border-gray-800 bg-gray-950/70 p-4 flex flex-col justify-between overflow-hidden">
          {/* Chart Header */}
          <div className="flex items-center justify-between mb-1 flex-shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold font-mono tracking-wider uppercase text-gray-300">
                30-Day Solar & Earth Elevation Profile
              </h2>
              <span className="text-[10px] font-mono text-gray-500 bg-gray-800/80 px-1.5 py-0.5 rounded">
                720 Hourly Ephemeris Readings
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                Sun Elevation
              </span>
              <span className="flex items-center gap-1.5 text-blue-400">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                Earth Elevation
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Cursor: {currentPoint.time}
              </span>
            </div>
          </div>

          {/* Recharts LineChart */}
          <div className="w-full flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={telemetryData}
                margin={{ top: 12, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis
                  dataKey="time"
                  interval={xAxisInterval}
                  stroke="#4b5563"
                  tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'monospace' }}
                  tickLine={{ stroke: '#374151' }}
                />
                <YAxis
                  stroke="#4b5563"
                  unit="°"
                  tick={{ fill: '#9ca3af', fontSize: 11, fontFamily: 'monospace' }}
                  tickLine={{ stroke: '#374151' }}
                  domain={[-8, 8]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    borderColor: '#374151',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                  }}
                  itemStyle={{ color: '#e5e7eb' }}
                  labelStyle={{ color: '#9ca3af', fontWeight: 'bold' }}
                  formatter={(value: number) => [
                    `${value > 0 ? '+' : ''}${value.toFixed(2)}°`,
                    '',
                  ]}
                />
                <Legend
                  wrapperStyle={{
                    paddingTop: '2px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                  }}
                />

                {/* Horizon 0° reference line */}
                <ReferenceLine
                  y={0}
                  stroke="#4b5563"
                  strokeDasharray="2 2"
                  label={{
                    value: 'Horizon 0°',
                    fill: '#6b7280',
                    fontSize: 10,
                    position: 'insideBottomRight',
                  }}
                />

                {/* Vertical cursor line matching the slider's current step */}
                <ReferenceLine
                  x={currentPoint.time}
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  label={{
                    value: currentPoint.time,
                    fill: '#10b981',
                    fontSize: 10,
                    position: 'top',
                    fontFamily: 'monospace',
                  }}
                />

                {/* Sun Elevation Line (dot={false} and isAnimationActive={false} for smooth 720-point rendering) */}
                <Line
                  type="monotone"
                  dataKey="sunElevation"
                  name="Sun Elevation"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  activeDot={{ r: 6, fill: '#f59e0b' }}
                />

                {/* Earth Elevation Line */}
                <Line
                  type="monotone"
                  dataKey="earthElevation"
                  name="Earth Elevation"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  activeDot={{ r: 6, fill: '#3b82f6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>
    </div>
  );
}
