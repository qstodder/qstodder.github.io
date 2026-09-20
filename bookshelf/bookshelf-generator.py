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
OUTPUT_DESKTOP = BASE / "book-list.html"
OUTPUT_MOBILE = BASE / "book-list-mobile.html"

IMG = "./img"
BOOKS = "./img/books"

# Rotating fallback covers (.png as requested)
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
    sy = 1

    return sx, sy


def render_book(book, shelf_index, year, idx):
    title = escape(book.get("Title") or "Untitled")
    cover = (book.get("Cover_File") or "").strip()
    genre = escape((book.get("Genre") or "Not listed").strip(), quote=True)
    author = escape((book.get("Author") or "Not listed").strip(), quote=True)
    page_count = escape((book.get("Page_Count") or "Not listed").strip(), quote=True)
    year_published = escape((book.get("Year_Published") or "Not listed").strip(), quote=True)
    date_read = escape((book.get("Date_Read") or "Not listed").strip(), quote=True)

    seed_num = year * 1000 + idx
    sx, sy = book_style(seed_num)

    style = f'--sx:{sx}; --sy:{sy};'

    # real cover
    if cover:
        src = f"{BOOKS}/{cover}"
        fallback = DEFAULTS[shelf_index % len(DEFAULTS)]

        return f'''
<div class="book has-cover" style="{style}" tabindex="0" role="button"
     aria-label="View details for {title}"
     data-title="{title}" data-cover="{src}" data-fallback="{fallback}"
     data-genre="{genre}" data-author="{author}" data-pages="{page_count}"
     data-year="{year_published}" data-read="{date_read}">
    <img src="{src}" alt="{title}"
         onerror="this.onerror=null;this.src='{fallback}'">
</div>
'''

    # default cover with title overlay
    src = DEFAULTS[shelf_index % len(DEFAULTS)]

    return f'''
<div class="book no-cover" style="{style}" tabindex="0" role="button"
     aria-label="View details for {title}"
     data-title="{title}" data-cover="{src}" data-fallback="{src}"
     data-genre="{genre}" data-author="{author}" data-pages="{page_count}"
     data-year="{year_published}" data-read="{date_read}">
    <img src="{src}" alt="{title}">
    <div class="title-on-book">{title}</div>
</div>
'''


# =====================================================
# Build Body
# =====================================================

