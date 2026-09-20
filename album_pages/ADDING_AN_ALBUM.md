# Adding a photo album

The album builder creates the gallery page, gallery thumbnails, cover thumbnail, and landing-page card. Original photos are left unchanged.

## Inputs

Choose one short folder name using letters, numbers, underscores, or hyphens, such as `japan_2026`. Use the same name in these places:

1. Add a row to `descriptions.xlsx`.
   - `folder`: the chosen name, such as `japan_2026`
   - `background`: CSS color for the gallery header, such as `lightblue` or `#dce8ef`
   - `rturn`: color for the return link
   - `title`: album title shown to visitors
   - `title_color`: title color
   - `desc_color`: description color
   - `description`: short gallery introduction
2. Create `album_pages/<folder>/` and put the original JPG, JPEG, or PNG photos inside it.
3. Add one landing-page cover named `cover_pics/<folder>.jpg`, `.jpeg`, or `.png`.

The cover filename must match the workbook's `folder` value. The extension and letter case may differ.

## Build it

From the website's top-level folder, run:

```bash
python3 album_pages/album_generator.py --album japan_2026
```

Replace `japan_2026` with the new album's folder value. To rebuild every album instead, omit `--album`:

```bash
python3 album_pages/album_generator.py
```

The builder will:

- validate the workbook, photo folder, and cover;
- preserve the order of photos already listed in an existing gallery and append newly added photos alphabetically;
- create WebP gallery thumbnails in `album_pages/<folder>/_thumbs/`;
- create a WebP cover thumbnail in `cover_pics/_thumbs/`;
- generate `album_pages/<folder>/<folder>.html` and its `header.css`;
- add albums not already present to the end of the `photos.html` album grid.

## Check before building

This checks the workbook, folders, photos, and required covers without changing anything:

```bash
python3 album_pages/album_generator.py --check
```

## Updating an existing album

Add or replace original photos in its folder, then run the same `--album` command. A thumbnail is regenerated automatically when its source photo is newer. If you replace the cover, use the same cover filename and rerun the command.

## Preview

With the local server running from the website's top-level folder, open:

<http://localhost:8000/photos.html>

Hard-refresh with `Cmd+Shift+R` if the browser still shows an older thumbnail.
