import { afterEach, describe, expect, it, vi } from "vitest";
import { handleWeddingSiteRequest } from "../src/routes/weddingSite";
import { Env } from "../src/types";

const configuredEnv = {
    WEDDING_SITE_PASSWORD: "blue-and-gold",
    WEDDING_SESSION_SECRET: "a-long-random-session-signing-secret"
} as Env;

afterEach(() => vi.unstubAllGlobals());

describe("wedding website password", () => {
    it("redirects the public admin shortcut to the secure dashboard", async () => {
        for (const path of ["/wedding/admin", "/wedding/admin/"]) {
            const response = await handleWeddingSiteRequest(
                new Request(`https://www.qstodder.com${path}`),
                {} as Env
            );
            expect(response.status).toBe(303);
            expect(response.headers.get("Location")).toBe(
                "https://wedding-rsvp-api.qstodder.workers.dev/admin/"
            );
        }
    });

    it("fails closed when password secrets are missing", async () => {
        const response = await handleWeddingSiteRequest(
            new Request("https://www.qstodder.com/wedding/"),
            {} as Env
        );
        expect(response.status).toBe(503);
        expect(await response.text()).toContain("has not been configured");
    });

    it("shows the styled login screen", async () => {
        const response = await handleWeddingSiteRequest(
            new Request("https://www.qstodder.com/wedding/login"),
            configuredEnv
        );
        const html = await response.text();
        expect(response.status).toBe(200);
        expect(html).toContain("Quiana <span>&amp;</span> Scott");
        expect(html).toContain('autocomplete="current-password"');
        expect(response.headers.get("Cache-Control")).toBe("no-store");
    });

    it("redirects unauthenticated wedding requests to login", async () => {
        const response = await handleWeddingSiteRequest(
            new Request("https://www.qstodder.com/wedding/schedule.html?day=1"),
            configuredEnv
        );
        expect(response.status).toBe(303);
        expect(response.headers.get("Location")).toBe(
            "/wedding/login?next=%2Fwedding%2Fschedule.html%3Fday%3D1"
        );
    });

    it("rejects an incorrect password", async () => {
        const response = await handleWeddingSiteRequest(
            new Request("https://www.qstodder.com/wedding/login", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({ password: "wrong", next: "/wedding/" })
            }),
            configuredEnv
        );
        expect(response.status).toBe(401);
        expect(response.headers.get("Set-Cookie")).toBeNull();
        expect(await response.text()).toContain("doesn’t match");
    });

    it("sets a secure session and serves protected files", async () => {
        const login = await handleWeddingSiteRequest(
            new Request("https://www.qstodder.com/wedding/login", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({ password: "blue-and-gold", next: "/wedding/schedule.html" })
            }),
            configuredEnv
        );
        expect(login.status).toBe(303);
        expect(login.headers.get("Location")).toBe("/wedding/schedule.html");
        const setCookie = login.headers.get("Set-Cookie")!;
        expect(setCookie).toContain("HttpOnly");
        expect(setCookie).toContain("Secure");
        expect(setCookie).toContain("SameSite=Lax");

        const fetchMock = vi.fn().mockResolvedValue(
            new Response(".schedule{}", { status: 200 })
        );
        vi.stubGlobal("fetch", fetchMock);
        const response = await handleWeddingSiteRequest(
            new Request("https://www.qstodder.com/wedding/css/schedule.css", {
                headers: { Cookie: setCookie.split(";", 1)[0] }
            }),
            configuredEnv
        );
        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toBe("text/css; charset=UTF-8");
        expect(await response.text()).toBe(".schedule{}");
        expect(fetchMock).toHaveBeenCalledWith(
            "https://raw.githubusercontent.com/qstodder/qstodder.github.io/master/wedding/css/schedule.css",
            { method: "GET", redirect: "follow" }
        );
    });

    it("clears the session on logout", async () => {
        const response = await handleWeddingSiteRequest(
            new Request("https://www.qstodder.com/wedding/logout"),
            configuredEnv
        );
        expect(response.status).toBe(303);
        expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
    });
});
