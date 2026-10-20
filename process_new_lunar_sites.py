"""
CLPS Lunar Mission Browser — Multi-Site DEM & Ephemeris Processor
==================================================================
Processes 5 new Artemis candidate lunar South Pole landing sites using
Rasterio, NumPy, Pillow (PIL), and Skyfield:

Sites:
- mons_mouton  : Lat -85.5, Lon  32.7
- nobile_rim   : Lat -85.4, Lon  53.5
- haworth      : Lat -87.4, Lon  -4.0
- cabeus_b     : Lat -86.0, Lon -42.0
- slater_plain : Lat -86.0, Lon -20.0

Tasks:
1. Task 1 (Heightmaps via Rasterio & PIL):
   - Opens ldem_87s_5mpp.tif (LOLA 5m/px Polar Stereographic South Pole DEM).
   - Computes pixel coordinates for each site's Lat/Lon.
   - Extracts a 1024x1024 pixel window centered on that location.
   - Handles NoData values (clamps to nearest DEM extent if outside -87°S disk).
   - Normalizes elevation to 0 - 255 grayscale (uint8).
   - Saves to public/heightmaps/[site_name]_heightmap.png.

2. Task 2 (Ephemeris via Skyfield & JPL DE421):
   - Computes 30-day (720 hourly points) topocentric Sun & Earth elevation angles.
   - Saves to public/[site_name]_data.json.
"""

import json
import math
import os
import shutil
from datetime import datetime, timezone, timedelta
from pathlib import Path

import numpy as np
from PIL import Image
import rasterio
from rasterio.windows import Window
from rasterio.warp import transform
from skyfield.api import load
from skyfield.planetarylib import PlanetaryConstants

# 5 Target Lunar Landing Sites
LUNAR_SITES = [
    {
        "id": "mons_mouton",
        "name": "Mons Mouton",
        "lat": -85.5,
        "lon": 32.7,
        "description": "High-altitude flat-topped lunar mountain (VIPER rover target).",
    },
    {
        "id": "nobile_rim",
        "name": "Nobile Rim",
        "lat": -85.4,
        "lon": 53.5,
        "description": "Crater rim with prominent high-illumination ridges and PSRs.",
    },
    {
        "id": "haworth",
        "name": "Haworth Crater",
        "lat": -87.4,
        "lon": -4.0,
        "description": "Deep impact crater with extensive permanently shadowed regions.",
    },
    {
        "id": "cabeus_b",
        "name": "Cabeus B",
        "lat": -86.0,
        "lon": -42.0,
        "description": "Elevated ridge adjacent to Cabeus crater with Earth line-of-sight.",
    },
    {
        "id": "slater_plain",
        "name": "Slater Plain",
        "lat": -86.0,
        "lon": -20.0,
        "description": "Traversable plateau between Faustini and Shoemaker craters.",
    },
]

# Moon Physical & Spatial Constants
MOON_RADIUS_METERS = 1737400.0  # IAU Moon reference sphere
WINDOW_SIZE = 1024               # 1024x1024 output resolution
TOTAL_DAYS = 30
HOURS_PER_DAY = 24
TOTAL_HOURS = TOTAL_DAYS * HOURS_PER_DAY


def locate_dem_file() -> Path:
    """Finds the ldem_87s_5mpp.tif file across likely workspace locations."""
    candidates = [
        Path("raw_data/ldem_87s_5mpp.tif"),
        Path("ldem_87s_5mpp.tif"),
        Path("../raw_data/ldem_87s_5mpp.tif"),
    ]
    for p in candidates:
        if p.exists():
            return p.resolve()
    raise FileNotFoundError("Could not find 'ldem_87s_5mpp.tif' in raw_data/ or root directory.")


def latlon_to_polar_stereo(lat: float, lon: float, radius: float = MOON_RADIUS_METERS) -> tuple[float, float]:
    """
    Direct analytical conversion from Lunar Lat/Lon to South Pole Polar Stereographic (meters).
    Formula:
      colatitude c = 90° - (-lat)
      scale k = 2 * R * tan(c / 2)
      x = k * sin(lon_rad)
      y = k * cos(lon_rad)
    """
    colat_rad = math.radians(90.0 + lat)
    lon_rad = math.radians(lon)
    k = 2.0 * radius * math.tan(colat_rad / 2.0)
    x = k * math.sin(lon_rad)
    y = k * math.cos(lon_rad)
    return x, y


