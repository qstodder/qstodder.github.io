--------------------------------------------------
-- Track final RSVP submission independently from
-- the retired acknowledgement step.
--------------------------------------------------

ALTER TABLE households
ADD COLUMN rsvp_submitted_at TEXT;

UPDATE households
SET rsvp_submitted_at = (
    SELECT updated_at
    FROM household_acknowledgements
    WHERE household_acknowledgements.household_id = households.id
)
WHERE EXISTS (
    SELECT 1
    FROM household_acknowledgements
    WHERE household_acknowledgements.household_id = households.id
);
