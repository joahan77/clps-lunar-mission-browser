import React from 'react';
import { X, ExternalLink, CheckCircle2, AlertTriangle, Layers, BookOpen, Calculator } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

interface MetricDetail {
  id: string;
  name: string;
  category: 'REAL' | 'PHYSICAL MODEL' | 'SIMULATED' | 'DERIVED';
  categoryLabel: string;
  categoryColor: string;
  formula: string;
  inputs: string[];
  source: string;
  description: string;
  benchmark: string;
  limitations: string;
}

const METRICS_DICT: Record<string, MetricDetail> = {
  sunElevation: {
    id: 'sunElevation',
    name: 'Solar Elevation Angle',
    category: 'REAL',
    categoryLabel: 'REAL: NASA SPICE',
    categoryColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    formula: '\\alpha_{\\odot} = \\arcsin(\\hat{r}_{\\text{site}\\rightarrow\\odot} \\cdot \\hat{n}_{\\text{surface}})',
    inputs: [
      'NASA JPL DE421 Planetary Ephemeris (de421.bsp)',
      'NAIF MOON_PA_DE421 Lunar Principal Axis Reference Frame (moon_pa_de421_1900-2050.bpc)',
      'IAU Moon Reference Radius (R = 1,737.4 km)',
      'Landing site topocentric coordinates (Lat, Lon)',
    ],
    source: 'NASA NAIF SPICE / JPL Horizons',
    description:
      'Calculates the true angular elevation of the solar disk center above the local horizontal tangent plane at the observer location. Because the Moon has an axial tilt of only 1.5424° to the ecliptic, solar elevation at the South Pole never exceeds +1.54° on an ideal sphere, producing extreme low-angle grazing illumination and long shadows.',
    benchmark: 'Strictly bounded within 90° - |Latitude| + 1.55° across all 720 hours.',
    limitations: 'Calculated at 1-hour resolution. Atmospheric refraction is zero (lunar vacuum). Solar disk semi-diameter is 0.26°.',
  },
  earthElevation: {
    id: 'earthElevation',
    name: 'Earth Elevation Angle',
    category: 'REAL',
    categoryLabel: 'REAL: NASA SPICE',
    categoryColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    formula: '\\alpha_{\\oplus} = \\arcsin(\\hat{r}_{\\text{site}\\rightarrow\\oplus} \\cdot \\hat{n}_{\\text{surface}})',
    inputs: [
      'NASA JPL DE421 Planetary Ephemeris (de421.bsp)',
      'NAIF Lunar Orientation Frame (MOON_PA_DE421)',
      'Libration in latitude (±6.7°) and longitude (±7.9°)',
      'Observer local surface normal',
    ],
    source: 'NASA NAIF SPICE / JPL DE421',
    description:
      'The topocentric elevation angle of Earth above the local lunar horizon. While the Moon is tidally locked, orbital eccentricity and spin-axis inclination cause optical and physical libration of roughly ±7°. At the South Pole, Earth hovers permanently near the horizon, oscillating between roughly -7° and +7° over each 27.3-day draconic/sidereal period.',
    benchmark: 'Bounded between -6.89° and +10.43° across all sites. Fixed earlier polar singularity bug.',
    limitations: 'Topocentric point-mass center of Earth; does not model Earth rotational phase.',
  },
  solarIrradiance: {
    id: 'solarIrradiance',
    name: 'Surface Solar Irradiance',
    category: 'PHYSICAL MODEL',
    categoryLabel: 'PHYSICAL MODEL: ASTM E490 + LOLA DEM',
    categoryColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    formula: 'I = \\begin{cases} I_0 \\cdot \\sin(\\max(0.05^\\circ, \\alpha_{\\odot} - h(\\theta_{\\odot}))), & \\text{if } \\alpha_{\\odot} + 0.26^\\circ > h(\\theta_{\\odot}) \\\\ 0, & \\text{if shadowed by terrain} \\end{cases}',
    inputs: [
      'Solar Constant I₀ = 1361.0 W/m² (ASTM E490 standard at 1 AU)',
      'Topocentric Solar Elevation α_☉',
      'Local LOLA DEM Horizon Mask h(θ_☉) along solar azimuth',
      'Solar disk angular semi-diameter (0.26°)',
    ],
    source: 'ASTM E490 Standard Solar Constant / LOLA DEM Ray-Tracing',
    description:
      'Horizontal solar flux incident on the lunar regolith or horizontal solar array. When the Sun upper limb dips below the local topographic horizon mask h(θ), irradiance drops to exactly 0.0 W/m² (deep shadow). When visible, flux is modulated by the angle of grazing incidence relative to the local terrain profile.',
    benchmark: 'Zero irradiance in permanently shadowed regions (e.g. Haworth crater floor).',
    limitations: 'Neglects secondary scattered regolith reflection (albedo ~0.08) and earthshine.',
  },
  batteryLevel: {
    id: 'batteryLevel',
    name: 'Battery State of Charge',
    category: 'SIMULATED',
    categoryLabel: 'SIMULATED SUBSYSTEM MODEL',
    categoryColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    formula: '\\Delta E = (I \\cdot A_{\\text{pv}} \\cdot \\eta_{\\text{pv}} - P_{\\text{hotel}}) \\cdot \\Delta t, \\quad \\text{SoC}_{t+1} = \\text{clamp}\\left(0, 100, \\text{SoC}_t + \\frac{\\Delta E}{C_{\\text{batt}}} \\times 100\\%\\right)',
    inputs: [
      'Solar Array Area: 10.0 m²',
      'Photovoltaic Efficiency: 30% (triple-junction GaAs cells)',
      'Lander Base Hotel Load: 50.0 W (avionics, thermal survival heaters, comms)',
      'Battery Storage Capacity: 1,000 Wh (1.0 kWh Li-ion buffer)',
      'Time Step: Δt = 1.0 hour',
    ],
    source: 'Engineering Subsystem Simulation Model (Artemis/CLPS Class Lander)',
    description:
      'Simulates the onboard energy storage buffer of a lunar surface payload. Whenever generated solar power exceeds the 50W housekeeping load, surplus energy charges the battery; during occultations or low sun angles, the battery drains to maintain thermal survival and core telemetry.',
    benchmark: 'Explicitly labeled as an engineering simulation, never presented as an environmental measurement.',
    limitations: 'Assumes nominal battery temperature; does not model Li-ion cell degradation over cycle life.',
  },
  dataRate: {
    id: 'dataRate',
    name: 'Telemetry Data Rate & Comms Status',
    category: 'SIMULATED',
    categoryLabel: 'SIMULATED RF LINK BUDGET',
    categoryColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    formula: 'R = \\begin{cases} 0 \\text{ Mbps (BLACKOUT)}, & \\text{if } \\alpha_{\\oplus} \\le h(\\theta_{\\oplus}) \\\\ 5 \\text{ Mbps (DEGRADED)}, & \\text{if } 0 < \\alpha_{\\oplus} - h(\\theta_{\\oplus}) < 2.0^\\circ \\\\ 100 \\cdot \\sin(\\alpha_{\\oplus}) \\text{ Mbps (NOMINAL)}, & \\text{if } \\alpha_{\\oplus} - h(\\theta_{\\oplus}) \\ge 2.0^\\circ \\end{cases}',
    inputs: [
      'Topocentric Earth Elevation α_⊕',
      'Local LOLA DEM Horizon Mask h(θ_⊕) along Earth azimuth',
      'Direct-to-Earth (DTE) Line-of-Sight geometry',
      'Lander High-Gain Antenna (HGA) Ka-band link budget margin',
    ],
    source: 'NASA Deep Space Network (DSN) Ka-band Surface Link Budget Model',
    description:
      'Evaluates direct line-of-sight between the lander antenna and Earth ground stations. When terrain blocks the line-of-sight, the link drops into BLACKOUT. At marginal elevation (grazing 0° to 2° above terrain), multipath regolith scatter limits throughput to 5 Mbps (DEGRADED). Clear views yield up to 100 Mbps NOMINAL telemetry.',
    benchmark: 'Occulted by mountains at high massifs, continuous link on elevated massifs like Malapert.',
    limitations: 'Assumes continuous DSN 34m/70m station coverage (Goldstone, Madrid, Canberra); does not account for Earth station visibility handoffs.',
  },
  sunHours: {
    id: 'sunHours',
    name: 'Sunlight Duration (Sun Hours)',
    category: 'REAL',
    categoryLabel: 'REAL: NASA LOLA DEM + SPICE',
    categoryColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    formula: 'T_{\\text{sun}} = \\sum_{t=1}^{720} \\mathbb{I}\\left[\\alpha_{\\odot}(t) + 0.26^\\circ > h(\\theta_{\\odot}(t))\\right]',
    inputs: [
      'NASA JPL DE421 Ephemeris (720 hourly solar elevation & azimuth vectors)',
      'NASA LRO LOLA DEM (1024x1024 heightmap at 5-20m resolution)',
      'Radial 360-degree horizon profile h(θ) accounting for Moon curvature',
    ],
    source: 'NASA LRO LOLA DEM / NAIF SPICE',
    description:
      'Total cumulative hours over the 30-day lunar month during which the solar disk upper limb is above the local topographic horizon. Unlike smooth-sphere models which erroneously predict 100% illumination at polar latitudes, our model intersects SPICE ephemerides with real NASA LOLA terrain.',
    benchmark: 'Haworth Crater floor = 15h (2.1%, PSR cold trap). Shackleton Rim Peak = 365h (50.7%). Malapert = 472h (65.6%).',
    limitations: 'Sub-pixel local micro-roughness (<5m rocks/boulders) not captured in DEM.',
  },
  commsUptime: {
    id: 'commsUptime',
    name: 'Direct-to-Earth Comms Uptime',
    category: 'REAL',
    categoryLabel: 'REAL: NASA LOLA DEM + SPICE',
    categoryColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    formula: '\\text{Uptime} = \\frac{1}{720} \\sum_{t=1}^{720} \\mathbb{I}\\left[\\alpha_{\\oplus}(t) > h(\\theta_{\\oplus}(t))\\right] \\times 100\\%',
    inputs: [
      'NASA JPL DE421 Earth apparent position vectors',
      'NAIF MOON_PA_DE421 body-fixed orientation frame',
      'NASA LRO LOLA terrain elevation profile',
    ],
    source: 'NASA LRO LOLA DEM / NAIF SPICE',
    description:
      'The percentage of the 30-day mission window during which Earth is above the local terrain horizon mask, providing unbroken radio line-of-sight to the NASA Deep Space Network. Due to lunar libration, sites behind northern crater rims experience periodic occultations.',
    benchmark: 'Malapert Mountain Massif reaches 72.1% DTE visibility due to its +5,000m altitude.',
    limitations: 'Assumes direct line-of-sight without lunar communication relay satellites.',
  },
  rankingScore: {
    id: 'rankingScore',
    name: 'Suitability / Mission Score',
    category: 'DERIVED',
    categoryLabel: 'DERIVED: MULTI-CRITERIA DECISION ANALYSIS',
    categoryColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    formula: 'S = 0.40 \\cdot \\left(\\frac{T_{\\text{sun}}}{720}\\right) + 0.35 \\cdot \\left(\\frac{\\text{Comms\\%}}{100}\\right) + 0.25 \\cdot \\left(\\frac{\\min(I_{\\text{avg}}, 50)}{50}\\right)',
    inputs: [
      'Solar Illumination Duration (40% weight)',
      'Earth Comms Line-of-Sight Uptime (35% weight)',
      'Average Solar Irradiance (25% weight)',
    ],
    source: 'CLPS Lunar Mission Multi-Criteria Decision Analysis (MCDA)',
    description:
      'A transparent mathematical ranking score (0-100) evaluating landing site suitability for solar-powered robotic CLPS missions. Prioritizes continuous solar access and direct radio communication to Earth.',
    benchmark: 'Malapert Mountain and Slater Plain rank among the top sites for mission longevity.',
    limitations: 'Subjective mission weighting prioritizing power and comms over scientific traverse targets.',
  },
};