# =============================================================================
# TASK 1: Generate Heightmaps (Rasterio, NumPy, PIL)
# =============================================================================
def generate_site_heightmaps(dem_path: Path, output_dir: Path, clamp_to_valid_disk: bool = True) -> dict[str, str]:
    print("\n" + "=" * 70)
    print("TASK 1: Extracting 1024x1024 Heightmaps from ldem_87s_5mpp.tif")
    print("=" * 70)

    output_dir.mkdir(parents=True, exist_ok=True)
    generated_files: dict[str, str] = {}

    with rasterio.open(str(dem_path)) as src:
        nodata = src.nodata
        print(f"  • Source DEM       : {dem_path.name}")
        print(f"  • Dimensions       : {src.width:,} x {src.height:,} pixels")
        print(f"  • Resolution       : {src.res[0]:.1f} m/pixel")
        print(f"  • Coordinate Frame : {src.crs.data if hasattr(src.crs, 'data') else 'Moon2000 Polar Stereo'}")

        # Geographic Moon coordinate reference system for rasterio
        geog_crs = rasterio.crs.CRS.from_string(f"+proj=longlat +R={MOON_RADIUS_METERS} +no_defs")

        # The valid disk radius of ldem_87s is ~88,000 meters (~87.1° S)
        MAX_VALID_RADIUS = 88000.0

        for site in LUNAR_SITES:
            site_id = site["id"]
            lat = site["lat"]
            lon = site["lon"]
            out_filename = output_dir / f"{site_id}_heightmap.png"

            print(f"\n[{site_id}] Lat: {lat:+.1f}°, Lon: {lon:+.1f}°")

            # 1. Transform Lat/Lon to projected coordinates (meters)
            xs, ys = transform(geog_crs, src.crs, [lon], [lat])
            proj_x, proj_y = xs[0], ys[0]
            dist_from_pole = math.hypot(proj_x, proj_y)

            # Check if location is outside the -87° extent of ldem_87s
            eff_x, eff_y = proj_x, proj_y
            was_clamped = False

            if dist_from_pole > MAX_VALID_RADIUS and clamp_to_valid_disk:
                scale = MAX_VALID_RADIUS / dist_from_pole
                eff_x = proj_x * scale
                eff_y = proj_y * scale
                was_clamped = True
                print(f"  ℹ Note: Site is {dist_from_pole/1000:.1f} km from South Pole (north of -87°S coverage).")
                print(f"    Sampled nearest valid LOLA terrain along azimuth at {MAX_VALID_RADIUS/1000:.1f} km radius.")

            # 2. Find pixel coordinates (row, col) in raster
            row, col = src.index(eff_x, eff_y)
            print(f"  • Projected Target : x={eff_x:,.1f} m, y={eff_y:,.1f} m")
            print(f"  • Center Pixel     : col={col:,}, row={row:,}")

            # 3. Extract 1024x1024 pixel window centered on that location
            col_off = int(round(col - WINDOW_SIZE / 2))
            row_off = int(round(row - WINDOW_SIZE / 2))
            window = Window(col_off, row_off, WINDOW_SIZE, WINDOW_SIZE)

            # Read band 1 with boundless padding
            raw_elevation = src.read(1, window=window, boundless=True, fill_value=np.nan).astype(np.float32)

            # 4. Handle NoData values
            if nodata is not None and not np.isnan(nodata):
                valid_mask = (raw_elevation != nodata) & ~np.isnan(raw_elevation) & ~np.isinf(raw_elevation)
            else:
                valid_mask = ~np.isnan(raw_elevation) & ~np.isinf(raw_elevation)

            valid_count = int(np.count_nonzero(valid_mask))
            total_pixels = raw_elevation.size

            if valid_count > 0:
                min_elev = float(np.min(raw_elevation[valid_mask]))
                max_elev = float(np.max(raw_elevation[valid_mask]))
                elev_range = max_elev - min_elev

                print(f"  • Valid Pixels     : {valid_count:,} / {total_pixels:,} ({(valid_count/total_pixels)*100:.1f}%)")
                print(f"  • Elevation Range  : {min_elev:+.1f} m to {max_elev:+.1f} m (Delta: {elev_range:.1f} m)")

                # Replace NoData pixels with the minimum valid elevation
                raw_elevation[~valid_mask] = min_elev

                # 5. Normalize values to 0 - 255 grayscale range
                if elev_range > 0:
                    normalized = ((raw_elevation - min_elev) / elev_range) * 255.0
                    normalized = np.clip(normalized, 0, 255).astype(np.uint8)
                else:
                    normalized = np.zeros((WINDOW_SIZE, WINDOW_SIZE), dtype=np.uint8)
            else:
                print("  ⚠ No valid pixels inside window. Creating baseline neutral terrain.")
                normalized = np.zeros((WINDOW_SIZE, WINDOW_SIZE), dtype=np.uint8)

            # 6. Save as grayscale PNG image using Pillow
            img = Image.fromarray(normalized, mode="L")
            img.save(str(out_filename), format="PNG", optimize=True)
            print(f"  ✓ Saved Heightmap  : {out_filename}")
            generated_files[site_id] = str(out_filename)

            # Mirror to clps-app/public/heightmaps/ if directory exists
            clps_app_dir = Path("clps-app/public/heightmaps")
            if clps_app_dir.exists():
                shutil.copy2(out_filename, clps_app_dir / out_filename.name)

    return generated_files


