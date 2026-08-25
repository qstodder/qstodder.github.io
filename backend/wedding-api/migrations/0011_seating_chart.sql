CREATE TABLE seating_layout (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    version INTEGER NOT NULL DEFAULT 0,
    save_token TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO seating_layout (id, version) VALUES (1, 0);

CREATE TABLE seating_tables (
    id TEXT PRIMARY KEY,
    table_number INTEGER NOT NULL UNIQUE CHECK (table_number > 0),
    position_x REAL NOT NULL CHECK (position_x BETWEEN 0 AND 100),
    position_y REAL NOT NULL CHECK (position_y BETWEEN 0 AND 100),
    seat_count INTEGER NOT NULL DEFAULT 10 CHECK (seat_count BETWEEN 1 AND 10),
    rotation REAL NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE seating_assignments (
    guest_id INTEGER PRIMARY KEY,
    table_id TEXT NOT NULL,
    seat_number INTEGER NOT NULL CHECK (seat_number BETWEEN 1 AND 10),
    is_locked INTEGER NOT NULL DEFAULT 0 CHECK (is_locked IN (0, 1)),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (table_id, seat_number),
    FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE,
    FOREIGN KEY (table_id) REFERENCES seating_tables(id) ON DELETE CASCADE
);

INSERT INTO seating_tables (id, table_number, position_x, position_y)
VALUES
    ('table-1', 1, 20, 30),
    ('table-2', 2, 40, 27),
    ('table-3', 3, 60, 27),
    ('table-4', 4, 80, 30),
    ('table-5', 5, 88, 48),
    ('table-6', 6, 87, 68),
    ('table-7', 7, 82, 84),
    ('table-8', 8, 66, 86),
    ('table-9', 9, 34, 86),
    ('table-10', 10, 18, 84),
    ('table-11', 11, 13, 68),
    ('table-12', 12, 12, 48);
