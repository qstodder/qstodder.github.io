from dateutil import parser
import csv
from datetime import datetime

TEMPLATE_HEADER = """<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Book List</title>
  <style>
    body {
      font-family: monospace;
      background-color: #f8f8f2;
      color: #444;
      margin: 0;
      padding: 2rem;
    }
    header {
      position: relative;
      padding-bottom: 1rem;
    }
    #home-icon {
      position: absolute;
      top: 0;
      right: 0;
      width: 7em;
      height: auto;
    }
    #home-icon img {
      width: 100%;
      height: 100%;
      cursor: pointer;
      transition: transform 0.2s ease;
    }
    #home-icon img:hover {
      transform: scale(1.1);
    }
    h1 {
      font-size: 2rem;
      color: #2d6a4f;
      margin-bottom: 0.5rem;
    }
    h2 {
      font-size: 1.2rem;
      color: #4d4d4d;
      margin-bottom: 2rem;
      font-weight: normal;
    }
    h3 {
      font-size: 1.2rem;
      color: #1b4332;
      margin-bottom: 1rem;
    }
    .book-entry {
      border-left: 4px solid #95d5b2;
      padding-left: 1rem;
      margin-bottom: 2rem;
    }
    .book-title {
      font-size: 1.5rem;
      font-weight: bold;
      color: #1b4332;
    }
    .book-meta {
      font-size: 0.95rem;
      color: #555;
      margin-bottom: 0.5rem;
    }
    .book-description {
      font-size: 1rem;
      color: #333;
    }
    .year-divider {
      text-align: center;
      margin: 3rem 0 2rem;
      position: relative;
    }
    .year-divider:before,
    .year-divider:after {
      content: "";
      display: inline-block;
      width: 40%;
      height: 1px;
      background: #ccc;
      vertical-align: middle;
      margin: 0 1rem;
    }
    .favorites-section {
      margin-bottom: 4rem;
    }
  </style>
</head>
<body>
  <header>
    <a href="index.html" id="home-icon">
      <img src="home_icon_about.svg" alt="Home">
    </a>
    <h1>Book List</h1>
    <h2>essentially my goodreads page</h2>
  </header>
  <main>
    <section class="favorites-section">
      <h3>Favorites</h3>
      <div class="book-entry">
        <div class="book-title">Project Hail Mary</div>
        <div class="book-meta">by Andy Weir • Sci-Fi • Finished: Feb 2023</div>
        <div class="book-description">So good it ruined Sci-Fi for me. I'm still recovering.</div>
      </div>
      <div class="book-entry">
        <div class="book-title">Ministry for the Future</div>
        <div class="book-meta">by Kim Stanley Robinson • Sci-Fi • Finished: Apr 2023</div>
        <div class="book-description">An exploration into many feasible solutions to global warning while following stories from around the world. Reads like fiction, hits like a textbook.</div>
      </div>
      <div class="book-entry">
        <div class="book-title">Ready Player One</div>
        <div class="book-meta">by Ernest Cline • Sci-Fi • Finished: circa 2015</div>
        <div class="book-description">The ultimate gamer easter egg hunt along with some comentary on the impacts of life in VR and over-industrialization.</div>
      </div>
    </section>
    <h3>All Books</h3>
"""

TEMPLATE_FOOTER = """  </main>
</body>
</html>
"""

def format_date(date_str):
    try:
        dt = parser.parse(date_str)
        return dt.strftime("%b %Y"), dt.year
    except (ValueError, TypeError):
        return date_str, None

def create_book_entry(row):
    formatted_date, year = format_date(row['Date_Read'])
    html = f"""
    <div class="book-entry">
      <div class="book-title">{row['Title']}</div>
      <div class="book-meta">by {row['Author']} &bull; {row['Genre']} &bull; Finished: {formatted_date}</div>
      <div class="book-description">{row['Description']}</div>
    </div>
    """
    return year, html

def generate_html(csv_filename, output_filename):
    with open(csv_filename, newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        rows = list(reader)[::-1]  # most recent first

    entries = []
    last_year = None
    for row in rows:
        year, html = create_book_entry(row)
        if last_year == None:
            last_year = year
        elif year and year != last_year:
            entries.append(f'<div class="year-divider">{year}</div>')
            last_year = year
        entries.append(html)

    with open(output_filename, 'w', encoding='utf-8') as htmlfile:
        htmlfile.write(TEMPLATE_HEADER)
        for entry in entries:
            htmlfile.write(entry)
        htmlfile.write(TEMPLATE_FOOTER)

generate_html("book_list.csv", "book-list.html")
