import { Env } from "../types";
import { AdminAuthError, authenticateAdmin } from "../lib/adminAuth";
import { withAdminCors } from "../lib/adminCors";
import { refreshGmailAccessToken, sendGmailMessageWithAccessToken } from "../services/gmail";
import { buildHouseholdEmail, EmailTemplate } from "../services/massEmail";

interface RecipientRow {
    id: number;
    household_name: string;
    email: string;
}

const MAX_BATCH_SIZE = 20;

export async function sendAdminEmailBatch(request: Request, env: Env): Promise<Response> {
    try {
        await authenticateAdmin(request, env);
        const input = await request.json().catch(() => null) as {
            householdIds?: unknown;
            subject?: unknown;
            body?: unknown;
            template?: unknown;
        } | null;
        const householdIds = Array.isArray(input?.householdIds)
            ? [...new Set(input.householdIds.filter((id): id is number => Number.isInteger(id) && id > 0))]
            : [];
        const subject = typeof input?.subject === "string" ? input.subject.trim() : "";
        const body = typeof input?.body === "string" ? input.body.trim() : "";
        const template = typeof input?.template === "string" ? input.template : "plain";
        const templates: EmailTemplate[] = ["plain", "classic", "animated", "reveal"];

        if (!householdIds.length || householdIds.length > MAX_BATCH_SIZE) {
            return withAdminCors(request, Response.json({ error: `Choose between 1 and ${MAX_BATCH_SIZE} households per batch.` }, { status: 400 }));
        }
        if (!subject || subject.length > 150 || !body || body.length > 10000) {
            return withAdminCors(request, Response.json({ error: "Enter a subject (150 characters maximum) and message body." }, { status: 400 }));
        }
        if (!templates.includes(template as EmailTemplate)) {
            return withAdminCors(request, Response.json({ error: "Choose a valid email template." }, { status: 400 }));
        }

        const placeholders = householdIds.map(() => "?").join(",");
        const result = await env.wedding_rsvp_db.prepare(`
            SELECT id, household_name, email
            FROM households
            WHERE archived_at IS NULL
              AND TRIM(COALESCE(email, '')) <> ''
              AND id IN (${placeholders})
            ORDER BY id
        `).bind(...householdIds).all<RecipientRow>();
        const accessToken = await refreshGmailAccessToken(env);
        const sent: number[] = [];
        const failed: Array<{ householdId: number; error: string }> = [];
        const foundIds = new Set(result.results.map((row) => row.id));

        for (const householdId of householdIds) {
            if (!foundIds.has(householdId)) {
                failed.push({ householdId, error: "Household is missing an email address or is no longer active." });
            }
        }
        for (const recipient of result.results) {
            try {
                await sendGmailMessageWithAccessToken(env, buildHouseholdEmail({
                    householdName: recipient.household_name,
                    email: recipient.email
                }, subject, body, template as EmailTemplate), accessToken);
                sent.push(recipient.id);
            } catch (error) {
                failed.push({ householdId: recipient.id, error: error instanceof Error ? error.message : "Unable to send email." });
            }
        }

        return withAdminCors(request, Response.json({ sent, failed }));
    } catch (error) {
        const status = error instanceof AdminAuthError ? error.status : 500;
        return withAdminCors(request, Response.json({
            error: error instanceof AdminAuthError ? error.message : "Unable to send the email batch."
        }, { status }));
    }
}
