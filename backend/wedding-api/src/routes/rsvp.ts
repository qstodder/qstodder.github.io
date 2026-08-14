import { Env } from "../types";

import {
    ok,
    notFound,
    badRequest
} from "../lib/responses";

import {
    CompleteRsvp,
    RsvpValidationError,
    saveCompleteRsvp
} from "../services/rsvp";
import {
    sendRsvpConfirmation
} from "../services/confirmation";


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
                    address_line_2,
                    city,
                    state,
                    zip,
                    country_code,
                    address_needed

                FROM households

                WHERE id = ? AND archived_at IS NULL
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
                    g.is_invited_to_welcome,
                    g.is_invited_to_wedding,
                    g.is_invited_to_brunch,

                    gr.attending_welcome,
                    gr.attending_wedding,
                    gr.attending_brunch

                FROM guests g

                LEFT JOIN guest_rsvps gr
                    ON g.id = gr.guest_id

                WHERE g.household_id = ?
                    AND g.archived_at IS NULL

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
                    dr.name,
                    gdr.notes

                FROM guest_dietary_restrictions gdr

                JOIN dietary_restrictions dr
                    ON gdr.restriction_id = dr.id

                JOIN guests g
                    ON g.id = gdr.guest_id

                WHERE g.household_id = ?
                    AND g.archived_at IS NULL

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

    const attendanceValue = (
        value: unknown
    ): boolean | null => {

        if (value === null || value === undefined) {
            return null;
        }

        return Boolean(value);
    };

    const response = {

        household: {
            id: household.id,
            householdName:
                household.household_name,
            email: household.email,
            street: household.street,
            addressLine2: household.address_line_2,
            city: household.city,
            state: household.state,
            zip: household.zip,
            countryCode: household.country_code,
            addressNeeded:
                Boolean(household.address_needed)
        },

        guests:
            guests.results.map(
                (guest: any) => ({

                    id: guest.id,

                    firstName:
                        guest.first_name,

                    lastName:
                        guest.last_name,

                    isInvitedToWelcome:
                        Boolean(
                            guest.is_invited_to_welcome
                        ),

                    isInvitedToWedding:
                        Boolean(
                            guest.is_invited_to_wedding
                        ),

                    isInvitedToBrunch:
                        Boolean(
                            guest.is_invited_to_brunch
                        ),

                    attendance: {

                        welcome:
                            attendanceValue(
                                guest.attending_welcome
                            ),

                        wedding:
                            attendanceValue(
                                guest.attending_wedding
                            ),

                        brunch:
                            attendanceValue(
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
                            ),

                    otherDietaryDetails:
                        dietary.results
                            .find(
                                (d: any) =>
                                    d.guest_id === guest.id &&
                                    d.name === "Other"
                            )
                            ?.notes ?? ""
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

    let body: CompleteRsvp;

    try {
        body = await request.json() as CompleteRsvp;
    } catch {
        return badRequest("RSVP information must be valid JSON.");
    }

    //-----------------------------------------
    // Minimal validation
    //-----------------------------------------

    if (!body?.contact) {

        return badRequest(
            "Missing contact information."
        );
    }

    if (!body?.guestRsvps) {

        return badRequest(
            "Missing guest RSVPs."
        );
    }

    if (!body?.guestDietary) {

        return badRequest(
            "Missing guest dietary information."
        );
    }

    if (!body?.acknowledgements) {

        return badRequest(
            "Missing acknowledgements."
        );
    }

    try {
        await saveCompleteRsvp(env, body);
    } catch (error) {
        if (error instanceof RsvpValidationError) {
            return badRequest(error.message);
        }
        throw error;
    }

    let emailSent = false;

    try {

        await sendRsvpConfirmation(
            env,
            body.contact.householdId
        );

        emailSent = true;

    } catch (error) {

        console.error(
            "RSVP confirmation email failed.",
            {
                householdId:
                    body.contact.householdId,
                error:
                    error instanceof Error
                        ? error.message
                        : "Unknown email error"
            }
        );
    }

    return ok({
        success: true,
        emailSent
    });
}
