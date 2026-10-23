import React from 'react';
import { Layers, Sun, Info } from 'lucide-react';

interface HeatmapLegendWidgetProps {
  active: boolean;
  onToggle: () => void;
}

export default function HeatmapLegendWidget({ active, onToggle }: HeatmapLegendWidgetProps) {
  return (
    <div className="bg-black/80 border border-t2-ash-border rounded-t2-xl p-3 select-none flex flex-col items-start gap-2 max-w-xs pointer-events-auto">
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border font-t2-nbarchitekt text-xs transition-all ${
          active
            ? 'bg-indigo-600/25 border-indigo-500 text-white font-medium'
            : 'bg-zinc-900/60 border-zinc-700/60 text-zinc-300 hover:text-white hover:bg-zinc-800'
        }`}
      >
        <span className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <span>30-Day Solar Heatmap</span>
        </span>
        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-black/60 border border-zinc-700">
          {active ? 'ON' : 'OFF'}
        </span>
      </button>

      {/* Perceptual Ramp Legend (Visible when active) */}
      {active && (
        <div className="w-full space-y-1.5 pt-1 border-t border-zinc-800/80 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-[9px] font-t2-nbarchitekt text-zinc-400">
            <span>0% PSR (Dark)</span>
            <span>Mid (40-60%)</span>
            <span>Peak (80-95%)</span>
          </div>

          {/* Color Gradient Bar */}
          <div
            className="w-full h-2 rounded-full border border-zinc-700/80 overflow-hidden"
            style={{
              background: 'linear-gradient(to right, #000000 0%, #3b0764 25%, #d97706 65%, #ffffff 100%)',
            }}
          />

          <div className="flex items-center justify-between text-[8px] font-mono text-zinc-500 pt-0.5">
            <span>Permanently Shadowed</span>
            <span>Sunlit Ridge</span>
          </div>
        </div>
      )}
    </div>
  );
}
