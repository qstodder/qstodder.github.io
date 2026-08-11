ALTER TABLE households
ADD COLUMN address_line_2 TEXT;

ALTER TABLE households
ADD COLUMN country_code TEXT NOT NULL DEFAULT 'US';

ALTER TABLE households
ADD COLUMN archived_at TEXT;

ALTER TABLE guests
ADD COLUMN archived_at TEXT;

CREATE INDEX households_archived_at_index
ON households(archived_at);

CREATE INDEX guests_archived_at_index
ON guests(archived_at);
