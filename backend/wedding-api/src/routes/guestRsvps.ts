import { Env } from "../types";
import {
    ok,
    badRequest
} from "../lib/responses";

import {
    saveGuestRsvps,
    GuestRsvp
} from "../db/guestRsvps";

interface RequestBody {

    guests: GuestRsvp[];
}

export async function saveGuestRsvpsRoute(
    request: Request,
    env: Env
): Promise<Response> {

    const body =
        await request.json() as RequestBody;

    if (
        !body.guests ||
        body.guests.length === 0
    ) {

        return badRequest(
            "No guests supplied."
        );
    }

    await saveGuestRsvps(
        env,
        body.guests
    );

    return ok({
        success: true
    });
}