def build_body(books, books_per_shelf):
    html = []

    # =========================
    # FAVORITES SHELF (NEW)
    # =========================
    favorites = load_favorites()

    if favorites:
        html.append("""
<div class="year-wrap">
    <div class="year-sign favorites-sign">
        <img src="./img/year-sign.svg" alt="Favorites">
        <span>Faves</span>
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
        random.seed(year-2020)
        rot = random.randint(1, 6)
        # yoff = random.randint(-2, 3)
        yoff = 0
        s = 1 - 2*(year % 2)
        rot = rot*s

        print(year, rot)

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

        plan = distribute(len(books_for_year), books_per_shelf)
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

def build_page(body, book_shift):
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<script>
(function () {{
    const DESKTOP_PAGE = "book-list.html";
    const MOBILE_PAGE  = "book-list-mobile.html";
    const BREAKPOINT   = 768;

    function isPortrait() {{
        return window.matchMedia("(orientation: portrait)").matches;
    }}

    function onMobileLayout() {{
        return window.innerWidth <= BREAKPOINT && isPortrait();
    }}

    function isMobilePage()  {{
        return window.location.pathname.includes("book-list-mobile");
    }}

    function routePage()  {{
        const shouldUseMobile = onMobileLayout();
        const currentlyMobile = isMobilePage();

        if (shouldUseMobile && !currentlyMobile)  {{
            window.location.replace(MOBILE_PAGE);
            return;
        }}

        if (!shouldUseMobile && currentlyMobile)  {{
            window.location.replace(DESKTOP_PAGE);
            return;
        }}
    }}

    routePage();

    let resizeTimer;
    window.addEventListener("resize", function ()  {{
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(routePage, 150);
    }});

    window.addEventListener("orientationchange", routePage);
}})();
</script>

<title>Bookshelf</title>

<style>
body {{
    margin:0;
    background:#8aa9b3ff;
    color:#e6e3de;
    font-family:Georgia, serif;
}}

header {{
    padding:16px;
    text-align:center;
    background:rgba(0,0,0,.35);
    backdrop-filter:blur(8px);
    border-bottom:1px solid rgba(255,255,255,.08);
}}

#home-icon {{
    position: absolute;
    top: 0;
    right: 1em;
    width: 3em;
    height: 3em;
}}

#home-icon img {{
    width: 100%;
    height: 100%;
    cursor: pointer;
    transition: transform 0.2s ease;
}}

#home-icon img:hover {{
    transform: scale(1.1);
}}

header h1 {{
    margin:1rem;
    font-size:2rem;
}}

.wrap {{
    max-width:1200px;
    margin:auto;
    padding-bottom:80px;
}}

/* =========================
   Year Sign
========================= */

.year-wrap {{
    height:135px;
    background:#8aa9b3ff;
    display:flex;
    align-items:center;
    justify-content:center;
    padding-bottom: 15px;
}}

.year-sign {{
    position:relative;
    transform:
        translateY(var(--y))
        rotate(var(--rot));
    filter:drop-shadow(0 8px 10px rgba(0,0,0,.35));
}}

.year-sign img {{
    height: 95px;   /* or whatever your baseline is */
    width: auto;     /* important: prevents distortion */
    display: block;
}}

.year-sign span {{
    position:absolute;
    inset:0;
    display:flex;
    align-items:center;
    justify-content:center;
    transform: translateY(15px);
    font-size:2rem;
    font-weight:bold;
    color:#48392cff;
    letter-spacing:.08em;
    text-shadow:0 2px 4px rgba(0,0,0,.55);
}}

.year-sign.favorites-sign img {{
    width: 300px; /* pick whatever feels right */
}}

/* =========================
   Shelf
========================= */

.shelf {{
    height:260px;
    background:center/cover no-repeat url('{IMG}/bookshelf.svg');
    display:flex;
    align-items:flex-end;
    justify-content:center;
    gap:18px;
    padding:0 20px 34px;
}}

.book {{
    position:relative;
    width:130px;
    bottom:{book_shift}px;
    text-align:center;
    cursor:pointer;
    outline:none;
}}

.book:focus-visible {{
    outline:3px solid #f8f5e6;
    outline-offset:5px;
    border-radius:3px;
}}

.book::before {{
    content:'';
    position:absolute;
    left:10px;
    right:10px;
    top:8px;
    bottom:20px;
    background:rgba(0,0,0,.35);
    filter:blur(8px);
    transform:translate(8px,10px);
    border-radius:6px;
}}

.book img {{
    position:relative;
    width:relative;
    height:180px;
    object-fit:cover;
    border:1px solid rgba(0,0,0,.35);
    box-shadow:0 0px 20px 5px rgba(0,0,0,.45);
    transition:.25s;
    transform:
        scaleX(var(--sx))
        scaleY(var(--sy));
}}

.book:hover img {{
    transform:
        translateY(-8px)
        scaleX(var(--sx))
        scaleY(var(--sy))
        scale(1.03);
}}

.title-on-book {{
    position:absolute;
    top:12px;
    left:10px;
    right:10px;
    z-index:2;
    color:#f8f5e6;
    font-size:.72rem;
    line-height:1.15;
    font-weight:bold;
    text-align:center;
    text-shadow:0 1px 2px rgba(0,0,0,.65);
}}

/* =========================
   Book Details
========================= */

.book-dialog {{
    width:min(620px, calc(100vw - 40px));
    padding:0;
    border:1px solid rgba(255,255,255,.2);
    border-radius:14px;
    color:#30271f;
    background:#f4efe5;
    box-shadow:0 24px 70px rgba(0,0,0,.55);
}}

.book-dialog::backdrop {{
    background:rgba(24,30,31,.78);
    backdrop-filter:blur(5px);
}}

.dialog-close {{
    position:absolute;
    top:10px;
    right:12px;
    z-index:2;
    width:38px;
    height:38px;
    border:0;
    border-radius:50%;
    background:rgba(48,39,31,.1);
    color:#30271f;
    font:28px/1 Georgia, serif;
    cursor:pointer;
}}

.dialog-close:hover,
.dialog-close:focus-visible {{
    background:rgba(48,39,31,.2);
    outline:2px solid #745f4c;
}}

.dialog-content {{
    display:grid;
    grid-template-columns:190px 1fr;
    gap:28px;
    padding:38px;
}}

.dialog-cover {{
    width:190px;
    height:285px;
    object-fit:cover;
    border-radius:4px;
    box-shadow:0 10px 25px rgba(0,0,0,.3);
}}

.dialog-details {{
    align-self:center;
}}

.dialog-details h2 {{
    margin:0 28px 24px 0;
    color:#48392c;
    font-size:1.65rem;
    line-height:1.15;
}}

.book-meta {{
    display:grid;
    grid-template-columns:max-content 1fr;
    gap:10px 16px;
    margin:0;
}}

.book-meta dt {{
    color:#745f4c;
    font-weight:bold;
}}

.book-meta dd {{
    margin:0;
}}

/* =========================
   Responsive
========================= */

@media (max-width:900px) {{
    .shelf {{
        gap:12px;
        height:240px;
    }}

    .book {{
        width:90px;
    }}

    .book img {{
        width:82px;
        height:128px;
    }}
}}

@media (max-width:640px) {{

    .dialog-content {{
        grid-template-columns:1fr;
        justify-items:center;
        gap:22px;
        padding:32px 24px;
    }}

    .dialog-cover {{
        width:150px;
        height:225px;
    }}

    .dialog-details {{
        width:100%;
    }}

    .dialog-details h2 {{
        text-align:center;
    }}

    .year-sign img {{
        width:190px;
    }}

    .year-sign span {{
        font-size:1.85rem;
    }}

    .shelf {{
        gap:8px;
        height:125px;
        flex-wrap:wrap;
        align-content:flex-end;
    }}

    .book {{
        width:74px;
        bottom:30px;
    }}

    .book img {{
        width:66px;
        height:104px;
    }}

    .title-on-book {{
        font-size:.62rem;
        left:6px;
        right:6px;
        top:8px;
    }}
}}
</style>
</head>

<body>

<header>
    <a href="../index.html" id="home-icon">
      <img src="../home_icon_steal-blue.svg" alt="Home">
    </a>
    <h1>My Book List</h1>
    <div>some old, some new — some fiction, some true</div>
</header>

<div class="wrap">
{body}
</div>

<dialog class="book-dialog" id="book-dialog" aria-labelledby="dialog-title">
    <button class="dialog-close" type="button" aria-label="Close book details">&times;</button>
    <div class="dialog-content">
        <img class="dialog-cover" id="dialog-cover" src="" alt="">
        <div class="dialog-details">
            <h2 id="dialog-title"></h2>
            <dl class="book-meta">
                <dt>Genre</dt><dd id="dialog-genre"></dd>
                <dt>Author</dt><dd id="dialog-author"></dd>
                <dt>Page count</dt><dd id="dialog-pages"></dd>
                <dt>Published</dt><dd id="dialog-year"></dd>
                <dt>Date read</dt><dd id="dialog-read"></dd>
            </dl>
        </div>
    </div>
</dialog>

<script>
(function () {{
    const dialog = document.getElementById("book-dialog");
    const cover = document.getElementById("dialog-cover");
    const fields = {{
        title: document.getElementById("dialog-title"),
        genre: document.getElementById("dialog-genre"),
        author: document.getElementById("dialog-author"),
        pages: document.getElementById("dialog-pages"),
        year: document.getElementById("dialog-year"),
        read: document.getElementById("dialog-read")
    }};

    function openBook(book) {{
        Object.keys(fields).forEach(function (key) {{
            fields[key].textContent = book.dataset[key];
        }});
        cover.src = book.dataset.cover;
        cover.alt = "Cover of " + book.dataset.title;
        cover.onerror = function () {{
            cover.onerror = null;
            cover.src = book.dataset.fallback;
        }};
        dialog.showModal();
    }}

    document.querySelectorAll(".book").forEach(function (book) {{
        book.addEventListener("click", function () {{ openBook(book); }});
        book.addEventListener("keydown", function (event) {{
            if (event.key === "Enter" || event.key === " ") {{
                event.preventDefault();
                openBook(book);
            }}
        }});
    }});

    dialog.querySelector(".dialog-close").addEventListener("click", function () {{
        dialog.close();
    }});

    dialog.addEventListener("click", function (event) {{
        if (event.target === dialog) dialog.close();
    }});
}})();
</script>

</body>
</html>
'''


# =====================================================
# Main
# =====================================================

def main():
    # desktop display
    books_per_shelf = 7
    book_shift = 71
    books = load_books()
    body = build_body(books, books_per_shelf)
    page = build_page(body, book_shift)
    OUTPUT_DESKTOP.write_text(page, encoding="utf-8")
    print(f"Generated {OUTPUT_DESKTOP}")

    # mobile display
    books_per_shelf = 3
    book_shift = 30
    books = load_books()
    body = build_body(books, books_per_shelf)
    page = build_page(body, book_shift)

    OUTPUT_MOBILE.write_text(page, encoding="utf-8")
    print(f"Generated {OUTPUT_MOBILE}")


if __name__ == "__main__":
    main()
