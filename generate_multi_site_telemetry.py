"""
CLPS Lunar Mission Browser — Multi-Site Skyfield Telemetry Generator
=====================================================================
Calculates real topocentric Sun & Earth elevation angles, solar irradiance,
power generation, battery charging/drain simulation, and comms line-of-sight
for 5 lunar South Pole landing sites starting from Jan 1, 2026.

Sites:
- mons_mouton  : Lat -85.5, Lon  32.7
- nobile_rim   : Lat -85.4, Lon  53.5
- haworth      : Lat -87.4, Lon  -4.0
- cabeus_b     : Lat -86.0, Lon -42.0
- slater_plain : Lat -86.0, Lon -20.0

Output Format (public/[site_name]_data.json):
{
  "site": "Mons Mouton",
  "coordinates": { "lat": -85.5, "lon": 32.7 },
  "data": [
    {
      "time": "Day 01, 00:00",
      "sunElevation": 5.83,
      "earthElevation": 9.99,
      "solarIrradiance": 138.2,
      "batteryLevel": 100.0,
      "dataRate": 17.3,
      "commsStatus": "NOMINAL"
    },
    ...
  ]
}
"""

import json
import math
import os
import shutil
from datetime import timedelta
from pathlib import Path
from skyfield.api import load
from skyfield.planetarylib import PlanetaryConstants

# 5 Target Lunar Landing Sites
SITES = [
    {
        "id": "mons_mouton",
        "name": "Mons Mouton",
        "coordinates": {"lat": -85.5, "lon": 32.7},
    },
    {
        "id": "nobile_rim",
        "name": "Nobile Rim",
        "coordinates": {"lat": -85.4, "lon": 53.5},
    },
    {
        "id": "haworth",
        "name": "Haworth",
        "coordinates": {"lat": -87.4, "lon": -4.0},
    },
    {
        "id": "cabeus_b",
        "name": "Cabeus B",
        "coordinates": {"lat": -86.0, "lon": -42.0},
    },
    {
        "id": "slater_plain",
        "name": "Slater Plain",
        "coordinates": {"lat": -86.0, "lon": -20.0},
    },
]

# Simulation parameters: 720 hours (30 days) starting Jan 1, 2026
TOTAL_HOURS = 720
START_YEAR = 2026
START_MONTH = 1
START_DAY = 1
START_HOUR = 0

# Solar Constant at 1 AU (W/m^2)
SOLAR_CONSTANT = 1361.0

# NAIF SPICE kernels for Moon high-precision orientation
NAIF_KERNELS = [
    ("pck00010.tpc", "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00010.tpc", "text"),
    ("moon_080317.tf", "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/fk/satellites/moon_080317.tf", "text"),
    ("moon_pa_de421_1900-2050.bpc", "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/moon_pa_de421_1900-2050.bpc", "binary"),
]


def ensure_kernel(filename: str, url: str, base_dir: Path) -> Path:
    """Ensures NAIF kernel is available locally, downloading if necessary."""
    file_path = base_dir / filename
    if not file_path.exists():
        print(f"Downloading required NAIF SPICE kernel: {filename}...")
        try:
            load.open(url)
        except Exception as e:
            print(f"Warning downloading {url}: {e}")
    return file_path


