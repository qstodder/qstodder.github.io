const EMAIL_PATTERN = /^[^\s@<>,]+@[^\s@<>,]+\.[^\s@<>,]+$/;

export function normalizeGuestEmail(
    value: unknown,
    label = "Email"
): string | null {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value !== "string") throw new Error(`${label} is invalid.`);
    const email = value.trim().toLowerCase();
    if (!email) return null;
    if (email.length > 254) throw new Error(`${label} is too long.`);
    if (!EMAIL_PATTERN.test(email)) throw new Error(`Enter a valid ${label.toLowerCase()}.`);
    return email;
}

export function uniqueGuestEmails(values: Array<string | null | undefined>): string[] {
    return [...new Set(values.filter((value): value is string => Boolean(value?.trim())).map((value) => value.trim().toLowerCase()))];
}

export function syncHouseholdEmailStatement(
    database: D1Database,
    householdId: number
): D1PreparedStatement {
    return database.prepare(`
        UPDATE households
        SET email = (
            SELECT LOWER(TRIM(email))
            FROM guests
            WHERE household_id = ?1
              AND archived_at IS NULL
              AND TRIM(COALESCE(email, '')) <> ''
            ORDER BY id
            LIMIT 1
        )
        WHERE id = ?1 AND archived_at IS NULL
    `).bind(householdId);
}
