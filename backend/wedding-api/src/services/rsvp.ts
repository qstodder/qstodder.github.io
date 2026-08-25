import { Env } from "../types";
import {
    normalizeGuestEmail,
    syncHouseholdEmailStatement
} from "./guestEmails";

export interface GuestEmail {
    guestId: number;
    email: string;
}

export interface ContactInfo {
    householdId: number;
    email?: string;
    guestEmails?: GuestEmail[];
    street: string;
    addressLine2?: string;
    city: string;
    state: string;
    zip: string;
    countryCode: string;
}

export interface GuestRsvp {
    guestId: number;
    attendingWelcome: boolean;
    attendingWedding: boolean;
    attendingBrunch: boolean;
}

export interface GuestDietary {
    guestId: number;
    restrictionIds: number[];
    otherDietaryDetails?: string;
}

export interface CompleteRsvp {
    contact: ContactInfo;
    guestRsvps: GuestRsvp[];
    guestDietary: GuestDietary[];
}

interface HouseholdRow {
    id: number;
    address_needed: number;
}

interface GuestRow {
    id: number;
    is_invited_to_welcome: number;
    is_invited_to_wedding: number;
    is_invited_to_brunch: number;
}

interface RestrictionRow {
    id: number;
    name: string;
}

export class RsvpValidationError extends Error {}

function requiredId(value: unknown, label: string): number {
    if (!Number.isInteger(value) || Number(value) <= 0) {
        throw new RsvpValidationError(`${label} is invalid.`);
    }
    return Number(value);
}

function text(value: unknown, label: string, max: number): string {
    if (typeof value !== "string") {
        throw new RsvpValidationError(`${label} is invalid.`);
    }
    const normalized = value.trim();
    if (normalized.length > max) {
        throw new RsvpValidationError(`${label} is too long.`);
    }
    return normalized;
}

function boolean(value: unknown, label: string): boolean {
    if (typeof value !== "boolean") {
        throw new RsvpValidationError(`${label} is invalid.`);
    }
    return value;
}

function uniqueIds(values: unknown, label: string): number[] {
    if (!Array.isArray(values)) {
        throw new RsvpValidationError(`${label} is invalid.`);
    }
    const ids = values.map((value) => requiredId(value, label));
    if (new Set(ids).size !== ids.length) {
        throw new RsvpValidationError(`${label} contains duplicates.`);
    }
    return ids;
}

function sameIds(actual: number[], expected: number[]): boolean {
    return actual.length === expected.length &&
        actual.every((id) => expected.includes(id));
}

