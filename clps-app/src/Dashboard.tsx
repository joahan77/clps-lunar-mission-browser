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
import { useMission } from './context/MissionContext';
import type { DataPoint } from './data';
import { useCountUp } from './hooks/useCountUp';
import { useDecodeScramble } from './hooks/useDecodeScramble';
import { useMissionClock } from './hooks/useMissionClock';
import DemoMode from './components/DemoMode';
import FpsMonitor from './components/FpsMonitor';

interface DashboardProps {
  telemetryData: DataPoint[];
  selectedSite: any;
  onSelectSite: (site: any) => void;
  isSiteFetching: boolean;
}

export default function Dashboard({
  telemetryData,
  selectedSite,
  onSelectSite,
  isSiteFetching,
}: DashboardProps) {
  const { SITES } = useMission();
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Real-time ticking mission clock
  const missionClock = useMissionClock(1, 0, 0);

  // Reset slider when telemetry data changes
  useMemo(() => {
    setCurrentIndex(0);
  }, [telemetryData]);

  // Active telemetry reading
  const currentPoint = useMemo<DataPoint>(() => {
    if (!telemetryData || telemetryData.length === 0) {
      return { time: '00:00', sunElevation: 0, earthElevation: 0 } as DataPoint;
    }
    const idx = Math.min(Math.max(currentIndex, 0), telemetryData.length - 1);
    return telemetryData[idx];
  }, [telemetryData, currentIndex]);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentIndex(parseInt(e.target.value, 10));
  }, []);

  // Compute clean tick interval for the 30-day timeline
  const xAxisInterval = useMemo(() => {
    if (!telemetryData || telemetryData.length === 0) return 1;
    return Math.max(Math.floor(telemetryData.length / 10), 1);
  }, [telemetryData]);

  const totalPoints = telemetryData?.length || 0;
  const startTime = telemetryData[0]?.time ?? 'Start';
  const endTime = telemetryData[totalPoints - 1]?.time ?? 'End';

  // ── LIVING NUMBERS HOOKS ──
  const animatedSunElevation = useCountUp(currentPoint.sunElevation, 2, 250);
  const animatedEarthElevation = useCountUp(currentPoint.earthElevation, 2, 250);
  const animatedSolar = useCountUp(currentPoint.solarIrradiance || 0, 1, 250);
  const animatedBattery = useCountUp(currentPoint.batteryLevel || 100, 1, 250);

  // Decode scramble on site name and coordinates
  const scrambledSiteName = useDecodeScramble(selectedSite.name || '', 500);
  const coordString = `${Math.abs(selectedSite.lat).toFixed(1)}°S, ${
    selectedSite.lon >= 0 ? `${selectedSite.lon.toFixed(1)}°E` : `${Math.abs(selectedSite.lon).toFixed(1)}°W`
  }`;
  const scrambledCoords = useDecodeScramble(coordString, 600);

  // Comms status styling using Data Tokens
  const commsStatus = currentPoint.commsStatus;
  const commsColor =
    commsStatus === 'NOMINAL'
      ? 'text-data-nominal-text bg-data-nominal/15 border-data-nominal/40'
      : commsStatus === 'DEGRADED' || commsStatus === 'WEAK'
      ? 'text-data-degraded-text bg-data-degraded/15 border-data-degraded/40'
      : 'text-data-blackout-text bg-data-blackout/15 border-data-blackout/40';

  return (
    <div className="flex h-screen w-screen bg-t2-void-black text-t2-ghost-white select-none overflow-hidden relative">
      {/* ── Left Sidebar (Active Theory Shell + OHZI Typography + Times Editorial) ── */}
      <aside className="w-[320px] flex-shrink-0 bg-black/50 backdrop-blur-[4px] border-r border-t2-ash-border flex flex-col z-10 overflow-hidden">
        <div className="flex flex-col flex-1 overflow-y-auto min-h-0">
          {/* Header */}
          <div className="p-t2-16 border-b border-t2-ash-border flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-t2-md bg-t2-dusk-violet text-t2-ghost-white border border-t2-dusk-violet">
                <Rocket className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-t1-unbounded text-t1-body font-bold text-t1-pure-white tracking-[2.38px] uppercase">
                  CLPS LUNAR
                </h1>
                <p className="font-t2-nbarchitekt text-t2-caption text-t2-pale-mist uppercase tracking-widest">
                  Mission Browser
                </p>
              </div>
            </div>
          </div>

          {/* Landing Sites Section */}
          <div className="p-t2-16 border-b border-t2-ash-border flex-shrink-0">
            <div className="flex items-center justify-between mb-2.5">
              <span className="font-t1-unbounded text-t1-caption font-semibold text-t1-pure-white tracking-[2.63px] uppercase flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-t2-pale-mist" />
                Landing Sites
              </span>
              <span className="font-t2-nbarchitekt text-t2-caption text-t2-smoke">
                {SITES.length} Targets
              </span>
            </div>

            {/* Scrollable site list */}
            <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-1">
              {SITES.map((site: any) => {
                const isSelected = selectedSite.id === site.id;
                return (
                  <button
                    key={site.id}
                    onClick={() => onSelectSite(site)}
                    disabled={isSiteFetching}
                    className={`w-full text-left px-t2-12 py-2 rounded-t2-md font-t2-nbarchitekt text-t2-body-sm transition-colors flex items-center justify-between border ${
                      isSelected
                        ? 'bg-t2-dusk-violet text-t2-ghost-white border-t2-dusk-violet'
                        : 'bg-black/30 text-t2-pale-mist border-t2-ash-border hover:bg-white/[0.08] hover:text-t2-ghost-white'
                    } ${isSiteFetching ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span className="font-medium truncate">{site.label}</span>
                    {isSelected && isSiteFetching ? (
                      <Loader2 className="w-3.5 h-3.5 flex-shrink-0 text-t2-ghost-white animate-spin" />
                    ) : (
                      <ChevronRight
                        className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${
                          isSelected ? 'rotate-90 text-t2-ghost-white' : 'text-t2-smoke'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Site Details (Decode/Scramble & Times Editorial Prose) */}
            <div className="mt-t2-12 p-t2-12 bg-black/40 rounded-t2-md border border-t2-ash-border font-t2-nbarchitekt text-t2-caption space-y-1.5 text-t2-pale-mist">
              <div className="flex justify-between items-center">
                <span className="text-t2-smoke">Target:</span>
                <span className="font-t1-unbounded text-t1-caption font-semibold text-t1-pure-white tracking-[2.63px] uppercase">
                  {scrambledSiteName}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-t2-smoke">Coordinates:</span>
                <span className="text-t2-ghost-white font-t2-nbarchitekt text-t2-caption font-mono">
                  {scrambledCoords}
                </span>
              </div>
              <div className="pt-1 border-t border-t2-ash-border/50">
                <span className="text-t2-smoke block mb-0.5">Mission Site Notes:</span>
                <p className="font-t2-times text-[14px] leading-[1.88] text-t2-pale-mist font-normal">
                  {selectedSite.description}
                </p>
              </div>
            </div>
          </div>

          {/* Mission Timeline Slider (Scrub-to-live) */}
          <div className="p-t2-16 border-b border-t2-ash-border flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="font-t1-unbounded text-t1-caption font-semibold text-t1-pure-white tracking-[2.63px] uppercase flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-t2-pale-mist" />
                Mission Timeline
              </span>
              <span className="font-t2-nbarchitekt text-t2-body-sm text-t2-ghost-white border border-t2-ash-border rounded-t2-md px-2 py-0.5 bg-black/40 tabular-nums">
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
              className="w-full h-1.5 bg-t2-ash-border rounded-t2-md appearance-none cursor-pointer accent-t2-dusk-violet focus:outline-none transition-all"
            />

            <div className="flex justify-between font-t2-nbarchitekt text-t2-caption text-t2-smoke mt-1.5 tabular-nums">
              <span>{startTime}</span>
              <span className="text-t2-pale-mist">Step {currentIndex + 1}/{totalPoints}</span>
              <span>{endTime}</span>
            </div>
          </div>

          {/* Telemetry Cards Section (Living Numbers + Odometer) */}
          <div className="p-t2-16 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-t1-unbounded text-t1-caption font-semibold text-t1-pure-white tracking-[2.63px] uppercase">
                Telemetry ({currentPoint.time})
              </span>
              <Radio className="w-3.5 h-3.5 text-data-nominal animate-pulse" />
            </div>

            {/* Sun Elevation Card */}
            <div className="p-t2-12 rounded-t2-xl bg-black/50 border border-t2-ash-border">
              <div className="flex items-center justify-between mb-1">
                <span className="font-t2-nbarchitekt text-t2-body-sm text-t2-pale-mist flex items-center gap-1.5">
                  <Sun className="w-4 h-4 text-data-sun" />
                  Sun Elevation
                </span>
                <span className="font-t2-nbarchitekt text-t2-caption px-2 py-0.5 rounded-t2-full border border-t2-ash-border text-t2-ghost-white bg-black/40">
                  {currentPoint.sunElevation >= 0 ? 'DAYLIGHT' : 'ECLIPSE'}
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-t1-unbounded text-t1-subheading font-bold text-t1-pure-white tracking-[2.66px] tabular-nums">
                  {parseFloat(animatedSunElevation) > 0 ? '+' : ''}
                  {animatedSunElevation}
                </span>
                <span className="font-t2-nbarchitekt text-t2-caption text-t2-smoke">deg</span>
              </div>
            </div>

            {/* Earth Elevation Card */}
            <div className="p-t2-12 rounded-t2-xl bg-black/50 border border-t2-ash-border">
              <div className="flex items-center justify-between mb-1">
                <span className="font-t2-nbarchitekt text-t2-body-sm text-t2-pale-mist flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-data-earth" />
                  Earth Elevation
                </span>
                <span className="font-t2-nbarchitekt text-t2-caption px-2 py-0.5 rounded-t2-full border border-t2-ash-border text-t2-ghost-white bg-black/40">
                  {currentPoint.earthElevation >= 0 ? 'LOS ACTIVE' : 'NO COMM'}
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-t1-unbounded text-t1-subheading font-bold text-t1-pure-white tracking-[2.66px] tabular-nums">
                  {parseFloat(animatedEarthElevation) > 0 ? '+' : ''}
                  {animatedEarthElevation}
                </span>
                <span className="font-t2-nbarchitekt text-t2-caption text-t2-smoke">deg</span>
              </div>
            </div>

            {/* Solar Irradiance */}
            {currentPoint.solarIrradiance !== undefined && (
              <div className="p-t2-12 rounded-t2-xl bg-black/50 border border-t2-ash-border">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-t2-nbarchitekt text-t2-body-sm text-t2-pale-mist flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-data-sun" />
                    Solar Irradiance
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="font-t1-unbounded text-t1-subheading font-bold text-t1-pure-white tracking-[2.66px] tabular-nums">
                    {animatedSolar}
                  </span>
                  <span className="font-t2-nbarchitekt text-t2-caption text-t2-smoke">W/m²</span>
                </div>
              </div>
            )}

            {/* Battery Level */}
            {currentPoint.batteryLevel !== undefined && (
              <div className="p-t2-12 rounded-t2-xl bg-black/50 border border-t2-ash-border">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-t2-nbarchitekt text-t2-body-sm text-t2-pale-mist flex items-center gap-1.5">
                    <Battery className="w-4 h-4 text-data-nominal" />
                    Battery Level
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-t1-unbounded text-t1-body font-bold text-t1-pure-white tracking-[2.38px] tabular-nums">
                    {animatedBattery}%
                  </span>
                  <div className="flex-1 h-1.5 bg-black/60 rounded-t2-md overflow-hidden border border-t2-ash-border">
                    <div
                      className="h-full bg-data-nominal transition-all duration-300"
                      style={{ width: `${Math.min(currentPoint.batteryLevel, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Comms Status Indicator */}
            {currentPoint.commsStatus !== undefined && (
              <div className={`p-t2-12 rounded-t2-md border font-t2-nbarchitekt text-t2-caption flex items-center justify-between ${commsColor}`}>
                <span className="flex items-center gap-1.5">
                  <Signal className="w-3.5 h-3.5" />
                  Comms Status
                </span>
                <span className="font-bold tracking-wider">{currentPoint.commsStatus}</span>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-t2-12 border-t border-t2-ash-border bg-black/50 flex items-center justify-between font-t2-nbarchitekt text-t2-caption text-t2-smoke flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <Compass className="w-3 h-3 text-t2-pale-mist" />
            <span>NASA JPL DE421 Ephemeris</span>
          </div>
          <span className="text-data-nominal tabular-nums">● {totalPoints} PTS</span>
        </div>
      </aside>

      {/* ── Right Main Area ── */}
      <main className="flex-1 flex flex-col h-full min-w-0">
        {/* Top Section (3D View - 60% height) */}
        <div className="relative w-full h-[60%] bg-t2-void-black overflow-hidden">
          <Scene
            sunElevation={currentPoint.sunElevation}
            earthElevation={currentPoint.earthElevation}
            heightmapUrl={selectedSite.heightmapUrl}
          />

          {/* Loading overlay when switching sites */}
          {isSiteFetching && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[4px] flex items-center justify-center z-20">
              <div className="flex items-center gap-3 px-t2-16 py-t2-12 rounded-t2-md bg-black/80 border border-t2-ash-border text-t2-ghost-white font-t2-nbarchitekt text-t2-body-sm">
                <Loader2 className="w-4 h-4 animate-spin text-t2-pale-mist" />
                Loading {selectedSite.name} ephemeris…
              </div>
            </div>
          )}

          {/* Top Left Overlay Badge */}
          <div className="absolute top-20 left-4 z-10 flex items-center gap-2">
            <div className="px-t2-12 py-t2-6 rounded-t2-md bg-black/50 backdrop-blur-[4px] border border-t2-ash-border flex items-center gap-2">
              <div className="w-2 h-2 rounded-t2-full bg-data-nominal animate-ping" />
              <span className="font-t2-nbarchitekt text-t2-body-sm text-t2-ghost-white">
                {selectedSite.label} (3D View)
              </span>
            </div>
          </div>

          {/* Top Right Overlay: Sun / Earth / Ticking Mission Clock HUD */}
          <div className="absolute top-20 right-4 z-10 flex items-center gap-2">
            <div className="px-t2-12 py-t2-6 rounded-t2-md bg-black/50 backdrop-blur-[4px] border border-t2-ash-border flex items-center gap-3 font-t2-nbarchitekt text-t2-body-sm tabular-nums">
              <span className="text-t2-pale-mist flex items-center gap-1">
                <Sun className="w-3.5 h-3.5 text-data-sun" />
                Sun: <strong className="text-t2-ghost-white">{animatedSunElevation}°</strong>
              </span>
              <span className="text-t2-smoke">|</span>
              <span className="text-t2-pale-mist flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-data-earth" />
                Earth: <strong className="text-t2-ghost-white">{animatedEarthElevation}°</strong>
              </span>
              <span className="text-t2-smoke">|</span>
              <span className="text-t2-pale-mist flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-data-nominal" />
                Clock: <strong className="text-t2-ghost-white">{missionClock.formatted}</strong>
              </span>
            </div>
          </div>

          {/* Bottom Right Controls Tip */}
          <div className="absolute bottom-3 right-4 z-10 font-t2-nbarchitekt text-t2-caption text-t2-smoke bg-black/60 backdrop-blur-[4px] px-t2-12 py-1 rounded-t2-md border border-t2-ash-border">
            Rotate: Left Click + Drag | Pan: Right Click | Zoom: Scroll
          </div>
        </div>

        {/* Bottom Section (Charts - 40% height) */}
        <div className="w-full h-[40%] bg-black/50 backdrop-blur-[4px] border-t border-t2-ash-border p-t2-16 flex flex-col justify-between overflow-hidden">
          {/* Chart Header */}
          <div className="flex items-center justify-between mb-1 flex-shrink-0">
            <div className="flex items-center gap-3">
              <h2 className="font-t1-unbounded text-t1-caption font-semibold tracking-[2.63px] uppercase text-t1-pure-white">
                30-Day Solar & Earth Elevation Profile
              </h2>
              <span className="font-t2-nbarchitekt text-t2-caption text-t2-smoke border border-t2-ash-border px-2 py-0.5 rounded-t2-md">
                {selectedSite.name} — 720 Hourly Ephemeris Readings
              </span>
            </div>
            <div className="flex items-center gap-3 font-t2-nbarchitekt text-t2-caption tabular-nums">
              <span className="flex items-center gap-1.5 text-data-sun">
                <span className="w-2 h-2 rounded-t2-full bg-data-sun" />
                Sun Elevation
              </span>
              <span className="flex items-center gap-1.5 text-data-earth">
                <span className="w-2 h-2 rounded-t2-full bg-data-earth" />
                Earth Elevation
              </span>
              <span className="flex items-center gap-1.5 text-data-nominal font-bold">
                <span className="w-2 h-2 rounded-t2-full bg-data-nominal" />
                Cursor: {currentPoint.time}
              </span>
            </div>
          </div>

          {/* Recharts LineChart */}
          <div className="w-full flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={telemetryData}
                margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis
                  dataKey="time"
                  interval={xAxisInterval}
                  stroke="#4d4d4d"
                  tick={{ fill: '#808080', fontSize: 10, fontFamily: 'nbarchitekt, Space Grotesk, monospace' }}
                  tickLine={{ stroke: '#4d4d4d' }}
                />
                <YAxis
                  stroke="#4d4d4d"
                  unit="°"
                  tick={{ fill: '#808080', fontSize: 10, fontFamily: 'nbarchitekt, Space Grotesk, monospace' }}
                  tickLine={{ stroke: '#4d4d4d' }}
                  domain={[-8, 8]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#000000',
                    borderColor: '#4d4d4d',
                    borderRadius: '5px',
                    fontSize: '12px',
                    fontFamily: 'nbarchitekt, Space Grotesk, monospace',
                  }}
                  itemStyle={{ color: '#ffffff' }}
                  labelStyle={{ color: '#c6c6c6', fontWeight: 'bold' }}
                  formatter={(value: any) => [
                    `${Number(value) > 0 ? '+' : ''}${Number(value).toFixed(2)}°`,
                    '',
                  ]}
                />
                <Legend
                  wrapperStyle={{
                    paddingTop: '2px',
                    fontSize: '10px',
                    fontFamily: 'nbarchitekt, Space Grotesk, monospace',
                  }}
                />

                <ReferenceLine
                  y={0}
                  stroke="#4d4d4d"
                  strokeDasharray="2 2"
                  label={{
                    value: 'Horizon 0°',
                    fill: '#808080',
                    fontSize: 10,
                    position: 'insideBottomRight',
                  }}
                />

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
                    fontFamily: 'nbarchitekt, Space Grotesk, monospace',
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="sunElevation"
                  name="Sun Elevation"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  activeDot={{ r: 5, fill: '#f59e0b' }}
                />

                <Line
                  type="monotone"
                  dataKey="earthElevation"
                  name="Earth Elevation"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  activeDot={{ r: 5, fill: '#3b82f6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>

      {/* Global FPS Monitor HUD */}
      <FpsMonitor />

      {/* Guided Tour Demo Mode integration */}
      <DemoMode onSliderScrub={(idx) => setCurrentIndex(idx)} />
    </div>
  );
}
