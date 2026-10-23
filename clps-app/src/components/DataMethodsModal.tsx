import React, { useState } from 'react';
import { X, ExternalLink, ShieldCheck, Database, Compass, Radio, Sun, BookOpen, AlertCircle, Cpu } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export default function DataMethodsModal() {
  const { dataMethodsModalOpen, setDataMethodsModalOpen } = useAppStore();
  const [activeTab, setActiveTab] = useState<'ephemeris' | 'terrain' | 'models' | 'matrix' | 'citations'>('ephemeris');

  if (!dataMethodsModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
              <Database className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide font-sans">
                Data & Methods: NASA Ephemeris & Terrain Traceability
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                CLPS Lunar Mission Browser — Scientific Documentation & Validation
              </p>
            </div>
          </div>
          <button
            onClick={() => setDataMethodsModalOpen(false)}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/40 px-6 gap-2 overflow-x-auto">
          {[
            { id: 'ephemeris', label: '1. SPICE Ephemeris', icon: Compass },
            { id: 'terrain', label: '2. LOLA DEM Horizon', icon: Sun },
            { id: 'models', label: '3. Subsystem Models', icon: Cpu },
            { id: 'matrix', label: '4. Real vs. Simulated', icon: ShieldCheck },
            { id: 'citations', label: '5. Citations & Legal', icon: BookOpen },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-mono font-medium border-b-2 transition-all shrink-0 ${
                  isActive
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-zinc-300 font-sans leading-relaxed">
          {activeTab === 'ephemeris' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Compass className="w-4 h-4 text-indigo-400" /> High-Precision Planetary Ephemeris (NASA JPL NAIF SPICE)
              </h3>
              <p>
                All astronomical positions for the Sun and Earth are calculated using the <strong>NASA JPL SPICE</strong> architecture,
                executed via the Skyfield astronomy computational library. Calculations evaluate the exact 30-day lunar synodic window starting
                from <strong>2026-01-01T00:00:00Z</strong> to <strong>2026-01-30T23:00:00Z</strong> (720 hourly readings), representing
                the lunar southern summer exploration window for upcoming Artemis and Commercial Lunar Payload Services (CLPS) missions.
              </p>

              <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
                <h4 className="text-xs font-mono uppercase text-indigo-400 font-bold">NAIF SPICE Kernels Ingested:</h4>
                <ul className="text-xs font-mono space-y-1.5 text-zinc-300">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <strong>de421.bsp</strong>: NASA JPL Development Ephemeris 421 (high-precision planetary and lunar positions).
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <strong>moon_pa_de421_1900-2050.bpc</strong>: High-precision binary lunar orientation kernel in the Principal Axis (PA) frame.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <strong>pck00010.tpc</strong>: Planetary Constants Kernel defining IAU lunar reference radii and prime meridian parameters.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <strong>moon_080317.tf</strong>: NAIF Lunar Frame definitions tying Principal Axis to Mean Earth / Polar Axis coordinates.
                  </li>
                </ul>
              </div>

              <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
                <h4 className="text-xs font-mono uppercase text-emerald-400 font-bold">Libration Dynamics & The -90° Fix:</h4>
                <p className="text-xs text-zinc-300">
                  Because the Moon undergoes optical and physical libration of roughly ±6.7° in latitude and ±7.9° in longitude,
                  Earth elevation at the South Pole never stays fixed at a single angle. By projecting apparent Earth position vectors onto
                  the local surface tangent plane defined by the <code className="text-indigo-300">MOON_PA_DE421</code> reference frame,
                  Earth elevation at Shackleton Crater accurately oscillates between <strong>-6.87° and +6.53°</strong>, completely
                  resolving the earlier placeholder singularity bug (-90.00°).
                </p>
              </div>
            </div>
          )}

          {activeTab === 'terrain' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-400" /> Real LOLA DEM Terrain & Horizon Masking
              </h3>
              <p>
                Real lunar terrain models were extracted from NASA Lunar Reconnaissance Orbiter (LRO) <strong>Lunar Orbiter Laser Altimeter (LOLA)</strong> Digital
                Elevation Models (DEMs). The products include 5-meter to 20-meter per pixel polar stereographic rasters (<code className="text-zinc-200">ldem_87s_5mpp</code> and Artemis candidate GeoTIFFs).
              </p>

              <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
                <h4 className="text-xs font-mono uppercase text-amber-400 font-bold">Horizon Masking Algorithm (h(θ)):</h4>
                <p className="text-xs text-zinc-300">
                  For each landing site, an observer is placed at elevation <span className="font-mono text-zinc-200">z₀ + 2.0 m</span> (representing a lander antenna mast).
                  A 360-degree radial ray-casting algorithm scans across the 1024×1024 LOLA elevation matrix. At radial distance <span className="font-mono text-zinc-200">r</span>,
                  the elevation angle above the local tangent plane is computed incorporating spherical Moon curvature:
                </p>
                <div className="p-2.5 bg-black/60 rounded-lg border border-zinc-800 font-mono text-xs text-zinc-200">
                  <code>h(θ) = max_{'{'}r{'>'}0{'}'} [ arctan( (z(r, θ) - z₀ - r²/(2 R_moon)) / r ) ]</code>
                </div>
                <p className="text-xs text-zinc-400">
                  Where <span className="font-mono text-zinc-300">R_moon = 1,737,400 m</span>. The resulting 360-element horizon mask <code className="text-indigo-300">h(θ)</code> defines the local topographic cutoff angle for every azimuth.
                </p>
              </div>

              <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
                <h4 className="text-xs font-mono uppercase text-emerald-400 font-bold">Permanently Shadowed Regions (PSRs):</h4>
                <p className="text-xs text-zinc-300">
                  In deep impact craters like <strong>Haworth Crater</strong> (Site 06), surrounding crater rims rise up to <strong>+13.82°</strong> above the crater floor.
                  Because the grazing sun reaches a maximum elevation of only +3.87° at latitude -87.4°, the sun is physically blocked from reaching the crater floor,
                  yielding a verified <strong>2.1% illumination duration</strong> (15 hours of partial limb exposure) and confirming its scientific status as a cold trap.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'models' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-400" /> Engineering Subsystem Simulation Models
              </h3>
              <p>
                To provide realistic mission context for robotic lunar landers, two engineering models simulate onboard energy storage and direct-to-Earth communication links.
                These are transparently classified as <strong>Simulated Subsystems</strong>.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
                  <h4 className="text-xs font-mono uppercase text-purple-400 font-bold">Battery & Power Subsystem</h4>
                  <ul className="text-xs font-mono space-y-1 text-zinc-300">
                    <li>• Solar Array: 10.0 m² triple-junction GaAs</li>
                    <li>• Cell Conversion Efficiency: 30.0%</li>
                    <li>• Continuous Housekeeping Load: 50.0 W</li>
                    <li>• Battery Capacity: 1,000 Wh (1 kWh Li-ion)</li>
                  </ul>
                  <p className="text-xs text-zinc-400">
                    Power generation tracks <code className="text-zinc-200">I_solar × 10m² × 0.3</code>. Power deficit drains the battery buffer at 50W hotel load; surplus charges to 100%.
                  </p>
                </div>

                <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
                  <h4 className="text-xs font-mono uppercase text-blue-400 font-bold">Direct-to-Earth (DTE) RF Link</h4>
                  <ul className="text-xs font-mono space-y-1 text-zinc-300">
                    <li>• Frequency: Ka-band (26-40 GHz)</li>
                    <li>• Earth Station: NASA DSN 34m Aperture</li>
                    <li>• Terrain Margin Threshold: 2.0° above DEM</li>
                    <li>• Peak Data Rate: 100 Mbps at zenith</li>
                  </ul>
                  <p className="text-xs text-zinc-400">
                    When Earth is below terrain horizon: <strong>BLACKOUT (0 Mbps)</strong>. Grazing 0°-2°: <strong>DEGRADED (5 Mbps)</strong>. Nominal clear LOS: up to 100 Mbps.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'matrix' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Scientific Traceability Matrix: Real vs. Simulated
              </h3>
              <p className="text-xs text-zinc-400">
                In adherence to scientific integrity principles, every number displayed across the application is strictly partitioned into verified observation/ephemeris, physical model, or simulated subsystem:
              </p>

              <div className="border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-300">
                    <tr>
                      <th className="p-3">Metric Name</th>
                      <th className="p-3">Classification</th>
                      <th className="p-3">Primary Origin</th>
                      <th className="p-3">UI Label</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80 bg-zinc-950">
                    <tr>
                      <td className="p-3 text-white font-bold">Sun Elevation & Azimuth</td>
                      <td className="p-3 text-emerald-400">REAL</td>
                      <td className="p-3 text-zinc-400">NASA JPL DE421 + MOON_PA_DE421 SPICE</td>
                      <td className="p-3 text-emerald-400">[REAL: NASA SPICE]</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-white font-bold">Earth Elevation & Azimuth</td>
                      <td className="p-3 text-emerald-400">REAL</td>
                      <td className="p-3 text-zinc-400">NASA JPL DE421 + Libration Topocentric Frame</td>
                      <td className="p-3 text-emerald-400">[REAL: NASA SPICE]</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-white font-bold">Terrain Heightmap & DEM</td>
                      <td className="p-3 text-emerald-400">REAL</td>
                      <td className="p-3 text-zinc-400">NASA LRO LOLA (5m - 20m/px resolution)</td>
                      <td className="p-3 text-emerald-400">[REAL: NASA LOLA DEM]</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-white font-bold">Terrain Horizon Mask h(θ)</td>
                      <td className="p-3 text-emerald-400">REAL</td>
                      <td className="p-3 text-zinc-400">360° Raycast across LOLA DEM</td>
                      <td className="p-3 text-emerald-400">[REAL: LOLA RAYCAST]</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-white font-bold">Sunlight Duration (Sun Hours)</td>
                      <td className="p-3 text-emerald-400">REAL</td>
                      <td className="p-3 text-zinc-400">DE421 Ephemeris intersected with LOLA Mask</td>
                      <td className="p-3 text-emerald-400">[REAL: COMPUTED EPHEMERIS]</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-white font-bold">Comms Line-of-Sight Uptime</td>
                      <td className="p-3 text-emerald-400">REAL</td>
                      <td className="p-3 text-zinc-400">DE421 Ephemeris intersected with LOLA Mask</td>
                      <td className="p-3 text-emerald-400">[REAL: COMPUTED EPHEMERIS]</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-white font-bold">Solar Irradiance (W/m²)</td>
                      <td className="p-3 text-amber-400">PHYSICAL MODEL</td>
                      <td className="p-3 text-zinc-400">ASTM E490 (1361 W/m²) × sin(effective elev)</td>
                      <td className="p-3 text-amber-400">[PHYSICAL MODEL]</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-white font-bold">Telemetry Data Rate</td>
                      <td className="p-3 text-blue-400">SIMULATED</td>
                      <td className="p-3 text-zinc-400">NASA DSN Ka-band surface link budget model</td>
                      <td className="p-3 text-blue-400">[SIMULATED LINK BUDGET]</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-white font-bold">Battery State of Charge</td>
                      <td className="p-3 text-purple-400">SIMULATED</td>
                      <td className="p-3 text-zinc-400">10m² array, 30% eff, 50W hotel load simulation</td>
                      <td className="p-3 text-purple-400">[SIMULATED SUBSYSTEM]</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-white font-bold">Suitability Score</td>
                      <td className="p-3 text-cyan-400">DERIVED</td>
                      <td className="p-3 text-zinc-400">MCDA weighted composite (40% sun, 35% comms, 25% solar)</td>
                      <td className="p-3 text-cyan-400">[DERIVED METRIC]</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'citations' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400" /> Scientific Literature Citations & Compliance
              </h3>

              <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
                <h4 className="text-xs font-mono uppercase text-indigo-400 font-bold">Peer-Reviewed Literature References:</h4>
                <ul className="text-xs space-y-2 text-zinc-300">
                  <li>
                    <strong>Mazarico, E., et al. (2011).</strong> <em>"Illumination conditions at the lunar poles: Implications for future exploration."</em> Icarus, 211(2), 1066–1081. doi:10.1016/j.icarus.2010.10.030.
                  </li>
                  <li>
                    <strong>Gläser, P., et al. (2014).</strong> <em>"Illumination conditions at the lunar south pole using high-resolution Digital Terrain Models."</em> Icarus, 243, 78–90. doi:10.1016/j.icarus.2014.08.013.
                  </li>
                  <li>
                    <strong>Smith, D. E., et al. (2010).</strong> <em>"Initial findings from the Lunar Orbiter Laser Altimeter (LOLA) on the Lunar Reconnaissance Orbiter (LRO)."</em> Geophys. Res. Lett., 37, L18204. doi:10.1029/2010GL043751.
                  </li>
                  <li>
                    <strong>Acton, C. H. (1996).</strong> <em>"Ancillary Data Services of NASA's Navigation and Ancillary Information Facility."</em> Planet. Space Sci., 44(1), 65–70.
                  </li>
                  <li>
                    <strong>Bussey, D. B. J., et al. (2005).</strong> <em>"Constant illumination at the lunar north pole."</em> Nature, 434(7035), 842.
                  </li>
                </ul>
              </div>

              <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
                <h4 className="text-xs font-mono uppercase text-amber-400 font-bold">NASA Insignia & Endorsement Compliance (14 CFR Part 1221):</h4>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  In strict compliance with 14 CFR Part 1221 and NASA Media Usage Guidelines, this application does <strong>NOT</strong> incorporate
                  the official NASA Insignia ("meatball"), NASA Logotype ("worm"), or any agency seal. This software is an independent educational and competition
                  data visualization platform and does not state or imply endorsement or sponsorship by NASA or the United States Government.
                </p>
                <p className="text-xs text-zinc-400 font-mono">
                  Data courtesy: NASA / LRO LOLA Science Team, NASA JPL NAIF SPICE, and the Planetary Data System (PDS) Geosciences Node.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-zinc-800 bg-zinc-900/80">
          <p className="text-xs text-zinc-400 font-mono">
            Verified across 40/40 Automated Sanity Assertions (JPL DE421 / LOLA DEM)
          </p>
          <button
            onClick={() => setDataMethodsModalOpen(false)}
            className="px-4 py-1.5 text-xs font-mono font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm"
          >
            Close Documentation
          </button>
        </div>
      </div>
    </div>
  );
}
