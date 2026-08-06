import { Env } from "../types";
import { ok, badRequest, notFound } from "../lib/responses";

export async function searchGuests(
    request: Request,
    env: Env
): Promise<Response> {

    const url = new URL(request.url);

    const search =
        (url.searchParams.get("search") || "").trim();

    if (search.length < 2) {
        return ok([]);
    }

    const query = `
        SELECT
            household_id,
            first_name || ' ' || last_name AS display_name
        FROM guests
        WHERE
            lower(first_name) LIKE lower(?)
            OR
            lower(last_name) LIKE lower(?)
        ORDER BY last_name, first_name
        LIMIT 10
    `;

    const result =
        await env.wedding_rsvp_db
            .prepare(query)
            .bind(
                `%${search}%`,
                `%${search}%`
            )
            .all();

    return ok(
        result.results.map((guest: any) => ({
            householdId: guest.household_id,
            displayName: guest.display_name
        }))
    );
}
