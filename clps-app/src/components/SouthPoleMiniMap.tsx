import React, { useState } from 'react';
import { Compass } from 'lucide-react';

interface SouthPoleMiniMapProps {
  sites: any[];
  hoveredSite: any | null;
  targetSite: any | null;
  onHover: (site: any | null) => void;
  onSelect: (site: any) => void;
}

export default function SouthPoleMiniMap({
  sites,
  hoveredSite,
  targetSite,
  onHover,
  onSelect,
}: SouthPoleMiniMapProps) {
  const [tooltipSite, setTooltipSite] = useState<any | null>(null);

  const cx = 80;
  const cy = 80;
  const mapRadius = 65;
  const maxColatitude = 5.5; // Bounds map to latitudes between -90.0° and -84.5°S

  return (
    <div className="relative bg-black/80 border border-t2-ash-border rounded-t2-xl p-3 select-none flex flex-col items-center">
      {/* Header */}
      <div className="w-full flex items-center justify-between font-t2-nbarchitekt text-[10px] text-t2-smoke tracking-wider uppercase mb-1.5 px-0.5">
        <span className="flex items-center gap-1 text-t2-pale-mist font-semibold">
          <Compass className="w-3 h-3 text-indigo-400" />
          South Pole Mini-Map
        </span>
        <span className="text-[9px] text-t2-smoke tabular-nums">-84.5°S Rim</span>
      </div>

      {/* Circular Azimuthal Equidistant SVG Map */}
      <div className="relative w-[160px] h-[160px]">
        <svg
          viewBox="0 0 160 160"
          className="w-full h-full overflow-visible"
        >
          {/* Background circle */}
          <circle cx={cx} cy={cy} r={mapRadius} fill="#000000" fillOpacity="0.6" stroke="#4d4d4d" strokeWidth="1" />

          {/* Concentric latitude guide rings */}
          <circle cx={cx} cy={cy} r={mapRadius * (2.0 / maxColatitude)} fill="none" stroke="#333333" strokeDasharray="2 2" strokeWidth="0.75" />
          <circle cx={cx} cy={cy} r={mapRadius * (4.0 / maxColatitude)} fill="none" stroke="#333333" strokeDasharray="2 2" strokeWidth="0.75" />

          {/* Crosshairs */}
          <line x1={cx} y1={cy - mapRadius} x2={cx} y2={cy + mapRadius} stroke="#262626" strokeWidth="0.75" />
          <line x1={cx - mapRadius} y1={cy} x2={cx + mapRadius} y2={cy} stroke="#262626" strokeWidth="0.75" />

          {/* South Pole Center Axis */}
          <circle cx={cx} cy={cy} r="1.5" fill="#4d4d4d" />
          <text x={cx + 3} y={cy - 3} fill="#666666" fontSize="7" fontFamily="nbarchitekt, monospace">90°S</text>

          {/* Longitude Axis Labels */}
          <text x={cx} y={cy - mapRadius - 3} textAnchor="middle" fill="#666666" fontSize="7" fontFamily="nbarchitekt, monospace">0°</text>
          <text x={cx + mapRadius + 4} y={cy + 2.5} textAnchor="start" fill="#666666" fontSize="7" fontFamily="nbarchitekt, monospace">90°E</text>
          <text x={cx} y={cy + mapRadius + 9} textAnchor="middle" fill="#666666" fontSize="7" fontFamily="nbarchitekt, monospace">180°</text>
          <text x={cx - mapRadius - 4} y={cy + 2.5} textAnchor="end" fill="#666666" fontSize="7" fontFamily="nbarchitekt, monospace">90°W</text>

          {/* 8 Site Dots */}
          {sites.filter((site) => site.lat <= -80.0).map((site) => {
            const colat = 90.0 - Math.abs(site.lat);
            const f = Math.min(Math.max(colat / maxColatitude, 0), 1);
            const rad = (site.lon * Math.PI) / 180.0;
            const px = cx + mapRadius * f * Math.sin(rad);
            const py = cy - mapRadius * f * Math.cos(rad);

            const isHovered = hoveredSite?.id === site.id || tooltipSite?.id === site.id;
            const isTargeted = targetSite?.id === site.id;
            const isActive = isHovered || isTargeted;

            return (
              <g
                key={site.id}
                className="cursor-pointer group"
                onMouseEnter={() => {
                  setTooltipSite(site);
                  onHover(site);
                }}
                onMouseLeave={() => {
                  setTooltipSite(null);
                  onHover(null);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(site);
                }}
              >
                {/* Hit target circle */}
                <circle cx={px} cy={py} r="8" fill="transparent" />

                {/* Outer ping ring on hover/selection */}
                {isActive && (
                  <circle
                    cx={px}
                    cy={py}
                    r="6.5"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1"
                    strokeOpacity="0.8"
                    className="animate-ping"
                  />
                )}

                {/* Outer hairline circle */}
                <circle
                  cx={px}
                  cy={py}
                  r={isActive ? "4" : "2.5"}
                  fill={isActive ? "#ffffff" : "#000000"}
                  stroke="#ffffff"
                  strokeWidth="1"
                  className="transition-all duration-200"
                />

                {/* Center dot */}
                <circle
                  cx={px}
                  cy={py}
                  r={isActive ? "2" : "1"}
                  fill={isActive ? "#000000" : "#ffffff"}
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Callout */}
        {(tooltipSite || hoveredSite) && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-950 border border-t2-ash-border rounded px-2 py-1 text-center whitespace-nowrap shadow-none pointer-events-none z-20">
            <p className="font-t1-unbounded text-[9px] font-bold text-t1-pure-white uppercase tracking-wider">
              {(tooltipSite || hoveredSite).name}
            </p>
            <p className="font-t2-nbarchitekt text-[8px] text-t2-pale-mist">
              {Math.abs((tooltipSite || hoveredSite).lat).toFixed(1)}°S,{' '}
              {(tooltipSite || hoveredSite).lon >= 0
                ? `${(tooltipSite || hoveredSite).lon.toFixed(1)}°E`
                : `${Math.abs((tooltipSite || hoveredSite).lon).toFixed(1)}°W`}
            </p>
          </div>
        )}
      </div>

      <div className="mt-1.5 font-t2-nbarchitekt text-[9px] text-t2-smoke text-center tracking-tight">
        Click or hover dot to target & descend
      </div>
    </div>
  );
}
