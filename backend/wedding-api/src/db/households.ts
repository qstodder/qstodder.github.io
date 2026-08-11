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
                    household_key,
                    household_name,
                    email,
                    street,
                    city,
                    state,
                    zip,
                    notes,
                    address_needed
                FROM households
                WHERE id = ? AND archived_at IS NULL
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
                WHERE household_id = ? AND archived_at IS NULL
                ORDER BY id
            `)
            .bind(householdId)
            .all();

    return {
        household: {
            id: household.id,
            householdKey: household.household_key,
            householdName: household.household_name,
            email: household.email,
            street: household.street,
            city: household.city,
            state: household.state,
            zip: household.zip,
            notes: household.notes,
            addressNeeded:
                Boolean(household.address_needed)
        },
        guests: guests.results.map((guest: any) => ({
            id: guest.id,
            firstName: guest.first_name,
            lastName: guest.last_name,
            isInvitedToWelcome: Boolean(
                guest.is_invited_to_welcome
            ),
            isInvitedToWedding: Boolean(
                guest.is_invited_to_wedding
            ),
            isInvitedToBrunch: Boolean(
                guest.is_invited_to_brunch
            )
        })),
        rsvps: [],
        acknowledgements: null
    };
}
