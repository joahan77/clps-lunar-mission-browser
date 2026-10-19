export interface DataPoint {
  time: string;
  sunElevation: number;
  earthElevation: number;
}

export interface LandingSite {
  id: string;
  name: string;
  label: string;
  lat: number;
  lon: number;
  description: string;
}

export const landingSites: LandingSite[] = [
  {
    id: 'a',
    name: 'Shackleton Crater',
    label: 'Site A: Shackleton',
    lat: -89.9,
    lon: 0.0,
    description: 'Lunar South Pole rim with near-permanent solar illumination peaks and cold trap craters.',
  },
  {
    id: 'b',
    name: 'Malapert Mountain',
    label: 'Site B: Malapert',
    lat: -86.0,
    lon: 0.0,
    description: 'High-elevation massif with continuous line-of-sight communication to Earth.',
  },
  {
    id: 'c',
    name: 'de Gerlache Rim',
    label: 'Site C: de Gerlache',
    lat: -88.5,
    lon: -70.0,
    description: 'Connecting ridge between de Gerlache and Shackleton, target for robotic landers.',
  },
];
