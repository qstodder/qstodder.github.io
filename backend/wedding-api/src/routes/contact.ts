import { Env } from "../types";
import { badRequest, ok } from "../lib/responses";
import {
    saveContactInfo,
    ContactInfo
} from "../db/contact";

export async function saveContactInfoRoute(
    request: Request,
    env: Env
): Promise<Response> {

    const body =
        await request.json() as ContactInfo;

    if (!body.householdId) {
        return badRequest(
            "Missing household id."
        );
    }

    await saveContactInfo(
        env,
        body
    );

    return ok({
        success: true
    });
}
