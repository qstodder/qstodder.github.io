import {
    env,
    applyD1Migrations,
    createExecutionContext,
    waitOnExecutionContext,
    SELF
} from "cloudflare:test";
import { beforeAll, describe, it, expect, vi } from "vitest";
import worker from "../src/index";
import {
    authenticateAdmin
} from "../src/lib/adminAuth";
import { updateAdminAddress } from "../src/routes/adminAddress";
import {
    getAdminAsset,
    getAdminPage
} from "../src/routes/adminPage";
import { Env } from "../src/types";
import {
    archiveAdminGuest,
    createAdminGuest,
    createAdminHousehold,
    getAdminHousehold,
    updateAdminGuest,
    updateAdminHousehold
} from "../src/routes/adminHouseholds";
import { getAdminGuests } from "../src/routes/admin";

const IncomingRequest =
    Request<unknown, IncomingRequestCfProperties>;

beforeAll(async () => {
    await applyD1Migrations(
        env.wedding_rsvp_db,
        env.TEST_MIGRATIONS
    );
});

describe("Wedding RSVP Worker", () => {

    it("returns the API health check", async () => {

        const request =
            new IncomingRequest("http://example.com");

        const context =
            createExecutionContext();

        const response =
            await worker.fetch(request, env, context);

        await waitOnExecutionContext(context);

        expect(response.status).toBe(200);
        expect(await response.json()).toBe(
            "Wedding RSVP API is running!"
        );
    });

    it("returns the API health check through SELF", async () => {

        const response =
            await SELF.fetch("https://example.com");

        expect(response.status).toBe(200);
        expect(await response.json()).toBe(
            "Wedding RSVP API is running!"
        );
    });

    it("fails closed when admin access is not configured", async () => {

        const response = await SELF.fetch(
            "https://example.com/api/admin"
        );

        expect(response.status).toBe(503);
        expect(await response.json()).toEqual({
            error: "Admin access has not been configured."
        });
    });

    it("allows the admin development identity only on localhost", async () => {

        const identity = await authenticateAdmin(
            new Request(
                "http://localhost:8787/api/admin"
            ),
            env
        );

        expect(identity).toEqual({
            email: "Local development"
        });
    });

    it("allows PATCH in admin preflight responses", async () => {

        const response = await SELF.fetch(
            "https://example.com/api/admin/households/1/address",
            {
                method: "OPTIONS",
                headers: {
                    Origin: "https://qstodder.github.io"
                }
            }
        );

        expect(response.status).toBe(204);
        expect(
            response.headers.get(
                "Access-Control-Allow-Methods"
            )
        ).toContain("PATCH");
    });
});

describe("Admin household addresses", () => {

    function addressRequest(
        body: Record<string, unknown>
    ): Request {
        return new Request(
            "http://localhost:8787/api/admin/households/12/address",
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            }
        );
    }

    function databaseEnv(changes: number) {
        const run = vi.fn().mockResolvedValue({
            meta: { changes }
        });
        const bind = vi.fn().mockReturnValue({ run });
        const prepare = vi.fn().mockReturnValue({ bind });

        return {
            env: {
                wedding_rsvp_db: { prepare }
            } as unknown as Env,
            prepare,
            bind,
            run
        };
    }

    it("updates and normalizes a complete address", async () => {

        const database = databaseEnv(1);
        const response = await updateAdminAddress(
            addressRequest({
                street: "  123 Main Street  ",
                city: " San Diego ",
                state: "ca",
                zip: "92101"
            }),
            database.env,
            12
        );

        expect(response.status).toBe(200);
        expect(database.bind).toHaveBeenCalledWith(
            "123 Main Street",
            "San Diego",
            "CA",
            "92101",
            12
        );
        expect(await response.json()).toEqual({
            success: true,
            householdId: 12,
            address: {
                street: "123 Main Street",
                city: "San Diego",
                state: "CA",
                zip: "92101"
            }
        });
    });

    it("accepts full international region names", async () => {

        const database = databaseEnv(1);
        const response = await updateAdminAddress(
            addressRequest({
                street: "123 Main Street",
                city: "San Diego",
                state: "Noord-Holland",
                zip: "1016 GV"
            }),
            database.env,
            12
        );

        expect(response.status).toBe(200);
        expect(database.bind).toHaveBeenCalledWith(
            "123 Main Street",
            "San Diego",
            "Noord-Holland",
            "1016 GV",
            12
        );
    });

    it("accepts non-US postal code formats", async () => {

        const database = databaseEnv(1);
        const response = await updateAdminAddress(
            addressRequest({
                street: "123 Main Street",
                city: "San Diego",
                state: "CA",
                zip: "SW1A 1AA"
            }),
            database.env,
            12
        );

        expect(response.status).toBe(200);
    });

    it("returns not found when no household is updated", async () => {

        const database = databaseEnv(0);
        const response = await updateAdminAddress(
            addressRequest({
                street: "123 Main Street",
                city: "San Diego",
                state: "CA",
                zip: "92101"
            }),
            database.env,
            999
        );

        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({
            error: "Household not found."
        });
    });

    it("fails closed outside localhost without admin configuration", async () => {

        const database = databaseEnv(1);
        const request = new Request(
            "https://example.com/api/admin/households/12/address",
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    street: "123 Main Street",
                    city: "San Diego",
                    state: "CA",
                    zip: "92101"
                })
            }
        );
        const response = await updateAdminAddress(
            request,
            database.env,
            12
        );

        expect(response.status).toBe(503);
        expect(database.prepare).not.toHaveBeenCalled();
    });
});

