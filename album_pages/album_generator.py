#!/usr/bin/env python3
"""Build photo galleries, WebP thumbnails, and new photos-page cards.

The ``folder`` column in descriptions.xlsx is the album's identifier. For an
album named ``my_trip``, this script expects:

* album_pages/my_trip/ containing the full-resolution photos
* cover_pics/my_trip.jpg (or .jpeg/.png) as its landing-page cover

Run without arguments to build every configured album, or pass ``--album`` to
build one. Existing full-resolution images are never modified.
"""

from __future__ import annotations

import argparse
from html import escape
from pathlib import Path
import re
import sys
from typing import Optional

import pandas as pd
from PIL import Image, ImageOps


ALBUM_ROOT = Path(__file__).resolve().parent
ROOT = ALBUM_ROOT.parent
WORKBOOK = ALBUM_ROOT / "descriptions.xlsx"
PHOTOS_PAGE = ROOT / "photos.html"
COVERS = ROOT / "cover_pics"
PHOTO_EXTENSIONS = {".jpg", ".jpeg", ".png"}
LANCZOS = getattr(Image, "Resampling", Image).LANCZOS
START_MARKER = "<!-- AUTO-GENERATED ALBUMS: START -->"
END_MARKER = "<!-- AUTO-GENERATED ALBUMS: END -->"
REQUIRED_COLUMNS = {
    "folder",
    "background",
    "rturn",
    "title",
    "title_color",
    "desc_color",
    "description",
}


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


def load_metadata() -> list[dict[str, str]]:
    table = pd.read_excel(WORKBOOK).fillna("")
    missing = REQUIRED_COLUMNS.difference(table.columns)
    if missing:
        raise ValueError(f"descriptions.xlsx is missing columns: {', '.join(sorted(missing))}")
    records = [{key: str(value).strip() for key, value in row.items()} for row in table.to_dict("records")]
    folders = [row["folder"] for row in records]
    if any(not folder for folder in folders):
        raise ValueError("Every descriptions.xlsx row needs a folder value.")
    duplicates = sorted({folder for folder in folders if folders.count(folder) > 1})
    if duplicates:
        raise ValueError(f"Duplicate folder values: {', '.join(duplicates)}")
    return records


def find_cover(folder: str) -> Optional[Path]:
    matches = [
        path
        for path in COVERS.iterdir()
        if path.is_file()
        and path.suffix.lower() in PHOTO_EXTENSIONS
        and path.stem.casefold() == folder.casefold()
    ]
    return matches[0] if len(matches) == 1 else None


def album_photos(folder: Path) -> list[Path]:
    photos = [path for path in folder.iterdir() if path.is_file() and path.suffix.lower() in PHOTO_EXTENSIONS]
    existing_page = folder / f"{folder.name}.html"
    if not existing_page.exists():
        return sorted(photos, key=lambda path: path.name.casefold())

    existing_order = re.findall(r"<a\s+href=['\"]([^'\"]+\.(?:jpe?g|png))['\"]", existing_page.read_text(), re.I)
    by_name = {path.name: path for path in photos}
    ordered = [by_name[name] for name in existing_order if name in by_name]
    used = {path.name for path in ordered}
    ordered.extend(sorted((path for path in photos if path.name not in used), key=lambda path: path.name.casefold()))
    return ordered


def build_album(row: dict[str, str]) -> None:
    folder = ALBUM_ROOT / row["folder"]
    if not folder.is_dir():
        raise FileNotFoundError(f"Missing photo folder: {folder}")
    photos = album_photos(folder)
    if not photos:
        raise ValueError(f"No JPG, JPEG, or PNG photos found in {folder}")

    items = []
    for photo in photos:
        thumbnail = folder / "_thumbs" / f"{photo.stem}.webp"
        make_webp(photo, thumbnail, (960, 960), 78)
        items.append(
            f'        <a href="{escape(photo.name, quote=True)}">\n'
            f'            <img src="_thumbs/{escape(thumbnail.name, quote=True)}" '
            f'loading="lazy" decoding="async" alt="">\n'
            "        </a>"
        )

    title = escape(row["title"])
    description = escape(row["description"])
    page = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{title}</title>
    <link rel="stylesheet" href="../../styles.css">
    <link rel="stylesheet" href="../../justifiedGallery.min.css">
    <link rel="stylesheet" href="header.css">
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>
    <script src="../../jquery.justifiedGallery.min.js"></script>
