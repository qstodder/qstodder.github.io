import {
    afterEach,
    describe,
    expect,
    it,
    vi
} from "vitest";
import {
    buildConfirmationEmail,
    ConfirmationDetails
} from "../src/services/confirmation";
import {
    refreshGmailAccessToken,
    sendGmailMessage
} from "../src/services/gmail";
import { buildHouseholdEmail } from "../src/services/massEmail";
import { sendAdminEmailBatch } from "../src/routes/adminEmail";
import { Env } from "../src/types";

const confirmation: ConfirmationDetails = {
    householdName: "Stodder Family",
    email: "guest@example.com",
    guests: [
        {
            id: 1,
            firstName: "Quiana",
            lastName: "Stodder",
            invitedToWelcome: true,
            invitedToWedding: true,
            invitedToBrunch: true,
            attendingWelcome: true,
            attendingWedding: true,
            attendingBrunch: false,
            dietaryRestrictions: [
                "Vegetarian",
                "Other: nut allergy"
            ]
        }
    ]
};

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("RSVP confirmation email", () => {

    it("refreshes Gmail OAuth without sending an email", async () => {

        const fetchMock = vi.fn()
            .mockResolvedValueOnce(
                Response.json({
                    access_token: "temporary-access-token"
                })
            );

        vi.stubGlobal("fetch", fetchMock);

        const env = {
            GMAIL_CLIENT_ID: "client-id",
            GMAIL_CLIENT_SECRET: "client-secret",
            GMAIL_REFRESH_TOKEN: "refresh-token",
            GMAIL_SENDER_EMAIL: "sender@gmail.com"
        } as Env;

        const accessToken =
            await refreshGmailAccessToken(env);

        expect(accessToken).toBe(
            "temporary-access-token"
        );
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0][0]).toBe(
            "https://oauth2.googleapis.com/token"
        );
    });

    it("includes attendance and dietary responses", () => {

        const email =
            buildConfirmationEmail(confirmation);

        expect(email.to).toBe("guest@example.com");
        expect(email.text).toContain(
            "Welcome Event: Attending"
        );
        expect(email.text).toContain(
            "Morning-After Brunch: Not attending"
        );
        expect(email.text).toContain(
            "Vegetarian, Other: nut allergy"
        );
        expect(email.html).toContain(
            "RSVP Confirmation"
        );
        expect(email.text).toContain(
            "You may edit your responses until Aug 1st, 2027."
        );
        expect(email.html).toContain(
            "You may edit your responses until Aug 1st, 2027."
        );
        expect(email.text).not.toContain(
            "Here is a copy of your responses"
        );
    });

    it("escapes database content in HTML", () => {

        const email = buildConfirmationEmail({
            ...confirmation,
            householdName: "<script>alert(1)</script>"
        });

        expect(email.html).not.toContain("<script>");
        expect(email.html).toContain(
            "&lt;script&gt;alert(1)&lt;/script&gt;"
        );
    });

    it("refreshes OAuth and sends a Gmail API message", async () => {

        const fetchMock = vi.fn()
            .mockResolvedValueOnce(
                Response.json({
                    access_token: "temporary-access-token"
                })
            )
            .mockResolvedValueOnce(
                Response.json({ id: "gmail-message-id" })
            );

        vi.stubGlobal("fetch", fetchMock);

        const env = {
            GMAIL_CLIENT_ID: "client-id",
            GMAIL_CLIENT_SECRET: "client-secret",
            GMAIL_REFRESH_TOKEN: "refresh-token",
            GMAIL_SENDER_EMAIL: "sender@gmail.com"
        } as Env;

        await sendGmailMessage(
            env,
            buildConfirmationEmail(confirmation)
        );

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock.mock.calls[0][0]).toBe(
            "https://oauth2.googleapis.com/token"
        );
        expect(fetchMock.mock.calls[1][0]).toBe(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"
        );

        const gmailRequest =
            fetchMock.mock.calls[1][1] as RequestInit;

        expect(gmailRequest.headers).toEqual({
            Authorization:
                "Bearer temporary-access-token",
            "Content-Type": "application/json"
        });

        const body = JSON.parse(
            gmailRequest.body as string
        );

        expect(body.raw).toMatch(
            /^[A-Za-z0-9_-]+$/
        );
    });

    it("encodes smart punctuation in the subject header", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(Response.json({ access_token: "temporary-access-token" }))
            .mockResolvedValueOnce(Response.json({ id: "gmail-message-id" }));
        vi.stubGlobal("fetch", fetchMock);
        const testEnv = {
            GMAIL_CLIENT_ID: "client-id",
            GMAIL_CLIENT_SECRET: "client-secret",
            GMAIL_REFRESH_TOKEN: "refresh-token",
            GMAIL_SENDER_EMAIL: "sender@gmail.com"
        } as Env;

        await sendGmailMessage(testEnv, {
            ...buildConfirmationEmail(confirmation),
            subject: "You’re invited to Quiana & Scott’s wedding"
        });

        const request = fetchMock.mock.calls[1][1] as RequestInit;
        const raw = JSON.parse(request.body as string).raw as string;
        const padded = raw.replaceAll("-", "+").replaceAll("_", "/")
            .padEnd(Math.ceil(raw.length / 4) * 4, "=");
        const binary = atob(padded);
        const mime = new TextDecoder().decode(
            Uint8Array.from(binary, (character) => character.charCodeAt(0))
        );
        const encoded = mime.match(/Subject: =\?UTF-8\?B\?([^?]+)\?=/)?.[1];

        expect(encoded).toBeTruthy();
        const decodedBinary = atob(encoded!);
        const decodedSubject = new TextDecoder().decode(
            Uint8Array.from(decodedBinary, (character) => character.charCodeAt(0))
        );
        expect(decodedSubject).toBe(
            "You’re invited to Quiana & Scott’s wedding"
        );
    });

    it("reports token failures without attempting a send", async () => {

        const fetchMock = vi.fn()
            .mockResolvedValueOnce(
                Response.json(
                    {
                        error: "invalid_grant",
                        error_description:
                            "Token has been expired or revoked."
                    },
                    { status: 400 }
                )
            );

        vi.stubGlobal("fetch", fetchMock);

        const env = {
            GMAIL_CLIENT_ID: "client-id",
            GMAIL_CLIENT_SECRET: "client-secret",
            GMAIL_REFRESH_TOKEN: "refresh-token",
            GMAIL_SENDER_EMAIL: "sender@gmail.com"
        } as Env;

        await expect(
            sendGmailMessage(
                env,
                buildConfirmationEmail(confirmation)
            )
        ).rejects.toThrow(
            "Gmail token request failed (400): " +
            "invalid_grant: Token has been expired or revoked."
        );

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("allows multiple recipients but rejects recipient header injection before OAuth", async () => {

        const fetchMock = vi.fn();

        vi.stubGlobal("fetch", fetchMock);

        const env = {
            GMAIL_CLIENT_ID: "client-id",
            GMAIL_CLIENT_SECRET: "client-secret",
            GMAIL_REFRESH_TOKEN: "refresh-token",
            GMAIL_SENDER_EMAIL: "sender@gmail.com"
        } as Env;

        await expect(
            sendGmailMessage(
                env,
                {
                    ...buildConfirmationEmail(
                        confirmation
                    ),
                    to: "guest@example.com\r\nBcc: other@example.com"
                }
            )
        ).rejects.toThrow(
            "invalid sender or recipient address"
        );

        expect(fetchMock).not.toHaveBeenCalled();
    });
});

