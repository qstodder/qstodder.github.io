import { Env } from "../types";
import {
    AdminAuthError,
    authenticateAdmin
} from "../lib/adminAuth";
import { withAdminCors } from "../lib/adminCors";

interface AdminHouseholdRow {
    id: number;
    household_key: string;
    household_name: string;
    email: string | null;
    street: string | null;
    address_line_2: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    country_code: string;
    address_needed: number;
    guest_count: number;
    responded_guest_count: number;
    attending_welcome: number;
    attending_wedding: number;
    attending_brunch: number;
    submitted_at: string | null;
    guest_names: string | null;
}

interface AdminGuestRow {
    id: number;
    household_id: number;
    household_key: string;
    household_name: string;
    household_email: string | null;
    first_name: string;
    last_name: string;
    couple_side: string | null;
    relationship_type: string | null;
    family_side: string | null;
    is_invited_to_welcome: number;
    is_invited_to_wedding: number;
    is_invited_to_brunch: number;
    attending_welcome: number | null;
    attending_wedding: number | null;
    attending_brunch: number | null;
    rsvp_updated_at: string | null;
}

interface AdminGuestDietaryRow {
    guest_id: number;
    restriction_id: number;
    restriction_name: string;
    notes: string | null;
}

export async function getAdminData(
    request: Request,
    env: Env
) {

    try {
        const admin = await authenticateAdmin(
            request,
            env
        );

        const result =
            await env.wedding_rsvp_db
                .prepare(`
                    SELECT
                        h.id,
                        h.household_key,
                        h.household_name,
                        h.email,
                        h.street,
                        h.address_line_2,
                        h.city,
                        h.state,
                        h.zip,
                        h.country_code,
                        h.address_needed,
                        COUNT(g.id) AS guest_count,
                        SUM(
                            CASE
                                WHEN gr.guest_id IS NOT NULL
                                THEN 1
                                ELSE 0
                            END
                        ) AS responded_guest_count,
                        SUM(COALESCE(gr.attending_welcome, 0))
                            AS attending_welcome,
                        SUM(COALESCE(gr.attending_wedding, 0))
                            AS attending_wedding,
                        SUM(COALESCE(gr.attending_brunch, 0))
                            AS attending_brunch,
                        ha.updated_at AS submitted_at,
                        GROUP_CONCAT(
                            TRIM(
                                g.first_name || ' ' ||
                                COALESCE(g.last_name, '')
                            ),
                            '||'
                        ) AS guest_names
                    FROM households h
                    LEFT JOIN guests g
                        ON g.household_id = h.id
                        AND g.archived_at IS NULL
                    LEFT JOIN guest_rsvps gr
                        ON gr.guest_id = g.id
                    LEFT JOIN household_acknowledgements ha
                        ON ha.household_id = h.id
                    WHERE h.archived_at IS NULL
                    GROUP BY h.id
                    ORDER BY
                        CASE
                            WHEN h.address_needed = 1
                                AND TRIM(COALESCE(h.street, '')) = ''
                            THEN 0
                            ELSE 1
                        END,
                        LOWER(h.household_name)
                `)
                .all<AdminHouseholdRow>();

        const households = result.results.map((row) => {
            const hasAddress =
                Boolean(row.street?.trim());
            const missingAddress =
                Boolean(row.address_needed) &&
                !hasAddress;
            const isSubmitted =
                Boolean(row.submitted_at);
            const isInProgress =
                !isSubmitted &&
                row.responded_guest_count > 0;

            return {
                id: row.id,
                householdKey: row.household_key,
                householdName: row.household_name,
                email: row.email,
                address: {
                    street: row.street,
                    line2: row.address_line_2,
                    city: row.city,
                    state: row.state,
                    zip: row.zip,
                    countryCode: row.country_code
                },
                addressNeeded: Boolean(row.address_needed),
                missingAddress,
                deliveryStatus: missingAddress
                    ? "addressNeeded"
                    : row.address_needed
                        ? "readyToMail"
                        : "handDelivery",
                rsvpStatus: isSubmitted
                    ? "submitted"
                    : isInProgress
                        ? "inProgress"
                        : "pending",
                submittedAt: row.submitted_at,
                guests: row.guest_names
                    ? row.guest_names.split("||")
                    : [],
                guestCount: row.guest_count,
                respondedGuestCount:
                    row.responded_guest_count,
                attendance: {
                    welcome: row.attending_welcome,
                    wedding: row.attending_wedding,
                    brunch: row.attending_brunch
                }
            };
        });

        const summary = households.reduce(
            (totals, household) => ({
                households:
                    totals.households + 1,
                guests:
                    totals.guests + household.guestCount,
                submittedHouseholds:
                    totals.submittedHouseholds +
                    (household.rsvpStatus === "submitted" ? 1 : 0),
                missingAddresses:
                    totals.missingAddresses +
                    (household.missingAddress ? 1 : 0),
                attendingWelcome:
                    totals.attendingWelcome +
                    household.attendance.welcome,
                attendingWedding:
                    totals.attendingWedding +
                    household.attendance.wedding,
                attendingBrunch:
                    totals.attendingBrunch +
                    household.attendance.brunch
            }),
            {
                households: 0,
                guests: 0,
                submittedHouseholds: 0,
                missingAddresses: 0,
                attendingWelcome: 0,
                attendingWedding: 0,
                attendingBrunch: 0
            }
        );

        return withAdminCors(
            request,
            Response.json({
                admin: {
                    email: admin.email
                },
                summary,
                households,
                generatedAt:
                    new Date().toISOString()
            })
        );

    } catch (error) {
        const status =
            error instanceof AdminAuthError
                ? error.status
                : 500;
        const message =
            error instanceof AdminAuthError
                ? error.message
                : "Unable to load the admin dashboard.";

        return withAdminCors(
            request,
            Response.json(
                { error: message },
                { status }
            )
        );
    }
}

