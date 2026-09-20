#!/usr/bin/env python3
"""Build lightweight derivatives and wire them into the photo pages.

Original images are never modified. Re-run this script whenever photos are added.
"""

from pathlib import Path
import re

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
PHOTO_EXTENSIONS = {".jpg", ".jpeg", ".png"}
LANCZOS = getattr(Image, "Resampling", Image).LANCZOS


def make_webp(source: Path, destination: Path, max_size: tuple[int, int], quality: int) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists() and destination.stat().st_mtime >= source.stat().st_mtime:
        return

    with Image.open(source) as image:
        image = ImageOps.exif_transpose(image)
        image.thumbnail(max_size, LANCZOS)
        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGBA" if "transparency" in image.info else "RGB")
        image.save(destination, "WEBP", quality=quality, method=6)


def thumb_name(source: Path) -> str:
    return f"{source.stem}.webp"


def build_assets() -> None:
    for source in (ROOT / "cover_pics").iterdir():
        if source.is_file() and source.suffix.lower() in PHOTO_EXTENSIONS:
            make_webp(source, source.parent / "_thumbs" / thumb_name(source), (720, 540), 76)

    for album in (ROOT / "album_pages").iterdir():
        if not album.is_dir():
            continue
        for source in album.iterdir():
            if source.is_file() and source.suffix.lower() in PHOTO_EXTENSIONS:
                make_webp(source, album / "_thumbs" / thumb_name(source), (960, 960), 78)

    make_webp(ROOT / "header_background.jpg", ROOT / "header_background.webp", (1920, 720), 78)
    make_webp(ROOT / "footer_background.jpg", ROOT / "footer_background.webp", (1920, 360), 76)


def add_loading_attributes(tag: str) -> str:
    if " loading=" not in tag:
        tag = tag[:-1] + ' loading="lazy" decoding="async">'
    return tag


def update_landing_page() -> None:
    path = ROOT / "photos.html"
    html = path.read_text()

    def replace_cover(match: re.Match[str]) -> str:
        tag, filename = match.group(1), match.group(2)
        optimized = f"cover_pics/_thumbs/{Path(filename).stem}.webp"
        tag = re.sub(r'src=["\']cover_pics/[^"\']+["\']', f'src="{optimized}"', tag)
        return add_loading_attributes(tag)

    html = re.sub(
        r'(<img\b[^>]*src=["\']cover_pics/([^/"\']+)["\'][^>]*>)',
        replace_cover,
        html,
        flags=re.IGNORECASE,
    )
    path.write_text(html)


def update_album_pages() -> None:
    for path in (ROOT / "album_pages").glob("*/*.html"):
        html = path.read_text()

        def replace_image(match: re.Match[str]) -> str:
            tag, filename = match.group(1), match.group(2)
            if filename.startswith("_thumbs/"):
                return add_loading_attributes(tag)
            optimized = f"_thumbs/{Path(filename).stem}.webp"
            tag = re.sub(r'src=["\'][^/"\']+["\']', f'src="{optimized}"', tag)
            return add_loading_attributes(tag)

        html = re.sub(
            r'(<img\b[^>]*src=["\']([^/"\']+\.(?:jpe?g|png))["\'][^>]*>)',
            replace_image,
            html,
            flags=re.IGNORECASE,
        )
        path.write_text(html)


if __name__ == "__main__":
    build_assets()
    update_landing_page()
    update_album_pages()
    print("Photo derivatives and page references are up to date.")
