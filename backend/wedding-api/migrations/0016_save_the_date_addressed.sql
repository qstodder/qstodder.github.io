ALTER TABLE households
ADD COLUMN save_the_date_addressed INTEGER NOT NULL DEFAULT 0
CHECK (save_the_date_addressed IN (0, 1));
