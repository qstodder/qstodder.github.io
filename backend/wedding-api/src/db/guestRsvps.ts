import { Env } from "../types";

export interface GuestRsvp {

    guestId: number;

    attendingWelcome: boolean;

    attendingWedding: boolean;

    attendingBrunch: boolean;
}

export async function saveGuestRsvps(
    env: Env,
    guestRsvps: GuestRsvp[]
) {

    const statements =
        guestRsvps.map((guest) =>

            env.wedding_rsvp_db
                .prepare(`
                    INSERT INTO guest_rsvps (
                        guest_id,
                        attending_welcome,
                        attending_wedding,
                        attending_brunch,
                        updated_at
                    )
                    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)

                    ON CONFLICT(guest_id)
                    DO UPDATE SET

                        attending_welcome =
                            excluded.attending_welcome,

                        attending_wedding =
                            excluded.attending_wedding,

                        attending_brunch =
                            excluded.attending_brunch,

                        updated_at =
                            CURRENT_TIMESTAMP
                `)
                .bind(
                    guest.guestId,

                    guest.attendingWelcome ? 1 : 0,

                    guest.attendingWedding ? 1 : 0,

                    guest.attendingBrunch ? 1 : 0
                )
        );

    await env.wedding_rsvp_db.batch(
        statements
    );
}