export async function saveCompleteRsvp(
    env: Env,
    input: CompleteRsvp
): Promise<void> {
    if (!input || typeof input !== "object") {
        throw new RsvpValidationError("RSVP information is invalid.");
    }
    if (!input.contact) {
        throw new RsvpValidationError("RSVP information is incomplete.");
    }

    const householdId = requiredId(
        input.contact?.householdId,
        "Household"
    );
    const [household, guestResult, restrictionResult] = await Promise.all([
        env.wedding_rsvp_db.prepare(`
            SELECT id, address_needed
            FROM households
            WHERE id = ?1 AND archived_at IS NULL
        `).bind(householdId).first<HouseholdRow>(),
        env.wedding_rsvp_db.prepare(`
            SELECT id, is_invited_to_welcome,
                is_invited_to_wedding, is_invited_to_brunch
            FROM guests
            WHERE household_id = ?1 AND archived_at IS NULL
            ORDER BY id
        `).bind(householdId).all<GuestRow>(),
        env.wedding_rsvp_db.prepare(`
            SELECT id, name FROM dietary_restrictions
        `).all<RestrictionRow>()
    ]);

    if (!household) {
        throw new RsvpValidationError("Household not found.");
    }
    if (!Array.isArray(input.guestRsvps) ||
        !Array.isArray(input.guestDietary)) {
        throw new RsvpValidationError("Guest responses are invalid.");
    }

    const householdGuestIds = guestResult.results.map((guest) => guest.id);
    if (!householdGuestIds.length) {
        throw new RsvpValidationError("This household does not have any active guests.");
    }
    const rsvpGuestIds = uniqueIds(
        input.guestRsvps.map((guest) => guest?.guestId),
        "Guest RSVP"
    );
    const dietaryGuestIds = uniqueIds(
        input.guestDietary.map((guest) => guest?.guestId),
        "Guest dietary response"
    );
    if (!sameIds(rsvpGuestIds, householdGuestIds) ||
        !sameIds(dietaryGuestIds, householdGuestIds)) {
        throw new RsvpValidationError(
            "Guest responses do not match this household."
        );
    }

    const guestEmails = new Map<number, string | null>();
    if (Array.isArray(input.contact.guestEmails)) {
        const emailGuestIds = uniqueIds(
            input.contact.guestEmails.map((item) => item?.guestId),
            "Guest email"
        );
        if (!sameIds(emailGuestIds, householdGuestIds)) {
            throw new RsvpValidationError(
                "Email entries do not match this household."
            );
        }
        try {
            for (const item of input.contact.guestEmails) {
                guestEmails.set(
                    item.guestId,
                    normalizeGuestEmail(item.email, "Email address")
                );
            }
        } catch (error) {
            throw new RsvpValidationError(
                error instanceof Error ? error.message : "Enter a valid email address."
            );
        }
    } else {
        // Compatibility for the original one-email RSVP form during rollout.
        try {
            guestEmails.set(
                householdGuestIds[0],
                normalizeGuestEmail(input.contact.email, "Email address")
            );
        } catch (error) {
            throw new RsvpValidationError(
                error instanceof Error ? error.message : "Enter a valid email address."
            );
        }
        for (const guestId of householdGuestIds.slice(1)) {
            guestEmails.set(guestId, null);
        }
    }
    if (![...guestEmails.values()].some(Boolean)) {
        throw new RsvpValidationError(
            "Please enter a valid email address for at least one household member."
        );
    }
    const street = text(input.contact.street ?? "", "Street", 200);
    const addressLine2 = text(
        input.contact.addressLine2 ?? "",
        "Address line 2",
        200
    );
    const city = text(input.contact.city ?? "", "City", 100);
    const state = text(input.contact.state ?? "", "State or region", 100);
    const zip = text(input.contact.zip ?? "", "Postal code", 20);
    const countryCode = text(
        input.contact.countryCode ?? "US",
        "Country code",
        2
    ).toUpperCase();
    if (!/^[A-Z]{2}$/.test(countryCode)) {
        throw new RsvpValidationError("Enter a two-letter country code.");
    }
    if (household.address_needed && (!street || !city || !zip)) {
        throw new RsvpValidationError(
            "A street, city, and postal code are required for this invitation."
        );
    }

    const restrictions = new Map(
        restrictionResult.results.map((row) => [row.id, row.name])
    );
    const otherRestriction = restrictionResult.results.find(
        (row) => row.name.toLowerCase() === "other"
    );
    const rsvps = new Map(
        input.guestRsvps.map((response) => [response.guestId, response])
    );
    const dietary = new Map(
        input.guestDietary.map((response) => [response.guestId, response])
    );

    for (const guest of guestResult.results) {
        const response = rsvps.get(guest.id)!;
        response.attendingWelcome = boolean(
            response.attendingWelcome,
            "Welcome response"
        );
        response.attendingWedding = boolean(
            response.attendingWedding,
            "Wedding response"
        );
        response.attendingBrunch = boolean(
            response.attendingBrunch,
            "Brunch response"
        );
        if ((response.attendingWelcome && !guest.is_invited_to_welcome) ||
            (response.attendingWedding && !guest.is_invited_to_wedding) ||
            (response.attendingBrunch && !guest.is_invited_to_brunch)) {
            throw new RsvpValidationError(
                "An attendance response does not match the invitation."
            );
        }

        const dietaryResponse = dietary.get(guest.id)!;
        dietaryResponse.restrictionIds = uniqueIds(
            dietaryResponse.restrictionIds,
            "Dietary restrictions"
        );
        if (!response.attendingWedding &&
            dietaryResponse.restrictionIds.length > 0) {
            throw new RsvpValidationError(
                "Dietary selections are only accepted for wedding attendees."
            );
        }
        if (dietaryResponse.restrictionIds.some((id) => !restrictions.has(id))) {
            throw new RsvpValidationError("A dietary selection is invalid.");
        }
        dietaryResponse.otherDietaryDetails = text(
            dietaryResponse.otherDietaryDetails ?? "",
            "Other dietary details",
            500
        );
        if (otherRestriction &&
            dietaryResponse.restrictionIds.includes(otherRestriction.id) &&
            !dietaryResponse.otherDietaryDetails) {
            throw new RsvpValidationError("Other dietary details are required.");
        }
    }

    const statements: D1PreparedStatement[] = [
        env.wedding_rsvp_db.prepare(`
            UPDATE households SET street = ?1,
                address_line_2 = ?2, city = ?3, state = ?4,
                zip = ?5, country_code = ?6
            WHERE id = ?7 AND archived_at IS NULL
        `).bind(
            street || null, addressLine2 || null, city || null,
            state || null, zip || null, countryCode, householdId
        )
    ];

    for (const guestId of householdGuestIds) {
        statements.push(env.wedding_rsvp_db.prepare(`
            UPDATE guests SET email = ?1
            WHERE id = ?2 AND household_id = ?3 AND archived_at IS NULL
        `).bind(guestEmails.get(guestId) ?? null, guestId, householdId));
    }

    statements.push(syncHouseholdEmailStatement(
        env.wedding_rsvp_db,
        householdId
    ));

    for (const guest of guestResult.results) {
        const response = rsvps.get(guest.id)!;
        statements.push(env.wedding_rsvp_db.prepare(`
            INSERT INTO guest_rsvps (
                guest_id, attending_welcome, attending_wedding,
                attending_brunch, updated_at
            ) VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP)
            ON CONFLICT(guest_id) DO UPDATE SET
                attending_welcome = excluded.attending_welcome,
                attending_wedding = excluded.attending_wedding,
                attending_brunch = excluded.attending_brunch,
                updated_at = CURRENT_TIMESTAMP
        `).bind(
            guest.id,
            response.attendingWelcome ? 1 : 0,
            response.attendingWedding ? 1 : 0,
            response.attendingBrunch ? 1 : 0
        ));

        statements.push(env.wedding_rsvp_db.prepare(`
            DELETE FROM guest_dietary_restrictions WHERE guest_id = ?1
        `).bind(guest.id));

        const dietaryResponse = dietary.get(guest.id)!;
        for (const restrictionId of dietaryResponse.restrictionIds) {
            statements.push(env.wedding_rsvp_db.prepare(`
                INSERT INTO guest_dietary_restrictions (
                    guest_id, restriction_id, notes
                ) VALUES (?1, ?2, ?3)
            `).bind(
                guest.id,
                restrictionId,
                restrictionId === otherRestriction?.id
                    ? dietaryResponse.otherDietaryDetails || null
                    : null
            ));
        }
    }

    await env.wedding_rsvp_db.batch(statements);
}
