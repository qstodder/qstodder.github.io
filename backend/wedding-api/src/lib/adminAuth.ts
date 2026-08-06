import {
    createRemoteJWKSet,
    jwtVerify
} from "jose";

import { Env } from "../types";

export interface AdminIdentity {
    email: string;
}

export class AdminAuthError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = "AdminAuthError";
        this.status = status;
    }
}

export async function authenticateAdmin(
    request: Request,
    env: Env
): Promise<AdminIdentity> {

    const hostname = new URL(request.url).hostname;

    if (
        hostname === "localhost" ||
        hostname === "127.0.0.1"
    ) {
        return {
            email: "Local development"
        };
    }

    if (
        !env.ACCESS_TEAM_DOMAIN ||
        !env.ACCESS_AUD ||
        !env.ADMIN_EMAILS
    ) {
        throw new AdminAuthError(
            "Admin access has not been configured.",
            503
        );
    }

    const token =
        request.headers.get(
            "cf-access-jwt-assertion"
        );

    if (!token) {
        throw new AdminAuthError(
            "Cloudflare Access authentication is required.",
            401
        );
    }

    const teamDomain =
        env.ACCESS_TEAM_DOMAIN.replace(/\/$/, "");

    try {
        const jwks = createRemoteJWKSet(
            new URL(
                `${teamDomain}/cdn-cgi/access/certs`
            )
        );

        const { payload } = await jwtVerify(
            token,
            jwks,
            {
                issuer: teamDomain,
                audience: env.ACCESS_AUD
            }
        );

        const email =
            typeof payload.email === "string"
                ? payload.email.trim().toLowerCase()
                : "";

        const allowedEmails =
            env.ADMIN_EMAILS
                .split(",")
                .map((value) =>
                    value.trim().toLowerCase()
                )
                .filter(Boolean);

        if (!email || !allowedEmails.includes(email)) {
            throw new AdminAuthError(
                "This account is not authorized for wedding administration.",
                403
            );
        }

        return { email };

    } catch (error) {
        if (error instanceof AdminAuthError) {
            throw error;
        }

        throw new AdminAuthError(
            "Cloudflare Access authentication could not be verified.",
            401
        );
    }
}
