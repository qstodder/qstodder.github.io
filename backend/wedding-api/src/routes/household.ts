import { Env } from "../types";
import { getHousehold } from "../db/households";
import { ok, badRequest, notFound } from "../lib/responses";

export async function getHouseholdRoute(
    request: Request,
    env: Env
): Promise<Response> {

    const url = new URL(request.url);

    const id =
        Number(url.pathname.split("/").pop());

    if (!id) {
        return badRequest("Invalid household id.");
    }

    const household =
        await getHousehold(
            env,
            id
        );

    if (!household) {
        return notFound("Household not found.");
    }

    return ok(household);
}