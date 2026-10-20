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
  Loader2,
  Zap,
  Battery,
  Signal,
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
  selectedSite: LandingSite;
  onSelectSite: (site: LandingSite) => void;
  isSiteFetching: boolean;
}

export default function Dashboard({
  telemetryData,
  selectedSite,
  onSelectSite,
  isSiteFetching,
}: DashboardProps) {
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Reset slider when telemetry data changes (new site selected)
  useMemo(() => {
    setCurrentIndex(0);
  }, [telemetryData]);

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

  // Comms status styling
  const commsStatus = currentPoint.commsStatus;
  const commsColor =
    commsStatus === 'NOMINAL'
      ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30'
      : commsStatus === 'WEAK'
      ? 'text-amber-400 bg-amber-400/10 border-amber-400/30'
      : 'text-red-400 bg-red-400/10 border-red-400/30';

  return (
    <div className="flex h-screen w-screen bg-gray-900 text-gray-100 font-sans select-none overflow-hidden">
      {/* ── Left Sidebar (300px) ── */}
      <aside className="w-[300px] flex-shrink-0 bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col z-10 overflow-hidden">
        <div className="flex flex-col flex-1 overflow-y-auto min-h-0">
          {/* Header */}
          <div className="p-4 border-b border-white/10 bg-slate-900/40 backdrop-blur-xl flex-shrink-0">
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
          <div className="p-4 border-b border-gray-800 flex-shrink-0">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                Landing Sites
              </span>
              <span className="text-[10px] font-mono text-gray-500">
                {landingSites.length} Targets
              </span>
            </div>

            {/* Scrollable site list */}
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1 scrollbar-thin">
              {landingSites.map((site) => {
                const isSelected = selectedSite.id === site.id;
                return (
                  <button
                    key={site.id}
                    onClick={() => onSelectSite(site)}
                    disabled={isSiteFetching}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all duration-150 flex items-center justify-between border ${
                      isSelected
                        ? 'bg-blue-600/20 text-blue-200 border-blue-500/40 shadow-sm shadow-blue-500/10'
                        : 'bg-gray-800/40 text-gray-400 border-gray-800/60 hover:bg-gray-800 hover:text-gray-200'
                    } ${isSiteFetching ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span className="font-medium truncate">{site.label}</span>
                    {isSelected && isSiteFetching ? (
                      <Loader2 className="w-3.5 h-3.5 flex-shrink-0 text-blue-400 animate-spin" />
                    ) : (
                      <ChevronRight
                        className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${
                          isSelected ? 'rotate-90 text-blue-400' : 'text-gray-600'
                        }`}
                      />
                    )}
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
                  {Math.abs(selectedSite.lat).toFixed(1)}°S,{' '}
                  {selectedSite.lon >= 0
                    ? `${selectedSite.lon.toFixed(1)}°E`
                    : `${Math.abs(selectedSite.lon).toFixed(1)}°W`}
                </span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-gray-500">Note:</span>
                <span className="text-gray-400 text-right ml-2 leading-tight" style={{ maxWidth: '160px' }}>
                  {selectedSite.description.length > 60
                    ? selectedSite.description.slice(0, 60) + '…'
                    : selectedSite.description}
                </span>
              </div>
            </div>
          </div>

          {/* Mission Timeline Slider */}
          <div className="p-4 border-b border-gray-800 flex-shrink-0">
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

          {/* Telemetry Cards */}
          <div className="p-4 space-y-2.5">
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
            </div>

            {/* Extra telemetry cards (only when data has them) */}
            {currentPoint.solarIrradiance !== undefined && (
              <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500/10 via-yellow-500/5 to-transparent border border-yellow-500/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-yellow-300/80 font-medium flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    Solar Irradiance
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-bold font-mono text-yellow-400">
                    {currentPoint.solarIrradiance.toFixed(1)}
                  </span>
                  <span className="text-xs font-mono text-yellow-400/70">W/m²</span>
                </div>
              </div>
            )}

            {currentPoint.batteryLevel !== undefined && (
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-emerald-300/80 font-medium flex items-center gap-1.5">
                    <Battery className="w-4 h-4 text-emerald-400" />
                    Battery Level
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xl font-bold font-mono text-emerald-400">
                    {currentPoint.batteryLevel.toFixed(1)}%
                  </span>
                  <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${Math.min(currentPoint.batteryLevel, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {currentPoint.commsStatus !== undefined && (
              <div className={`p-2.5 rounded-lg border text-[11px] font-mono flex items-center justify-between ${commsColor}`}>
                <span className="flex items-center gap-1.5">
                  <Signal className="w-3.5 h-3.5" />
                  Comms Status
                </span>
                <span className="font-bold">{currentPoint.commsStatus}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 bg-slate-900/40 backdrop-blur-xl flex items-center justify-between text-[10px] font-mono text-gray-500 flex-shrink-0">
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
            heightmapUrl={selectedSite.heightmapUrl}
          />

          {/* Loading overlay when switching sites */}
          {isSiteFetching && (
            <div className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm flex items-center justify-center z-20">
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gray-900/80 border border-blue-500/30 text-blue-300 text-xs font-mono">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading {selectedSite.name} ephemeris…
              </div>
            </div>
          )}

          {/* Top Left Overlay Badge */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-2xl flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-mono font-medium text-gray-200">
                {selectedSite.label} (3D View)
              </span>
            </div>
          </div>

          {/* Top Right Overlay: Sun / Earth / Time status */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-2xl flex items-center gap-3 text-xs font-mono">
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
        <div className="w-full h-[40%] bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-2xl p-4 flex flex-col justify-between overflow-hidden">
          {/* Chart Header */}
          <div className="flex items-center justify-between mb-1 flex-shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold font-mono tracking-wider uppercase text-gray-300">
                30-Day Solar & Earth Elevation Profile
              </h2>
              <span className="text-[10px] font-mono text-gray-500 bg-gray-800/80 px-1.5 py-0.5 rounded">
                {selectedSite.name} — 720 Hourly Ephemeris Readings
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

                {/* Sun Elevation Line */}
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
