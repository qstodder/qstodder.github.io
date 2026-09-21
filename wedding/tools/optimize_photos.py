#!/usr/bin/env python3
"""Prepare a directory of photos for the wedding website carousel.

Each source image is orientation-corrected, center-cropped to a 2:3 portrait
aspect ratio, resized to 600 x 900 pixels, and saved as an optimized WebP file
inside an ``output`` directory next to the source images.

Usage:
    python3 wedding/tools/optimize_photos.py /path/to/photos

Example:
    python3 wedding/tools/optimize_photos.py wedding/assets/photos/original
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image, ImageOps, UnidentifiedImageError, features


TARGET_SIZE = (600, 900)
WEBP_QUALITY = 85
SUPPORTED_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".tif",
    ".tiff",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Center-crop photos to 2:3, resize them to 600x900, and "
            "save optimized WebP copies in SOURCE_DIRECTORY/output/."
        )
    )
    parser.add_argument(
        "source_directory",
        type=Path,
        help="Directory containing the source photos.",
    )
    return parser.parse_args()


def prepare_image(source_path: Path, output_path: Path) -> None:
    """Create one 600 x 900 carousel image."""

    with Image.open(source_path) as opened_image:
        oriented_image = ImageOps.exif_transpose(opened_image)
        rgb_image = oriented_image.convert("RGB")
        carousel_image = ImageOps.fit(
            rgb_image,
            TARGET_SIZE,
            method=Image.LANCZOS,
            centering=(0.5, 0.5),
        )
        carousel_image.save(
            output_path,
            format="WEBP",
            quality=WEBP_QUALITY,
            method=6,
        )


def main() -> int:
    args = parse_args()
    source_directory = args.source_directory.expanduser().resolve()

    if not source_directory.is_dir():
        print(f"Error: directory not found: {source_directory}", file=sys.stderr)
        return 1

    if not features.check("webp"):
        print(
            "Error: this Pillow installation does not support WebP.",
            file=sys.stderr,
        )
        return 1

    output_directory = source_directory / "output"
    output_directory.mkdir(exist_ok=True)

    source_images = sorted(
        path
        for path in source_directory.iterdir()
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS
    )

    if not source_images:
        print(f"No supported images found in {source_directory}")
        return 0

    duplicate_stems = {
        image.stem.lower()
        for image in source_images
        if sum(
            candidate.stem.lower() == image.stem.lower()
            for candidate in source_images
        ) > 1
    }
    if duplicate_stems:
        names = ", ".join(sorted(duplicate_stems))
        print(
            "Error: multiple source files would produce the same WebP name: "
            f"{names}",
            file=sys.stderr,
        )
        return 1

    processed = 0
    failed = 0

    for source_path in source_images:
        output_path = output_directory / f"{source_path.stem}.webp"
        try:
            prepare_image(source_path, output_path)
            original_size = source_path.stat().st_size
            output_size = output_path.stat().st_size
            savings = 100 * (1 - output_size / original_size)
            print(
                f"✓ {source_path.name} → output/{output_path.name} "
                f"({TARGET_SIZE[0]}x{TARGET_SIZE[1]}, {output_size / 1024:.0f} KB, "
                f"{savings:.0f}% smaller)"
            )
            processed += 1
        except (OSError, UnidentifiedImageError) as error:
            print(f"✗ {source_path.name}: {error}", file=sys.stderr)
            failed += 1

    print(
        f"\nFinished: {processed} processed, {failed} failed. "
        f"Output: {output_directory}"
    )
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
