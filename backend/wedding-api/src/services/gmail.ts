import { Env } from "../types";

export interface GmailMessage {
    to: string;
    subject: string;
    text: string;
    html: string;
}

function encodeBase64Url(value: string): string {

    const bytes =
        new TextEncoder().encode(value);

    let binary = "";

    for (let index = 0; index < bytes.length; index += 8192) {
        binary += String.fromCharCode(
            ...bytes.subarray(index, index + 8192)
        );
    }

    return btoa(binary)
        .replaceAll("+", "-")
        .replaceAll("/", "_")
        .replace(/=+$/, "");
}

function safeHeader(value: string): string {
    return value.replace(/[\r\n]/g, " ").trim();
}

function encodeHeader(value: string): string {
    const safeValue = safeHeader(value);

    if (/^[\x20-\x7E]*$/.test(safeValue)) {
        return safeValue;
    }

    const bytes = new TextEncoder().encode(safeValue);
    let binary = "";

    for (let index = 0; index < bytes.length; index += 8192) {
        binary += String.fromCharCode(
            ...bytes.subarray(index, index + 8192)
        );
    }

    return `=?UTF-8?B?${btoa(binary)}?=`;
}

function isSingleEmailAddress(value: string): boolean {
    return /^[^\s@<>,]+@[^\s@<>,]+\.[^\s@<>,]+$/.test(
        value
    );
}

function isEmailAddressList(value: string): boolean {
    const addresses = value.split(",").map((address) => address.trim());
    return addresses.length > 0 && addresses.every(isSingleEmailAddress);
}

function buildMimeMessage(
    sender: string,
    message: GmailMessage
): string {

    const boundary =
        `rsvp_${crypto.randomUUID()}`;

    return [
        `From: Quiana & Scott <${safeHeader(sender)}>`,
        `To: ${safeHeader(message.to)}`,
        `Subject: ${encodeHeader(message.subject)}`,
        "MIME-Version: 1.0",
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        "",
        `--${boundary}`,
        "Content-Type: text/plain; charset=UTF-8",
        "Content-Transfer-Encoding: 8bit",
        "",
        message.text,
        "",
        `--${boundary}`,
        "Content-Type: text/html; charset=UTF-8",
        "Content-Transfer-Encoding: 8bit",
        "",
        message.html,
        "",
        `--${boundary}--`,
        ""
    ].join("\r\n");
}

export async function refreshGmailAccessToken(
    env: Env
): Promise<string> {

    const response = await fetch(
        "https://oauth2.googleapis.com/token",
        {
            method: "POST",
            headers: {
                "Content-Type":
                    "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
                client_id: env.GMAIL_CLIENT_ID,
                client_secret:
                    env.GMAIL_CLIENT_SECRET,
                refresh_token:
                    env.GMAIL_REFRESH_TOKEN,
                grant_type: "refresh_token"
            })
        }
    );

    if (!response.ok) {

        const oauthError =
            await response.json()
                .catch(() => ({})) as {
                    error?: string;
                    error_description?: string;
                };

        const details = [
            oauthError.error,
            oauthError.error_description
        ]
            .filter(Boolean)
            .join(": ");

        throw new Error(
            `Gmail token request failed (${response.status})` +
            `${details ? `: ${details}` : ""}.`
        );
    }

    const result =
        await response.json() as {
            access_token?: string;
        };

    if (!result.access_token) {
        throw new Error(
            "Gmail token response did not include an access token."
        );
    }

    return result.access_token;
}

export async function sendGmailMessage(
    env: Env,
    message: GmailMessage
): Promise<void> {

    if (
        !isSingleEmailAddress(env.GMAIL_SENDER_EMAIL) ||
        !isEmailAddressList(message.to)
    ) {
        throw new Error(
            "Confirmation email contains an invalid sender or recipient address."
        );
    }

    const accessToken =
        await refreshGmailAccessToken(env);

    await sendGmailMessageWithAccessToken(
        env,
        message,
        accessToken
    );
}

export async function sendGmailMessageWithAccessToken(
    env: Env,
    message: GmailMessage,
    accessToken: string
): Promise<void> {
    if (
        !isSingleEmailAddress(env.GMAIL_SENDER_EMAIL) ||
        !isEmailAddressList(message.to)
    ) {
        throw new Error(
            "Email contains an invalid sender or recipient address."
        );
    }

    const raw = encodeBase64Url(
        buildMimeMessage(
            env.GMAIL_SENDER_EMAIL,
            message
        )
    );

    const response = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        {
            method: "POST",
            headers: {
                "Authorization":
                    `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ raw })
        }
    );

    if (!response.ok) {
        throw new Error(
            `Gmail send request failed (${response.status}).`
        );
    }
}