</head>
<body>
    <div class="album-return">
        <a href="../../photos.html" class="return">q u i n o t o p i a</a>
    </div>
    <header>
        <h1>{title}</h1>
        <p>{description}</p>
    </header>
    <main id="mygallery" class="justified-gallery">
{chr(10).join(items)}
    </main>
    <script src="../../main.js"></script>
</body>
</html>
"""
    (folder / f"{folder.name}.html").write_text(page)

    css = f"""header {{
    padding: 60px 100px 100px;
    font-size: 20px;
    color: {row['title_color']};
    background-color: {row['background']};
    text-align: center;
}}

.album-return {{
    padding: 15px;
    background: {row['background']};
}}

a.return {{ color: {row['rturn']}; text-decoration: none; }}
a.return:hover {{ text-decoration: underline; }}
h1 {{ text-align: center; }}
header p {{ font-size: 20px; color: {row['desc_color']}; text-align: center; }}
"""
    (folder / "header.css").write_text(css)
    print(f"Built {folder.name}: {len(photos)} photos")


def sync_landing_page(rows: list[dict[str, str]]) -> None:
    html = PHOTOS_PAGE.read_text()
    marker_pattern = re.compile(
        rf"\s*{re.escape(START_MARKER)}.*?{re.escape(END_MARKER)}",
        re.DOTALL,
    )
    manual_html = marker_pattern.sub("", html)
    cards = []

    for row in rows:
        gallery_href = f"album_pages/{row['folder']}/{row['folder']}.html"
        if re.search(rf'href=["\']{re.escape(gallery_href)}["\']', manual_html, re.I):
            continue
        cover = find_cover(row["folder"])
        if cover is None:
            raise FileNotFoundError(
                f"Album {row['folder']!r} is not on photos.html and needs exactly one cover named "
                f"cover_pics/{row['folder']}.jpg, .jpeg, or .png"
            )
        thumbnail = COVERS / "_thumbs" / f"{cover.stem}.webp"
        make_webp(cover, thumbnail, (720, 540), 76)
        cards.append(
            f'            <a href="{gallery_href}" class="album-card">\n'
            f'                <img src="cover_pics/_thumbs/{escape(thumbnail.name, quote=True)}" '
            f'class="cover" loading="lazy" decoding="async" alt="">\n'
            f'                <p class="text">{escape(row["title"])}</p>\n'
            "            </a>"
        )

    managed = f"\n            {START_MARKER}\n"
    if cards:
        managed += "\n".join(cards) + "\n"
    managed += f"            {END_MARKER}"

    anchor = re.search(r'(\s*</div>\s*<script\s+src\s*=\s*["\']main\.js["\']\s*>.*?</script>)', manual_html, re.I | re.S)
    if not anchor:
        raise ValueError("Could not find the photo gallery closing tag in photos.html")
    updated = manual_html[: anchor.start()] + managed + manual_html[anchor.start() :]
    PHOTOS_PAGE.write_text(updated)
    print(f"Updated photos.html: {len(cards)} workbook-managed album card(s)")


def validate(rows: list[dict[str, str]]) -> None:
    html = PHOTOS_PAGE.read_text()
    errors = []
    for row in rows:
        folder = ALBUM_ROOT / row["folder"]
        if not folder.is_dir():
            errors.append(f"missing folder album_pages/{row['folder']}")
        elif not album_photos(folder):
            errors.append(f"no photos in album_pages/{row['folder']}")
        gallery_href = f"album_pages/{row['folder']}/{row['folder']}.html"
        if gallery_href not in html and find_cover(row["folder"]) is None:
            errors.append(f"missing cover cover_pics/{row['folder']}.jpg (or .jpeg/.png)")
    if errors:
        raise ValueError("Validation failed:\n- " + "\n- ".join(errors))
    print(f"Validation passed for {len(rows)} configured albums.")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--album", help="Build only this folder value; landing-page sync still checks all rows.")
    parser.add_argument("--check", action="store_true", help="Validate inputs without changing files.")
    args = parser.parse_args()
    try:
        rows = load_metadata()
        validate(rows)
        if args.check:
            return 0
        selected = rows
        if args.album:
            selected = [row for row in rows if row["folder"].casefold() == args.album.casefold()]
            if not selected:
                raise ValueError(f"No descriptions.xlsx row has folder={args.album!r}")
        for row in selected:
            build_album(row)
        sync_landing_page(rows)
        return 0
    except (FileNotFoundError, ValueError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
