import { Env } from "../types";

export async function getDietaryRestrictions(
    env: Env
) {
    const result =
        await env.wedding_rsvp_db
            .prepare(`
                SELECT
                    id,
                    name
                FROM dietary_restrictions
                ORDER BY display_order
            `)
            .all();

    return result.results;
}