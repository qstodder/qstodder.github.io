import { Env } from "../types";

export async function getAdminData(
    request: Request,
    env: Env
) {
    return Response.json({
        message: "Coming soon!"
    });
}