import { Env } from "../types";
import {
    AdminAuthError,
    authenticateAdmin
} from "../lib/adminAuth";
import { withAdminCors } from "../lib/adminCors";

interface HouseholdRow {
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
    notes: string | null;
    address_needed: number;
}

interface GuestRow {
    id: number;
    household_id: number;
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

interface DietaryRow {
    guest_id: number;
    restriction_id: number;
    notes: string | null;
}

function json(
    request: Request,
    data: unknown,
    status = 200
): Response {
    return withAdminCors(
        request,
        Response.json(data, { status })
    );
}

function errorResponse(
    request: Request,
    error: unknown,
    fallback: string
): Response {
    return json(
        request,
        {
            error: error instanceof AdminAuthError
                ? error.message
                : fallback
        },
        error instanceof AdminAuthError
            ? error.status
            : 500
    );
}

function text(
    value: unknown,
    label: string,
    maxLength: number,
    required = false
): string | null {
    if (value === null || value === undefined) {
        if (required) {
            throw new Error(`${label} is required.`);
        }
        return null;
    }

    if (typeof value !== "string") {
        throw new Error(`${label} must be text.`);
    }

    const normalized = value.trim();
    if (required && !normalized) {
        throw new Error(`${label} is required.`);
    }
    if (normalized.length > maxLength) {
        throw new Error(
            `${label} must be ${maxLength} characters or fewer.`
        );
    }

    return normalized || null;
}

function boolean(value: unknown, label: string): boolean {
    if (typeof value !== "boolean") {
        throw new Error(`${label} must be true or false.`);
    }
    return value;
}

async function body(request: Request): Promise<Record<string, unknown>> {
    try {
        const result = await request.json();
        if (!result || typeof result !== "object" || Array.isArray(result)) {
            throw new Error();
        }
        return result as Record<string, unknown>;
    } catch {
        throw new Error("A valid JSON request body is required.");
    }
}

function slug(value: string): string {
    return value
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "household";
}

function householdJson(row: HouseholdRow) {
    return {
        id: row.id,
        householdKey: row.household_key,
        householdName: row.household_name,
        email: row.email,
        addressNeeded: Boolean(row.address_needed),
        notes: row.notes,
        address: {
            line1: row.street,
            line2: row.address_line_2,
            city: row.city,
            region: row.state,
            postalCode: row.zip,
            countryCode: row.country_code || "US"
        }
    };
}

export async function getAdminHousehold(
    request: Request,
    env: Env,
    householdId: number
): Promise<Response> {
    try {
        const admin = await authenticateAdmin(request, env);

        const household = await env.wedding_rsvp_db
            .prepare(`
                SELECT id, household_key, household_name, email,
                    street, address_line_2, city, state, zip,
                    country_code, notes, address_needed
                FROM households
                WHERE id = ?1 AND archived_at IS NULL
            `)
            .bind(householdId)
            .first<HouseholdRow>();

        if (!household) {
            return json(request, { error: "Household not found." }, 404);
        }

        const [guestResult, dietaryResult, restrictions, householdOptions] =
            await Promise.all([
                env.wedding_rsvp_db.prepare(`
                    SELECT g.id, g.household_id, g.first_name, g.last_name,
                        g.is_invited_to_welcome,
                        g.is_invited_to_wedding,
                        g.is_invited_to_brunch,
                        g.couple_side,
                        g.relationship_type,
                        g.family_side,
                        gr.attending_welcome,
                        gr.attending_wedding,
                        gr.attending_brunch,
                        gr.updated_at AS rsvp_updated_at
                    FROM guests g
                    LEFT JOIN guest_rsvps gr ON gr.guest_id = g.id
                    WHERE g.household_id = ?1
                        AND g.archived_at IS NULL
                    ORDER BY LOWER(g.first_name), LOWER(g.last_name)
                `).bind(householdId).all<GuestRow>(),
                env.wedding_rsvp_db.prepare(`
                    SELECT gdr.guest_id, gdr.restriction_id, gdr.notes
                    FROM guest_dietary_restrictions gdr
                    JOIN guests g ON g.id = gdr.guest_id
                    WHERE g.household_id = ?1
                        AND g.archived_at IS NULL
                `).bind(householdId).all<DietaryRow>(),
                env.wedding_rsvp_db.prepare(`
                    SELECT id, name, display_order
                    FROM dietary_restrictions
                    ORDER BY display_order
                `).all(),
                env.wedding_rsvp_db.prepare(`
                    SELECT id, household_name
                    FROM households
                    WHERE archived_at IS NULL
                    ORDER BY LOWER(household_name)
                `).all()
            ]);

        const dietaryByGuest = new Map<number, DietaryRow[]>();
        for (const item of dietaryResult.results) {
            const values = dietaryByGuest.get(item.guest_id) ?? [];
            values.push(item);
            dietaryByGuest.set(item.guest_id, values);
        }

        return json(request, {
            admin: { email: admin.email },
            household: householdJson(household),
            guests: guestResult.results.map((guest) => {
                const dietary = dietaryByGuest.get(guest.id) ?? [];
                return {
                    id: guest.id,
                    householdId: guest.household_id,
                    firstName: guest.first_name,
                    lastName: guest.last_name,
                    invitations: {
                        welcome: Boolean(guest.is_invited_to_welcome),
                        wedding: Boolean(guest.is_invited_to_wedding),
                        brunch: Boolean(guest.is_invited_to_brunch)
                    },
                    classifications: {
                        coupleSide: guest.couple_side,
                        relationshipType: guest.relationship_type,
                        familySide: guest.family_side
                    },
                    rsvp: guest.rsvp_updated_at ? {
                        welcome: Boolean(guest.attending_welcome),
                        wedding: Boolean(guest.attending_wedding),
                        brunch: Boolean(guest.attending_brunch),
                        updatedAt: guest.rsvp_updated_at
                    } : null,
                    dietaryRestrictionIds: dietary.map(
                        (item) => item.restriction_id
                    ),
                    dietaryNotes: dietary.find(
                        (item) => item.notes
                    )?.notes ?? null
                };
            }),
            dietaryRestrictions: restrictions.results,
            householdOptions: householdOptions.results.map((option: any) => ({
                id: option.id,
                householdName: option.household_name
            }))
        });
    } catch (error) {
        return errorResponse(
            request,
            error,
            "Unable to load the household."
        );
    }
}

export async function updateAdminHousehold(
    request: Request,
    env: Env,
    householdId: number
): Promise<Response> {
    try {
        await authenticateAdmin(request, env);
        const input = await body(request);

        let householdName: string;
        let householdKey: string;
        let email: string | null;
        let line1: string | null;
        let line2: string | null;
        let city: string | null;
        let region: string | null;
        let postalCode: string | null;
        let countryCode: string;
        let notes: string | null;
        let addressNeeded: boolean;

        try {
            householdName = text(input.householdName, "Household name", 150, true)!;
            householdKey = text(input.householdKey, "Household key", 150, true)!;
            if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(householdKey)) {
                throw new Error("Household key must contain lowercase letters, numbers, and hyphens only.");
            }
            email = text(input.email, "Email", 254);
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                throw new Error("Enter a valid household email address.");
            }
            const address = input.address as Record<string, unknown> | undefined;
            line1 = text(address?.line1, "Address line 1", 200);
            line2 = text(address?.line2, "Address line 2", 200);
            city = text(address?.city, "City/locality", 100);
            region = text(address?.region, "State/province/region", 100);
            postalCode = text(address?.postalCode, "Postal code", 32);
            countryCode = (text(address?.countryCode, "Country", 2) ?? "US").toUpperCase();
            if (!/^[A-Z]{2}$/.test(countryCode)) {
                throw new Error("Country must use a two-letter country code.");
            }
            notes = text(input.notes, "Notes", 2000);
            addressNeeded = boolean(input.addressNeeded, "Address needed");
        } catch (error) {
            return json(request, {
                error: error instanceof Error ? error.message : "Invalid household."
            }, 400);
        }

