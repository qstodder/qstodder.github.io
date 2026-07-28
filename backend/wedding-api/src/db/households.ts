import { Env } from "../types";

export async function getHousehold(
    env: Env,
    householdId: number
) {

    const household =
        await env.wedding_rsvp_db
            .prepare(`
                SELECT
                    id,
                    household_name,
                    email,
                    street,
                    city,
                    state,
                    zip,
                    notes
                FROM households
                WHERE id = ?
            `)
            .bind(householdId)
            .first();

    if (!household) {
        return null;
    }

    const guests =
        await env.wedding_rsvp_db
            .prepare(`
                SELECT
                    id,
                    first_name,
                    last_name,
                    is_invited_to_welcome,
                    is_invited_to_wedding,
                    is_invited_to_brunch
                FROM guests
                WHERE household_id = ?
                ORDER BY id
            `)
            .bind(householdId)
            .all();

    return {
        household,
        guests: guests.results,
        rsvps: [],
        acknowledgements: null
    };
}