import { Env } from "../types";

export interface GuestDietary {

    guestId: number;

    restrictionIds: number[];

    otherDietaryDetails?: string;
}

export async function saveGuestDietary(
    env: Env,
    guests: GuestDietary[]
) {

    const statements = [];

    for (const guest of guests) {

        statements.push(

            env.wedding_rsvp_db
                .prepare(`
                    DELETE FROM
                        guest_dietary_restrictions
                    WHERE guest_id = ?
                `)
                .bind(guest.guestId)

        );

        for (const restrictionId of guest.restrictionIds) {

            statements.push(

                env.wedding_rsvp_db
                    .prepare(`
                        INSERT INTO guest_dietary_restrictions
                        (
                            guest_id,
                            restriction_id,
                            notes
                        )
                        VALUES (?, ?, ?)
                    `)
                    .bind(
                        guest.guestId,
                        restrictionId,
                        guest.otherDietaryDetails ?? null
                    )

            );
        }
    }

    await env.wedding_rsvp_db.batch(
        statements
    );
}