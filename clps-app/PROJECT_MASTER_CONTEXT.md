# CLPS Lunar Mission Browser — Master Context & Project Handover Document

> **Purpose**: This document serves as the authoritative single source of truth for the **CLPS Lunar Mission Browser** project. If you are switching AI assistants or onboarding a new developer/model, providing this document will grant 100% full context of the project architecture, tech stack, codebase structure, completed features, state flow, and future roadmap.

---

## 1. Project Overview & Vision

- **Project Name**: CLPS Lunar Mission Browser
- **Domain**: Space Exploration / Aerospace Visualization / NASA Artemis & CLPS (Commercial Lunar Payload Services)
- **Concept**: An interactive 3D telemetry dashboard simulating lunar landing missions at the Moon's South Pole (specifically **Shackleton Crater**, $-89.9^\circ\text{ S}, 0.0^\circ\text{ E}$). It visualizes real-world astronomical environmental parameters—principally **Solar Elevation** (illumination/power) and **Earth Elevation** (line-of-sight direct-to-Earth radio communication)—across a full **30-day lunar month (720 hourly ephemeris steps)** computed from NASA JPL SPICE DE421 ephemerides, accompanied by 3D terrain displaced from real NASA LOLA Digital Elevation Model (DEM) GeoTIFFs.
- **UI Aesthetic**: Dark, high-tech, modern aerospace mission control / NASA JPL aesthetic with dark slate (`bg-gray-900`/`bg-gray-950`), cyber/amber/blue accents, monospace telemetry readouts, status badges, and smooth 3D scene animations with realistic low-angle grazing solar shadows.

---

## 2. Tech Stack & Dependencies