describe("Admin household email", () => {
    it("addresses and escapes each household message", () => {
        const email = buildHouseholdEmail(
            {
                householdName: "The <Blue> Family",
                email: "blue@example.com"
            },
            "Wedding invitation",
            "You are cordially invited.\n\nPlease RSVP."
        );

        expect(email.text).toContain(
            "Dear The <Blue> Family,"
        );
        expect(email.html).toContain(
            "Dear The &lt;Blue&gt; Family,"
        );
        expect(email.html).not.toContain("<Blue>");
    });

    it("renders every invitation template", () => {
        const recipient = {
            householdName: "Blue Family",
            email: "blue@example.com"
        };
        const classic = buildHouseholdEmail(
            recipient, "Invitation", "Please join us.", "classic"
        );
        const animated = buildHouseholdEmail(
            recipient, "Invitation", "Please join us.", "animated"
        );
        const reveal = buildHouseholdEmail(
            recipient, "Invitation", "", "reveal"
        );

        expect(classic.html).toContain("Together with their families");
        expect(animated.html).toContain("@keyframes tide");
        expect(reveal.html).toContain("Open your invitation");
        expect(reveal.html).toContain("/wedding/invitation.html");
        expect(reveal.html).toContain("max-width:480px");
        expect(reveal.html).toContain("Quiana &amp; Scott");
        expect(reveal.html).toContain("Blue Family");
        expect(reveal.html).not.toContain("Dear Blue Family");
        expect(reveal.html).toContain("padding:1px;background:#c5a75e");
        expect(reveal.html).toContain("password:");
        expect(reveal.html).toContain(">rufus</span>");
        expect(reveal.text).toContain("Open your invitation:");
        expect(reveal.text).toContain("Password: rufus");
    });

    it("requires a body for plain email but allows an empty reveal body", async () => {
        const all = vi.fn().mockResolvedValue({
            results: [{ id: 1, household_name: "Blue Family", email: "blue@example.com" }]
        });
        const bind = vi.fn().mockReturnValue({ all });
        const prepare = vi.fn().mockReturnValue({ bind });
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(Response.json({ access_token: "batch-token" }))
            .mockResolvedValueOnce(Response.json({ id: "message-1" }));
        vi.stubGlobal("fetch", fetchMock);
        const env = {
            wedding_rsvp_db: { prepare },
            GMAIL_CLIENT_ID: "client-id",
            GMAIL_CLIENT_SECRET: "client-secret",
            GMAIL_REFRESH_TOKEN: "refresh-token",
            GMAIL_SENDER_EMAIL: "sender@gmail.com"
        } as unknown as Env;

        const plainResponse = await sendAdminEmailBatch(
            new Request("http://localhost:8787/api/admin/email/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ householdIds: [1], subject: "Reminder", body: "", template: "plain" })
            }), env
        );
        expect(plainResponse.status).toBe(400);

        const revealResponse = await sendAdminEmailBatch(
            new Request("http://localhost:8787/api/admin/email/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ householdIds: [1], subject: "Invitation", body: "", template: "reveal" })
            }), env
        );
        expect(revealResponse.status).toBe(200);
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("refreshes OAuth once for an email batch", async () => {
        const all = vi.fn().mockResolvedValue({
            results: [
                { id: 1, household_name: "Alpha Family", email: "alpha@example.com" },
                { id: 2, household_name: "Beta Family", email: "beta@example.com" }
            ]
        });
        const bind = vi.fn().mockReturnValue({ all });
        const prepare = vi.fn().mockReturnValue({ bind });
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(Response.json({ access_token: "batch-token" }))
            .mockResolvedValueOnce(Response.json({ id: "message-1" }))
            .mockResolvedValueOnce(Response.json({ id: "message-2" }));
        vi.stubGlobal("fetch", fetchMock);

        const response = await sendAdminEmailBatch(
            new Request("http://localhost:8787/api/admin/email/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    householdIds: [1, 2],
                    subject: "Wedding invitation",
                    body: "Please RSVP."
                })
            }),
            {
                wedding_rsvp_db: { prepare },
                GMAIL_CLIENT_ID: "client-id",
                GMAIL_CLIENT_SECRET: "client-secret",
                GMAIL_REFRESH_TOKEN: "refresh-token",
                GMAIL_SENDER_EMAIL: "sender@gmail.com"
            } as unknown as Env
        );

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            sent: [1, 2],
            failed: []
        });
        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(fetchMock.mock.calls[0][0]).toBe(
            "https://oauth2.googleapis.com/token"
        );
    });
});
