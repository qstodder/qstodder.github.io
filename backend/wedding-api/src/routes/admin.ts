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
    city: string | null;
    state: string | null;
    zip: string | null;
    address_needed: number;
    guest_count: number;
    responded_guest_count: number;
    attending_welcome: number;
    attending_wedding: number;
    attending_brunch: number;
    submitted_at: string | null;
    guest_names: string | null;
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
                        h.city,
                        h.state,
                        h.zip,
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
                    JOIN guests g
                        ON g.household_id = h.id
                    LEFT JOIN guest_rsvps gr
                        ON gr.guest_id = g.id
                    LEFT JOIN household_acknowledgements ha
                        ON ha.household_id = h.id
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
                    city: row.city,
                    state: row.state,
                    zip: row.zip
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
