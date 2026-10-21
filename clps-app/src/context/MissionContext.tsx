import { createContext, useContext, useState, ReactNode } from 'react';

export const SITES = [
  { id: 'shackleton', label: 'Site 01: Shackleton', name: 'Shackleton', lat: -89.9, lon: 0.0, description: 'Deep permanently shadowed crater floor.', heightmapUrl: '/heightmaps/shackleton_heightmap.png', dataFile: 'shackleton_data.json' },
  { id: 'malapert', label: 'Site 02: Malapert', name: 'Malapert', lat: -86.0, lon: -2.9, description: 'Mountain peak with high solar visibility.', heightmapUrl: '/heightmaps/malapert_heightmap.png', dataFile: 'malapert_data.json' },
  { id: 'de_gerlache', label: 'Site 03: de Gerlache', name: 'de Gerlache', lat: -88.5, lon: -87.1, description: 'Crater rim with access to ice deposits.', heightmapUrl: '/heightmaps/de_gerlache_heightmap.png', dataFile: 'de_gerlache_data.json' },
  { id: 'mons_mouton', label: 'Site 04: Mons Mouton', name: 'Mons Mouton', lat: -85.5, lon: 32.7, description: 'Broad elevated plateau with high solar visibility.', heightmapUrl: '/heightmaps/mons_mouton_heightmap.png', dataFile: 'mons_mouton_data.json' },
  { id: 'nobile_rim', label: 'Site 05: Nobile Rim', name: 'Nobile Rim', lat: -85.4, lon: 53.5, description: 'VIPER rover exploration target.', heightmapUrl: '/heightmaps/nobile_rim_heightmap.png', dataFile: 'nobile_rim_data.json' },
  { id: 'haworth', label: 'Site 06: Haworth', name: 'Haworth', lat: -87.4, lon: -4.0, description: 'Deep permanently shadowed crater floor.', heightmapUrl: '/heightmaps/haworth_heightmap.png', dataFile: 'haworth_data.json' },
  { id: 'cabeus_b', label: 'Site 07: Cabeus B', name: 'Cabeus B', lat: -86.0, lon: -42.0, description: 'Highlands near permanently shadowed regions.', heightmapUrl: '/heightmaps/cabeus_b_heightmap.png', dataFile: 'cabeus_b_data.json' },
  { id: 'slater_plain', label: 'Site 08: Slater Plain', name: 'Slater Plain', lat: -86.0, lon: -20.0, description: 'Flat terrain adjacent to Shackleton.', heightmapUrl: '/heightmaps/slater_plain_heightmap.png', dataFile: 'slater_plain_data.json' },
];

const MissionContext = createContext<any>(null);

export function MissionProvider({ children }: { children: ReactNode }) {
  const [selectedSite, setSelectedSite] = useState(SITES[0]);
  
  return (
    <MissionContext.Provider value={{ selectedSite, setSelectedSite, SITES }}>
      {children}
    </MissionContext.Provider>
  );
}

export const useMission = () => useContext(MissionContext);