export async function getAdminGuests(
    request: Request,
    env: Env
): Promise<Response> {
    try {
        const admin = await authenticateAdmin(request, env);
        const [guestResult, dietaryResult, restrictionResult] =
            await Promise.all([
                env.wedding_rsvp_db.prepare(`
                    SELECT
                        g.id,
                        g.household_id,
                        h.household_key,
                        h.household_name,
                        h.email AS household_email,
                        g.first_name,
                        g.last_name,
                        h.couple_side,
                        h.relationship_type,
                        h.family_side,
                        g.is_invited_to_welcome,
                        g.is_invited_to_wedding,
                        g.is_invited_to_brunch,
                        gr.attending_welcome,
                        gr.attending_wedding,
                        gr.attending_brunch,
                        gr.updated_at AS rsvp_updated_at
                    FROM guests g
                    JOIN households h ON h.id = g.household_id
                    LEFT JOIN guest_rsvps gr ON gr.guest_id = g.id
                    WHERE g.archived_at IS NULL
                        AND h.archived_at IS NULL
                    ORDER BY LOWER(g.last_name), LOWER(g.first_name)
                `).all<AdminGuestRow>(),
                env.wedding_rsvp_db.prepare(`
                    SELECT
                        gdr.guest_id,
                        dr.id AS restriction_id,
                        dr.name AS restriction_name,
                        gdr.notes
                    FROM guest_dietary_restrictions gdr
                    JOIN dietary_restrictions dr
                        ON dr.id = gdr.restriction_id
                    JOIN guests g ON g.id = gdr.guest_id
                    JOIN households h ON h.id = g.household_id
                    WHERE g.archived_at IS NULL
                        AND h.archived_at IS NULL
                    ORDER BY dr.display_order
                `).all<AdminGuestDietaryRow>(),
                env.wedding_rsvp_db.prepare(`
                    SELECT id, name, display_order
                    FROM dietary_restrictions
                    ORDER BY display_order
                `).all()
            ]);

        const dietaryByGuest = new Map<
            number,
            AdminGuestDietaryRow[]
        >();
        for (const item of dietaryResult.results) {
            const dietary = dietaryByGuest.get(item.guest_id) ?? [];
            dietary.push(item);
            dietaryByGuest.set(item.guest_id, dietary);
        }

        const guests = guestResult.results.map((guest) => {
            const dietary = dietaryByGuest.get(guest.id) ?? [];
            return {
                id: guest.id,
                firstName: guest.first_name,
                lastName: guest.last_name,
                household: {
                    id: guest.household_id,
                    householdKey: guest.household_key,
                    householdName: guest.household_name,
                    email: guest.household_email
                },
                classifications: {
                    coupleSide: guest.couple_side,
                    relationshipType: guest.relationship_type,
                    familySide: guest.family_side
                },
                invitations: {
                    welcome: Boolean(guest.is_invited_to_welcome),
                    wedding: Boolean(guest.is_invited_to_wedding),
                    brunch: Boolean(guest.is_invited_to_brunch)
                },
                rsvp: guest.rsvp_updated_at ? {
                    welcome: Boolean(guest.attending_welcome),
                    wedding: Boolean(guest.attending_wedding),
                    brunch: Boolean(guest.attending_brunch),
                    updatedAt: guest.rsvp_updated_at
                } : null,
                dietaryRestrictions: dietary.map((item) => ({
                    id: item.restriction_id,
                    name: item.restriction_name,
                    notes: item.notes
                }))
            };
        });

        return withAdminCors(
            request,
            Response.json({
                admin: { email: admin.email },
                guests,
                dietaryRestrictions: restrictionResult.results,
                generatedAt: new Date().toISOString()
            })
        );
    } catch (error) {
        return withAdminCors(
            request,
            Response.json(
                {
                    error: error instanceof AdminAuthError
                        ? error.message
                        : "Unable to load the guest list."
                },
                {
                    status: error instanceof AdminAuthError
                        ? error.status
                        : 500
                }
            )
        );
    }
}
