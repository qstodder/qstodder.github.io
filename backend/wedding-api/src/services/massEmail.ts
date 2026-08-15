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
    return body.split(/\n{2,}/).map((paragraph) =>
        `<p style="margin:0 0 16px">${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`
    ).join("");
}

function frame(content: string, background = "#f4f6f6"): string {
    return `<!doctype html><html lang="en"><body style="margin:0;padding:24px;background:${background};color:#243746;font-family:Georgia,serif;line-height:1.6"><main style="max-width:600px;margin:0 auto">${content}</main></body></html>`;
}

function invitationCore(greeting: string, htmlBody: string): string {
    return `<p style="margin:0 0 30px;text-align:left;color:#5c6d73">${escapeHtml(greeting)}</p>
        <p style="margin:0;color:#657e8b;font:600 11px Arial,sans-serif;letter-spacing:3px;text-transform:uppercase">Together with their families</p>
        <h1 style="margin:18px 0 10px;color:#243746;font:normal 58px Georgia,serif;line-height:.9">Quiana <span style="display:block;color:#7a9db0;font-size:30px;font-style:italic">&amp;</span> Scott</h1>
        <p style="margin:24px auto;max-width:390px;font-size:19px">joyfully invite you to celebrate their marriage</p>
        <p style="margin:28px 0;color:#455e69;font-size:16px;letter-spacing:1px;text-transform:uppercase">Saturday &nbsp; · &nbsp; September 18, 2027 &nbsp; · &nbsp; Four o’clock</p>
        <p style="font-size:18px">Cuvier Park · La Jolla, California</p>
        <div style="margin:28px auto 22px;max-width:440px;text-align:left">${htmlBody}</div>
        <p style="margin:20px 0">Kindly respond by August 1, 2027</p>
        <a href="https://qstodder.com/wedding/rsvp.html" style="display:inline-block;padding:13px 25px;color:#fff;background:#243746;border-radius:999px;font:600 12px Arial,sans-serif;letter-spacing:1px;text-decoration:none;text-transform:uppercase">View details &amp; RSVP</a>`;
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
        html = frame(`<section style="padding:10px;background:#fffdf9;border:1px solid #adbec6"><div style="padding:46px 42px;border:1px solid #d3dee2;text-align:center">${invitationCore(greeting, htmlBody)}<p style="margin:25px 0 0;color:#71828a">Reception to follow at La Jolla Woman’s Club</p></div></section>`);
    } else if (template === "animated") {
        html = frame(`<style>@keyframes tide{from{background-position:0 0}to{background-position:80px 0}}.coastal-motion{animation:tide 7s ease-in-out infinite alternate}</style><section class="coastal-motion" style="padding:52px 42px 155px;background-color:#edf5f8;background-image:repeating-radial-gradient(ellipse at 50% 110%,#7a9db0 0,#7a9db0 25px,#d6e7ed 27px,#d6e7ed 50px);background-size:680px 230px;text-align:center">${invitationCore(greeting, htmlBody)}</section><p style="margin:0;padding:10px;color:#fff;background:#27495b;text-align:center;font:11px Arial,sans-serif">A wedding by the sea</p>`, "#e4eef2");
    } else if (template === "reveal") {
        html = frame(`<section style="padding:58px 45px;background:#f9faf9;border-top:8px solid #243746;text-align:center"><p style="margin:0 0 30px;text-align:left;color:#5c6d73">${escapeHtml(greeting)}</p><p style="color:#657e8b;font:600 11px Arial,sans-serif;letter-spacing:3px;text-transform:uppercase">An invitation from</p><h1 style="margin:18px 0;font:normal 54px Georgia,serif">Quiana &amp; Scott</h1><div style="margin:25px auto;max-width:430px;text-align:left">${htmlBody}</div><a href="https://qstodder.com/wedding/invitation-reveal-demo.html" style="display:inline-block;padding:14px 26px;color:#fff;background:#243746;border-radius:999px;font:600 12px Arial,sans-serif;letter-spacing:1px;text-decoration:none;text-transform:uppercase">Open our invitation →</a><p style="color:#687b83">September 18, 2027 · Kindly respond by August 1</p></section>`);
    } else {
        html = frame(`<section style="padding:32px;background:#fff;border:1px solid #d8e3e8;border-radius:8px"><p>${escapeHtml(greeting)}</p>${htmlBody}</section>`);
    }

    return { to: recipient.email, subject, text: `${greeting}\n\n${body}`, html };
}
