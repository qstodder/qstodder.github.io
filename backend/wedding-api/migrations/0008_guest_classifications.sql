ALTER TABLE guests
ADD COLUMN couple_side TEXT
CHECK (couple_side IN ('scott', 'quiana'));

ALTER TABLE guests
ADD COLUMN relationship_type TEXT
CHECK (relationship_type IN ('friend', 'family'));

ALTER TABLE guests
ADD COLUMN family_side TEXT
CHECK (family_side IN ('moms-side', 'dads-side'));

CREATE INDEX guests_couple_side_index
ON guests(couple_side);

CREATE INDEX guests_relationship_type_index
ON guests(relationship_type);

CREATE INDEX guests_family_side_index
ON guests(family_side);
