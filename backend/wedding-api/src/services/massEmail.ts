import { GmailMessage } from "./gmail";

export type EmailTemplate = "plain" | "classic" | "animated" | "reveal";

export interface MassEmailRecipient {
    householdName: string;
    email: string;
}

function escapeHtml(value: string): string {
    return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function paragraphs(body: string): string {
    if (!body.trim()) return "";
    return body.split(/\n{2,}/).map((paragraph) =>
        `<p style="margin:0 0 16px">${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`
    ).join("");
}

function frame(content: string, background = "#f4f6f6"): string {
    return `<!doctype html><html lang="en"><body style="margin:0;padding:24px;background:${background};color:#243746;font-family:'Cormorant Garamond',Georgia,serif;font-size:17px;line-height:1.6"><main style="max-width:600px;margin:0 auto">${content}</main></body></html>`;
}

function invitationCore(greeting: string, htmlBody: string): string {
    return `<p style="margin:0 0 40px;text-align:left;color:#647a7e;font-size:16px">${escapeHtml(greeting)}</p>
        <p style="margin:0;color:#647a7e;font-family:Copperplate,'Trebuchet MS',Arial,sans-serif;font-size:10px;letter-spacing:2.5px;text-transform:uppercase">Together with their families</p>
        <h1 style="margin:18px 0 8px;color:#243746;font-family:Copperplate,'Trebuchet MS',Arial,sans-serif;font-size:34px;font-weight:500;letter-spacing:3px;line-height:1.25;text-transform:uppercase">Quiana <span style="color:#7a9db0;font-family:Georgia,serif;font-size:26px;font-style:italic;letter-spacing:0;text-transform:none">&amp;</span> Scott</h1>
        <p style="margin:8px auto 25px;color:#647a7e;font-size:17px;font-variant:small-caps;letter-spacing:1px">joyfully invite you to celebrate their marriage</p>
        <table role="presentation" style="width:100%;margin:28px 0;border-collapse:collapse"><tr><td style="width:30%;border-top:1px solid #7a9db0">&nbsp;</td><td style="padding:0 14px;color:#243746;font-family:Copperplate,'Trebuchet MS',Arial,sans-serif;font-size:12px;letter-spacing:2px;white-space:nowrap">09 · 18 · 27</td><td style="width:30%;border-top:1px solid #7a9db0">&nbsp;</td></tr></table>
        <p style="margin:0;color:#243746;font-family:Copperplate,'Trebuchet MS',Arial,sans-serif;font-size:13px;letter-spacing:1px;text-transform:uppercase">Cuvier Park · La Jolla, California</p>
        <p style="margin:5px 0 0;color:#647a7e;font-size:16px">Saturday at four o’clock</p>
        <div style="margin:32px auto 24px;max-width:440px;color:#3e5965;text-align:left">${htmlBody}</div>
        <p style="margin:24px 0;color:#526b76;font-size:16px">Kindly respond by August 1, 2027</p>
        <a href="https://qstodder.com/wedding/rsvp.html" style="display:inline-block;padding:13px 27px;color:#fff;background:#365f74;border-radius:999px;font-family:Copperplate,'Trebuchet MS',Arial,sans-serif;font-size:11px;letter-spacing:1.5px;text-decoration:none;text-transform:uppercase">View details &amp; RSVP</a>`;
}

export function buildHouseholdEmail(
    recipient: MassEmailRecipient,
    subject: string,
    body: string,
    template: EmailTemplate = "plain"
): GmailMessage {
    const greeting = `Dear ${recipient.householdName},`;
    const htmlBody = paragraphs(body);
    let html: string;

    if (template === "classic") {
        html = frame(`<section style="padding:10px;background:#fbfdfe;border:1px solid #8faeba"><div style="padding:54px 42px;background:linear-gradient(180deg,#ffffff,#f2f7f9);border:1px solid #c4d6de;text-align:center">${invitationCore(greeting, htmlBody)}<p style="margin:28px 0 0;color:#647a7e;font-size:15px">Reception to follow at La Jolla Woman’s Club</p></div></section>`, "#e9f1f4");
    } else if (template === "animated") {
        html = frame(`<style>@keyframes tide{from{background-position:0 100%}to{background-position:75px 100%}}.coastal-motion{animation:tide 7s ease-in-out infinite alternate}</style><section class="coastal-motion" style="padding:54px 42px 165px;background-color:#f7fbfc;background-image:repeating-radial-gradient(ellipse at 50% 112%,#608da2 0,#608da2 24px,#a9c7d3 26px,#a9c7d3 48px,#dcebf0 50px,#dcebf0 72px);background-position:0 100%;background-repeat:repeat-x;background-size:680px 235px;text-align:center">${invitationCore(greeting, htmlBody)}</section><p style="margin:0;padding:12px;color:#fff;background:#365f74;text-align:center;font-family:Copperplate,'Trebuchet MS',Arial,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase">A wedding by the sea</p>`, "#dfecef");
    } else if (template === "reveal") {
        const optionalMessage = htmlBody
            ? `<div style="margin:30px auto 0;max-width:390px;color:#526b76;text-align:center">${htmlBody}</div>`
            : "";
        html = frame(`<section style="max-width:480px;margin:0 auto;padding:5px;background:#dbe7eb;border:9px solid #29465a;box-shadow:0 10px 24px rgba(25,47,61,.12)"><section style="min-height:340px;padding:1px;background:#c5a75e"><div style="min-height:340px;padding:26px 30px 30px;background-color:#fffdf7;background-image:linear-gradient(32deg,transparent 49.6%,rgba(122,157,176,.22) 50%,transparent 50.4%),linear-gradient(-32deg,transparent 49.6%,rgba(122,157,176,.22) 50%,transparent 50.4%);background-position:left bottom,right bottom;background-repeat:no-repeat;background-size:50% 56%;text-align:left"><p style="margin:0;color:#365f74;font-family:Copperplate,'Trebuchet MS',Arial,sans-serif;font-size:12px;letter-spacing:1.4px;text-transform:uppercase">Quiana &amp; Scott</p><div style="padding:62px 10px 48px;text-align:center"><p style="margin:0;color:#243746;font-family:Copperplate,'Trebuchet MS',Arial,sans-serif;font-size:20px;letter-spacing:2px;line-height:1.45">${escapeHtml(recipient.householdName)}</p>${optionalMessage}</div><div style="text-align:center"><a href="https://qstodder.com/wedding/invitation.html" style="display:inline-block;padding:14px 27px;color:#fff;background:#365f74;border-radius:999px;font-family:Copperplate,'Trebuchet MS',Arial,sans-serif;font-size:11px;letter-spacing:1.5px;text-decoration:none;text-transform:uppercase">Open our invitation →</a></div></div></section></section>`, "#e5f0f3");
    } else {
        html = frame(`<section style="padding:38px;background:#fafdfe;border:1px solid #b9ced7;border-top:7px solid #365f74;border-radius:8px"><p style="color:#526b76">${escapeHtml(greeting)}</p><div style="color:#3e5965">${htmlBody}</div></section>`, "#e9f1f4");
    }

    const text = template === "reveal"
        ? `Quiana & Scott\n\n${recipient.householdName}\n\n${body ? `${body}\n\n` : ""}Open our invitation: https://qstodder.com/wedding/invitation.html`
        : `${greeting}\n\n${body}`;
    return { to: recipient.email, subject, text, html };
}
