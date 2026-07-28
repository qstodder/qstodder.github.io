import { Env } from "../types";

import {
    ok,
    notFound,
    badRequest
} from "../lib/responses";

import {
    CompleteRsvp,
    saveCompleteRsvp
} from "../services/rsvp";


export async function getRsvpRoute(
    request: Request,
    env: Env,
    householdId: number
): Promise<Response> {


    //-------------------------------------------------
    // Household
    //-------------------------------------------------

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

        return notFound(
            "Household not found."
        );
    }



    //-------------------------------------------------
    // Guests + attendance
    //-------------------------------------------------

    const guests =
        await env.wedding_rsvp_db
            .prepare(`
                SELECT

                    g.id,
                    g.first_name,
                    g.last_name,

                    gr.attending_welcome,
                    gr.attending_wedding,
                    gr.attending_brunch

                FROM guests g

                LEFT JOIN guest_rsvps gr
                    ON g.id = gr.guest_id

                WHERE g.household_id = ?

                ORDER BY g.id
            `)
            .bind(householdId)
            .all();



    //-------------------------------------------------
    // Dietary restrictions
    //-------------------------------------------------

    const dietary =
        await env.wedding_rsvp_db
            .prepare(`
                SELECT

                    gdr.guest_id,
                    dr.id,
                    dr.name

                FROM guest_dietary_restrictions gdr

                JOIN dietary_restrictions dr
                    ON gdr.restriction_id = dr.id

                JOIN guests g
                    ON g.id = gdr.guest_id

                WHERE g.household_id = ?

            `)
            .bind(householdId)
            .all();



    //-------------------------------------------------
    // Acknowledgements
    //-------------------------------------------------

    const acknowledgements =
        await env.wedding_rsvp_db
            .prepare(`
                SELECT

                    acknowledge_no_children,
                    acknowledge_no_plus_ones

                FROM household_acknowledgements

                WHERE household_id = ?

            `)
            .bind(householdId)
            .first();



    //-------------------------------------------------
    // Assemble response
    //-------------------------------------------------

    const response = {

        household,

        guests:
            guests.results.map(
                (guest: any) => ({

                    id: guest.id,

                    firstName:
                        guest.first_name,

                    lastName:
                        guest.last_name,

                    attendance: {

                        welcome:
                            Boolean(
                                guest.attending_welcome
                            ),

                        wedding:
                            Boolean(
                                guest.attending_wedding
                            ),

                        brunch:
                            Boolean(
                                guest.attending_brunch
                            )
                    },

                    dietaryRestrictions:
                        dietary.results
                            .filter(
                                (d: any) =>
                                    d.guest_id === guest.id
                            )
                            .map(
                                (d: any) => ({
                                    id: d.id,
                                    name: d.name
                                })
                            )
                })
            ),


        acknowledgements: {

            noChildren:
                Boolean(
                    acknowledgements
                        ?.acknowledge_no_children
                ),

            noPlusOnes:
                Boolean(
                    acknowledgements
                        ?.acknowledge_no_plus_ones
                )
        }
    };


    return ok(response);
}

export async function saveRsvpRoute(
    request: Request,
    env: Env
): Promise<Response> {

    const body =
        await request.json() as CompleteRsvp;

    //-----------------------------------------
    // Minimal validation
    //-----------------------------------------

    if (!body.contact) {

        return badRequest(
            "Missing contact information."
        );
    }

    if (!body.guestRsvps) {

        return badRequest(
            "Missing guest RSVPs."
        );
    }

    if (!body.guestDietary) {

        return badRequest(
            "Missing guest dietary information."
        );
    }

    if (!body.acknowledgements) {

        return badRequest(
            "Missing acknowledgements."
        );
    }

    await saveCompleteRsvp(
        env,
        body
    );

    return ok({
        success: true
    });
}