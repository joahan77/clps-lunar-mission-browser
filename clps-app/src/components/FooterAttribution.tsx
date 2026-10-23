import React from 'react';
import { Database, ShieldCheck, BookOpen } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export default function FooterAttribution() {
  const { setDataMethodsModalOpen } = useAppStore();

  return (
    <footer className="w-full border-t border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-zinc-400 z-30">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-zinc-300 font-medium">NASA JPL DE421 Ephemeris & LRO LOLA DEM</span>
        <span className="text-zinc-600 hidden sm:inline">•</span>
        <span className="text-zinc-400 hidden sm:inline">
          Data courtesy NASA / LRO LOLA, NAIF SPICE. Independent competition visualization, not endorsed by NASA.
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setDataMethodsModalOpen(true)}
          className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 hover:text-white transition-all flex items-center gap-1.5 shadow-sm"
        >
          <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
          <span>Data & Methods</span>
        </button>
        <button
          onClick={() => setDataMethodsModalOpen(true)}
          className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 hover:text-white transition-all flex items-center gap-1.5 shadow-sm"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Traceability Matrix</span>
        </button>
      </div>
    </footer>
  );
}
