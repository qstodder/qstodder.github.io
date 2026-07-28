DROP TABLE IF EXISTS rsvps;

CREATE TABLE guest_rsvps (

    guest_id INTEGER PRIMARY KEY,

    attending_welcome INTEGER NOT NULL DEFAULT 0,
    attending_wedding INTEGER NOT NULL DEFAULT 0,
    attending_brunch INTEGER NOT NULL DEFAULT 0,

    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (guest_id)
        REFERENCES guests(id)
        ON DELETE CASCADE
);

CREATE TABLE household_acknowledgements (

    household_id INTEGER PRIMARY KEY,

    acknowledge_no_children INTEGER NOT NULL DEFAULT 0,
    acknowledge_no_plus_ones INTEGER NOT NULL DEFAULT 0,

    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (household_id)
        REFERENCES households(id)
        ON DELETE CASCADE
);

CREATE TABLE dietary_restrictions (

    id INTEGER PRIMARY KEY,

    name TEXT NOT NULL UNIQUE,

    display_order INTEGER NOT NULL
);

INSERT INTO dietary_restrictions
(name, display_order)
VALUES
('Vegetarian', 1),
('Vegan', 2),
('Gluten Free', 3),
('Other', 4);

CREATE TABLE guest_dietary_restrictions (

    guest_id INTEGER NOT NULL,

    restriction_id INTEGER NOT NULL,

    notes TEXT,

    PRIMARY KEY (
        guest_id,
        restriction_id
    ),

    FOREIGN KEY (guest_id)
        REFERENCES guests(id)
        ON DELETE CASCADE,

    FOREIGN KEY (restriction_id)
        REFERENCES dietary_restrictions(id)
);