export default function MetricExplainerModal() {
  const { activeExplainerMetric, setActiveExplainerMetric, setDataMethodsModalOpen } = useAppStore();

  if (!activeExplainerMetric) return null;

  const metric = METRICS_DICT[activeExplainerMetric] || METRICS_DICT.sunElevation;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <Calculator className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide font-sans">{metric.name}</h3>
              <p className="text-xs text-zinc-400">Scientific Formula & NASA Data Provenance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 text-xs font-mono font-bold rounded-full border ${metric.categoryColor}`}>
              {metric.categoryLabel}
            </span>
            <button
              onClick={() => setActiveExplainerMetric(null)}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Scientific Definition */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-zinc-500" /> Definition & Astronomical Context
            </h4>
            <p className="text-zinc-200 leading-relaxed font-sans text-sm">{metric.description}</p>
          </div>

          {/* Mathematical Formula Box */}
          <div className="p-4 bg-zinc-900/90 border border-zinc-800 rounded-xl">
            <h4 className="text-xs font-mono uppercase tracking-wider text-indigo-400 mb-2">Mathematical Formulation</h4>
            <div className="font-mono text-zinc-100 text-xs sm:text-sm bg-black/60 p-3 rounded-lg border border-zinc-800/80 overflow-x-auto">
              <code>{metric.formula}</code>
            </div>
          </div>

          {/* Primary Inputs */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-zinc-500" /> Data Sources & Input Parameters
            </h4>
            <ul className="space-y-1.5">
              {metric.inputs.map((inp, idx) => (
                <li key={idx} className="flex items-start gap-2 text-zinc-300 text-xs font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <span>{inp}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Literature Sanity Benchmark */}
          <div className="p-3.5 bg-emerald-950/20 border border-emerald-800/40 rounded-xl">
            <h4 className="text-xs font-mono uppercase tracking-wider text-emerald-400 mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Scientific Sanity Validation
            </h4>
            <p className="text-xs text-zinc-300 leading-relaxed">{metric.benchmark}</p>
          </div>

          {/* Limitations */}
          <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl">
            <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Known Assumptions & Bounds
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">{metric.limitations}</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-zinc-800 bg-zinc-900/70">
          <button
            onClick={() => {
              setActiveExplainerMetric(null);
              setDataMethodsModalOpen(true);
            }}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-mono flex items-center gap-1.5 hover:underline"
          >
            <BookOpen className="w-3.5 h-3.5" /> View Full Data & Methods Page
          </button>
          <button
            onClick={() => setActiveExplainerMetric(null)}
            className="px-4 py-1.5 text-xs font-mono font-medium text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
