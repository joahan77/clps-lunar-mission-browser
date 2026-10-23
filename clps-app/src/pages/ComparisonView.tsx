import React, { useEffect, useState, useMemo, useRef, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMission } from '../context/MissionContext';
import { useAppStore } from '../store/useAppStore';
import {
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Radar as RadarIcon,
  X,
  CheckSquare,
  Square,
  Info,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Sliders,
  ExternalLink,
  Award,
} from 'lucide-react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import FpsMonitor from '../components/FpsMonitor';
import FooterAttribution from '../components/FooterAttribution';
import LightAndLinkTimeline from '../components/LightAndLinkTimeline';
import { useCountUp } from '../hooks/useCountUp';

type SortKey = 'rank' | 'name' | 'compositeScore' | 'sunHours' | 'commsUptime' | 'avgSolar';
type SortDirection = 'asc' | 'desc';

/** 30-Day Sun & Earth Elevation Sparkline for expanded table row */
function RowSparkline({ data }: { data: any[] }) {
  if (!data || data.length === 0) return null;

  // 720 points mapped to 500x60 SVG
  const width = 500;
  const height = 60;
  const minEl = -8;
  const maxEl = 12;

  const toY = (val: number) => {
    const clamped = Math.max(minEl, Math.min(maxEl, val));
    return height - ((clamped - minEl) / (maxEl - minEl)) * height;
  };

  const sunPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${(i / (data.length - 1)) * width} ${toY(d.sunElevation)}`)
    .join(' ');

  const earthPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${(i / (data.length - 1)) * width} ${toY(d.earthElevation)}`)
    .join(' ');

  const zeroY = toY(0);

  return (
    <div className="w-full sm:w-[480px] h-16 bg-[#050508] border border-t3-haze/20 rounded p-1.5 relative select-none">
      <div className="absolute top-1 left-2 flex items-center gap-3 text-[10px] font-mono">
        <span className="text-amber-400">● Sun Elevation</span>
        <span className="text-sky-400">● Earth Elevation</span>
        <span className="text-zinc-500">─ 0° Horizon</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
        {/* 0 deg Horizon line */}
        <line x1="0" y1={zeroY} x2={width} y2={zeroY} stroke="#3f3f46" strokeDasharray="3 3" strokeWidth="1" />
        {/* Earth elevation line */}
        <path d={earthPath} fill="none" stroke="#38bdf8" strokeWidth="1.4" opacity={0.85} />
        {/* Sun elevation line */}
        <path d={sunPath} fill="none" stroke="#fbbf24" strokeWidth="1.4" opacity={0.9} />
      </svg>
    </div>
  );
}

/** Animated Verdict Stat Readout */
function VerdictStat({ label, value, unit = '' }: { label: string; value: number; unit?: string }) {
  const animated = useCountUp(value, 1, 650);
  return (
    <div className="space-y-0.5">
      <div className="text-[10px] font-mono uppercase tracking-wider text-t3-haze">{label}</div>
      <div className="font-t1-unbounded text-lg sm:text-xl font-medium text-t1-pure-white tabular-nums">
        {animated}
        <span className="text-xs font-normal text-t3-haze ml-0.5">{unit}</span>
      </div>
    </div>
  );
}

