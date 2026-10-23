import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, MapPin, ExternalLink, X } from 'lucide-react';

interface SitesDrawerProps {
  sites: any[];
  hoveredSite: any | null;
  targetSite: any | null;
  onHover: (site: any | null) => void;
  onSelect: (site: any) => void;
}

export default function SitesDrawer({
  sites,
  hoveredSite,
  targetSite,
  onHover,
  onSelect,
}: SitesDrawerProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape or click outside
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    function handleClickOutside(e: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={drawerRef} className="relative z-30 pointer-events-auto">
      {/* Collapsed Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Accessible list of 8 lunar landing sites"
        className="font-t2-nbarchitekt text-t2-body-sm text-t2-ghost-white border border-t2-ash-border rounded-t2-md px-3 py-2 bg-black/80 hover:bg-white/[0.08] hover:border-t2-smoke transition-all flex items-center gap-2 focus:outline-none focus:ring-1 focus:ring-t2-ghost-white"
      >
        <MapPin className="w-3.5 h-3.5 text-indigo-400" />
        <span>Sites (8)</span>
        {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-t2-smoke" /> : <ChevronDown className="w-3.5 h-3.5 text-t2-smoke" />}
      </button>

      {/* Expanded Accessible Drawer Panel */}
      {isOpen && (
        <div
          role="region"
          aria-label="Lunar landing sites keyboard navigation menu"
          className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-zinc-950 border border-t2-ash-border rounded-t2-xl p-3 shadow-none z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800 mb-2">
            <span className="font-t1-unbounded text-[10px] font-bold text-t1-pure-white uppercase tracking-wider">
              Accessible Target List
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-zinc-500 hover:text-white p-1 rounded"
              aria-label="Close sites drawer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <ul role="list" className="space-y-1 max-h-72 overflow-y-auto pr-1">
            {sites.map((site) => {
              const isSelected = targetSite?.id === site.id || hoveredSite?.id === site.id;

              return (
                <li key={site.id}>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onSelect(site);
                    }}
                    onMouseEnter={() => onHover(site)}
                    onMouseLeave={() => onHover(null)}
                    onFocus={() => onHover(site)}
                    onBlur={() => onHover(null)}
                    className={`w-full text-left p-2 rounded-lg border transition-all text-xs font-t2-nbarchitekt ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/15 text-white'
                        : 'border-transparent hover:border-zinc-800 hover:bg-zinc-900/60 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-t1-unbounded text-[10px] font-bold tracking-wide uppercase text-white">
                        {site.name}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {Math.abs(site.lat).toFixed(1)}°S
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 truncate mt-0.5 font-sans">
                      {site.description}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="pt-2 mt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-t2-nbarchitekt text-zinc-500">
            <span>Keyboard: Tab / Enter</span>
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/styleguide');
              }}
              className="text-zinc-400 hover:text-white flex items-center gap-1 hover:underline"
            >
              <span>Styleguide</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
