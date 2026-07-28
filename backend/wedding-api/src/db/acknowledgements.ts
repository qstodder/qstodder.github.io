import { Env } from "../types";

export interface Acknowledgements {

    householdId: number;

    acknowledgeNoChildren: boolean;

    acknowledgeNoPlusOnes: boolean;
}


export async function saveAcknowledgements(
    env: Env,
    acknowledgements: Acknowledgements
) {

    await env.wedding_rsvp_db
        .prepare(`
            INSERT INTO household_acknowledgements (
                household_id,
                acknowledge_no_children,
                acknowledge_no_plus_ones,
                updated_at
            )
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)

            ON CONFLICT(household_id)
            DO UPDATE SET

                acknowledge_no_children =
                    excluded.acknowledge_no_children,

                acknowledge_no_plus_ones =
                    excluded.acknowledge_no_plus_ones,

                updated_at =
                    CURRENT_TIMESTAMP
        `)
        .bind(
            acknowledgements.householdId,

            acknowledgements.acknowledgeNoChildren
                ? 1
                : 0,

            acknowledgements.acknowledgeNoPlusOnes
                ? 1
                : 0
        )
        .run();
}