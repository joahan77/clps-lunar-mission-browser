import { useEffect, useState, useMemo, useRef, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMission } from '../context/MissionContext';
import { useAppStore } from '../store/useAppStore';
import { Loader2, ArrowUpDown, ArrowUp, ArrowDown, Radar as RadarIcon, X, CheckSquare, Square, Info, BookOpen, ShieldCheck } from 'lucide-react';
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

type SortKey = 'rank' | 'name' | 'sunHours' | 'commsUptime' | 'avgSolar';
type SortDirection = 'asc' | 'desc';

export default function ComparisonView() {
  const navigate = useNavigate();
  const { SITES } = useMission();
  const { setActiveExplainerMetric, setDataMethodsModalOpen } = useAppStore();
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { demoShowRadarModal, setViewReady } = useAppStore();

  // Column Sorting State
  const [sortKey, setSortKey] = useState<SortKey>('commsUptime');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Radar multi-select comparison state (up to 3 sites)
  const [selectedForRadar, setSelectedForRadar] = useState<string[]>(['malapert', 'mons_mouton']);
  const [showRadarModal, setShowRadarModal] = useState(false);
  const isRadarOpen = showRadarModal || demoShowRadarModal;

  // FLIP animation refs
  const rowRefs = useRef<Map<string, HTMLElement>>(new Map());
  const prevPositions = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    async function loadAllData() {
      const results = [];
      for (const site of SITES) {
        try {
          const res = await fetch(`/${site.id}_data.json`);
          const json = await res.json();
          const data = json.data || json;

          let sunHours = json.summary?.sunHours;
          let commsUptime = json.summary?.commsUptimePercent?.toFixed(1);
          let avgSolar = json.summary?.avgSolarIrradiance?.toFixed(1);

          if (sunHours === undefined) {
            sunHours = data.filter((d: any) => d.sunVisible ?? d.sunElevation > 0).length;
            const commsHours = data.filter((d: any) => d.earthVisible ?? (d.commsStatus !== 'BLACKOUT')).length;
            const totalHours = data.length || 720;
            commsUptime = ((commsHours / totalHours) * 100).toFixed(1);
            avgSolar = (data.reduce((acc: number, d: any) => acc + (d.solarIrradiance || 0), 0) / totalHours).toFixed(1);
          }

          results.push({
            ...site,
            sunHours,
            commsUptime,
            avgSolar,
          });
        } catch (err) {
          console.error(`Failed to load data for ${site.name}`, err);
        }
      }
      
      // Default initial rank by comms uptime
      results.sort((a, b) => parseFloat(b.commsUptime) - parseFloat(a.commsUptime));
      const withRank = results.map((item, idx) => ({ ...item, baseRank: idx + 1 }));
      setScores(withRank);
      setLoading(false);
      setViewReady(true);
    }
    loadAllData();
    return () => setViewReady(false);
  }, [SITES, setViewReady]);

  // Record positions before sort
  const handleSort = (key: SortKey) => {
    // Record current bounding boxes for FLIP
    rowRefs.current.forEach((el, id) => {
      if (el) {
        prevPositions.current.set(id, el.getBoundingClientRect().top);
      }
    });

    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection(key === 'name' ? 'asc' : 'desc');
    }
  };

  // Sorted list
  const sortedScores = useMemo(() => {
    const list = [...scores];
    list.sort((a, b) => {
      let comparison = 0;
      if (sortKey === 'rank') {
        comparison = a.baseRank - b.baseRank;
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
  }, [scores, sortKey, sortDirection]);

  // FLIP layout effect after sort change
  useLayoutEffect(() => {
    if (prevPositions.current.size === 0) return;

    rowRefs.current.forEach((el, id) => {
      const prevTop = prevPositions.current.get(id);
      if (el && prevTop !== undefined) {
        const currentTop = el.getBoundingClientRect().top;
        const deltaY = prevTop - currentTop;

        if (deltaY !== 0) {
          // Invert
          el.style.transform = `translateY(${deltaY}px)`;
          el.style.transition = 'transform 0s';

          // Play
          requestAnimationFrame(() => {
            el.style.transition = 'transform 450ms cubic-bezier(0.4, 0, 0.2, 1)';
            el.style.transform = 'translateY(0)';
          });
        }
      }
    });

    prevPositions.current.clear();
  }, [sortedScores]);

  // Toggle selection for radar
  const toggleRadarSite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedForRadar((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  };

  // Prepare normalized Radar Chart data for selected sites
  const radarChartData = useMemo(() => {
    const selected = scores.filter((s) => selectedForRadar.includes(s.id));
    if (selected.length === 0) return [];

    const metrics = [
      { subject: 'Sunlight Duration', key: 'sunHours', max: 720 },
      { subject: 'Comms Line-of-Sight', key: 'commsUptime', max: 100 },
      { subject: 'Solar Power Flux', key: 'avgSolar', max: 50 },
      { subject: 'Peak Elevation', key: 'peakElevation', max: 1 },
      { subject: 'Thermal Stability', key: 'thermal', max: 1 },
    ];

    return metrics.map((m) => {
      const row: any = { metric: m.subject };
      selected.forEach((s) => {
        let val = 0;
        if (m.key === 'sunHours') val = (s.sunHours / m.max) * 100;
        else if (m.key === 'commsUptime') val = parseFloat(s.commsUptime);
        else if (m.key === 'avgSolar') val = (parseFloat(s.avgSolar) / m.max) * 100;
        else if (m.key === 'peakElevation') val = s.id.includes('mountain') || s.id.includes('malapert') ? 95 : 40;
        else val = 70;
        row[s.name] = Math.round(val);
      });
      return row;
    });
  }, [scores, selectedForRadar]);

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

  const radarColors = ['#1a2ffb', '#c1ff00', '#fbbf24'];

  return (
    <div className="min-h-screen bg-t2-void-black text-t2-ghost-white p-6 md:p-10 select-none">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header & Navigation */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            onClick={() => navigate('/')}
            className="self-start font-t2-nbarchitekt text-t2-body-sm text-t2-ghost-white border border-t2-ash-border rounded-t2-md px-t2-14 py-t2-6 bg-transparent hover:bg-white/[0.08] hover:border-t2-smoke transition-colors focus:outline-none focus:ring-1 focus:ring-t2-ghost-white"
          >
            ← Return to Orbit
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setDataMethodsModalOpen(true)}
              className="font-t2-nbarchitekt text-t2-body-sm text-t2-ghost-white bg-black/40 hover:bg-black/60 border border-t2-ash-border rounded-t2-md px-3 py-1.5 flex items-center gap-1.5 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>Data & Methods</span>
            </button>

            {selectedForRadar.length >= 2 && (
              <button
                onClick={() => setShowRadarModal(true)}
                className="font-t2-nbarchitekt text-t2-body-sm text-t2-ghost-white bg-t3-electric-indigo/25 border border-t3-electric-indigo rounded-t2-md px-3 py-1.5 flex items-center gap-1.5 hover:bg-t3-electric-indigo/40 transition-colors"
              >
                <RadarIcon className="w-3.5 h-3.5 text-t3-electric-indigo" />
                <span>Radar Compare ({selectedForRadar.length})</span>
              </button>
            )}

            <h1 className="font-t1-unbounded text-t1-caption sm:text-t1-subheading font-bold tracking-[2.66px] uppercase text-t1-pure-white">
              MISSION PLANNER: SITE COMPARISON
            </h1>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-t2-pale-mist font-t2-nbarchitekt space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-t2-ghost-white" />
            <p className="text-t2-body-sm tracking-wider">CALCULATING 30-DAY TELEMETRY...</p>
          </div>
        ) : (
          /* ── Lusion Domain: Table Card Only ── */
          <div className="overflow-x-auto bg-t3-slate-hollow border border-t3-haze rounded-t3-xl">
            <table className="w-full text-left border-collapse font-t3-aeonik">
              <thead>
                <tr className="border-b border-t3-haze/30 text-t3-haze text-t3-caption tracking-[-0.24px] uppercase select-none">
                  <th className="p-4 sm:p-5 font-medium w-12 text-center">
                    <RadarIcon className="w-3.5 h-3.5 mx-auto text-t3-haze/60" />
                  </th>
                  <th className="p-4 sm:p-5 font-medium">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleSort('rank')}
                        className="flex items-center gap-1.5 hover:text-t3-paper-white focus:outline-none focus:ring-1 focus:ring-t3-electric-indigo rounded px-1 py-0.5"
                      >
                        <span>RANK</span>
                        {renderSortIcon('rank')}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveExplainerMetric('rankingScore');
                        }}
                        title="How is rank computed?"
                        className="text-t3-haze/60 hover:text-indigo-400 p-0.5 transition-colors"
                      >
                        <Info className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                  <th className="p-4 sm:p-5 font-medium">
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-1.5 hover:text-t3-paper-white focus:outline-none focus:ring-1 focus:ring-t3-electric-indigo rounded px-1 py-0.5"
                    >
                      <span>SITE NAME</span>
                      {renderSortIcon('name')}
                    </button>
                  </th>
                  <th className="p-4 sm:p-5 font-medium">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleSort('sunHours')}
                        className="flex items-center gap-1.5 hover:text-t3-paper-white focus:outline-none focus:ring-1 focus:ring-t3-electric-indigo rounded px-1 py-0.5"
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
                        className="text-t3-haze/60 hover:text-indigo-400 p-0.5 transition-colors"
                      >
                        <Info className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                  <th className="p-4 sm:p-5 font-medium">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleSort('commsUptime')}
                        className="flex items-center gap-1.5 hover:text-t3-paper-white focus:outline-none focus:ring-1 focus:ring-t3-electric-indigo rounded px-1 py-0.5"
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
                        className="text-t3-haze/60 hover:text-indigo-400 p-0.5 transition-colors"
                      >
                        <Info className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                  <th className="p-4 sm:p-5 font-medium">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleSort('avgSolar')}
                        className="flex items-center gap-1.5 hover:text-t3-paper-white focus:outline-none focus:ring-1 focus:ring-t3-electric-indigo rounded px-1 py-0.5"
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
                        className="text-t3-haze/60 hover:text-indigo-400 p-0.5 transition-colors"
                      >
                        <Info className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedScores.map((s, index) => {
                  const isTopRanked = index === 0;
                  const commsVal = parseFloat(s.commsUptime);
                  const isRadarSelected = selectedForRadar.includes(s.id);
                  const sunPercent = Math.min((s.sunHours / 720) * 100, 100);

                  return (
                    <tr
                      key={s.id}
                      ref={(el) => {
                        if (el) rowRefs.current.set(s.id, el);
                        else rowRefs.current.delete(s.id);
                      }}
                      onClick={() => navigate(`/mission/${s.id}`)}
                      style={{
                        backgroundColor: isTopRanked ? 'rgba(193, 255, 0, 0.08)' : undefined,
                        animationDelay: `${index * 50}ms`,
                      }}
                      className={`border-b border-t3-haze/15 hover:bg-white/[0.04] cursor-pointer transition-colors group text-t3-body-sm tracking-[-0.28px] ${
                        isTopRanked ? 'lime-shimmer' : ''
                      }`}
                    >
                      {/* Checkbox for Radar */}
                      <td className="p-4 sm:p-5 text-center" onClick={(e) => toggleRadarSite(s.id, e)}>
                        <button
                          title="Select for Radar comparison"
                          className="text-t3-haze hover:text-t3-paper-white focus:outline-none"
                        >
                          {isRadarSelected ? (
                            <CheckSquare className="w-4 h-4 text-t3-electric-indigo" />
                          ) : (
                            <Square className="w-4 h-4 opacity-40 group-hover:opacity-100" />
                          )}
                        </button>
                      </td>

                      {/* Rank */}
                      <td className="p-4 sm:p-5 font-medium text-t3-haze tabular-nums">
                        #{index + 1}
                      </td>

                      {/* Site Name */}
                      <td className="p-4 sm:p-5 font-medium text-t3-paper-white group-hover:text-t3-haze transition-colors">
                        {s.name}
                      </td>

                      {/* Sun Hours + Inline Animated Bar */}
                      <td className="p-4 sm:p-5 font-normal text-t3-paper-white tabular-nums">
                        <div className="flex items-center gap-3">
                          <span className="w-14">{s.sunHours} h</span>
                          <div className="hidden sm:block flex-1 max-w-[100px] h-1.5 bg-black/40 rounded-full overflow-hidden border border-t3-haze/20">
                            <div
                              className="h-full bg-data-sun transition-all duration-700"
                              style={{ width: `${sunPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Comms Uptime (Data tokens) */}
                      <td className="p-4 sm:p-5">
                        <div className="flex items-center gap-3">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-t2-full text-t2-caption font-t2-nbarchitekt border tabular-nums ${
                              commsVal >= 50
                                ? 'bg-data-nominal/15 text-data-nominal-text border-data-nominal/40'
                                : 'bg-data-blackout/15 text-data-blackout-text border-data-blackout/40'
                            }`}
                          >
                            {s.commsUptime}%
                          </span>
                          <div className="hidden sm:block flex-1 max-w-[80px] h-1.5 bg-black/40 rounded-full overflow-hidden border border-t3-haze/20">
                            <div
                              className={`h-full transition-all duration-700 ${
                                commsVal >= 50 ? 'bg-data-nominal' : 'bg-data-blackout'
                              }`}
                              style={{ width: `${Math.min(commsVal, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Average Solar */}
                      <td className="p-4 sm:p-5 font-normal text-t3-paper-white tabular-nums">
                        {s.avgSolar} W/m²
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Overlaid Radar Chart Modal ── */}
        {isRadarOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-[6px] flex items-center justify-center p-4">
            <div className="bg-t3-slate-hollow border border-t3-haze rounded-t3-xl max-w-2xl w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-t3-haze/30 pb-3">
                <div>
                  <h3 className="font-t1-unbounded text-sm font-bold text-t1-pure-white tracking-[2px] uppercase">
                    MULTI-SITE RADAR PROFILE
                  </h3>
                  <p className="font-t3-aeonik text-xs text-t3-haze mt-0.5">
                    Comparing {selectedForRadar.length} selected Artemis candidate sites across key mission parameters
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowRadarModal(false);
                    useAppStore.getState().setDemoShowRadarModal(false);
                  }}
                  className="p-1 text-t3-haze hover:text-t3-paper-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarChartData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                    <PolarGrid stroke="#4d4d4d" />
                    <PolarAngleAxis
                      dataKey="metric"
                      tick={{ fill: '#e4e6ef', fontSize: 11, fontFamily: 'Aeonik, Inter, sans-serif' }}
                    />
                    <PolarRadiusAxis stroke="#4d4d4d" angle={30} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#000000',
                        borderColor: '#e4e6ef',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontFamily: 'Aeonik, sans-serif',
                      }}
                    />
                    <Legend
                      wrapperStyle={{
                        fontSize: '12px',
                        fontFamily: 'Aeonik, sans-serif',
                        paddingTop: '8px',
                      }}
                    />
                    {scores
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

              <div className="text-right">
                <button
                  onClick={() => {
                    setShowRadarModal(false);
                    useAppStore.getState().setDemoShowRadarModal(false);
                  }}
                  className="font-t2-nbarchitekt text-xs text-t2-ghost-white px-4 py-2 border border-t2-ash-border rounded-t2-md hover:bg-white/10 transition-colors"
                >
                  Close Radar View
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <FooterAttribution />
      <FpsMonitor />
    </div>
  );
}
