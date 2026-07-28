import { Env, RSVPRequest } from "./types";
import { searchGuests } from "./routes/guests";
import { ok, badRequest, notFound } from "./lib/responses";
import { getHouseholdRoute } from "./routes/household";
import { getDietaryRestrictionsRoute } from "./routes/dietary";
import { saveContactInfoRoute } from "./routes/contact";
import { saveGuestRsvpsRoute } from "./routes/guestRsvps";
import { saveGuestDietaryRoute } from "./routes/guestDietary";
import { saveAcknowledgementsRoute } from "./routes/acknowledgements";
import { getRsvpRoute, saveRsvpRoute } from "./routes/rsvp"

export default {

    async fetch(
        request: Request,
        env: Env
    ): Promise<Response> {

        const url = new URL(request.url);

		if (request.method === "OPTIONS") {
			return ok(null)
		}

        //-----------------------------------------
        // Health check
        //-----------------------------------------

        if (url.pathname === "/") {
            return ok("Wedding RSVP API is running!");
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
        // Get household information
        //-------------------------------------------------

        if (
			request.method === "GET" &&
			url.pathname.startsWith("/api/household/")
		) {
			return getHouseholdRoute(
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
        // Get household contact information
        //-------------------------------------------------


		if (
			request.method === "POST" &&
			url.pathname === "/api/contact-info"
		) {

			return saveContactInfoRoute(
				request,
				env
			);
		}

		//-------------------------------------------------
        // Get Guest RSVPs information
        //-------------------------------------------------
		
		if (
			request.method === "POST" &&
			url.pathname === "/api/guest-rsvps"
		) {

			return saveGuestRsvpsRoute(
				request,
				env
			);
		}

		//-------------------------------------------------
		// Save guest dietary restrictions
		//-------------------------------------------------

		if (
			request.method === "POST" &&
			url.pathname === "/api/guest-dietary"
		) {

			return saveGuestDietaryRoute(
				request,
				env
			);
		}

		//-------------------------------------------------
		// Save household acknowledgements
		//-------------------------------------------------

		if (
			request.method === "POST" &&
			url.pathname === "/api/acknowledgements"
		) {

			return saveAcknowledgementsRoute(
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
    }

}