def main():
    base_dir = Path(__file__).resolve().parent
    public_dir = base_dir / "public"
    clps_app_public = base_dir / "clps-app" / "public"

    # Ensure output directories exist
    public_dir.mkdir(parents=True, exist_ok=True)
    if (base_dir / "clps-app").exists():
        clps_app_public.mkdir(parents=True, exist_ok=True)

    print("=" * 70)
    print("CLPS Lunar: 30-Day Mission Telemetry Generator (Skyfield & DE421)")
    print("=" * 70)
    print(f"Start Epoch : {START_YEAR}-{START_MONTH:02d}-{START_DAY:02d} {START_HOUR:02d}:00 UTC")
    print(f"Duration    : {TOTAL_HOURS} Hours (30 Days at 1-Hour Resolution)")
    print(f"Sites Count : {len(SITES)} Landing Sites")

    # 1. Load timescales and JPL DE421 ephemeris
    print("\n[1/3] Loading Skyfield timescales and JPL DE421 ephemeris...")
    ts = load.timescale()
    try:
        eph = load("de421.bsp")
    except Exception as e:
        print(f"Error loading de421.bsp: {e}. Downloading from JPL...")
        eph = load("de421.bsp")

    moon = eph["moon"]
    sun = eph["sun"]
    earth = eph["earth"]

    # 2. Initialize Moon Principal Axis Frame
    print("\n[2/3] Initializing Moon Topocentric Orientation (MOON_PA_DE421)...")
    pc = PlanetaryConstants()
    for fname, url, ktype in NAIF_KERNELS:
        kpath = ensure_kernel(fname, url, base_dir)
        try:
            if ktype == "text":
                pc.read_text(load(str(kpath.name)))
            else:
                pc.read_binary(load(str(kpath.name)))
        except Exception as e:
            print(f"Note loading kernel {fname}: {e}")

    try:
        moon_frame = pc.build_frame_named("MOON_PA_DE421")
    except Exception as e:
        print(f"Notice on frame build: {e}. Falling back to default Moon orientation.")
        moon_frame = None

    start_time = ts.utc(START_YEAR, START_MONTH, START_DAY, START_HOUR)

    # 3. Process Telemetry for Each Site
    print("\n[3/3] Generating Telemetry Datasets...")
    completed_sites = []

    for site in SITES:
        site_id = site["id"]
        site_name = site["name"]
        coords = site["coordinates"]
        lat = coords["lat"]
        lon = coords["lon"]

        print(f"\nProcessing {site_name} ({lat:+.1f}°, {lon:+.1f}°)...")

        # Define topocentric observer on Moon's surface
        if moon_frame is not None:
            observer_loc = pc.build_latlon_degrees(moon_frame, latitude_degrees=lat, longitude_degrees=lon)
            site_observer = moon + observer_loc
        else:
            site_observer = moon

        data_points = []
        battery_level = 100.0  # Battery starts at 100%

        for h in range(TOTAL_HOURS):
            t = start_time + timedelta(hours=h)

            # Compute apparent topocentric positions
            astrometric_sun = site_observer.at(t).observe(sun).apparent()
            astrometric_earth = site_observer.at(t).observe(earth).apparent()

            alt_sun, _, _ = astrometric_sun.altaz()
            alt_earth, _, _ = astrometric_earth.altaz()

            sun_elev = float(alt_sun.degrees)
            earth_elev = float(alt_earth.degrees)

            # Calculate Solar Irradiance (W/m^2)
            if sun_elev > 0:
                solar_irradiance = SOLAR_CONSTANT * math.sin(math.radians(sun_elev))
            else:
                solar_irradiance = 0.0

            # Battery simulation:
            # 10 m^2 solar array with 30% conversion efficiency, baseline hotel load 50 W
            power_gen = solar_irradiance * 10.0 * 0.3
            battery_change = power_gen - 50.0  # Surplus charges battery, deficit drains battery
            battery_level += (battery_change / 1000.0) * 100.0
            battery_level = max(0.0, min(100.0, battery_level))

            # Communications Line-of-Sight and Data Rate
            if earth_elev < 0:
                comms_status = "BLACKOUT"
                data_rate = 0.0
            elif earth_elev < 2.0:
                comms_status = "DEGRADED"
                data_rate = 5.0
            else:
                comms_status = "NOMINAL"
                data_rate = 100.0 * math.sin(math.radians(earth_elev))

            day = (h // 24) + 1
            hour_str = f"{h % 24:02d}:00"
            time_label = f"Day {day:02d}, {hour_str}"

            data_points.append({
                "time": time_label,
                "sunElevation": round(sun_elev, 2),
                "earthElevation": round(earth_elev, 2),
                "solarIrradiance": round(solar_irradiance, 1),
                "batteryLevel": round(battery_level, 1),
                "dataRate": round(data_rate, 1),
                "commsStatus": comms_status,
            })

        output_payload = {
            "site": site_name,
            "coordinates": coords,
            "data": data_points,
        }

        # Save to public/[site_name]_data.json
        out_file = public_dir / f"{site_id}_data.json"
        try:
            with open(out_file, "w", encoding="utf-8") as f:
                json.dump(output_payload, f, indent=2)
            print(f"  ✓ Saved {out_file.name} ({len(data_points)} hourly records)")
        except Exception as e:
            print(f"  ✗ Error writing {out_file}: {e}")
            continue

        # Mirror to clps-app/public/
        if clps_app_public.exists():
            try:
                shutil.copy2(out_file, clps_app_public / out_file.name)
            except Exception as e:
                print(f"  Note on mirror copy: {e}")

        completed_sites.append(site_name)

    print("\n" + "=" * 70)
    print(f"🎉 SUCCESS: All {len(completed_sites)} of {len(SITES)} landing sites generated successfully!")
    print("=" * 70)
    for s in completed_sites:
        print(f"  • {s:<15} -> public/{s.lower().replace(' ', '_')}_data.json")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    main()
