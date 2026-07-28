import { Env } from "../types";

import {
    ok,
    badRequest
} from "../lib/responses";

import {
    saveAcknowledgements,
    Acknowledgements
} from "../db/acknowledgements";


export async function saveAcknowledgementsRoute(
    request: Request,
    env: Env
): Promise<Response> {

    const body =
        await request.json() as Acknowledgements;


    if (!body.householdId) {

        return badRequest(
            "Missing household id."
        );
    }


    await saveAcknowledgements(
        env,
        body
    );


    return ok({
        success: true
    });
}