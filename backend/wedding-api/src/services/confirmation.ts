import { Env } from "../types";
import { sendGmailMessage } from "./gmail";
import { uniqueGuestEmails } from "./guestEmails";

interface ConfirmationGuest {
    id: number;
    firstName: string;
    lastName: string;
    invitedToWelcome: boolean;
    invitedToWedding: boolean;
    invitedToReception: boolean;
    invitedToBrunch: boolean;
    attendingWelcome: boolean;
    attendingWedding: boolean;
    attendingReception: boolean;
    attendingBrunch: boolean;
    dietaryRestrictions: string[];
}

export interface ConfirmationDetails {
    householdName: string;
    emails?: string[];
    /** Compatibility for older callers while guest-email rollout completes. */
    email?: string;
    guests: ConfirmationGuest[];
}

function escapeHtml(value: string): string {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function attendanceText(
    invited: boolean,
    attending: boolean
): string {

    if (!invited) {
        return "Not invited";
    }

    return attending
        ? "Attending"
        : "Not attending";
}

function receptionInvitation(guest: ConfirmationGuest): boolean {
    return guest.invitedToReception ?? guest.invitedToWedding;
}

function receptionAttendance(guest: ConfirmationGuest): boolean {
    return guest.attendingReception ?? guest.attendingWedding;
}

async function getConfirmationDetails(
    env: Env,
    householdId: number
): Promise<ConfirmationDetails> {

    const household =
        await env.wedding_rsvp_db
            .prepare(`
                SELECT household_name
                FROM households
                WHERE id = ? AND archived_at IS NULL
            `)
            .bind(householdId)
            .first<{
                household_name: string;
                email: string | null;
            }>();

    if (!household) {
        throw new Error(
            "RSVP household was not found."
        );
    }

    const guestResult =
        await env.wedding_rsvp_db
            .prepare(`
                SELECT
                    g.id,
                    g.first_name,
                    g.last_name,
                    g.email,
                    g.is_invited_to_welcome,
                    g.is_invited_to_wedding,
                    g.is_invited_to_reception,
                    g.is_invited_to_brunch,
                    gr.attending_welcome,
                    gr.attending_wedding,
                    gr.attending_reception,
                    gr.attending_brunch
                FROM guests g
                LEFT JOIN guest_rsvps gr
                    ON gr.guest_id = g.id
                WHERE g.household_id = ?
                    AND g.archived_at IS NULL
                ORDER BY g.id
            `)
            .bind(householdId)
            .all<any>();

    const dietaryResult =
        await env.wedding_rsvp_db
            .prepare(`
                SELECT
                    gdr.guest_id,
                    dr.name,
                    gdr.notes
                FROM guest_dietary_restrictions gdr
                JOIN dietary_restrictions dr
                    ON dr.id = gdr.restriction_id
                JOIN guests g
                    ON g.id = gdr.guest_id
                WHERE g.household_id = ?
                    AND g.archived_at IS NULL
                ORDER BY dr.display_order
            `)
            .bind(householdId)
            .all<any>();

    const emails = uniqueGuestEmails(
        guestResult.results.map((guest) => guest.email)
    );
    if (!emails.length) {
        throw new Error("RSVP household does not have an email address.");
    }

    return {
        householdName: household.household_name,
        emails,
        guests: guestResult.results.map((guest) => ({
            id: guest.id,
            firstName: guest.first_name,
            lastName: guest.last_name,
            invitedToWelcome:
                Boolean(guest.is_invited_to_welcome),
            invitedToWedding:
                Boolean(guest.is_invited_to_wedding),
            invitedToReception:
                Boolean(guest.is_invited_to_reception),
            invitedToBrunch:
                Boolean(guest.is_invited_to_brunch),
            attendingWelcome:
                Boolean(guest.attending_welcome),
            attendingWedding:
                Boolean(guest.attending_wedding),
            attendingReception:
                Boolean(guest.attending_reception),
            attendingBrunch:
                Boolean(guest.attending_brunch),
            dietaryRestrictions:
                dietaryResult.results
                    .filter((restriction) =>
                        restriction.guest_id === guest.id
                    )
                    .map((restriction) =>
                        restriction.name === "Other" &&
                        restriction.notes
                            ? `Other: ${restriction.notes}`
                            : restriction.name
                    )
        }))
    };
}

export function buildConfirmationEmail(
    details: ConfirmationDetails
) {

    const textEvents = [
        "WEEKEND DETAILS",
        "Welcome Gathering — Friday, September 17, 2027 · 7–9 PM",
        "The Public House · 830 Kline St, La Jolla, CA 92037",
        "",
        "Wedding Ceremony — Saturday, September 18, 2027 · 4 PM",
        "Wedding Bowl · 590 Coast S Blvd, La Jolla, CA 92037",
        "",
        "Wedding Reception — Saturday, September 18, 2027 · 5–10 PM",
        "La Jolla Woman’s Club · 7791 Draper Ave, La Jolla, CA 92037",
        "",
        "Morning-After Brunch — Sunday, September 19, 2027 · 11 AM–2 PM",
        "Ellen Browning Scripps Park · 1100 Coast Blvd, La Jolla, CA 92037"
    ].join("\n");

    const htmlEvents = `
        <section style="margin: 28px 0 34px; padding: 22px; background: #f4f8fa; border: 1px solid #d8e3e8;">
            <h2 style="margin: 0 0 18px; color: #52656a; font-size: 20px; font-weight: 500;">Weekend Details</h2>
            <p style="margin: 0 0 14px;"><strong>Welcome Gathering</strong><br>Friday, September 17, 2027 · 7–9 PM<br>The Public House · 830 Kline St, La Jolla, CA 92037</p>
            <p style="margin: 0 0 14px;"><strong>Wedding Ceremony</strong><br>Saturday, September 18, 2027 · 4 PM<br>Wedding Bowl · 590 Coast S Blvd, La Jolla, CA 92037</p>
            <p style="margin: 0 0 14px;"><strong>Wedding Reception</strong><br>Saturday, September 18, 2027 · 5–10 PM<br>La Jolla Woman’s Club · 7791 Draper Ave, La Jolla, CA 92037</p>
            <p style="margin: 0;"><strong>Morning-After Brunch</strong><br>Sunday, September 19, 2027 · 11 AM–2 PM<br>Ellen Browning Scripps Park · 1100 Coast Blvd, La Jolla, CA 92037</p>
        </section>
    `;

    const textGuests = details.guests
        .map((guest) => [
            `${guest.firstName} ${guest.lastName}`,
            `  Welcome Event: ${attendanceText(
                guest.invitedToWelcome,
                guest.attendingWelcome
            )}`,
            `  Ceremony: ${attendanceText(
                guest.invitedToWedding,
                guest.attendingWedding
            )}`,
            `  Reception: ${attendanceText(
                receptionInvitation(guest),
                receptionAttendance(guest)
            )}`,
            `  Morning-After Brunch: ${attendanceText(
                guest.invitedToBrunch,
                guest.attendingBrunch
            )}`,
            `  Dietary restrictions: ${
                receptionAttendance(guest)
                    ? guest.dietaryRestrictions.join(", ") || "None"
                    : "Not applicable"
            }`
        ].join("\n"))
        .join("\n\n");

    const htmlGuests = details.guests
        .map((guest) => `
            <section style="margin: 0 0 24px;">
                <h3 style="margin: 0 0 8px; color: #52656a;">
                    ${escapeHtml(guest.firstName)}
                    ${escapeHtml(guest.lastName)}
                </h3>
                <p style="margin: 4px 0;">
                    <strong>Welcome Event:</strong>
                    ${attendanceText(
                        guest.invitedToWelcome,
                        guest.attendingWelcome
                    )}
                </p>
                <p style="margin: 4px 0;">
                    <strong>Ceremony:</strong>
                    ${attendanceText(
                        guest.invitedToWedding,
                        guest.attendingWedding
                    )}
                </p>
                <p style="margin: 4px 0;">
                    <strong>Reception:</strong>
                    ${attendanceText(
                        receptionInvitation(guest),
                        receptionAttendance(guest)
                    )}
                </p>
                <p style="margin: 4px 0;">
                    <strong>Morning-After Brunch:</strong>
                    ${attendanceText(
                        guest.invitedToBrunch,
                        guest.attendingBrunch
                    )}
                </p>
                <p style="margin: 4px 0;">
                    <strong>Dietary restrictions:</strong>
                    ${escapeHtml(
                        receptionAttendance(guest)
                            ? guest.dietaryRestrictions.join(", ") || "None"
                            : "Not applicable"
                    )}
                </p>
            </section>
        `)
        .join("");

    return {
        to: uniqueGuestEmails(
            details.emails ?? [details.email]
        ).join(", "),
        subject: "Your RSVP for Quiana & Scott's Wedding",
        text: [
            `Hello ${details.householdName},`,
            "",
            "Thank you for submitting your RSVP. You may edit your responses until Aug 1st, 2027.",
            "",
            textGuests,
            "",
            textEvents,
            "",
            "We can't wait to celebrate with you!",
            "",
            "With love,",
            "Quiana & Scott"
        ].join("\n"),
        html: `
            <!doctype html>
            <html lang="en">
                <body style="margin: 0; padding: 24px; background: #f7fafb; color: #2f3c40; font-family: Georgia, serif; line-height: 1.6;">
                    <main style="max-width: 640px; margin: 0 auto; padding: 32px; background: #ffffff; border: 1px solid #d8e3e8; border-radius: 8px;">
                        <h1 style="margin-top: 0; color: #52656a; font-weight: 500;">
                            RSVP Confirmation
                        </h1>
                        <p>Hello ${escapeHtml(details.householdName)},</p>
                        <p>
                            Thank you for submitting your RSVP. You may edit your responses until Aug 1st, 2027.
                        </p>
                        ${htmlGuests}
                        ${htmlEvents}
                        <p>We can't wait to celebrate with you!</p>
                        <p>With love,<br>Quiana &amp; Scott</p>
                    </main>
                </body>
            </html>
        `
    };
}

export async function sendRsvpConfirmation(
    env: Env,
    householdId: number
): Promise<void> {

    const details =
        await getConfirmationDetails(
            env,
            householdId
        );

    await sendGmailMessage(
        env,
        buildConfirmationEmail(details)
    );
}