        const result = await env.wedding_rsvp_db.prepare(`
            UPDATE households SET
                household_name = ?1,
                household_key = ?2,
                email = ?3,
                street = ?4,
                address_line_2 = ?5,
                city = ?6,
                state = ?7,
                zip = ?8,
                country_code = ?9,
                notes = ?10,
                address_needed = ?11
            WHERE id = ?12 AND archived_at IS NULL
        `).bind(
            householdName, householdKey, email, line1, line2,
            city, region, postalCode, countryCode, notes,
            addressNeeded ? 1 : 0, householdId
        ).run();

        if (result.meta.changes === 0) {
            return json(request, { error: "Household not found." }, 404);
        }
        return json(request, { success: true, householdId });
    } catch (error) {
        if (error instanceof Error && error.message.includes("UNIQUE constraint")) {
            return json(request, { error: "That household key is already in use." }, 409);
        }
        return errorResponse(request, error, "Unable to update the household.");
    }
}

export async function createAdminHousehold(
    request: Request,
    env: Env
): Promise<Response> {
    try {
        await authenticateAdmin(request, env);
        const input = await body(request);
        let householdName: string;
        try {
            householdName = text(input.householdName, "Household name", 150, true)!;
        } catch (error) {
            return json(request, { error: (error as Error).message }, 400);
        }

        const baseKey = slug(householdName);
        let householdKey = baseKey;
        let suffix = 2;
        while (await env.wedding_rsvp_db.prepare(
            "SELECT id FROM households WHERE household_key = ?1"
        ).bind(householdKey).first()) {
            householdKey = `${baseKey}-${suffix++}`;
        }

        const result = await env.wedding_rsvp_db.prepare(`
            INSERT INTO households (
                household_name, household_key, address_needed, country_code
            ) VALUES (?1, ?2, 1, 'US')
        `).bind(householdName, householdKey).run();

        return json(request, {
            success: true,
            householdId: result.meta.last_row_id,
            householdKey
        }, 201);
    } catch (error) {
        return errorResponse(request, error, "Unable to add the household.");
    }
}

