import { Env } from "../types";

import {
    ok,
    badRequest
} from "../lib/responses";

import {
    saveGuestDietary,
    GuestDietary
} from "../db/guestDietary";

interface RequestBody {

    guests: GuestDietary[];
}

export async function saveGuestDietaryRoute(
    request: Request,
    env: Env
): Promise<Response> {

    const body =
        await request.json() as RequestBody;

    if (!body.guests) {

        return badRequest(
            "Missing guests."
        );
    }

    await saveGuestDietary(
        env,
        body.guests
    );

    return ok({
        success: true
    });
}