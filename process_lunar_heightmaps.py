"""
CLPS Lunar Mission Browser — Lunar DEM Heightmap Processor
===========================================================
Processes raw NASA/CLPS GeoTIFF Digital Elevation Models (DEMs) into
normalized 8-bit grayscale heightmap PNGs (1024x1024) for 3D terrain rendering.

Workflow:
1. Opens GeoTIFF using rasterio.
2. Reads elevation band into a NumPy float array.
3. Identifies and handles NoData / NaN / Inf values, replacing them with the minimum valid elevation.
4. Normalizes valid elevation values to 0 - 255 (uint8 grayscale).
5. Resamples and resizes to 1024x1024 using Pillow (LANCZOS filter).
6. Exports optimized grayscale PNGs for use in Three.js / WebGL.
"""

import os
import sys
from pathlib import Path
import numpy as np
import rasterio
from PIL import Image

# Target files and output mappings
TARGET_SITES = [
    {
        "input": "Site04_final_adj_5mpp_surf.tif",
        "output": "site04_heightmap.png",
        "alt_output": "shackleton_heightmap.png",
        "description": "Site 04 (Shackleton Crater / Connecting Ridge)",
    },
    {
        "input": "Site07_final_adj_5mpp_surf.tif",
        "output": "site07_heightmap.png",
        "alt_output": "malapert_heightmap.png",
        "description": "Site 07 (Malapert Mountain / Massif)",
    },
    {
        "input": "Site23_final_adj_5mpp_surf.tif",
        "output": "site23_heightmap.png",
        "alt_output": "de_gerlache_heightmap.png",
        "description": "Site 23 (de Gerlache Rim)",
    },
]

TARGET_RESOLUTION = (1024, 1024)


def process_geotiff_to_heightmap(
    input_path: str,
    output_path: str,
    target_size: tuple[int, int] = TARGET_RESOLUTION,
) -> bool:
    """
    Reads a single GeoTIFF, cleans NoData, normalizes to 0-255 uint8,
    resizes to target_size, and saves as a grayscale PNG.
    """
    if not os.path.exists(input_path):
        print(f"[!] File not found: {input_path}")
        return False

    print(f"\n{'=' * 65}")
    print(f"Processing: {os.path.basename(input_path)}")
    print(f"{'=' * 65}")

    # 1. Open GeoTIFF using rasterio
    with rasterio.open(input_path) as src:
        nodata_val = src.nodata
        original_shape = (src.height, src.width)
        print(f"  • Source Resolution : {original_shape[1]} x {original_shape[0]} px")
        print(f"  • Coordinate System : {src.crs}")
        print(f"  • GeoTIFF NoData    : {nodata_val}")

        # 2. Read elevation band 1 into a NumPy float32 array
        elevation = src.read(1).astype(np.float32)

    # 3. Handle NoData and invalid (NaN / Inf) values
    if nodata_val is not None and not np.isnan(nodata_val):
        valid_mask = (elevation != nodata_val) & ~np.isnan(elevation) & ~np.isinf(elevation)
    else:
        valid_mask = ~np.isnan(elevation) & ~np.isinf(elevation)

    valid_count = int(np.count_nonzero(valid_mask))
    total_pixels = elevation.size

    if valid_count == 0:
        print("  [ERROR] No valid elevation pixels found in dataset!")
        return False

    min_elev = float(np.min(elevation[valid_mask]))
    max_elev = float(np.max(elevation[valid_mask]))
    elev_range = max_elev - min_elev

    print(f"  • Valid Pixels      : {valid_count:,} / {total_pixels:,} ({(valid_count / total_pixels) * 100:.1f}%)")
    print(f"  • Min Elevation     : {min_elev:+.2f} m")
    print(f"  • Max Elevation     : {max_elev:+.2f} m")
    print(f"  • Elevation Range   : {elev_range:.2f} m")

    # Replace NoData/invalid pixels with the minimum valid elevation
    elevation[~valid_mask] = min_elev

    # 4. Normalize values: lowest point = 0, highest point = 255
    if elev_range > 0:
        normalized = ((elevation - min_elev) / elev_range) * 255.0
        normalized = np.clip(normalized, 0, 255).astype(np.uint8)
    else:
        normalized = np.zeros(elevation.shape, dtype=np.uint8)

    # 5. Convert NumPy array to Pillow grayscale ('L') image & resize
    img = Image.fromarray(normalized, mode="L")

    # Use high-quality resampling (LANCZOS)
    resample_method = getattr(Image, "Resampling", Image).LANCZOS
    img_resized = img.resize(target_size, resample=resample_method)
    print(f"  • Resized to        : {target_size[0]} x {target_size[1]} px (LANCZOS)")

    # 6. Save the result as a grayscale PNG
    img_resized.save(output_path, format="PNG", optimize=True)
    file_size_kb = os.path.getsize(output_path) / 1024
    print(f"  ✓ Saved Heightmap   : {output_path} ({file_size_kb:.1f} KB)")

    return True


def main():
    base_dir = Path(__file__).resolve().parent

    print("=" * 65)
    print("CLPS Lunar GeoTIFF to Heightmap Processor")
    print("=" * 65)

    processed_count = 0

    for site in TARGET_SITES:
        input_file = base_dir / site["input"]
        output_file = base_dir / site["output"]

        if not input_file.exists():
            print(f"[!] Warning: Input file '{site['input']}' not found in {base_dir}")
            continue

        success = process_geotiff_to_heightmap(
            input_path=str(input_file),
            output_path=str(output_file),
            target_size=TARGET_RESOLUTION,
        )

        if success:
            processed_count += 1
            # Also create the descriptive named copy if requested (e.g. shackleton_heightmap.png)
            alt_output_file = base_dir / site["alt_output"]
            try:
                # Save a copy with the named crater alias
                img = Image.open(str(output_file))
                img.save(str(alt_output_file), format="PNG", optimize=True)
                print(f"  ✓ Saved Alias       : {alt_output_file.name}")
            except Exception as e:
                print(f"  [!] Note: Could not create alias: {e}")

    print(f"\n{'=' * 65}")
    print(f"Processing Complete: {processed_count} / {len(TARGET_SITES)} files processed successfully.")
    print(f"{'=' * 65}\n")


if __name__ == "__main__":
    main()
