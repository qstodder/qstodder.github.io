import { GmailMessage } from "./gmail";

export interface MassEmailRecipient {
    householdName: string;
    email: string;
}

function escapeHtml(value: string): string {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

export function buildHouseholdEmail(
    recipient: MassEmailRecipient,
    subject: string,
    body: string
): GmailMessage {
    const greeting = `Dear ${recipient.householdName},`;
    const htmlBody = body
        .split(/\n{2,}/)
        .map((paragraph) =>
            `<p>${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`
        )
        .join("");

    return {
        to: recipient.email,
        subject,
        text: `${greeting}\n\n${body}`,
        html: `<!doctype html><html lang="en"><body style="margin:0;padding:24px;background:#f7fafb;color:#2f3c40;font-family:Georgia,serif;line-height:1.6"><main style="max-width:640px;margin:0 auto;padding:32px;background:#fff;border:1px solid #d8e3e8;border-radius:8px"><p>${escapeHtml(greeting)}</p>${htmlBody}</main></body></html>`
    };
}
