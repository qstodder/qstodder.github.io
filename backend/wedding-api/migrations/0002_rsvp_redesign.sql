--------------------------------------------------
-- Add household contact information
--------------------------------------------------

ALTER TABLE households
ADD COLUMN email TEXT;

ALTER TABLE households
ADD COLUMN street TEXT;

ALTER TABLE households
ADD COLUMN city TEXT;

ALTER TABLE households
ADD COLUMN state TEXT;

ALTER TABLE households
ADD COLUMN zip TEXT;

ALTER TABLE households
ADD COLUMN notes TEXT;


--------------------------------------------------
-- Events
--------------------------------------------------

CREATE TABLE events (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    name TEXT NOT NULL,

    display_order INTEGER NOT NULL,

    active INTEGER NOT NULL DEFAULT 1

);


--------------------------------------------------
-- Guest attendance
--------------------------------------------------

CREATE TABLE guest_events (

    guest_id INTEGER NOT NULL,

    event_id INTEGER NOT NULL,

    attending INTEGER,

    dietary_notes TEXT,

    PRIMARY KEY (guest_id, event_id),

    FOREIGN KEY (guest_id)
        REFERENCES guests(id),

    FOREIGN KEY (event_id)
        REFERENCES events(id)

);


--------------------------------------------------
-- Household responses
--------------------------------------------------

CREATE TABLE responses (

    household_id INTEGER PRIMARY KEY,

    acknowledge_children INTEGER NOT NULL DEFAULT 0,

    acknowledge_plus_one INTEGER NOT NULL DEFAULT 0,

    submitted_at TEXT,

    updated_at TEXT,

    FOREIGN KEY (household_id)
        REFERENCES households(id)

);


--------------------------------------------------
-- Default wedding events
--------------------------------------------------

INSERT INTO events
(name, display_order)
VALUES

('Welcome Gathering',1),

('Wedding',2),

('Morning-after Brunch',3);