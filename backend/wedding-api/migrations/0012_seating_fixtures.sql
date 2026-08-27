CREATE TABLE seating_fixtures (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    position_x REAL NOT NULL CHECK (position_x BETWEEN 0 AND 100),
    position_y REAL NOT NULL CHECK (position_y BETWEEN 0 AND 100),
    width REAL NOT NULL CHECK (width BETWEEN 3 AND 30),
    height REAL NOT NULL CHECK (height BETWEEN 2 AND 15),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO seating_fixtures (id, label, position_x, position_y, width, height)
VALUES
    ('sweetheart', 'Sweetheart Table', 50, 14.25, 14, 4.5),
    ('dj', 'DJ', 50, 20, 14, 4.5);