export async function archiveAdminHousehold(
    request: Request,
    env: Env,
    householdId: number
): Promise<Response> {
    try {
        await authenticateAdmin(request, env);
        const existing = await env.wedding_rsvp_db.prepare(
            "SELECT id FROM households WHERE id = ?1 AND archived_at IS NULL"
        ).bind(householdId).first();
        if (!existing) {
            return json(request, { error: "Household not found." }, 404);
        }

        await env.wedding_rsvp_db.batch([
            env.wedding_rsvp_db.prepare(`
                UPDATE guests SET archived_at = CURRENT_TIMESTAMP
                WHERE household_id = ?1 AND archived_at IS NULL
            `).bind(householdId),
            env.wedding_rsvp_db.prepare(`
                UPDATE households SET archived_at = CURRENT_TIMESTAMP
                WHERE id = ?1
            `).bind(householdId)
        ]);
        return json(request, { success: true });
    } catch (error) {
        return errorResponse(request, error, "Unable to archive the household.");
    }
}

function guestFields(input: Record<string, unknown>) {
    const invitations = input.invitations as Record<string, unknown> | undefined;
    const classifications = input.classifications as Record<string, unknown> | undefined;
    const choice = (
        value: unknown,
        label: string,
        allowed: string[]
    ): string | null => {
        if (value === null || value === undefined || value === "") {
            return null;
        }
        if (typeof value !== "string" || !allowed.includes(value)) {
            throw new Error(`${label} is invalid.`);
        }
        return value;
    };
    const relationshipType = choice(
        classifications?.relationshipType,
        "Relationship",
        ["friend", "family"]
    );
    const familySide = choice(
        classifications?.familySide,
        "Family side",
        ["moms-side", "dads-side"]
    );
    if (relationshipType !== "family" && familySide) {
        throw new Error("Family side can only be set for Family guests.");
    }
    if (relationshipType === "family" && !familySide) {
        throw new Error("Choose Mom's side or Dad's side for Family guests.");
    }
    return {
        firstName: text(input.firstName, "First name", 100, true)!,
        lastName: text(input.lastName, "Last name", 100) ?? "",
        householdId: Number(input.householdId),
        welcome: boolean(invitations?.welcome, "Welcome invitation"),
        wedding: boolean(invitations?.wedding, "Wedding invitation"),
        brunch: boolean(invitations?.brunch, "Brunch invitation"),
        coupleSide: choice(
            classifications?.coupleSide,
            "Scott/Quiana classification",
            ["scott", "quiana"]
        ),
        relationshipType,
        familySide
    };
}

export async function createAdminGuest(
    request: Request,
    env: Env,
    householdId: number
): Promise<Response> {
    try {
        await authenticateAdmin(request, env);
        const input = await body(request);
        let guest;
        try {
            guest = guestFields({
                ...input,
                householdId,
                invitations: input.invitations ?? {
                    welcome: true,
                    wedding: true,
                    brunch: true
                },
                classifications: input.classifications ?? {
                    coupleSide: null,
                    relationshipType: null,
                    familySide: null
                }
            });
        } catch (error) {
            return json(request, { error: (error as Error).message }, 400);
        }

        const household = await env.wedding_rsvp_db.prepare(
            "SELECT id FROM households WHERE id = ?1 AND archived_at IS NULL"
        ).bind(householdId).first();
        if (!household) {
            return json(request, { error: "Household not found." }, 404);
        }

        const result = await env.wedding_rsvp_db.prepare(`
            INSERT INTO guests (
                household_id, first_name, last_name,
                is_invited_to_welcome, is_invited_to_wedding,
                is_invited_to_brunch, couple_side,
                relationship_type, family_side
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
        `).bind(
            householdId, guest.firstName, guest.lastName,
            guest.welcome ? 1 : 0,
            guest.wedding ? 1 : 0,
            guest.brunch ? 1 : 0,
            guest.coupleSide,
            guest.relationshipType,
            guest.familySide
        ).run();
        return json(request, {
            success: true,
            guestId: result.meta.last_row_id
        }, 201);
    } catch (error) {
        return errorResponse(request, error, "Unable to add the guest.");
    }
}

