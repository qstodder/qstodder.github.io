import { Env } from "../types";

export interface ContactInfo {

    householdId: number;
    email: string;
    street: string;
    city: string;
    state: string;
    zip: string;
}

export async function saveContactInfo(
    env: Env,
    contact: ContactInfo
) {

    await env.wedding_rsvp_db
        .prepare(`
            UPDATE households
            SET
                email = ?,
                street = ?,
                city = ?,
                state = ?,
                zip = ?
            WHERE id = ?
        `)
        .bind(
            contact.email,
            contact.street,
            contact.city,
            contact.state,
            contact.zip,
            contact.householdId
        )
        .run();
}