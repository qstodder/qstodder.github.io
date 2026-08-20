-- Guest email is the source of truth. Preserve any existing guest emails and
-- copy a household's legacy email to its first active guest only when none of
-- that household's active guests has an email yet.
UPDATE guests
SET email = (
    SELECT LOWER(TRIM(h.email))
    FROM households h
    WHERE h.id = guests.household_id
)
WHERE archived_at IS NULL
  AND id = (
      SELECT MIN(g2.id)
      FROM guests g2
      WHERE g2.household_id = guests.household_id
        AND g2.archived_at IS NULL
  )
  AND NOT EXISTS (
      SELECT 1
      FROM guests g3
      WHERE g3.household_id = guests.household_id
        AND g3.archived_at IS NULL
        AND TRIM(COALESCE(g3.email, '')) <> ''
  )
  AND EXISTS (
      SELECT 1
      FROM households h
      WHERE h.id = guests.household_id
        AND TRIM(COALESCE(h.email, '')) <> ''
  );

UPDATE households
SET email = (
    SELECT LOWER(TRIM(g.email))
    FROM guests g
    WHERE g.household_id = households.id
      AND g.archived_at IS NULL
      AND TRIM(COALESCE(g.email, '')) <> ''
    ORDER BY g.id
    LIMIT 1
)
WHERE archived_at IS NULL;
