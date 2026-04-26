import csv
import math
import random
from datetime import datetime
from pathlib import Path
from html import escape

# =====================================================
# Paths
# =====================================================
BASE = Path(".") / "bookshelf"
CSV_FILE = BASE / "books.csv"
FAVORITES_FILE = BASE / "favorites.csv"
OUTPUT = BASE / "book-list.html"

IMG = "./img"
BOOKS = "./img/books"

DEFAULTS = [
    "./img/default-blue.png",
    "./img/default-green.png",
    "./img/default-grey.png",
]

# =====================================================
# Helpers
# =====================================================

def parse_date(value: str) -> datetime:
    value = (value or "").strip()
    if not value:
        return datetime(1900, 1, 1)

    for fmt in ("%m/%d/%y", "%m/%d/%Y"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            pass

    return datetime(1900, 1, 1)


def load_books():
    with open(CSV_FILE, newline="", encoding="utf-8-sig") as f:
        sample = f.read(4096)
        f.seek(0)
        dialect = csv.Sniffer().sniff(sample, delimiters="\t,;")
        reader = csv.DictReader(f, dialect=dialect)
        return list(reader)


def load_favorites():
    if not FAVORITES_FILE.exists():
        return []

    with open(FAVORITES_FILE, newline="", encoding="utf-8-sig") as f:
        sample = f.read(4096)
        f.seek(0)
        dialect = csv.Sniffer().sniff(sample, delimiters="\t,;")
        reader = csv.DictReader(f, dialect=dialect)
        return list(reader)


def distribute(total: int, max_per_shelf: int = 7):
    if total <= 0:
        return []

    shelves = math.ceil(total / max_per_shelf)
    base = total // shelves
    extra = total % shelves

    return [base + (1 if i < extra else 0) for i in range(shelves)]


def chunk_by_plan(items, plan):
    rows = []
    idx = 0
    for size in plan:
        rows.append(items[idx:idx + size])
        idx += size
    return rows

# =====================================================
# Book Rendering
# =====================================================

def book_style(seed_num):
    random.seed(seed_num)

    sx = round(random.uniform(0.97, 1.02), 3)
    sy = round(random.uniform(0.97, 1.04), 3)

    return sx, sy


def render_book(book, shelf_index, year, idx):
    title = escape(book.get("Title") or "Untitled")
    cover = (book.get("Cover_File") or "").strip()

    seed_num = year * 1000 + idx
    sx, sy = book_style(seed_num)

    style = f'--sx:{sx}; --sy:{sy};'

    if cover:
        src = f"{BOOKS}/{cover}"
        fallback = DEFAULTS[shelf_index % len(DEFAULTS)]

        return f'''
<div class="book has-cover" style="{style}">
    <img src="{src}" alt="{title}"
         onerror="this.onerror=null;this.src='{fallback}'">
</div>
'''

    src = DEFAULTS[shelf_index % len(DEFAULTS)]

    return f'''
<div class="book no-cover" style="{style}">
    <img src="{src}" alt="{title}">
    <div class="title-on-book">{title}</div>
</div>
'''

# =====================================================
# Build Body
# =====================================================

def build_body(books):
    html = []

    # =========================
    # FAVORITES SHELF (NEW)
    # =========================
    favorites = load_favorites()

    if favorites:
        html.append("""
<div class="year-wrap">
    <div class="year-sign">
        <img src="./img/year-sign.svg" alt="Favorites">
        <span>Favorites</span>
    </div>
</div>
""")

        html.append('<div class="shelf">')

        for idx, book in enumerate(favorites):
            html.append(render_book(book, 0, 9999, idx))

        html.append('</div>')

    # =========================
    # YEAR GROUPS
    # =========================

    grouped = {}

    for book in books:
        dt = parse_date(book.get("Date_Read", ""))
        book["_date"] = dt
        grouped.setdefault(dt.year, []).append(book)

    for year in sorted(grouped.keys(), reverse=True):
        random.seed(year)
        rot = random.randint(-3, 3)
        yoff = random.randint(-2, 3)

        html.append(f'''
<div class="year-wrap">
    <div class="year-sign" style="--rot:{rot}deg; --y:{yoff}px;">
        <img src="{IMG}/year-sign.svg" alt="{year}">
        <span>{year}</span>
    </div>
</div>
''')

        books_for_year = sorted(
            grouped[year],
            key=lambda b: b["_date"],
            reverse=True
        )

        plan = distribute(len(books_for_year), 7)
        rows = chunk_by_plan(books_for_year, plan)

        counter = 0

        for row in rows:
            html.append('<div class="shelf">')

            for shelf_index, book in enumerate(row):
                html.append(render_book(book, shelf_index, year, counter))
                counter += 1

            html.append('</div>')

    return "".join(html)

# =====================================================
# Full Page
# =====================================================

def build_page(body):
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bookshelf</title>

<style>
/* (unchanged styles — omitted for brevity, same as yours) */
</style>
</head>

<body>

<header>
    <h1>My Book List</h1>
    <div>some old, some new — some fiction, some true</div>
</header>

<div class="wrap">
{body}
</div>

</body>
</html>
'''

# =====================================================
# Main
# =====================================================

def main():
    books = load_books()
    body = build_body(books)
    page = build_page(body)

    OUTPUT.write_text(page, encoding="utf-8")
    print(f"Generated {OUTPUT}")


if __name__ == "__main__":
    main()