describe("Worker-hosted admin dashboard", () => {

    it("serves the dashboard on the authenticated Worker origin", async () => {

        const response = await getAdminPage(
            new Request(
                "http://localhost:8787/admin/"
            ),
            env
        );
        const html = await response.text();

        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type"))
            .toContain("text/html");
        expect(response.headers.get("Cache-Control"))
            .toBe("no-store");
        expect(response.headers.get("Content-Security-Policy"))
            .toContain("connect-src 'self'");
        expect(html).toContain(
            "Wedding Administration"
        );
        expect(html).toContain(
            "/admin/assets/admin.js"
        );
        expect(response.headers.get("Content-Security-Policy"))
            .toContain("script-src 'self'");
    });

    it("proxies allowlisted dashboard assets through the Worker origin", async () => {

        const fetchMock = vi.spyOn(globalThis, "fetch")
            .mockResolvedValueOnce(new Response(
                "console.log('dashboard');",
                { status: 200 }
            ));

        const response = await getAdminAsset(
            new Request(
                "http://localhost:8787/admin/assets/admin.js"
            ),
            env,
            "admin.js"
        );

        expect(fetchMock).toHaveBeenCalledWith(
            "https://qstodder.github.io/wedding/js/admin.js"
        );
        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type"))
            .toContain("text/javascript");
        expect(await response.text())
            .toBe("console.log('dashboard');");

        fetchMock.mockRestore();
    });

    it("rejects dashboard assets outside the allowlist", async () => {

        const response = await getAdminAsset(
            new Request(
                "http://localhost:8787/admin/assets/private.txt"
            ),
            env,
            "private.txt"
        );

        expect(response.status).toBe(404);
    });

    it("fails closed when the hosted page is not authenticated", async () => {

        const response = await getAdminPage(
            new Request(
                "https://example.com/admin/"
            ),
            env
        );

        expect(response.status).toBe(503);
        expect(await response.json()).toEqual({
            error: "Admin access has not been configured."
        });
    });
});

