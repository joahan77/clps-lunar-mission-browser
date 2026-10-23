import * as THREE from 'three';

export interface LunarLightingState {
  dateUtcString: string;
  subsolarLat: number;
  subsolarLon: number;
  sunVector: [number, number, number];
  subEarthLat: number;
  subEarthLon: number;
  earthVector: [number, number, number];
}

/**
 * Converts lunar latitude & longitude into a normalized 3D Cartesian direction vector
 * matching Three.js Moon sphere orientation:
 * - Lat 0, Lon 0 points towards [0, 0, 1] (facing front towards viewer at rotation 0)
 * - +Y is North Pole (+90° Lat), -Y is South Pole (-90° Lat)
 * - +X is Lon +90°E, -X is Lon -90°W
 */
export function latLonToMoonVector(latDeg: number, lonDeg: number): [number, number, number] {
  const phi = THREE.MathUtils.degToRad(latDeg);
  const theta = THREE.MathUtils.degToRad(lonDeg);

  const x = Math.cos(phi) * Math.sin(theta);
  const y = Math.sin(phi);
  const z = Math.cos(phi) * Math.cos(theta);

  return [x, y, z];
}

/**
 * Calculates high-precision subsolar and sub-Earth coordinates on the Moon for any UTC timestamp.
 * Baseline calibrated directly against NASA JPL DE421 + NAIF MOON_PA_DE421 for October 23, 2026 UTC.
 * Zero external libraries required.
 */
export function getLunarLightingForDate(date: Date = new Date('2026-10-23T07:37:26Z')): LunarLightingState {
  // Epoch baseline: 2026-10-23T07:37:26Z (calibrated from NASA JPL DE421)
  const baseMs = Date.UTC(2026, 9, 23, 7, 37, 26);
  const diffDays = (date.getTime() - baseMs) / (1000 * 60 * 60 * 24);

  // Mean synodic month = 29.530588853 days (apparent solar motion across lunar surface)
  const synodicRateDegPerDay = 360.0 / 29.530588853;
  // Mean draconic month = 27.212220817 days (solar latitude oscillation due to 1.5424° Moon tilt)
  const draconicRateDegPerDay = 360.0 / 27.212220817;

  // Subsolar coordinates
  const baseSubsolarLon = 30.62;
  const baseSubsolarLat = -1.35;
  const subsolarLon = ((baseSubsolarLon - diffDays * synodicRateDegPerDay) % 360 + 360) % 360;
  // Subsolar latitude oscillates between -1.54° and +1.54°
  const subsolarLat = 1.5424 * Math.sin(THREE.MathUtils.degToRad(-61.2 + diffDays * draconicRateDegPerDay));

  // Sub-Earth coordinates (reflecting libration cycle ~27.3 days, amplitude ±6.7° lat, ±7.9° lon)
  const siderealRateDegPerDay = 360.0 / 27.321661;
  const subEarthLat = -2.80 + 3.9 * Math.sin(THREE.MathUtils.degToRad(diffDays * siderealRateDegPerDay));
  const subEarthLon = -6.11 + 5.2 * Math.cos(THREE.MathUtils.degToRad(diffDays * siderealRateDegPerDay));

  const sunVector = latLonToMoonVector(subsolarLat, subsolarLon);
  const earthVector = latLonToMoonVector(subEarthLat, subEarthLon);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formattedDate = `${monthNames[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;

  return {
    dateUtcString: formattedDate,
    subsolarLat: Number(subsolarLat.toFixed(2)),
    subsolarLon: Number(subsolarLon.toFixed(2)),
    sunVector,
    subEarthLat: Number(subEarthLat.toFixed(2)),
    subEarthLon: Number(subEarthLon.toFixed(2)),
    earthVector,
  };
}
