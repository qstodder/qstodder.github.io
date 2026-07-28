"""
Wedding Website Photo Optimizer

Reads high-resolution photos from:
    assets/photos/original/

Creates optimized WebP files in:
    assets/photos/carousel/

Usage:
    python tools/optimize_photos.py
"""

from pathlib import Path
from PIL import Image


# ------------------------------------------------------------
# Configuration
# ------------------------------------------------------------

SOURCE_DIR = Path("assets/photos/original")
OUTPUT_DIR = Path("assets/photos/carousel")

# Target width for website display.
# Designed for retina displays (~2x display size)
TARGET_WIDTH = 600

# WebP quality:
# 80-85 is usually visually indistinguishable
WEBP_QUALITY = 85


# ------------------------------------------------------------
# Helper functions
# ------------------------------------------------------------

def resize_image(image: Image.Image, target_width: int) -> Image.Image:
    """
    Resize image while preserving aspect ratio.
    """

    if image.width <= target_width:
        return image

    ratio = target_width / image.width

    new_height = int(image.height * ratio)

    return image.resize(
        (target_width, new_height),
        Image.LANCZOS
    )


def process_photo(source_path: Path, output_path: Path):
    """
    Convert one image to optimized WebP.
    """

    print(f"Processing {source_path.name}")

    with Image.open(source_path) as img:

        # Convert unusual formats (ex: PNG transparency)
        img = img.convert("RGB")

        img = resize_image(
            img,
            TARGET_WIDTH
        )

        img.save(
            output_path,
            "WEBP",
            quality=WEBP_QUALITY,
            method=6
        )

        print(
            f"  → {output_path.name} "
            f"({img.width}x{img.height})"
        )


# ------------------------------------------------------------
# Main
# ------------------------------------------------------------

def main():

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    supported_formats = {
        ".jpg",
        ".jpeg",
        ".png"
    }

    photos = [
        p for p in SOURCE_DIR.iterdir()
        if p.suffix.lower() in supported_formats
    ]

    if not photos:
        print(
            "No photos found in "
            f"{SOURCE_DIR}"
        )
        return


    for photo in sorted(photos):

        output_file = (
            OUTPUT_DIR /
            f"{photo.stem}.webp"
        )

        process_photo(
            photo,
            output_file
        )


    print("\nDone! 🎉")


if __name__ == "__main__":
    main()