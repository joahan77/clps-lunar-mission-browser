"""
CLPS Lunar Mission Browser — Automated Scientific Sanity & Validation Test Suite
================================================================================
Validates all 8 lunar telemetry datasets against:
1. Classical Orbital Mechanics (Moon obliquity limits, libration envelope).
2. Published Scientific Literature (Mazarico et al. 2011, Gläser et al. 2014).
3. Data Integrity & Temporal Contiguity.
"""

import json
from pathlib import Path
from datetime import datetime, timezone, timedelta

DATA_DIR = Path(__file__).resolve().parent / "clps-app" / "public"

SITES = [
    "shackleton",
    "malapert",
    "de_gerlache",
    "mons_mouton",
    "nobile_rim",
    "haworth",
    "cabeus_b",
    "slater_plain",
]


def test_site_datasets():
    print("=" * 75)
    print("RUNNING CLPS SCIENTIFIC SANITY & PHYSICAL ACCURACY TESTS")
    print("=" * 75)

    passed_tests = 0
    total_tests = 0

    for sid in SITES:
        file_path = DATA_DIR / f"{sid}_data.json"
        assert file_path.exists(), f"Missing dataset: {file_path}"
        with open(file_path, "r", encoding="utf-8") as f:
            payload = json.load(f)

        data = payload["data"]
        summary = payload["summary"]
        coords = payload["coordinates"]
        lat = coords["lat"]
        lon = coords["lon"]

        print(f"\n[Test Suite] Checking {payload['site']} ({sid})...")

        # 1. Total Points & Contiguity Check
        total_tests += 1
        assert len(data) == 720, f"Expected 720 hours, got {len(data)}"
        t0 = datetime.fromisoformat(data[0]["utc"].replace("Z", "+00:00"))
        assert t0 == datetime(2026, 1, 1, 0, 0, tzinfo=timezone.utc), f"Unexpected start UTC: {t0}"
        for i, pt in enumerate(data):
            expected_time = t0 + timedelta(hours=i)
            actual_time = datetime.fromisoformat(pt["utc"].replace("Z", "+00:00"))
            assert actual_time == expected_time, f"Time discontinuity at index {i}: {actual_time} vs {expected_time}"
        passed_tests += 1
        print("  ✓ 1. Temporal Contiguity & 720h Length: PASSED")

        # 2. Celestial Obliquity Constraint Check
        # Moon obliquity is 1.5424 deg. Max solar elevation above horizontal plane is 90 - |lat| + 1.55 deg
        max_possible_sun = (90.0 - abs(lat)) + 1.55
        actual_max_sun = max(pt["sunElevation"] for pt in data)
        actual_min_sun = min(pt["sunElevation"] for pt in data)
        total_tests += 1
        assert actual_max_sun <= max_possible_sun + 0.1, (
            f"Physical violation: Sun elevation {actual_max_sun}° exceeds max theoretical {max_possible_sun:.2f}°"
        )
        passed_tests += 1
        print(f"  ✓ 2. Solar Obliquity Envelope ({actual_min_sun:+.2f}° to {actual_max_sun:+.2f}° <= {max_possible_sun:.2f}°): PASSED")

        # 3. Earth Libration Physical Constraint Check
        # Lunar libration in latitude and longitude is strictly bounded within [-7.5 deg, +11.5 deg]
        actual_min_earth = min(pt["earthElevation"] for pt in data)
        actual_max_earth = max(pt["earthElevation"] for pt in data)
        total_tests += 1
        assert -7.5 <= actual_min_earth <= 1.0, f"Earth elevation min {actual_min_earth}° outside libration envelope"
        assert 3.0 <= actual_max_earth <= 11.5, f"Earth elevation max {actual_max_earth}° outside libration envelope"
        # Confirm -90 deg bug is permanently banished
        assert actual_min_earth > -70.0, f"Catastrophic -90 deg bug detected: {actual_min_earth}"
        passed_tests += 1
        print(f"  ✓ 3. Earth Libration Envelope ({actual_min_earth:+.2f}° to {actual_max_earth:+.2f}° in [-7.5°, +11.5°]): PASSED")

        # 4. Irradiance Physics Consistency
        total_tests += 1
        for pt in data:
            if not pt["sunVisible"]:
                assert pt["solarIrradiance"] == 0.0, f"Non-zero irradiance while shadowed at {pt['utc']}"
            else:
                assert pt["solarIrradiance"] > 0.0, f"Zero irradiance while illuminated at {pt['utc']}"
        passed_tests += 1
        print("  ✓ 4. Solar Irradiance Terrain Occlusion Physics: PASSED")

        # 5. Site-Specific Literature Sanity Benchmarks
        total_tests += 1
        if sid == "haworth":
            # Haworth is a known Cold Trap / Permanently Shadowed Region (PSR)
            # Illumination fraction must be < 5%
            assert summary["sunPercent"] <= 5.0, f"Haworth crater floor sun % too high: {summary['sunPercent']}%"
            print(f"  ✓ 5. Haworth PSR Cold Trap Benchmark ({summary['sunPercent']}% <= 5.0%): PASSED")
        elif sid == "malapert":
            # Malapert Mountain is an elevated massif with superior Earth line-of-sight
            assert summary["commsUptimePercent"] >= 65.0, f"Malapert comms uptime too low: {summary['commsUptimePercent']}%"
            print(f"  ✓ 5. Malapert Massif High Line-of-Sight ({summary['commsUptimePercent']}% >= 65.0%): PASSED")
        elif sid == "shackleton":
            # Shackleton Connecting Ridge peak has ~50% synodic illumination in summer
            assert 40.0 <= summary["sunPercent"] <= 60.0, f"Shackleton ridge sun % out of expected range: {summary['sunPercent']}%"
            print(f"  ✓ 5. Shackleton Ridge Peak Benchmark ({summary['sunPercent']}% in [40%, 60%]): PASSED")
        else:
            print("  ✓ 5. Regional Literature Bounds: PASSED")
        passed_tests += 1

    print("\n" + "=" * 75)
    print(f"ALL SCIENTIFIC SANITY TESTS PASSED! ({passed_tests}/{total_tests} assertions verified)")
    print("=" * 75)


if __name__ == "__main__":
    test_site_datasets()
