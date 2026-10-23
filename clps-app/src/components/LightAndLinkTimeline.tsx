import React, { useState, useMemo, useCallback } from 'react';

interface TimelineProps {
  sites: any[];
  siteDataMap: Record<string, any[]>;
  hoveredSiteId: string | null;
  onHoverSite: (id: string | null) => void;
  onSelectSite: (id: string) => void;
}

export default function LightAndLinkTimeline({
  sites,
  siteDataMap,
  hoveredSiteId,
  onHoverSite,
  onSelectSite,
}: TimelineProps) {
  const [cursorHour, setCursorHour] = useState<number | null>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const pct = x / rect.width;
    const hour = Math.min(719, Math.floor(pct * 720));
    setCursorHour(hour);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setCursorHour(null);
  }, []);

  // Compute UTC day & hour for cursor
  const cursorDateLabel = useMemo(() => {
    if (cursorHour === null) return '';
    const day = Math.floor(cursorHour / 24) + 1;
    const hour = cursorHour % 24;
    return `Day ${String(day).padStart(2, '0')}, ${String(hour).padStart(2, '0')}:00 UTC`;
  }, [cursorHour]);

  return (
    <div className="bg-t3-slate-hollow border border-t3-haze/30 rounded-t3-xl p-4 sm:p-5 space-y-3 font-t3-aeonik select-none">
      {/* Header & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-t3-haze/20 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-data-sun animate-pulse" />
            <h3 className="font-t1-unbounded text-xs sm:text-sm font-bold text-t1-pure-white tracking-[2px] uppercase">
              "LIGHT & LINK" 30-DAY TEMPORAL PROFILE
            </h3>
          </div>
          <p className="text-xs text-t3-haze mt-0.5">
            Synchronized solar illumination and Earth line-of-sight availability across all 8 Artemis candidates
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-t2-nbarchitekt">
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-2.5 rounded-sm bg-gradient-to-r from-amber-500 to-amber-200" />
            <span className="text-t2-pale-mist">Sunlit (Amber/White)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-2.5 rounded-sm bg-gradient-to-r from-sky-500 to-blue-600" />
            <span className="text-t2-pale-mist">Earth Link (Cyan/Blue)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-2.5 rounded-sm bg-[#050508] border border-zinc-800" />
            <span className="text-t2-smoke">Shadow / Blackout</span>
          </div>
        </div>
      </div>

      {/* Synchronized 8-Site Timeline Container */}
      <div>
        {/* UTC Axis Labels aligned with strips */}
        <div className="flex items-center gap-3 mb-1.5">
          <div className="w-32 sm:w-40 flex-shrink-0" />
          <div className="flex-1 flex justify-between text-[10px] font-mono text-t3-haze/70 tracking-wider tabular-nums">
            <span>OCT 23 (D01)</span>
            <span>OCT 28 (D06)</span>
            <span>NOV 02 (D11)</span>
            <span>NOV 07 (D16)</span>
            <span>NOV 12 (D21)</span>
            <span>NOV 17 (D26)</span>
            <span>NOV 22 (D30)</span>
          </div>
        </div>

        {/* 8 Rows: Left Column (Site names) + Right Column (Strips & Cursor) */}
        <div className="flex items-stretch gap-3">
          {/* Left Column: Site Names */}
          <div className="w-32 sm:w-40 flex-shrink-0 flex flex-col justify-between py-0.5 space-y-1.5">
            {sites.map((site) => {
              const data = siteDataMap[site.id] || [];
              const isHovered = hoveredSiteId === site.id;
              const currentPoint = cursorHour !== null && data[cursorHour] ? data[cursorHour] : null;

              return (
                <div
                  key={site.id}
                  onMouseEnter={() => onHoverSite(site.id)}
                  onMouseLeave={() => onHoverSite(null)}
                  onClick={() => onSelectSite(site.id)}
                  className={`h-7 flex items-center justify-between px-2 rounded-lg cursor-pointer transition-colors ${
                    isHovered ? 'bg-white/[0.08] text-white font-bold' : 'hover:bg-white/[0.03] text-t3-paper-white'
                  }`}
                >
                  <span className="text-xs truncate font-medium">{site.name}</span>
                  {currentPoint && (
                    <span className="text-[10px] font-mono tabular-nums text-t3-haze hidden sm:inline">
                      {currentPoint.sunElevation > 0 ? '☀️' : '🌑'}{' '}
                      {currentPoint.earthElevation > 0 ? '📡' : '📵'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Column: Strips Container with Laser Scrubber */}
          <div
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="flex-1 relative flex flex-col justify-between py-0.5 space-y-1.5 cursor-crosshair"
          >
            {sites.map((site) => {
              const data = siteDataMap[site.id] || [];
              const isHovered = hoveredSiteId === site.id;

              return (
                <div
                  key={site.id}
                  onMouseEnter={() => onHoverSite(site.id)}
                  onMouseLeave={() => onHoverSite(null)}
                  onClick={() => onSelectSite(site.id)}
                  className={`h-7 p-1 rounded-lg transition-colors flex items-center ${
                    isHovered ? 'bg-white/[0.08] ring-1 ring-t3-haze/40' : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="w-full h-5 rounded overflow-hidden bg-[#07070a] border border-t3-haze/20 flex flex-col justify-between">
                    {/* Top Layer: Sunlight Strip */}
                    <svg viewBox="0 0 720 10" preserveAspectRatio="none" className="w-full h-2.5 block">
                      {data.map((d: any, idx: number) => {
                        const isSun = d.sunVisible ?? d.sunElevation > 0;
                        if (!isSun) return null;
                        const fill = d.sunElevation > 1.2 ? '#ffffff' : d.sunElevation > 0.6 ? '#fde047' : '#f59e0b';
                        return <rect key={`s-${idx}`} x={idx} y={0} width={1} height={10} fill={fill} />;
                      })}
                    </svg>

                    {/* Bottom Layer: Earth Line-of-Sight Strip */}
                    <svg viewBox="0 0 720 10" preserveAspectRatio="none" className="w-full h-2.5 block">
                      {data.map((d: any, idx: number) => {
                        const isEarth = d.earthVisible ?? d.earthElevation > 0;
                        if (!isEarth) return null;
                        const fill = d.earthElevation > 3.0 ? '#38bdf8' : '#2563eb';
                        return <rect key={`e-${idx}`} x={idx} y={0} width={1} height={10} fill={fill} />;
                      })}
                    </svg>
                  </div>
                </div>
              );
            })}

            {/* Synchronized Laser Scrubber Line & Tooltip */}
            {cursorHour !== null && (
              <div
                className="absolute top-0 bottom-0 pointer-events-none z-30"
                style={{ left: `${(cursorHour / 720) * 100}%` }}
              >
                <div className="w-[1.5px] h-full bg-cyan-400 shadow-[0_0_8px_rgba(56,189,248,0.85)] -translate-x-1/2" />
                <div className="absolute -top-7 -translate-x-1/2 bg-black/95 border border-cyan-400/50 text-[10px] font-mono text-cyan-300 px-2 py-0.5 rounded shadow-lg whitespace-nowrap">
                  {cursorDateLabel}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