# =============================================================================
# TASK 2: Generate 30-Day Ephemeris Telemetry (Skyfield & JPL DE421)
# =============================================================================
def generate_site_ephemerides(output_dir: Path) -> dict[str, str]:
    print("\n" + "=" * 70)
    print("TASK 2: Computing 30-Day Sun & Earth Ephemerides with Skyfield")
    print("=" * 70)

    output_dir.mkdir(parents=True, exist_ok=True)
    generated_ephemeris: dict[str, str] = {}

    # Load timescales and JPL DE421 ephemeris (auto-downloads if missing)
    ts = load.timescale()
    print("  • Loading NASA JPL DE421 ephemeris...")
    eph = load("de421.bsp")
    moon = eph["moon"]
    sun = eph["sun"]
    earth = eph["earth"]

    # Load NAIF Moon orientation kernels
    pc = PlanetaryConstants()
    naif_kernels = [
        ("pck00010.tpc", "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00010.tpc", "text"),
        ("moon_080317.tf", "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/fk/satellites/moon_080317.tf", "text"),
        ("moon_pa_de421_1900-2050.bpc", "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/moon_pa_de421_1900-2050.bpc", "binary"),
    ]

    for filename, url, ktype in naif_kernels:
        if not os.path.exists(filename):
            print(f"  • Downloading NAIF kernel: {filename}...")
            load.open(url)
        if ktype == "text":
            pc.read_text(load(filename))
        else:
            pc.read_binary(load(filename))

    moon_frame = pc.build_frame_named("MOON_PA_DE421")

    # Build 30-day timeline at 1-hour intervals starting from current UTC time
    start_time = datetime.now(timezone.utc)
    time_points = [start_time + timedelta(hours=i) for i in range(TOTAL_HOURS)]
    skyfield_times = ts.from_datetimes(time_points)

    for site in LUNAR_SITES:
        site_id = site["id"]
        lat = site["lat"]
        lon = site["lon"]
        json_path = output_dir / f"{site_id}_data.json"

        # Build topocentric observer on the Moon's surface
        observer = pc.build_latlon_degrees(moon_frame, latitude_degrees=lat, longitude_degrees=lon)
        topocentric_site = moon + observer

        # Vectorized computation of apparent elevation angles
        sun_alt, _, _ = topocentric_site.at(skyfield_times).observe(sun).apparent().altaz()
        earth_alt, _, _ = topocentric_site.at(skyfield_times).observe(earth).apparent().altaz()

        sun_elevations = sun_alt.degrees
        earth_elevations = earth_alt.degrees

        # Format into JSON array
        dataset = []
        for i in range(TOTAL_HOURS):
            day_num = (i // HOURS_PER_DAY) + 1
            hour_num = i % HOURS_PER_DAY
            dataset.append({
                "time": f"Day {day_num}, {hour_num:02d}:00",
                "sunElevation": float(round(sun_elevations[i], 2)),
                "earthElevation": float(round(earth_elevations[i], 2)),
            })

        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(dataset, f, indent=2)

        daylight_pct = (np.count_nonzero(sun_elevations >= 0) / TOTAL_HOURS) * 100
        los_pct = (np.count_nonzero(earth_elevations >= 0) / TOTAL_HOURS) * 100

        print(f"  ✓ [{site_id}] 720 points saved to {json_path.name}")
        print(f"    Sun: [{min(sun_elevations):+.2f}° to {max(sun_elevations):+.2f}°] (Daylight: {daylight_pct:.1f}%) | "
              f"Earth: [{min(earth_elevations):+.2f}° to {max(earth_elevations):+.2f}°] (LOS: {los_pct:.1f}%)")

        generated_ephemeris[site_id] = str(json_path)

        # Mirror to clps-app/public/ if directory exists
        clps_app_pub = Path("clps-app/public")
        if clps_app_pub.exists():
            shutil.copy2(json_path, clps_app_pub / json_path.name)

    return generated_ephemeris


# =============================================================================
# Main Entry Point
# =============================================================================
def main():
    print("=" * 70)
    print("CLPS Lunar: Multi-Site DEM Heightmap & Ephemeris Pipeline")
    print("=" * 70)

    dem_file = locate_dem_file()
    heightmap_dir = Path("public/heightmaps")
    ephemeris_dir = Path("public")

    # Task 1: Generate Heightmaps
    heightmaps = generate_site_heightmaps(dem_file, heightmap_dir, clamp_to_valid_disk=True)

    # Task 2: Generate Ephemerides
    ephemerides = generate_site_ephemerides(ephemeris_dir)

    print("\n" + "=" * 70)
    print("PIPELINE EXECUTION SUMMARY")
    print("=" * 70)
    print(f"Target Sites Processed : {len(LUNAR_SITES)}")
    print(f"Heightmaps Output Dir  : {heightmap_dir.resolve()}")
    print(f"Ephemerides Output Dir : {ephemeris_dir.resolve()}")
    for site in LUNAR_SITES:
        sid = site["id"]
        h_exists = Path(heightmaps.get(sid, "")).exists()
        e_exists = Path(ephemerides.get(sid, "")).exists()
        print(f"  • {sid:<14} -> Heightmap: [{'✓' if h_exists else '✗'}] | Ephemeris: [{'✓' if e_exists else '✗'}]")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    main()