### Web Frontend & 3D Visualization
| Package | Version | Purpose |
| :--- | :--- | :--- |
| **[React](https://react.dev/)** | `^18.3.1` | Core declarative component UI library |
| **[TypeScript](https://www.typescriptlang.org/)** | `^5.6.3` | Strongly-typed interfaces and codebase integrity |
| **[Vite](https://vite.dev/)** | `^6.0.1` | Ultra-fast development server & production bundler |
| **[Three.js](https://threejs.org/)** | `^0.170.0` | WebGL 3D graphics rendering engine |
| **[@react-three/fiber](https://docs.pmnd.rs/react-three-fiber)** | `^8.17.10` | Declarative React Three.js scene graph |
| **[@react-three/drei](https://github.com/pmndrs/drei)** | `^9.114.3` | Camera controls (`OrbitControls`), skybox (`Stars`), `Grid`, `useTexture` |
| **[Recharts](https://recharts.org/)** | `^2.14.1` | Responsive SVG charts (dual-line 720-point elevation profiles) |
| **[Tailwind CSS](https://tailwindcss.com/)** | `^3.4.15` | Utility-first styling & NASA mission control theme |
| **[Lucide React](https://lucide.dev/)** | `^0.460.0` | Aerospace icons (`Sun`, `Globe`, `Clock`, `MapPin`, `Rocket`, `Radio`, etc.) |

### Python Data Pipelines
| Package | Version | Purpose |
| :--- | :--- | :--- |
| **[skyfield](https://rhodesmill.org/skyfield/)** | `^1.55` | High-precision astronomy library for JPL DE421 ephemeris calculations |
| **[rasterio](https://rasterio.readthedocs.io/)** | `^1.5.2` | Geospatial raster I/O for reading NASA GeoTIFF elevation DEMs |
| **[numpy](https://numpy.org/)** | `^2.5.4` | Vectorized numerical array operations and normalization |
| **[Pillow (PIL)](https://python-pillow.org/)** | `^13.0.0` | Image processing and LANCZOS resampling to 1024x1024 PNG heightmaps |

---

## 3. Architecture & File Structure

```
CLPS lunar/
├── index.html                           # HTML entry point with dark background and viewport setup
├── package.json                         # Dependencies and npm build/dev scripts
├── tsconfig.json                        # TypeScript compiler configuration
├── vite.config.ts                       # Vite configuration (React plugin)
├── tailwind.config.js                   # Tailwind content paths and theme extensions
├── postcss.config.js                    # PostCSS configuration for Tailwind and Autoprefixer
│
├── public/                              # Static public assets served by Vite
│   ├── shackleton_data.json             # Real 30-day (720 hours) NASA JPL ephemeris dataset
│   └── heightmaps/
│       ├── shackleton_heightmap.png     # 1024x1024 normalized DEM heightmap (Site 04)
│       ├── site04_heightmap.png         # Site 04 alias
│       ├── malapert_heightmap.png       # 1024x1024 DEM heightmap (Site 07)
│       ├── site07_heightmap.png         # Site 07 alias
│       ├── de_gerlache_heightmap.png    # 1024x1024 DEM heightmap (Site 23)
│       └── site23_heightmap.png         # Site 23 alias
│
├── src/
│   ├── main.tsx                         # React root mount point (creates root on #root)
│   ├── index.css                        # Global styles, Tailwind directives, full-screen reset
│   ├── App.tsx                          # App component: fetches /shackleton_data.json, shows NASA loader
│   ├── data.ts                          # TypeScript types: DataPoint, LandingSite, landingSites array
│   ├── Dashboard.tsx                    # Main layout: 300px Sidebar + 3D View (60%) + Chart (40%)
│   └── Scene.tsx                        # 3D R3F Canvas: displaced DEM terrain, grazing Sun trigonometry
│
├── process_lunar_heightmaps.py          # Python pipeline: GeoTIFF -> normalized 1024x1024 grayscale PNG
├── generate_shackleton_ephemeris.py     # Python pipeline: Skyfield + JPL DE421 -> shackleton_data.json
├── PROJECT_MASTER_CONTEXT.md            # [This Master Document] Complete project context & handover
│
├── Site04_final_adj_5mpp_surf.tif       # Raw NASA DEM GeoTIFF (3200x3200, 5m/px) - Shackleton
├── Site07_final_adj_5mpp_surf.tif       # Raw NASA DEM GeoTIFF (3200x3200, 5m/px) - Malapert
├── Site23_final_adj_5mpp_surf.tif       # Raw NASA DEM GeoTIFF (4200x4200, 5m/px) - de Gerlache
│
├── de421.bsp                            # NASA JPL planetary ephemeris kernel
├── pck00010.tpc                         # NASA NAIF IAU planetary constants text kernel
├── moon_080317.tf                       # NASA NAIF lunar frame specification kernel
└── moon_pa_de421_1900-2050.bpc          # NASA NAIF binary lunar orientation kernel (DE421)
```

---

## 4. Detailed Component & Pipeline Breakdown

### 4.1. `src/data.ts` (Data Contracts)
- **Interfaces**:
  - `DataPoint`: `{ time: string, sunElevation: number, earthElevation: number }`
  - `LandingSite`: `{ id: string, name: string, label: string, lat: number, lon: number, description: string }`
- **Collections**:
  - `landingSites`: 3 lunar South Pole Artemis candidate targets:
    1. **Site A: Shackleton Crater** (`-89.9°S, 0.0°E`) — Lunar South Pole rim with near-permanent solar illumination peaks and cold trap permanently shadowed regions (PSRs).
    2. **Site B: Malapert Mountain** (`-86.0°S, 0.0°E`) — High-elevation massif with continuous line-of-sight communication to Earth.
    3. **Site C: de Gerlache Rim** (`-88.5°S, -70.0°E`) — Connecting ridge between de Gerlache and Shackleton, target for robotic landers.

---

### 4.2. `src/App.tsx` (Telemetry Ingestion & Loading Screen)
- **Data Fetching**:
  - Uses `useEffect` on mount to fetch `/shackleton_data.json`.
  - Maintains `telemetryData: DataPoint[]`, `isLoading: boolean`, and `error: string | null` state.
- **NASA Mission-Control Loading Screen**:
  - Displays while data is being ingested.
  - Features pulsing radar rings, spinning dashed orbital indicator, and animated `Rocket` and `Loader2` icons with descriptive subtext (`Streaming 30-Day NASA JPL DE421 Ephemeris...`).
- **Error State**:
  - Displays clear error diagnostics and a "Retry Connection" button if ephemeris data cannot be loaded.
- **Render**:
  - Passes the verified `telemetryData` array directly into `<Dashboard telemetryData={telemetryData} />`.

---

### 4.3. `src/Dashboard.tsx` (Telemetry Control Center UI)
Split into a fixed **300px Left Sidebar** and a **Flex-Grow Right Panel** (60% 3D / 40% Chart):

1. **Left Sidebar (300px)**:
   - **Header**: Mission badge with `Rocket` icon and "CLPS LUNAR Mission Browser" styling.
   - **Landing Site Selector**: Toggles between Sites A, B, and C with live coordinates readout.
   - **30-Day Mission Timeline Slider**:
     - Range slider from step `0` to `telemetryData.length - 1` (720 steps), corresponding to `Day 1, 00:00` through `Day 30, 23:00`.
     - Displays formatted step index (`Step X/720`) and active day/hour timestamp badge.
   - **Telemetry Cards**:
     - **Sun Elevation Card**: Shows elevation with `+`/`-` sign in degrees, with real-time status pill `DAYLIGHT` (when elevation $\ge 0^\circ$) or `ECLIPSE` (when elevation $< 0^\circ$).
     - **Earth Elevation Card**: Shows elevation with `+`/`-` sign in degrees, with real-time status pill `LOS ACTIVE` (Line-of-Sight direct communication) or `NO COMM` (below horizon).
   - **Footer**: JPL DE421 Ephemeris status indicator with total point count (`● 720 PTS`).

2. **Top-Right Main Area — 3D Canvas (60% Height)**:
    - Hosts `<Scene sunElevation={currentPoint.sunElevation} earthElevation={currentPoint.earthElevation} />`.
    - **Live HUD Badges**: Displays current target site, Sun elevation in degrees, Earth elevation in degrees, and mission time slice (`Day X, HH:00`).
    - **Controls Tip**: Guide for OrbitControls (Left Click: Rotate, Right Click: Pan, Scroll: Zoom).

3. **Bottom-Right Area — 30-Day Telemetry Chart (40% Height)**:
   - Built with **Recharts** inside a `ResponsiveContainer` rendering all 720 hourly points.
   - **Y-Axis Optimization (`domain={[-8, 8]}`)**: Scaled specifically to highlight the subtle $+1.34^\circ \leftrightarrow +1.57^\circ$ solar illumination angle and $-6.74^\circ \leftrightarrow +6.37^\circ$ Earth libration oscillations.
   - **X-Axis Interval**: Displays ~10 evenly spaced ticks across the 30 days (`Day 1`, `Day 4`, `Day 7`...) preventing label clutter.
   - **Performance Configuration**: `dot={false}` and `isAnimationActive={false}` ensures instantaneous, zero-lag timeline scrubbing across 720 SVG points.
   - **Interactive Cursor Line (`ReferenceLine`)**: Vertical dashed emerald green line (`#10b981`) tracking the slider's active hour.
   - **Signed Two-Decimal Tooltip**: Tooltip formatter displays exact signed values (e.g. `+1.45°` or `-2.71°`).

---

### 4.4. `src/Scene.tsx` (React Three Fiber 3D Simulation)
1. **Real 3D Terrain Displacement**:
   - Loads `/heightmaps/shackleton_heightmap.png` using `@react-three/drei` `useTexture` inside a `<Suspense fallback={null}>` boundary.
   - Subdivided `PlaneGeometry` with **$256 \times 256$ segments** (`args={[80, 80, 256, 256]}`).
   - `displacementScale={8.0}` gives dramatic physical depth to crater rims and deep depressions.
   - Material: `meshStandardMaterial` with lunar rock gray (`#71717a`), roughness `0.88`, metalness `0.06`, and `flatShading={true}` for crisp, faceted rock definition.
2. **Horizontal Grazing Sun & Glowing Sun Orb**:
   - Calculates light and Sun position using standard trigonometry:
     $$y = \sin(\theta_\text{rad}) \times 65$$
     $$xz = \cos(\theta_\text{rad}) \times 65$$
   - Core Sun sphere: `radius={2.5}` with `<meshBasicMaterial color="#ffdd55" />` (unaffected by scene shadows).
   - Multi-layer **solar corona bloom halos** with `THREE.AdditiveBlending` creating a radiant atmospheric glow.
   - `<directionalLight>` intensity `3.2` with expanded shadow frustum (`[-45, 45]`, `far: 160`) casting dramatic, long shadows across the crater.
3. **3D Earth Sphere (`EarthOrb`)**:
   - Blue celestial sphere: `radius={1.5}` with `<meshBasicMaterial color="#4488ff" />`.
   - Rayleigh scattering atmospheric bloom halo with `THREE.AdditiveBlending`.
   - **Dynamic Elevation Positioning**:
     $$y = \sin(\text{earthElevation}_\text{rad}) \times 80$$
     - When `earthElevation < 0` (down to $-6.74^\circ$): $y$ drops negative (beneath the terrain horizon).
     - When `earthElevation > 0` (up to $+6.37^\circ$): Earth rises above the crater rim into the starfield.
4. **Animated Deep Space Starfield**:
   - `<Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />` providing a shimmering, dynamic cosmos background.
5. **Procedural Lunar Lander Model**:
   - Core cylinder, gold-foil module, antenna, and 4 landing legs positioned atop the elevated terrain with full shadow casting.
6. **Camera & Controls**:
   - Perspective camera positioned at `[0, 30, 50]` with FOV 45 for a top-down angled overview.
   - `OrbitControls` with `minDistance: 5`, `maxDistance: 180`, `target: [0, 2, 0]`, and polar angle clamped to $89.5^\circ$ to prevent clipping beneath the lunar surface.

---

### 4.5. Python Pipelines

#### 1. `process_lunar_heightmaps.py` (DEM Processor)
- **Inputs**: `Site04_final_adj_5mpp_surf.tif`, `Site07_final_adj_5mpp_surf.tif`, `Site23_final_adj_5mpp_surf.tif`.
- **Process**:
  1. Opens GeoTIFF using `rasterio`.
  2. Reads elevation band into NumPy `float32`.
  3. Replaces `NoData` / `NaN` pixels with the minimum valid elevation.
  4. Normalizes valid range to $0 - 255$ (`uint8`).
  5. Resamples to $1024 \times 1024$ using Pillow `LANCZOS` filter.
  6. Exports optimized grayscale PNGs to `public/heightmaps/` (`shackleton_heightmap.png`, `malapert_heightmap.png`, `de_gerlache_heightmap.png`).

#### 2. `generate_shackleton_ephemeris.py` (Ephemeris Generator)
- **Inputs**: JPL DE421 ephemeris (`de421.bsp`), IAU PCK constants (`pck00010.tpc`), lunar frames (`moon_080317.tf`), and lunar binary orientation kernel (`moon_pa_de421_1900-2050.bpc`). Automatically downloads missing kernels from NASA JPL NAIF servers.
- **Process**:
  1. Initializes `MOON_PA_DE421` Principal Axis lunar frame.
  2. Constructs topocentric observer at Shackleton Crater ($-89.9^\circ\text{ S}, 0.0^\circ\text{ E}$).
  3. Computes apparent topocentric altitude/azimuth for the Sun and Earth across 720 hourly steps (30 days).
  4. Exports structured JSON to `public/shackleton_data.json` with format:
     ```json
     [
       { "time": "Day 1, 00:00", "sunElevation": 1.34, "earthElevation": -2.71 },
       ...
       { "time": "Day 30, 23:00", "sunElevation": 1.57, "earthElevation": 1.21 }
     ]
     ```

---

## 5. State Management & Data Flow Architecture

```mermaid
flowchart TD
    Mount["App.tsx Mount"] -->|fetch('/shackleton_data.json')| Fetch["Load Real 720-point Ephemeris"]
    Fetch -->|Loading| Loader["NASA Mission Control Spinner"]
    Fetch -->|Success| State["setTelemetryData(data)"]
    State --> Dash["Dashboard.tsx (telemetryData)"]
    
    Dash --> Slider["Timeline Slider (0 to 719)<br/>value: currentIndex"]
    Slider -->|onChange| SetIdx["setCurrentIndex(newIndex)"]
    SetIdx --> CurrPoint["currentPoint = telemetryData[currentIndex]"]
    
    CurrPoint -->|sunElevation, earthElevation| Cards["Sidebar Cards<br/>(DAYLIGHT / LOS ACTIVE)"]
    CurrPoint -->|currentPoint.time| ChartCursor["Recharts ReferenceLine (x = currentPoint.time)"]
    CurrPoint -->|currentPoint.sunElevation| R3F["Scene.tsx (sunElevation prop)"]
    
    R3F --> Trig["calculateSunPosition(elevation)<br/>y = sin(rad)*65, xz = cos(rad)*65"]
    Trig --> SunLight["DirectionalLight Position (LERP)<br/>Grazing Shallow Angle + Long Shadows"]
    Trig --> SunOrbMesh["SunOrb Mesh on Horizon (LERP)"]
```

---

## 6. How to Run & Build

### Development Server
```powershell
npm run dev
```
Launches Vite locally at `http://localhost:5173/`.

### Production Build & Typecheck
```powershell
cmd.exe /c npm run build
```
Runs `tsc -b` typechecking and builds production bundles into `/dist`.

### Re-running Python Pipelines
```powershell
# Regenerate 1024x1024 heightmaps from GeoTIFFs:
python process_lunar_heightmaps.py

# Regenerate 30-day NASA JPL ephemeris dataset:
python generate_shackleton_ephemeris.py
```

---

## 7. Current Completed Feature Checklist

- [x] Vite + React 18 + TypeScript + Tailwind CSS NASA mission control layout.
- [x] Fixed 300px sidebar with landing site selector (Shackleton, Malapert, de Gerlache).
- [x] Python DEM heightmap conversion pipeline using `rasterio`, `numpy`, and `Pillow` (LANCZOS).
- [x] Generated 1024x1024 grayscale PNG heightmaps for Sites 04, 07, and 23.
- [x] Real 3D Lunar Terrain rendered in React Three Fiber via `useTexture` displacement mapping ($256 \times 256$ segments, `scale: 8.0`, `flatShading: true`).
- [x] Python Skyfield + NASA JPL DE421 ephemeris pipeline with automatic NAIF kernel downloading.
- [x] Generated 30-day (720 hourly points) real ephemeris dataset (`shackleton_data.json`).
- [x] `App.tsx` data ingestion with `useEffect`, error boundary, and NASA mission-control loading screen.
- [x] 30-day timeline slider scrubbable across all 720 hourly steps (`Day 1, 00:00` to `Day 30, 23:00`).
- [x] Real-time telemetry cards with `DAYLIGHT`/`ECLIPSE` and `LOS ACTIVE`/`NO COMM` status indicators.
- [x] Recharts 720-point dual-line elevation profile with `domain={[-8, 8]}` and signed two-decimal tooltip (`+1.45°`).
- [x] Standard trigonometric directional lighting (`y = sin(rad)*65`, `xz = cos(rad)*65`) for real $1.34^\circ - 1.57^\circ$ solar grazing angles, casting dramatic long shadows across the crater.
- [x] Luminous Sun sphere (`radius={2.5}`, `#ffdd55`) with multi-layered solar corona bloom halos.
- [x] 3D Earth sphere (`radius={1.5}`, `#4488ff`) with elevation-driven horizon hiding/rising trigonometry ($y = \sin(\text{elevation}) \times 80$) and blue atmospheric bloom.
- [x] Animated 5,000-star deep space starfield (`<Stars count={5000} speed={1} />`).
- [x] Zero TypeScript, lint, or bundling errors.

---

## 8. Extension Points & Suggested Next Steps (For Future AI / Developers)

1. **Multi-Site Dynamic Ephemeris & Terrain Switching**:
   - Hook the landing site selector buttons (Site A, B, C) to dynamically switch both the heightmap texture (`shackleton`, `malapert`, `de_gerlache`) and run ephemeris for Malapert and de Gerlache coordinates.
2. **Earth 3D Orb & LOS Comm Beam**:
   - Render a 3D Earth sphere in the sky at coordinates determined by `currentPoint.earthElevation`.
   - Render a glowing laser or radio communication ray between the lander antenna and Earth whenever `earthElevation >= 0`.
3. **Timeline Play / Pause Auto-Advance**:
   - Add a play/pause button with speed multipliers (`1x`, `10x`, `60x`) to animate the 30-day lunar mission timeline automatically.
4. **GLTF 3D Lander Model**:
   - Replace the procedural lander with an authentic GLTF/GLB model of a CLPS commercial lander (e.g. Intuitive Machines Nova-C or Astrobotic Peregrine).

---

## 9. Handover Prompt Template for Any New AI

When switching to another AI model (ChatGPT, Claude, Gemini, etc.), copy and paste the snippet below:

```markdown
Hello! I am continuing work on my "CLPS Lunar Mission Browser" project.
Here is the master context file (PROJECT_MASTER_CONTEXT.md) containing the complete architecture, current codebase, tech stack, and feature list.

Please review PROJECT_MASTER_CONTEXT.md. I would like your help to:
[Insert your next task here, e.g., "Add a Play/Pause timeline animation button" or "Switch heightmap and ephemeris when selecting Malapert or de Gerlache"]
```
