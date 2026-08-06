ALTER TABLE households
ADD COLUMN address_needed INTEGER NOT NULL DEFAULT 1
CHECK (address_needed IN (0, 1));