export async function updateAdminGuest(
    request: Request,
    env: Env,
    guestId: number
): Promise<Response> {
    try {
        await authenticateAdmin(request, env);
        const input = await body(request);
        let guest;
        let restrictionIds: number[];
        let dietaryNotes: string | null;
        let rsvp: Record<string, unknown> | null;
        try {
            guest = guestFields(input);
            if (!Number.isInteger(guest.householdId) || guest.householdId <= 0) {
                throw new Error("Select a valid household.");
            }
            restrictionIds = Array.isArray(input.dietaryRestrictionIds)
                ? [...new Set(input.dietaryRestrictionIds.map(Number))]
                : [];
            if (restrictionIds.some((id) => !Number.isInteger(id) || id <= 0)) {
                throw new Error("Dietary selections are invalid.");
            }
            dietaryNotes = text(input.dietaryNotes, "Dietary notes", 1000);
            rsvp = input.rsvp === null
                ? null
                : input.rsvp as Record<string, unknown>;
            if (rsvp) {
                boolean(rsvp.welcome, "Welcome RSVP");
                boolean(rsvp.wedding, "Wedding RSVP");
                boolean(rsvp.brunch, "Brunch RSVP");
            }
        } catch (error) {
            return json(request, { error: (error as Error).message }, 400);
        }

        const targetHousehold = await env.wedding_rsvp_db.prepare(
            "SELECT id FROM households WHERE id = ?1 AND archived_at IS NULL"
        ).bind(guest.householdId).first();
        if (!targetHousehold) {
            return json(request, { error: "Selected household not found." }, 404);
        }

        const statements = [
            env.wedding_rsvp_db.prepare(`
                UPDATE guests SET household_id = ?1, first_name = ?2,
                    last_name = ?3, is_invited_to_welcome = ?4,
                    is_invited_to_wedding = ?5, is_invited_to_brunch = ?6,
                    couple_side = ?7, relationship_type = ?8,
                    family_side = ?9
                WHERE id = ?10 AND archived_at IS NULL
            `).bind(
                guest.householdId, guest.firstName, guest.lastName,
                guest.welcome ? 1 : 0, guest.wedding ? 1 : 0,
                guest.brunch ? 1 : 0, guest.coupleSide,
                guest.relationshipType, guest.familySide, guestId
            ),
            rsvp
                ? env.wedding_rsvp_db.prepare(`
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
                    guestId, rsvp.welcome ? 1 : 0,
                    rsvp.wedding ? 1 : 0, rsvp.brunch ? 1 : 0
                )
                : env.wedding_rsvp_db.prepare(
                    "DELETE FROM guest_rsvps WHERE guest_id = ?1"
                ).bind(guestId),
            env.wedding_rsvp_db.prepare(
                "DELETE FROM guest_dietary_restrictions WHERE guest_id = ?1"
            ).bind(guestId),
            ...restrictionIds.map((restrictionId) =>
                env.wedding_rsvp_db.prepare(`
                    INSERT INTO guest_dietary_restrictions (
                        guest_id, restriction_id, notes
                    )
                    SELECT ?1, id,
                        CASE WHEN LOWER(name) = 'other' THEN ?3 ELSE NULL END
                    FROM dietary_restrictions
                    WHERE id = ?2
                `).bind(guestId, restrictionId, dietaryNotes)
            )
        ];

        const results = await env.wedding_rsvp_db.batch(statements);
        if (results[0].meta.changes === 0) {
            return json(request, { error: "Guest not found." }, 404);
        }
        return json(request, { success: true, guestId });
    } catch (error) {
        return errorResponse(request, error, "Unable to update the guest.");
    }
}

export async function archiveAdminGuest(
    request: Request,
    env: Env,
    guestId: number
): Promise<Response> {
    try {
        await authenticateAdmin(request, env);
        const result = await env.wedding_rsvp_db.prepare(`
            UPDATE guests SET archived_at = CURRENT_TIMESTAMP
            WHERE id = ?1 AND archived_at IS NULL
        `).bind(guestId).run();
        if (result.meta.changes === 0) {
            return json(request, { error: "Guest not found." }, 404);
        }
        return json(request, { success: true });
    } catch (error) {
        return errorResponse(request, error, "Unable to archive the guest.");
    }
}
