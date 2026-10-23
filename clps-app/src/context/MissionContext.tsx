import { createContext, useContext, useState, ReactNode } from 'react';

export interface Site {
  id: string;
  label: string;
  name: string;
  lat: number;
  lon: number;
  description: string;
  heightmapUrl: string | null;
  dataFile: string;
}

export const SITES: Site[] = [
  // 8 Artemis South Pole Sites
  { id: 'shackleton', label: 'Site 01: Shackleton', name: 'Shackleton', lat: -89.9, lon: 0.0, description: 'Deep permanently shadowed crater floor.', heightmapUrl: '/heightmaps/shackleton_heightmap.png', dataFile: 'shackleton_data.json' },
  { id: 'malapert', label: 'Site 02: Malapert', name: 'Malapert', lat: -86.0, lon: -2.9, description: 'Mountain peak with high solar visibility.', heightmapUrl: '/heightmaps/malapert_heightmap.png', dataFile: 'malapert_data.json' },
  { id: 'de_gerlache', label: 'Site 03: de Gerlache', name: 'de Gerlache', lat: -88.5, lon: -87.1, description: 'Crater rim with access to ice deposits.', heightmapUrl: '/heightmaps/de_gerlache_heightmap.png', dataFile: 'de_gerlache_data.json' },
  { id: 'mons_mouton', label: 'Site 04: Mons Mouton', name: 'Mons Mouton', lat: -85.5, lon: 32.7, description: 'Broad elevated plateau with high solar visibility.', heightmapUrl: '/heightmaps/mons_mouton_heightmap.png', dataFile: 'mons_mouton_data.json' },
  { id: 'nobile_rim', label: 'Site 05: Nobile Rim', name: 'Nobile Rim', lat: -85.4, lon: 53.5, description: 'VIPER rover exploration target.', heightmapUrl: '/heightmaps/nobile_rim_heightmap.png', dataFile: 'nobile_rim_data.json' },
  { id: 'haworth', label: 'Site 06: Haworth', name: 'Haworth', lat: -87.4, lon: -4.0, description: 'Deep permanently shadowed crater floor.', heightmapUrl: '/heightmaps/haworth_heightmap.png', dataFile: 'haworth_data.json' },
  { id: 'cabeus_b', label: 'Site 07: Cabeus B', name: 'Cabeus B', lat: -86.0, lon: -42.0, description: 'Highlands near permanently shadowed regions.', heightmapUrl: '/heightmaps/cabeus_b_heightmap.png', dataFile: 'cabeus_b_data.json' },
  { id: 'slater_plain', label: 'Site 08: Slater Plain', name: 'Slater Plain', lat: -86.0, lon: -20.0, description: 'Flat terrain adjacent to Shackleton.', heightmapUrl: '/heightmaps/slater_plain_heightmap.png', dataFile: 'slater_plain_data.json' },

  // Global Historical & Robotic Sites
  { id: 'apollo_11', label: 'Apollo 11', name: 'Apollo 11', lat: 0.674, lon: 23.473, description: 'Historic first crewed lunar landing site in Mare Tranquillitatis.', heightmapUrl: '/heightmaps/apollo_11_heightmap.png', dataFile: 'apollo_11_data.json' },
  { id: 'apollo_17', label: 'Apollo 17', name: 'Apollo 17', lat: 20.190, lon: 30.772, description: 'Final Apollo mission exploration of Taurus-Littrow highland valley.', heightmapUrl: '/heightmaps/apollo_17_heightmap.png', dataFile: 'apollo_17_data.json' },
  { id: 'change_4', label: "Chang'e 4", name: "Chang'e 4", lat: -45.5, lon: 177.6, description: 'First soft landing on the lunar farside within Von Kármán crater.', heightmapUrl: '/heightmaps/change_4_heightmap.png', dataFile: 'change_4_data.json' },
  { id: 'luna_9', label: 'Luna 9', name: 'Luna 9', lat: 7.13, lon: -64.37, description: 'First spacecraft to achieve a soft touchdown on the Moon, Oceanus Procellarum.', heightmapUrl: '/heightmaps/luna_9_heightmap.png', dataFile: 'luna_9_data.json' },
  { id: 'chandrayaan_3', label: 'Chandrayaan-3', name: 'Chandrayaan-3', lat: -69.37, lon: 32.32, description: 'ISRO Vikram lander touchdown site at Shiv Shakti Point near Manzinus crater.', heightmapUrl: '/heightmaps/chandrayaan_3_heightmap.png', dataFile: 'chandrayaan_3_data.json' },
  { id: 'im_1_odysseus', label: 'IM-1 Odysseus', name: 'IM-1 Odysseus', lat: -80.13, lon: 1.44, description: 'Intuitive Machines CLPS robotic commercial landing near Malapert A crater.', heightmapUrl: '/heightmaps/im_1_odysseus_heightmap.png', dataFile: 'im_1_odysseus_data.json' },
];

const MissionContext = createContext<any>(null);

export function MissionProvider({ children }: { children: ReactNode }) {
  const [selectedSite, setSelectedSite] = useState<Site>(SITES[0]);
  
  return (
    <MissionContext.Provider value={{ selectedSite, setSelectedSite, SITES }}>
      {children}
    </MissionContext.Provider>
  );
}

export const useMission = () => useContext(MissionContext);
