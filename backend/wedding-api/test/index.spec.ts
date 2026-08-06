import {
    env,
    createExecutionContext,
    waitOnExecutionContext,
    SELF
} from "cloudflare:test";
import { describe, it, expect, vi } from "vitest";
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

const IncomingRequest =
    Request<unknown, IncomingRequestCfProperties>;

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

    it("rejects invalid state formats", async () => {

        const database = databaseEnv(1);
        const response = await updateAdminAddress(
            addressRequest({
                street: "123 Main Street",
                city: "San Diego",
                state: "California",
                zip: "9210"
            }),
            database.env,
            12
        );

        expect(response.status).toBe(400);
        expect(database.prepare).not.toHaveBeenCalled();
        expect(await response.json()).toEqual({
            error: "State must be 2 characters or fewer."
        });
    });

    it("rejects invalid ZIP formats", async () => {

        const database = databaseEnv(1);
        const response = await updateAdminAddress(
            addressRequest({
                street: "123 Main Street",
                city: "San Diego",
                state: "CA",
                zip: "9210"
            }),
            database.env,
            12
        );

        expect(response.status).toBe(400);
        expect(database.prepare).not.toHaveBeenCalled();
        expect(await response.json()).toEqual({
            error: "ZIP code must use 12345 or 12345-6789 format."
        });
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
