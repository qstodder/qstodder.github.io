ALTER TABLE households
ADD COLUMN couple_side TEXT
CHECK (couple_side IN ('scott', 'quiana'));

ALTER TABLE households
ADD COLUMN relationship_type TEXT
CHECK (relationship_type IN ('friend', 'family'));

ALTER TABLE households
ADD COLUMN family_side TEXT
CHECK (family_side IN ('moms-side', 'dads-side'));

-- Preserve values if guest classifications were populated between
-- migrations 0008 and 0009, but only where a household is consistent.
UPDATE households
SET couple_side = (
    SELECT CASE
        WHEN COUNT(DISTINCT couple_side) = 1 THEN MAX(couple_side)
        ELSE NULL
    END
    FROM guests
    WHERE guests.household_id = households.id
        AND couple_side IS NOT NULL
),
relationship_type = (
    SELECT CASE
        WHEN COUNT(DISTINCT relationship_type) = 1 THEN MAX(relationship_type)
        ELSE NULL
    END
    FROM guests
    WHERE guests.household_id = households.id
        AND relationship_type IS NOT NULL
),
family_side = (
    SELECT CASE
        WHEN COUNT(DISTINCT family_side) = 1 THEN MAX(family_side)
        ELSE NULL
    END
    FROM guests
    WHERE guests.household_id = households.id
        AND family_side IS NOT NULL
);

CREATE INDEX households_couple_side_index
ON households(couple_side);

CREATE INDEX households_relationship_type_index
ON households(relationship_type);

CREATE INDEX households_family_side_index
ON households(family_side);

DROP INDEX guests_couple_side_index;
DROP INDEX guests_relationship_type_index;
DROP INDEX guests_family_side_index;

ALTER TABLE guests DROP COLUMN couple_side;
ALTER TABLE guests DROP COLUMN relationship_type;
ALTER TABLE guests DROP COLUMN family_side;
