----------------------------------------------------
-- Households
----------------------------------------------------

CREATE TABLE households (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    household_name TEXT NOT NULL
);

----------------------------------------------------
-- Guests
----------------------------------------------------

CREATE TABLE guests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    household_id INTEGER NOT NULL,

    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,

    email TEXT,
    mailing_address TEXT,

    is_invited_to_welcome INTEGER NOT NULL DEFAULT 1,
    is_invited_to_wedding INTEGER NOT NULL DEFAULT 1,
    is_invited_to_brunch INTEGER NOT NULL DEFAULT 1,

    FOREIGN KEY (household_id)
        REFERENCES households(id)
);

----------------------------------------------------
-- RSVP Responses
----------------------------------------------------

CREATE TABLE rsvps (

    household_id INTEGER PRIMARY KEY,

    attending_welcome INTEGER,
    attending_wedding INTEGER,
    attending_brunch INTEGER,

    dietary_vegetarian INTEGER DEFAULT 0,
    dietary_vegan INTEGER DEFAULT 0,
    dietary_gluten_free INTEGER DEFAULT 0,

    acknowledge_no_children INTEGER DEFAULT 0,
    acknowledge_no_plus_ones INTEGER DEFAULT 0,

    updated_at TEXT,

    FOREIGN KEY (household_id)
        REFERENCES households(id)
);