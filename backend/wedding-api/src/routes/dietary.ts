import { Env } from "../types";
import { getDietaryRestrictions } from "../db/dietary";
import { ok } from "../lib/responses";

export async function getDietaryRestrictionsRoute(
    request: Request,
    env: Env
): Promise<Response> {

    const restrictions =
        await getDietaryRestrictions(env);

    return ok(restrictions);
}