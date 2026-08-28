ALTER TABLE guests ADD COLUMN is_invited_to_reception INTEGER NOT NULL DEFAULT 1;

ALTER TABLE guest_rsvps ADD COLUMN attending_reception INTEGER NOT NULL DEFAULT 0;

UPDATE guests
SET is_invited_to_reception = is_invited_to_wedding;

UPDATE guest_rsvps
SET attending_reception = attending_wedding;
