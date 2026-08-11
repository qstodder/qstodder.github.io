import { Env } from "../types";
import {
    AdminAuthError,
    authenticateAdmin
} from "../lib/adminAuth";
import { withAdminCors } from "../lib/adminCors";

interface AdminAddressRequest {
    street?: unknown;
    city?: unknown;
    state?: unknown;
    zip?: unknown;
}

function adminJson(
    request: Request,
    data: unknown,
    status = 200
): Response {
    return withAdminCors(
        request,
        Response.json(data, { status })
    );
}

function requiredText(
    value: unknown,
    label: string,
    maxLength: number
): string {
    if (typeof value !== "string") {
        throw new Error(`${label} is required.`);
    }

    const normalized = value.trim();

    if (!normalized) {
        throw new Error(`${label} is required.`);
    }

    if (normalized.length > maxLength) {
        throw new Error(
            `${label} must be ${maxLength} characters or fewer.`
        );
    }

    return normalized;
}

export async function updateAdminAddress(
    request: Request,
    env: Env,
    householdId: number
): Promise<Response> {
    try {
        await authenticateAdmin(request, env);

        if (
            !Number.isInteger(householdId) ||
            householdId <= 0
        ) {
            return adminJson(
                request,
                { error: "Invalid household id." },
                400
            );
        }

        let body: AdminAddressRequest;

        try {
            body = await request.json();
        } catch {
            return adminJson(
                request,
                { error: "A valid JSON address is required." },
                400
            );
        }

        let street: string;
        let city: string;
        let state: string;
        let zip: string;

        try {
            street = requiredText(
                body.street,
                "Street",
                200
            );
            city = requiredText(
                body.city,
                "City",
                100
            );
            state = requiredText(
                body.state,
                "State",
                100
            );
            if (/^[a-z]{2}$/i.test(state)) {
                state = state.toUpperCase();
            }
            zip = requiredText(
                body.zip,
                "Postal code",
                32
            );
        } catch (error) {
            return adminJson(
                request,
                {
                    error:
                        error instanceof Error
                            ? error.message
                            : "Invalid address."
                },
                400
            );
        }

        const result = await env.wedding_rsvp_db
            .prepare(`
                UPDATE households
                SET
                    street = ?1,
                    city = ?2,
                    state = ?3,
                    zip = ?4
                WHERE id = ?5
            `)
            .bind(
                street,
                city,
                state,
                zip,
                householdId
            )
            .run();

        if (result.meta.changes === 0) {
            return adminJson(
                request,
                { error: "Household not found." },
                404
            );
        }

        return adminJson(request, {
            success: true,
            householdId,
            address: {
                street,
                city,
                state,
                zip
            }
        });
    } catch (error) {
        const status =
            error instanceof AdminAuthError
                ? error.status
                : 500;
        const message =
            error instanceof AdminAuthError
                ? error.message
                : "Unable to update the household address.";

        return adminJson(
            request,
            { error: message },
            status
        );
    }
}
