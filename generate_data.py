import json
import math
import shutil
from datetime import timedelta
from pathlib import Path
from skyfield.api import load
from skyfield.planetarylib import PlanetaryConstants

print("Loading ephemeris (JPL DE421)...")
ts = load.timescale()
eph = load('de421.bsp')
earth, moon = eph['earth'], eph['moon']
sun = eph['sun']

pc = PlanetaryConstants()
pc.read_text(load('pck00010.tpc'))
pc.read_text(load('moon_080317.tf'))
pc.read_binary(load('moon_pa_de421_1900-2050.bpc'))
moon_frame = pc.build_frame_named('MOON_PA_DE421')

sites = {
    "mons_mouton": {"name": "Mons Mouton", "lat": -85.5, "lon": 32.7},
    "nobile_rim": {"name": "Nobile Rim", "lat": -85.4, "lon": 53.5},
    "haworth": {"name": "Haworth", "lat": -87.4, "lon": -4.0},
    "cabeus_b": {"name": "Cabeus B", "lat": -86.0, "lon": -42.0},
    "slater_plain": {"name": "Slater Plain", "lat": -86.0, "lon": -20.0},
    "shackleton": {"name": "Shackleton Crater", "lat": -89.9, "lon": 0.0},
    "malapert": {"name": "Malapert Mountain", "lat": -86.0, "lon": -2.9},
    "de_gerlache": {"name": "de Gerlache Rim", "lat": -88.5, "lon": -87.1},
}

start_time = ts.utc(2026, 1, 1, 0)
hours = 720  # 30 days

Path("public").mkdir(parents=True, exist_ok=True)
clps_app_pub = Path("clps-app/public")
if clps_app_pub.exists():
    clps_app_pub.mkdir(parents=True, exist_ok=True)

for site_id, info in sites.items():
    print(f"Generating telemetry for {info['name']}...")
    coords = {"lat": info["lat"], "lon": info["lon"]}
    observer = pc.build_latlon_degrees(moon_frame, latitude_degrees=info["lat"], longitude_degrees=info["lon"])
    site_obs = moon + observer

    data_points = []
    battery_level = 100.0

    for h in range(hours):
        t = start_time + timedelta(hours=h)

        astrometric_sun = site_obs.at(t).observe(sun).apparent()
        astrometric_earth = site_obs.at(t).observe(earth).apparent()

        alt_sun, az_sun, _ = astrometric_sun.altaz()
        alt_earth, az_earth, _ = astrometric_earth.altaz()

        sun_elev = alt_sun.degrees
        earth_elev = alt_earth.degrees

        if sun_elev > 0:
            solar_irradiance = 1361.0 * math.sin(math.radians(sun_elev))
        else:
            solar_irradiance = 0.0

        power_gen = solar_irradiance * 10.0 * 0.3
        battery_change = power_gen - 50.0
        battery_level += (battery_change / 1000.0) * 100.0
        battery_level = max(0.0, min(100.0, battery_level))

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

    output = {
        "site": info["name"],
        "coordinates": coords,
        "data": data_points,
    }

    filename = f"public/{site_id}_data.json"
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2)

    if clps_app_pub.exists():
        shutil.copy2(filename, clps_app_pub / Path(filename).name)

    print(f"  ✓ Saved {filename}")

print("\n🎉 All 5 new landing sites generated successfully!")
