ALTER TABLE households
ADD COLUMN household_key TEXT;

CREATE UNIQUE INDEX households_household_key_unique
ON households(household_key);
