export interface DataPoint {
  time: string;
  utc?: string;
  sunElevation: number;
  sunAzimuth?: number;
  earthElevation: number;
  earthAzimuth?: number;
  solarIrradiance?: number;
  batteryLevel?: number;
  dataRate?: number;
  commsStatus?: string;
  sunVisible?: boolean;
  earthVisible?: boolean;
  terrainHorizon?: number;
  maxSurfaceTempK?: number | null;
  averageSlopeDeg?: number | null;
  illuminationPct?: number | null;
}

export interface SiteSummary {
  totalHours: number;
  sunHours: number;
  sunPercent: number;
  commsHours: number;
  commsUptimePercent: number;
  avgSolarIrradiance: number;
  minSunElevation: number;
  maxSunElevation: number;
  minEarthElevation: number;
  maxEarthElevation: number;
  maxSurfaceTempK?: number | null;
  averageSlopeDeg?: number | null;
  illuminationPct?: number | null;
}

export interface LandingSite {
  id: string;
  name: string;
  label: string;
  lat: number;
  lon: number;
  description: string;
  dataFile: string;
  heightmapUrl: string;
  summary?: SiteSummary;
}

export const landingSites: LandingSite[] = [
  {
    id: 'shackleton',
    name: 'Shackleton Crater',
    label: 'Site 01: Shackleton',
    lat: -89.9,
    lon: 0.0,
    description: 'Lunar South Pole rim with near-permanent solar illumination peaks and cold trap craters.',
    dataFile: 'shackleton_data.json',
    heightmapUrl: '/heightmaps/shackleton_heightmap.png',
  },
  {
    id: 'malapert',
    name: 'Malapert Mountain',
    label: 'Site 02: Malapert',
    lat: -86.0,
    lon: -2.9,
    description: 'High-elevation massif with continuous line-of-sight communication to Earth.',
    dataFile: 'malapert_data.json',
    heightmapUrl: '/heightmaps/malapert_heightmap.png',
  },
  {
    id: 'de_gerlache',
    name: 'de Gerlache Rim',
    label: 'Site 03: de Gerlache',
    lat: -88.5,
    lon: -87.1,
    description: 'Connecting ridge between de Gerlache and Shackleton, target for robotic landers.',
    dataFile: 'de_gerlache_data.json',
    heightmapUrl: '/heightmaps/de_gerlache_heightmap.png',
  },
  {
    id: 'mons_mouton',
    name: 'Mons Mouton',
    label: 'Site 04: Mons Mouton',
    lat: -85.5,
    lon: 32.7,
    description: 'Broad elevated plateau with high solar visibility adjacent to South Pole-Aitken basin.',
    dataFile: 'mons_mouton_data.json',
    heightmapUrl: '/heightmaps/mons_mouton_heightmap.png',
  },
  {
    id: 'nobile_rim',
    name: 'Nobile Rim',
    label: 'Site 05: Nobile Rim',
    lat: -85.4,
    lon: 53.5,
    description: 'VIPER rover exploration target with permanently shadowed regions and volatile deposits.',
    dataFile: 'nobile_rim_data.json',
    heightmapUrl: '/heightmaps/nobile_rim_heightmap.png',
  },
  {
    id: 'haworth',
    name: 'Haworth Crater',
    label: 'Site 06: Haworth',
    lat: -87.4,
    lon: -4.0,
    description: 'Deep permanently shadowed crater floor harboring significant lunar water ice deposits.',
    dataFile: 'haworth_data.json',
    heightmapUrl: '/heightmaps/haworth_heightmap.png',
  },
  {
    id: 'cabeus_b',
    name: 'Cabeus B',
    label: 'Site 07: Cabeus B',
    lat: -86.0,
    lon: -42.0,
    description: 'High-interest scientific site near LCROSS impact zone rich in subsurface hydrogen.',
    dataFile: 'cabeus_b_data.json',
    heightmapUrl: '/heightmaps/cabeus_b_heightmap.png',
  },
  {
    id: 'slater_plain',
    name: 'Slater Plain',
    label: 'Site 08: Slater Plain',
    lat: -86.0,
    lon: -20.0,
    description: 'Relatively smooth transit corridor between Faustini and Amundsen craters.',
    dataFile: 'slater_plain_data.json',
    heightmapUrl: '/heightmaps/slater_plain_heightmap.png',
  },
];
