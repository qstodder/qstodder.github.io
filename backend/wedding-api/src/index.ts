import { Env } from "./types";
import { searchGuests } from "./routes/guests";
import { ok, badRequest } from "./lib/responses";
import { getDietaryRestrictionsRoute } from "./routes/dietary";
import { getRsvpRoute, saveRsvpRoute } from "./routes/rsvp"
import {
    refreshGmailAccessToken
} from "./services/gmail";
import {
    getAdminData,
    getAdminGuests
} from "./routes/admin";
import { updateAdminAddress } from "./routes/adminAddress";
import {
    getAdminAsset,
    getAdminEmailPage,
    getAdminGuestsPage,
    getAdminHouseholdPage,
    getAdminPage
} from "./routes/adminPage";
import { sendAdminEmailBatch } from "./routes/adminEmail";
import { adminPreflight } from "./lib/adminCors";
import {
    archiveAdminGuest,
    archiveAdminHousehold,
    createAdminGuest,
    createAdminHousehold,
    getAdminHousehold,
    updateAdminGuest,
    updateAdminHousehold
} from "./routes/adminHouseholds";

export default {

    async fetch(
        request: Request,
        env: Env
    ): Promise<Response> {

        const url = new URL(request.url);

        if (
            request.method === "OPTIONS" &&
            url.pathname.startsWith("/api/admin")
        ) {
            return adminPreflight(request);
        }

		if (request.method === "OPTIONS") {
			return ok(null)
		}

        //-----------------------------------------
        // Health check
        //-----------------------------------------

        if (url.pathname === "/") {
            return ok("Wedding RSVP API is running!");
        }

        if (
            request.method === "GET" &&
            url.pathname === "/admin"
        ) {
            return Response.redirect(
                `${url.origin}/admin/`,
                308
            );
        }

        if (
            request.method === "GET" &&
            url.pathname === "/admin/"
        ) {
            return getAdminPage(request, env);
        }

        if (
            request.method === "GET" &&
            /^\/admin\/households\/\d+\/?$/.test(url.pathname)
        ) {
            return getAdminHouseholdPage(request, env);
        }

        if (
            request.method === "GET" &&
            /^\/admin\/guests\/?$/.test(url.pathname)
        ) {
            return getAdminGuestsPage(request, env);
        }

        if (
            request.method === "GET" &&
            /^\/admin\/email\/?$/.test(url.pathname)
        ) {
            return getAdminEmailPage(request, env);
        }

        const adminAssetMatch = url.pathname.match(
            /^\/admin\/assets\/([^/]+)$/
        );
        if (
            request.method === "GET" &&
            adminAssetMatch
        ) {
            return getAdminAsset(
                request,
                env,
                adminAssetMatch[1]
            );
        }

        //-----------------------------------------
        // Protected admin dashboard data
        //-----------------------------------------

        if (
            request.method === "GET" &&
            url.pathname === "/api/admin"
        ) {
            return getAdminData(request, env);
        }

        if (
            request.method === "GET" &&
            url.pathname === "/api/admin/guests"
        ) {
            return getAdminGuests(request, env);
        }

        if (
            request.method === "POST" &&
            url.pathname === "/api/admin/email/send"
        ) {
            return sendAdminEmailBatch(request, env);
        }

        if (
            request.method === "POST" &&
            url.pathname === "/api/admin/households"
        ) {
            return createAdminHousehold(request, env);
        }

        const adminHouseholdMatch = url.pathname.match(
            /^\/api\/admin\/households\/(\d+)$/
        );
        if (adminHouseholdMatch) {
            const householdId = Number(adminHouseholdMatch[1]);
            if (request.method === "GET") {
                return getAdminHousehold(request, env, householdId);
            }
            if (request.method === "PATCH") {
                return updateAdminHousehold(request, env, householdId);
            }
            if (request.method === "DELETE") {
                return archiveAdminHousehold(request, env, householdId);
            }
        }

        const adminHouseholdGuestsMatch = url.pathname.match(
            /^\/api\/admin\/households\/(\d+)\/guests$/
        );
        if (
            request.method === "POST" &&
            adminHouseholdGuestsMatch
        ) {
            return createAdminGuest(
                request,
                env,
                Number(adminHouseholdGuestsMatch[1])
            );
        }

        const adminGuestMatch = url.pathname.match(
            /^\/api\/admin\/guests\/(\d+)$/
        );
        if (adminGuestMatch) {
            const guestId = Number(adminGuestMatch[1]);
            if (request.method === "PATCH") {
                return updateAdminGuest(request, env, guestId);
            }
            if (request.method === "DELETE") {
                return archiveAdminGuest(request, env, guestId);
            }
        }

        if (
            request.method === "PATCH" &&
            /^\/api\/admin\/households\/\d+\/address$/.test(
                url.pathname
            )
        ) {
            const householdId = Number(
                url.pathname.split("/")[4]
            );

            return updateAdminAddress(
                request,
                env,
                householdId
            );
        }

        //-----------------------------------------
        // Guest search
        //-----------------------------------------

        if (
            request.method === "GET" &&
            url.pathname === "/api/guests"
        ) {
            return searchGuests(
                request,
                env
            );

        }
		
		//-------------------------------------------------
        // Get dietary information
        //-------------------------------------------------
		if (
			request.method === "GET" &&
					url.pathname === "/api/dietary-restrictions"
		) {
			return getDietaryRestrictionsRoute(
				request,
				env
			);
		}

		//-------------------------------------------------
		// Get full RSVP
		//-------------------------------------------------

		if (
			request.method === "GET" &&
			url.pathname.startsWith("/api/rsvp/")
		) {

			const householdId =
				Number(
					url.pathname.split("/").pop()
				);


			if (!householdId) {

				return badRequest("Invalid household id");
			}


			return getRsvpRoute(
				request,
				env,
				householdId
			);
		}

		//-------------------------------------------------
		// Save complete RSVP
		//-------------------------------------------------

		if (
			request.method === "POST" &&
			url.pathname === "/api/rsvp"
		) {

			return saveRsvpRoute(
				request,
				env
			);
		}

        //-----------------------------------------
        // 404
        //-----------------------------------------

        return badRequest( "Not Found" );
    },

    async scheduled(
        controller: ScheduledController,
        env: Env
    ): Promise<void> {

        try {

            await refreshGmailAccessToken(env);

            console.log(
                "Gmail OAuth keepalive succeeded.",
                {
                    cron: controller.cron,
                    scheduledTime:
                        controller.scheduledTime
                }
            );

        } catch (error) {

            console.error(
                "Gmail OAuth keepalive failed.",
                {
                    cron: controller.cron,
                    scheduledTime:
                        controller.scheduledTime,
                    error:
                        error instanceof Error
                            ? error.message
                            : "Unknown OAuth error"
                }
            );

            throw error;
        }
    }

}
