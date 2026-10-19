"""
CLPS Lunar Mission Browser — Shackleton Ephemeris Generator
============================================================
Calculates real topocentric elevation angles for the Sun and Earth relative
to the local horizon at Shackleton Crater on the Moon (-89.9° Lat, 0.0° Lon)
using NASA JPL SPICE kernels and the Skyfield astronomy library.

Output:
shackleton_data.json — 30-day hourly elevation profile (720 data points)
in format: [{"time": "Day 1, 00:00", "sunElevation": 1.25, "earthElevation": -2.48}, ...]
"""

import json
import os
from datetime import datetime, timezone, timedelta
from pathlib import Path
from skyfield.api import load
from skyfield.planetarylib import PlanetaryConstants

# Coordinates for Shackleton Crater rim (Lunar South Pole)
SHACKLETON_LAT = -89.9
SHACKLETON_LON = 0.0

# 30-day simulation at 1-hour step
TOTAL_DAYS = 30
HOURS_PER_DAY = 24
TOTAL_HOURS = TOTAL_DAYS * HOURS_PER_DAY

# NASA JPL NAIF SPICE kernel URLs for high-precision lunar orientation
NAIF_KERNELS = [
    {
        "filename": "pck00010.tpc",
        "url": "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00010.tpc",
        "type": "text",
    },
    {
        "filename": "moon_080317.tf",
        "url": "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/fk/satellites/moon_080317.tf",
        "type": "text",
    },
    {
        "filename": "moon_pa_de421_1900-2050.bpc",
        "url": "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/moon_pa_de421_1900-2050.bpc",
        "type": "binary",
    },
]


def ensure_file_downloaded(filename: str, url: str) -> str:
    """Ensures a kernel file exists locally, downloading it from JPL NAIF if needed."""
    if os.path.exists(filename):
        return filename
    print(f"Downloading required NASA SPICE kernel: {filename}...")
    load.open(url)
    return filename


def generate_shackleton_ephemeris(output_filename: str = "shackleton_data.json") -> list[dict]:
    print("=" * 65)
    print("CLPS Lunar: Calculating Shackleton Crater 30-Day Ephemeris")
    print("=" * 65)
    print(f"Observer Location: Moon Shackleton Crater ({SHACKLETON_LAT}° Lat, {SHACKLETON_LON}° Lon)")
    print(f"Timeline         : {TOTAL_DAYS} Days ({TOTAL_HOURS} Hourly Readings)")

    # 1. Load timescales and JPL DE421 ephemeris (auto-downloads if missing)
    ts = load.timescale()
    print("\n[1/4] Loading JPL DE421 planetary ephemeris...")
    eph = load("de421.bsp")

    moon = eph["moon"]
    sun = eph["sun"]
    earth = eph["earth"]

    # 2. Download and load lunar orientation kernels
    print("\n[2/4] Initializing Lunar Principal Axis Reference Frame (DE421)...")
    pc = PlanetaryConstants()

    for kernel in NAIF_KERNELS:
        kernel_path = ensure_file_downloaded(kernel["filename"], kernel["url"])
        if kernel["type"] == "text":
            pc.read_text(load(kernel_path))
        elif kernel["type"] == "binary":
            pc.read_binary(load(kernel_path))

    # Build the official DE421 Moon Principal Axis frame
    moon_frame = pc.build_frame_named("MOON_PA_DE421")

    # 3. Define topocentric observer on the lunar surface
    shackleton_observer = pc.build_latlon_degrees(
        moon_frame,
        latitude_degrees=SHACKLETON_LAT,
        longitude_degrees=SHACKLETON_LON,
    )
    topocentric_site = moon + shackleton_observer

    # 4. Generate 30-day timeline starting from current UTC time
    print(f"\n[3/4] Computing topocentric elevation angles across {TOTAL_HOURS} hours...")
    start_time = datetime.now(timezone.utc)
    time_series = [start_time + timedelta(hours=i) for i in range(TOTAL_HOURS)]
    skyfield_times = ts.from_datetimes(time_series)

    # Vectorized computation of Sun and Earth apparent alt/az
    apparent_sun = topocentric_site.at(skyfield_times).observe(sun).apparent()
    sun_alt, _, _ = apparent_sun.altaz()

    apparent_earth = topocentric_site.at(skyfield_times).observe(earth).apparent()
    earth_alt, _, _ = apparent_earth.altaz()

    sun_elevations = sun_alt.degrees
    earth_elevations = earth_alt.degrees

    # 5. Build formatted JSON dataset
    dataset: list[dict] = []
    daylight_hours = 0
    los_active_hours = 0

    for i in range(TOTAL_HOURS):
        day_num = (i // HOURS_PER_DAY) + 1
        hour_num = i % HOURS_PER_DAY
        time_label = f"Day {day_num}, {hour_num:02d}:00"

        s_elev = float(round(sun_elevations[i], 2))
        e_elev = float(round(earth_elevations[i], 2))

        if s_elev >= 0:
            daylight_hours += 1
        if e_elev >= 0:
            los_active_hours += 1

        dataset.append({
            "time": time_label,
            "sunElevation": s_elev,
            "earthElevation": e_elev,
        })

    # Save to JSON
    output_path = Path(output_filename).resolve()
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=2)

    print(f"\n[4/4] Output successfully saved:")
    print(f"  ✓ File: {output_path}")
    print(f"  ✓ Data Points Generated : {len(dataset)}")
    print(f"  • Sun Elevation Range   : {min(sun_elevations):.2f}° to {max(sun_elevations):.2f}°")
    print(f"  • Earth Elevation Range : {min(earth_elevations):.2f}° to {max(earth_elevations):.2f}°")
    print(f"  • Daylight Visibility   : {daylight_hours} / {TOTAL_HOURS} hrs ({(daylight_hours/TOTAL_HOURS)*100:.1f}%)")
    print(f"  • Earth Direct Comms    : {los_active_hours} / {TOTAL_HOURS} hrs ({(los_active_hours/TOTAL_HOURS)*100:.1f}%)")
    print("=" * 65)

    return dataset


if __name__ == "__main__":
    generate_shackleton_ephemeris("shackleton_data.json")