describe("Admin household detail editing", () => {

    function adminRequest(
        path: string,
        method = "GET",
        data?: Record<string, unknown>
    ): Request {
        return new Request(`http://localhost:8787${path}`, {
            method,
            headers: data ? { "Content-Type": "application/json" } : undefined,
            body: data ? JSON.stringify(data) : undefined
        });
    }

    it("creates a household with a unique generated key", async () => {

        const response = await createAdminHousehold(
            adminRequest("/api/admin/households", "POST", {
                householdName: "Van den Berg Family"
            }),
            env
        );
        const result = await response.json<{
            householdId: number;
            householdKey: string;
        }>();

        expect(response.status, JSON.stringify(result)).toBe(201);
        expect(result.householdId).toBeGreaterThan(0);
        expect(result.householdKey).toBe("van-den-berg-family");
    });

    it("stores an international household address", async () => {

        const created = await createAdminHousehold(
            adminRequest("/api/admin/households", "POST", {
                householdName: "Amsterdam Household"
            }),
            env
        );
        const { householdId } = await created.json<{ householdId: number }>();
        const response = await updateAdminHousehold(
            adminRequest(`/api/admin/households/${householdId}`, "PATCH", {
                householdName: "Amsterdam Household",
                householdKey: "amsterdam-household",
                email: "guest@example.nl",
                addressNeeded: true,
                address: {
                    line1: "Prinsengracht 263",
                    line2: "2 hoog",
                    city: "Amsterdam",
                    region: "Noord-Holland",
                    postalCode: "1016 GV",
                    countryCode: "NL"
                },
                notes: "International postage"
            }),
            env,
            householdId
        );

        expect(response.status, await response.clone().text()).toBe(200);

        const detailResponse = await getAdminHousehold(
            adminRequest(`/api/admin/households/${householdId}`),
            env,
            householdId
        );
        const detail = await detailResponse.json<any>();
        expect(detail.household.address).toEqual({
            line1: "Prinsengracht 263",
            line2: "2 hoog",
            city: "Amsterdam",
            region: "Noord-Holland",
            postalCode: "1016 GV",
            countryCode: "NL"
        });
    });

    it("adds, edits, and archives a guest without deleting history", async () => {

        const createdHousehold = await createAdminHousehold(
            adminRequest("/api/admin/households", "POST", {
                householdName: "Guest Editor Household"
            }),
            env
        );
        const { householdId } = await createdHousehold.json<{ householdId: number }>();
        const createdGuest = await createAdminGuest(
            adminRequest(`/api/admin/households/${householdId}/guests`, "POST", {
                firstName: "Sanne",
                lastName: "Jansen"
            }),
            env,
            householdId
        );
        const { guestId } = await createdGuest.json<{ guestId: number }>();

        const updateResponse = await updateAdminGuest(
            adminRequest(`/api/admin/guests/${guestId}`, "PATCH", {
                firstName: "Sanne",
                lastName: "de Jansen",
                householdId,
                invitations: { welcome: true, wedding: true, brunch: false },
                classifications: {
                    coupleSide: "quiana",
                    relationshipType: "family",
                    familySide: "moms-side"
                },
                rsvp: { welcome: true, wedding: true, brunch: false },
                dietaryRestrictionIds: [1],
                dietaryNotes: null
            }),
            env,
            guestId
        );
        expect(updateResponse.status, await updateResponse.clone().text()).toBe(200);

        const classification = await env.wedding_rsvp_db.prepare(`
            SELECT couple_side, relationship_type, family_side
            FROM guests WHERE id = ?1
        `).bind(guestId).first();
        expect(classification).toEqual({
            couple_side: "quiana",
            relationship_type: "family",
            family_side: "moms-side"
        });

        const archiveResponse = await archiveAdminGuest(
            adminRequest(`/api/admin/guests/${guestId}`, "DELETE"),
            env,
            guestId
        );
        expect(archiveResponse.status).toBe(200);

        const storedRsvp = await env.wedding_rsvp_db.prepare(
            "SELECT guest_id FROM guest_rsvps WHERE guest_id = ?1"
        ).bind(guestId).first();
        expect(storedRsvp).not.toBeNull();
    });
});

describe("Admin guest directory", () => {

    it("returns active guests with household, RSVP, and dietary data", async () => {

        const response = await getAdminGuests(
            new Request("http://localhost:8787/api/admin/guests"),
            env
        );
        const result = await response.json<any>();

        expect(response.status).toBe(200);
        expect(result.admin.email).toBe("Local development");
        expect(result.guests.length).toBeGreaterThan(0);
        expect(result.guests[0]).toMatchObject({
            id: expect.any(Number),
            firstName: expect.any(String),
            lastName: expect.any(String),
            household: {
                id: expect.any(Number),
                householdName: expect.any(String)
            },
            invitations: {
                welcome: expect.any(Boolean),
                wedding: expect.any(Boolean),
                brunch: expect.any(Boolean)
            },
            classifications: {
                coupleSide: expect.toSatisfy(
                    (value: unknown) =>
                        value === null ||
                        value === "scott" ||
                        value === "quiana"
                ),
                relationshipType: expect.toSatisfy(
                    (value: unknown) =>
                        value === null ||
                        value === "friend" ||
                        value === "family"
                ),
                familySide: expect.toSatisfy(
                    (value: unknown) =>
                        value === null ||
                        value === "moms-side" ||
                        value === "dads-side"
                )
            },
            dietaryRestrictions: expect.any(Array)
        });
        expect(result.dietaryRestrictions.map((item: any) => item.name))
            .toContain("Other");
    });

    it("fails closed when the guest directory is not authenticated", async () => {

        const response = await getAdminGuests(
            new Request("https://example.com/api/admin/guests"),
            env
        );

        expect(response.status).toBe(503);
    });
});
