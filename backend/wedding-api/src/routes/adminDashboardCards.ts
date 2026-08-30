import { Env } from "../types";
import { AdminAuthError, authenticateAdmin } from "../lib/adminAuth";
import { withAdminCors } from "../lib/adminCors";

export type DashboardPage = "households" | "guests";
type DashboardCardInput = { metric: string; label: string; tone: string; order: number };

const METRICS: Record<DashboardPage, Set<string>> = {
    households: new Set([
        "all", "missingAddress", "missingEmail", "submitted", "pending",
        "inProgress", "welcomeAttending", "ceremonyAttending",
        "receptionAttending", "brunchAttending"
    ]),
    guests: new Set([
        "all", "missingAddress", "missingEmail", "submitted", "pending",
        "welcomeAttending", "ceremonyAttending", "receptionAttending",
        "brunchAttending"
    ])
};

export async function getDashboardCards(env: Env, page: DashboardPage) {
    const result = await env.wedding_rsvp_db.prepare(`
        SELECT metric, label, tone
        FROM admin_dashboard_cards
        WHERE page = ?1
        ORDER BY display_order, id
    `).bind(page).all<{ metric: string; label: string; tone: string }>();
    return result.results;
}

export async function saveAdminDashboardCards(request: Request, env: Env) {
    try {
        await authenticateAdmin(request, env);
        const input = await request.json<any>();
        const page = input?.page as DashboardPage;
        if (!METRICS[page] || !Array.isArray(input.cards) || input.cards.length > 12) {
            return withAdminCors(request, Response.json({ error: "Dashboard card configuration is invalid." }, { status: 400 }));
        }
        const cards: DashboardCardInput[] = input.cards.map((card: any, index: number) => {
            const metric = String(card?.metric ?? "");
            const label = String(card?.label ?? "").trim();
            const tone = card?.tone === "alert" ? "alert" : "default";
            if (!METRICS[page].has(metric) || !label || label.length > 80) {
                throw new Error("Invalid card");
            }
            return { metric, label, tone, order: index + 1 };
        });
        if (new Set(cards.map((card) => card.metric)).size !== cards.length) {
            throw new Error("Duplicate card");
        }
        await env.wedding_rsvp_db.batch([
            env.wedding_rsvp_db.prepare("DELETE FROM admin_dashboard_cards WHERE page = ?1").bind(page),
            ...cards.map((card) => env.wedding_rsvp_db.prepare(`
                INSERT INTO admin_dashboard_cards (page, metric, label, tone, display_order)
                VALUES (?1, ?2, ?3, ?4, ?5)
            `).bind(page, card.metric, card.label, card.tone, card.order))
        ]);
        return withAdminCors(request, Response.json({ cards: await getDashboardCards(env, page) }));
    } catch (error) {
        const status = error instanceof AdminAuthError ? error.status : 400;
        const message = error instanceof AdminAuthError ? error.message : "Dashboard card configuration is invalid.";
        return withAdminCors(request, Response.json({ error: message }, { status }));
    }
}