export default function ComparisonView() {
  const navigate = useNavigate();
  const { SITES } = useMission();
  const { setActiveExplainerMetric, setDataMethodsModalOpen, demoShowRadarModal, setViewReady } = useAppStore();

  const [scores, setScores] = useState<any[]>([]);
  const [siteDataMap, setSiteDataMap] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  // Weight Sliders (default: 40% Sun, 40% Comms, 20% Solar)
  const [wSun, setWSun] = useState<number>(40);
  const [wComms, setWComms] = useState<number>(40);
  const [wSolar, setWSolar] = useState<number>(20);

  // Sorting: default descending by composite score
  const [sortKey, setSortKey] = useState<SortKey>('compositeScore');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Interactive Hover & Row Expansion
  const [hoveredSiteId, setHoveredSiteId] = useState<string | null>(null);
  const [expandedSiteId, setExpandedSiteId] = useState<string | null>(null);

  // Radar multi-select comparison state (default 2 sites)
  const [selectedForRadar, setSelectedForRadar] = useState<string[]>(['malapert', 'mons_mouton']);

  // Initial scale bar animation trigger
  const [barsAnimated, setBarsAnimated] = useState(false);

  // FLIP animation refs
  const rowRefs = useRef<Map<string, HTMLElement>>(new Map());
  const prevPositions = useRef<Map<string, number>>(new Map());

  // Record positions prior to weight change or sort
  const recordPositions = () => {
    rowRefs.current.forEach((el, id) => {
      if (el) {
        prevPositions.current.set(id, el.getBoundingClientRect().top);
      }
    });
  };

  useEffect(() => {
    async function loadAllData() {
      const results = [];
      const dataMap: Record<string, any[]> = {};

      for (const site of SITES) {
        try {
          const res = await fetch(`/${site.id}_data.json`);
          const json = await res.json();
          const points = json.data || json;
          dataMap[site.id] = points;

          let sunHours = json.summary?.sunHours;
          let commsUptime = json.summary?.commsUptimePercent?.toFixed(1);
          let avgSolar = json.summary?.avgSolarIrradiance?.toFixed(1);

          if (sunHours === undefined) {
            sunHours = points.filter((d: any) => d.sunVisible ?? d.sunElevation > 0).length;
            const commsHours = points.filter((d: any) => d.earthVisible ?? (d.commsStatus !== 'BLACKOUT')).length;
            const totalHours = points.length || 720;
            commsUptime = ((commsHours / totalHours) * 100).toFixed(1);
            avgSolar = (points.reduce((acc: number, d: any) => acc + (d.solarIrradiance || 0), 0) / totalHours).toFixed(1);
          }

          results.push({
            ...site,
            sunHours,
            commsUptime,
            avgSolar,
            summary: json.summary,
          });
        } catch (err) {
          console.error(`Failed to load data for ${site.name}`, err);
        }
      }

      setSiteDataMap(dataMap);
      setScores(results);
      setLoading(false);
      setViewReady(true);
      setTimeout(() => setBarsAnimated(true), 150);
    }

    loadAllData();
    return () => setViewReady(false);
  }, [SITES, setViewReady]);

  // Recalculate composite scores whenever weights change
  const scoresWithComposite = useMemo(() => {
    const totalW = wSun + wComms + wSolar || 1;
    return scores.map((site) => {
      const sunRatio = (site.sunHours / 720) * 100;
      const commsRatio = parseFloat(site.commsUptime);
      const solarRatio = Math.min((parseFloat(site.avgSolar) / 160) * 100, 100);

      const compositeScore = (wSun * sunRatio + wComms * commsRatio + wSolar * solarRatio) / totalW;
      return {
        ...site,
        compositeScore,
      };
    });
  }, [scores, wSun, wComms, wSolar]);

  // Sorted list: natural comparison (a - b) inverted when sortDirection is 'desc'
  const sortedScores = useMemo(() => {
    const list = [...scoresWithComposite];
    list.sort((a, b) => {
      let comparison = 0;
      if (sortKey === 'rank' || sortKey === 'compositeScore') {
        comparison = a.compositeScore - b.compositeScore;
      } else if (sortKey === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortKey === 'sunHours') {
        comparison = a.sunHours - b.sunHours;
      } else if (sortKey === 'commsUptime') {
        comparison = parseFloat(a.commsUptime) - parseFloat(b.commsUptime);
      } else if (sortKey === 'avgSolar') {
        comparison = parseFloat(a.avgSolar) - parseFloat(b.avgSolar);
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return list;
  }, [scoresWithComposite, sortKey, sortDirection]);

  // FLIP layout effect
  useLayoutEffect(() => {
    if (prevPositions.current.size === 0) return;

    rowRefs.current.forEach((el, id) => {
      const prevTop = prevPositions.current.get(id);
      if (el && prevTop !== undefined) {
        const currentTop = el.getBoundingClientRect().top;
        const deltaY = prevTop - currentTop;

        if (deltaY !== 0) {
          el.style.transform = `translateY(${deltaY}px)`;
          el.style.transition = 'transform 0s';

          requestAnimationFrame(() => {
            el.style.transition = 'transform 450ms cubic-bezier(0.4, 0, 0.2, 1)';
            el.style.transform = 'translateY(0)';
          });
        }
      }
    });

    prevPositions.current.clear();
  }, [sortedScores]);

  // Handle Sort Click
  const handleSort = (key: SortKey) => {
    recordPositions();
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection(key === 'name' ? 'asc' : 'desc');
    }
  };

  // Dynamic scientific rationale derived strictly from the top-ranked candidate
  const topSite = sortedScores[0];
  const dynamicRationale = useMemo(() => {
    if (!topSite) return '';
    const commsNum = parseFloat(topSite.commsUptime);
    const sunHours = topSite.sunHours;
    const avgSolar = parseFloat(topSite.avgSolar);

    if (wComms >= wSun && commsNum >= 70) {
      return `${topSite.name} provides maximum continuous Earth comms line-of-sight (${commsNum}%) and thermal stability across southern lunar libration cycles.`;
    }
    if (wSun > wComms && sunHours >= 450) {
      return `${topSite.name} delivers highest solar illumination duration (${sunHours}h / ${((sunHours / 720) * 100).toFixed(1)}%) along an elevated polar rim for mission battery longevity.`;
    }
    if (wSolar >= 35) {
      return `${topSite.name} yields highest solar energy density (${avgSolar} W/m²) for surface science payload recharging.`;
    }
    return `${topSite.name} achieves overall top multi-criteria optimization score (${topSite.compositeScore.toFixed(1)}/100) under current mission weights.`;
  }, [topSite, wSun, wComms, wSolar]);

  // Toggle selection for radar
  const toggleRadarSite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedForRadar((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 4) {
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  };

  // Normalized Radar Chart Data
  const radarChartData = useMemo(() => {
    const selected = scoresWithComposite.filter((s) => selectedForRadar.includes(s.id));
    if (selected.length === 0) return [];

    const metrics = [
      { subject: 'Sunlight Duration', key: 'sunHours', max: 720 },
      { subject: 'Earth Line-of-Sight', key: 'commsUptime', max: 100 },
      { subject: 'Solar Power Flux', key: 'avgSolar', max: 150 },
      { subject: 'Topographic Peak', key: 'peak', max: 1 },
      { subject: 'Libration Margin', key: 'libration', max: 1 },
    ];

    return metrics.map((m) => {
      const row: any = { metric: m.subject };
      selected.forEach((s) => {
        let val = 0;
        if (m.key === 'sunHours') val = (s.sunHours / m.max) * 100;
        else if (m.key === 'commsUptime') val = parseFloat(s.commsUptime);
        else if (m.key === 'avgSolar') val = (parseFloat(s.avgSolar) / m.max) * 100;
        else if (m.key === 'peak') val = s.id.includes('mountain') || s.id.includes('malapert') ? 95 : s.id.includes('mouton') ? 85 : 45;
        else val = parseFloat(s.commsUptime) > 60 ? 90 : 50;
        row[s.name] = Math.round(val);
      });
      return row;
    });
  }, [scoresWithComposite, selectedForRadar]);

  const radarColors = ['#c1ff00', '#38bdf8', '#fbbf24', '#a855f7'];

  const renderSortIcon = (key: SortKey) => {
    if (sortKey === key) {
      return sortDirection === 'asc' ? (
        <ArrowUp className="w-3.5 h-3.5 text-t3-electric-indigo" />
      ) : (
        <ArrowDown className="w-3.5 h-3.5 text-t3-electric-indigo" />
      );
    }
    return <ArrowUpDown className="w-3 h-3 text-t3-haze opacity-40 hover:opacity-100" />;
  };

  return (
    <div className="relative z-10 h-screen w-full overflow-y-auto bg-t2-void-black text-t2-ghost-white p-4 sm:p-8 select-none">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        {/* ── Top Navigation & Viewport Controls ── */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-t3-haze/20 pb-4">
          <button
            onClick={() => navigate('/')}
            className="self-start font-t2-nbarchitekt text-t2-body-sm text-t2-ghost-white border border-t2-ash-border rounded-t2-md px-t2-14 py-t2-6 bg-transparent hover:bg-white/[0.08] hover:border-t2-smoke transition-colors focus:outline-none focus:ring-1 focus:ring-t2-ghost-white"
          >
            ← Return to Orbit
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setDataMethodsModalOpen(true)}
              className="font-t2-nbarchitekt text-xs sm:text-sm text-t2-ghost-white bg-black/40 hover:bg-black/60 border border-t2-ash-border rounded-t2-md px-3 py-1.5 flex items-center gap-1.5 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>Data & Methods</span>
            </button>

            <h1 className="font-t1-unbounded text-xs sm:text-sm font-bold tracking-[2.66px] uppercase text-t1-pure-white">
              MISSION PLANNER: SITE COMPARISON
            </h1>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-t2-pale-mist font-t2-nbarchitekt space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-t2-ghost-white" />
            <p className="text-t2-body-sm tracking-wider">COMPUTING 30-DAY TELEMETRY & MULTI-OBJECTIVE RANKINGS...</p>
          </div>
        ) : (
          <>
            {/* ── 1. Dynamic Verdict Banner ── */}
            {topSite && (
              <div className="bg-t3-slate-hollow border border-t3-haze/30 rounded-t3-xl p-5 sm:p-6 space-y-4 relative overflow-hidden">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Left: Recommended Candidate & Dynamic Rationale */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#c1ff00]/10 border border-[#c1ff00]/40 text-[#c1ff00] text-[11px] font-mono font-bold tracking-wider uppercase">
                        <Award className="w-3.5 h-3.5" />
                        <span>Recommended Site #1</span>
                      </div>
                      <span className="text-xs font-mono text-t3-haze">Based on current weighting</span>
                    </div>

                    <h2 className="font-t1-unbounded text-xl sm:text-2xl font-bold text-t1-pure-white tracking-wide uppercase">
                      {topSite.name}
                    </h2>

                    <p className="font-t3-aeonik text-xs sm:text-sm text-t3-paper-white/90 leading-relaxed max-w-3xl">
                      {dynamicRationale}
                    </p>
                  </div>

                  {/* Middle: Counting-up Telemetry Metrics */}
                  <div className="flex flex-wrap items-center gap-6 sm:gap-8 border-y lg:border-y-0 lg:border-l border-t3-haze/20 py-3 lg:py-0 lg:pl-8">
                    <VerdictStat label="Composite Score" value={topSite.compositeScore} unit="/100" />
                    <VerdictStat label="Comms Uptime" value={parseFloat(topSite.commsUptime)} unit="%" />
                    <VerdictStat label="Sun Hours" value={topSite.sunHours} unit="h" />
                    <VerdictStat label="Avg Solar Flux" value={parseFloat(topSite.avgSolar)} unit="W/m²" />
                  </div>

                  {/* Right: Direct Action */}
                  <button
                    onClick={() => navigate(`/mission/${topSite.id}`)}
                    className="flex-shrink-0 bg-t2-dusk-violet hover:opacity-90 text-white font-t2-nbarchitekt text-xs font-bold px-5 py-3 rounded-full flex items-center justify-center gap-2 border border-t2-dusk-violet transition-opacity"
                  >
                    <span>Launch 3D Mission Control</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ── 2. "Light & Link" 30-Day Aligned Temporal Profile ── */}
            <LightAndLinkTimeline
              sites={SITES}
              siteDataMap={siteDataMap}
              hoveredSiteId={hoveredSiteId}
              onHoverSite={setHoveredSiteId}
              onSelectSite={(id) => navigate(`/mission/${id}`)}
            />

            {/* ── 3. Weight Sliders & Live Mathematical Formula ── */}
            <div className="bg-t3-slate-hollow border border-t3-haze/30 rounded-t3-xl p-4 sm:p-5 space-y-3 font-t3-aeonik">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-t3-haze/20 pb-2">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-t3-electric-indigo" />
                  <span className="font-t1-unbounded text-xs font-bold text-t1-pure-white tracking-wider uppercase">
                    MULTI-OBJECTIVE OPTIMIZATION WEIGHTS
                  </span>
                </div>
                <div className="text-[11px] font-mono text-t3-haze tabular-nums">
                  Formula: Score = ({wSun}% × Sun) + ({wComms}% × Comms) + ({wSolar}% × Solar)
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-1">
                {/* Sun Hours Weight Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-amber-400 font-semibold">Sunlight Duration Weight</span>
                    <span className="text-white font-bold tabular-nums">{wSun}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={wSun}
                    onChange={(e) => {
                      recordPositions();
                      setWSun(parseInt(e.target.value, 10));
                    }}
                    className="w-full accent-amber-400 cursor-pointer h-1.5 bg-black/50 rounded-lg"
                  />
                </div>

                {/* Comms Uptime Weight Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-sky-400 font-semibold">Comms Uptime Weight</span>
                    <span className="text-white font-bold tabular-nums">{wComms}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={wComms}
                    onChange={(e) => {
                      recordPositions();
                      setWComms(parseInt(e.target.value, 10));
                    }}
                    className="w-full accent-sky-400 cursor-pointer h-1.5 bg-black/50 rounded-lg"
                  />
                </div>

                {/* Solar Irradiance Weight Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-emerald-400 font-semibold">Solar Irradiance Weight</span>
                    <span className="text-white font-bold tabular-nums">{wSolar}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={wSolar}
                    onChange={(e) => {
                      recordPositions();
                      setWSolar(parseInt(e.target.value, 10));
                    }}
                    className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-black/50 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* ── 4 & 5. Comparison Table & Docked Multi-Axis Radar Split ── */}
            <div className={`grid grid-cols-1 ${selectedForRadar.length >= 2 ? 'lg:grid-cols-12' : 'lg:grid-cols-1'} gap-6 items-start`}>
              {/* Main Comparison Table */}
              <div className={`${selectedForRadar.length >= 2 ? 'lg:col-span-8' : 'lg:col-span-12'} overflow-x-auto bg-t3-slate-hollow border border-t3-haze/30 rounded-t3-xl`}>
                <table className="w-full text-left border-collapse font-t3-aeonik">
                  <thead className="sticky top-0 bg-[#0c0c10] border-b border-t3-haze/30 text-t3-haze text-t3-caption tracking-[-0.24px] uppercase select-none z-10">
                    <tr>
                      <th className="p-3.5 sm:p-4 font-medium w-10 text-center">
                        <RadarIcon className="w-3.5 h-3.5 mx-auto text-t3-haze/60" />
                      </th>
                      <th className="p-3.5 sm:p-4 font-medium">
                        <button
                          onClick={() => handleSort('rank')}
                          className="flex items-center gap-1 hover:text-t3-paper-white focus:outline-none"
                        >
                          <span>RANK</span>
                          {renderSortIcon('rank')}
                        </button>
                      </th>
                      <th className="p-3.5 sm:p-4 font-medium">
                        <button
                          onClick={() => handleSort('name')}
                          className="flex items-center gap-1 hover:text-t3-paper-white focus:outline-none"
                        >
                          <span>SITE NAME</span>
                          {renderSortIcon('name')}
                        </button>
                      </th>
                      <th className="p-3.5 sm:p-4 font-medium">
                        <button
                          onClick={() => handleSort('compositeScore')}
                          className="flex items-center gap-1 hover:text-t3-paper-white focus:outline-none"
                        >
                          <span>SCORE</span>
                          {renderSortIcon('compositeScore')}
                        </button>
                      </th>
                      <th className="p-3.5 sm:p-4 font-medium">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleSort('sunHours')}
                            className="flex items-center gap-1 hover:text-t3-paper-white focus:outline-none"
                          >
                            <span>SUN HOURS</span>
                            {renderSortIcon('sunHours')}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveExplainerMetric('sunHours');
                            }}
                            title="How are sun hours computed?"
                            className="text-t3-haze/60 hover:text-indigo-400 p-0.5"
                          >
                            <Info className="w-3 h-3" />
                          </button>
                        </div>
                      </th>
                      <th className="p-3.5 sm:p-4 font-medium">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleSort('commsUptime')}
                            className="flex items-center gap-1 hover:text-t3-paper-white focus:outline-none"
                          >
                            <span>COMMS UPTIME</span>
                            {renderSortIcon('commsUptime')}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveExplainerMetric('commsUptime');
                            }}
                            title="How is comms uptime computed?"
                            className="text-t3-haze/60 hover:text-indigo-400 p-0.5"
                          >
                            <Info className="w-3 h-3" />
                          </button>
                        </div>
                      </th>
                      <th className="p-3.5 sm:p-4 font-medium">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleSort('avgSolar')}
                            className="flex items-center gap-1 hover:text-t3-paper-white focus:outline-none"
                          >
                            <span>AVG SOLAR</span>
                            {renderSortIcon('avgSolar')}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveExplainerMetric('solarIrradiance');
                            }}
                            title="How is solar irradiance computed?"
                            className="text-t3-haze/60 hover:text-indigo-400 p-0.5"
                          >
                            <Info className="w-3 h-3" />
                          </button>
                        </div>
                      </th>
                      <th className="p-3.5 sm:p-4 font-medium w-8 text-center" />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedScores.map((s, index) => {
                      const isTopRanked = index === 0;
                      const commsVal = parseFloat(s.commsUptime);
                      const isRadarSelected = selectedForRadar.includes(s.id);
                      const isHovered = hoveredSiteId === s.id;
                      const isExpanded = expandedSiteId === s.id;
                      const sunPercent = Math.min((s.sunHours / 720) * 100, 100);

                      return (
                        <React.Fragment key={s.id}>
                          <tr
                            ref={(el) => {
                              if (el) rowRefs.current.set(s.id, el);
                              else rowRefs.current.delete(s.id);
                            }}
                            onMouseEnter={() => setHoveredSiteId(s.id)}
                            onMouseLeave={() => setHoveredSiteId(null)}
                            onClick={() => setExpandedSiteId(isExpanded ? null : s.id)}
                            style={{
                              transitionDelay: `${index * 40}ms`,
                            }}
                            className={`border-b border-t3-haze/15 hover:bg-white/[0.04] cursor-pointer transition-all text-t3-body-sm tracking-[-0.28px] ${
                              isTopRanked
                                ? 'border-l-2 border-l-[#c1ff00] bg-[#c1ff00]/[0.05]'
                                : isHovered
                                ? 'bg-white/[0.05]'
                                : ''
                            }`}
                          >
                            {/* Checkbox for Radar */}
                            <td className="p-3.5 sm:p-4 text-center" onClick={(e) => toggleRadarSite(s.id, e)}>
                              <button
                                title="Toggle Radar Profile"
                                className="text-t3-haze hover:text-t3-paper-white focus:outline-none"
                              >
                                {isRadarSelected ? (
                                  <CheckSquare className="w-4 h-4 text-t3-electric-indigo" />
                                ) : (
                                  <Square className="w-4 h-4 opacity-40 hover:opacity-100" />
                                )}
                              </button>
                            </td>

                            {/* Rank */}
                            <td className="p-3.5 sm:p-4 font-medium tabular-nums">
                              {isTopRanked ? (
                                <span className="inline-flex items-center gap-1 font-bold text-[#c1ff00]">
                                  #1
                                </span>
                              ) : (
                                <span className="text-t3-haze">#{index + 1}</span>
                              )}
                            </td>

                            {/* Site Name */}
                            <td className="p-3.5 sm:p-4 font-medium text-t3-paper-white">
                              <div className="flex items-center gap-2">
                                <span>{s.name}</span>
                                {isTopRanked && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#c1ff00] animate-pulse" />
                                )}
                              </div>
                            </td>

                            {/* Composite Score */}
                            <td className="p-3.5 sm:p-4 font-bold text-t1-pure-white tabular-nums">
                              {s.compositeScore.toFixed(1)}
                            </td>

                            {/* Sun Hours + Inline Animated Bar */}
                            <td className="p-3.5 sm:p-4 font-normal text-t3-paper-white tabular-nums">
                              <div className="flex items-center gap-2.5">
                                <span className="w-12">{s.sunHours} h</span>
                                <div className="hidden sm:block flex-1 max-w-[80px] h-1.5 bg-black/40 rounded-full overflow-hidden border border-t3-haze/20">
                                  <div
                                    className={`h-full bg-data-sun transition-transform duration-700 ease-out-expo origin-left ${
                                      barsAnimated ? 'scale-x-100' : 'scale-x-0'
                                    }`}
                                    style={{ transform: barsAnimated ? `scaleX(${sunPercent / 100})` : 'scaleX(0)' }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* Comms Uptime (Data tokens) */}
                            <td className="p-3.5 sm:p-4">
                              <div className="flex items-center gap-2.5">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-t2-full text-xs font-mono border tabular-nums ${
                                    commsVal >= 50
                                      ? 'bg-data-nominal/15 text-data-nominal-text border-data-nominal/40'
                                      : 'bg-data-blackout/15 text-data-blackout-text border-data-blackout/40'
                                  }`}
                                >
                                  {s.commsUptime}%
                                </span>
                                <div className="hidden sm:block flex-1 max-w-[70px] h-1.5 bg-black/40 rounded-full overflow-hidden border border-t3-haze/20">
                                  <div
                                    className={`h-full transition-transform duration-700 ease-out-expo origin-left ${
                                      commsVal >= 50 ? 'bg-data-nominal' : 'bg-data-blackout'
                                    }`}
                                    style={{
                                      transform: barsAnimated ? `scaleX(${Math.min(commsVal, 100) / 100})` : 'scaleX(0)',
                                    }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* Average Solar */}
                            <td className="p-3.5 sm:p-4 font-normal text-t3-paper-white tabular-nums">
                              {s.avgSolar} W/m²
                            </td>

                            {/* Row Expand Chevron */}
                            <td className="p-3.5 sm:p-4 text-center text-t3-haze">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </td>
                          </tr>

                          {/* Expanded Detail Drawer */}
                          {isExpanded && (
                            <tr className="bg-black/40 border-b border-t3-haze/30">
                              <td colSpan={8} className="p-4 sm:p-6">
                                <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
                                  <div className="space-y-3 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold uppercase tracking-wider text-t1-pure-white">
                                        30-Day Sun & Earth Libration Profiles
                                      </span>
                                      <span className="text-[11px] font-mono text-t3-haze">
                                        ({s.lat ?? s.coordinates?.lat ?? -89.9}°S, {s.lon ?? s.coordinates?.lon ?? 0.0}°E)
                                      </span>
                                    </div>
                                    <RowSparkline data={siteDataMap[s.id] || []} />
                                  </div>

                                  <div className="flex flex-col sm:flex-row items-center gap-4">
                                    <div className="text-xs font-mono text-t3-haze space-y-1">
                                      <div>Min Sun Elev: <span className="text-white font-bold">{s.summary?.minSunElevation ?? '--'}°</span></div>
                                      <div>Max Sun Elev: <span className="text-white font-bold">{s.summary?.maxSunElevation ?? '--'}°</span></div>
                                      <div>Comms Horizon: <span className="text-white font-bold">{s.summary?.minEarthElevation ?? '--'}° to {s.summary?.maxEarthElevation ?? '--'}°</span></div>
                                    </div>

                                    <button
                                      onClick={() => navigate(`/mission/${s.id}`)}
                                      className="px-4 py-2 rounded-full bg-t2-dusk-violet text-white text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-none"
                                    >
                                      <span>Explore 3D Terrain</span>
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── 4. Docked Multi-Axis Radar Chart ── */}
              {selectedForRadar.length >= 2 ? (
                <div className="lg:col-span-4 bg-t3-slate-hollow border border-t3-haze/30 rounded-t3-xl p-4 sm:p-5 space-y-4 sticky top-6">
                  <div className="flex items-center justify-between border-b border-t3-haze/20 pb-2">
                    <div>
                      <h3 className="font-t1-unbounded text-xs font-bold text-t1-pure-white tracking-wider uppercase">
                        DOCKED RADAR COMPARISON
                      </h3>
                      <p className="text-[11px] text-t3-haze">
                        {selectedForRadar.length} candidate sites selected
                      </p>
                    </div>
                  </div>

                  <div className="h-64 sm:h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarChartData} margin={{ top: 10, right: 15, bottom: 10, left: 15 }}>
                        <PolarGrid stroke="#3f3f46" />
                        <PolarAngleAxis
                          dataKey="metric"
                          tick={{ fill: '#e4e6ef', fontSize: 10, fontFamily: 'Aeonik, Inter, sans-serif' }}
                        />
                        <PolarRadiusAxis stroke="#3f3f46" angle={30} domain={[0, 100]} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#000000',
                            borderColor: '#3f3f46',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontFamily: 'Aeonik, sans-serif',
                          }}
                        />
                        {scoresWithComposite
                          .filter((s) => selectedForRadar.includes(s.id))
                          .map((s, idx) => (
                            <Radar
                              key={s.id}
                              name={s.name}
                              dataKey={s.name}
                              stroke={radarColors[idx % radarColors.length]}
                              fill={radarColors[idx % radarColors.length]}
                              fillOpacity={0.25}
                            />
                          ))}
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Selected Sites Color Legend */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-t3-haze/20">
                    {scoresWithComposite
                      .filter((s) => selectedForRadar.includes(s.id))
                      .map((s, idx) => (
                        <div
                          key={s.id}
                          className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/40 border border-t3-haze/30 text-xs font-mono"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: radarColors[idx % radarColors.length] }}
                          />
                          <span className="text-white truncate max-w-[100px]">{s.name}</span>
                          <button
                            onClick={() => toggleRadarSite(s.id, { stopPropagation: () => {} } as any)}
                            className="text-zinc-500 hover:text-white ml-1"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-t3-haze/30 text-center text-xs font-mono text-t3-haze">
                  Select 2 or more sites using the checkboxes on the left to dock the multi-axis Radar Chart.
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <FooterAttribution />
      <FpsMonitor />
    </div>
  );
}
