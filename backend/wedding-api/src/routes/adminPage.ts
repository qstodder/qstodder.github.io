import { Env } from "../types";
import {
    AdminAuthError,
    authenticateAdmin
} from "../lib/adminAuth";

const adminPage = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <title>Wedding Administration</title>
    <link rel="stylesheet" href="/admin/assets/variables.css">
    <link rel="stylesheet" href="/admin/assets/base.css">
    <link rel="stylesheet" href="/admin/assets/admin.css">
</head>
<body>
    <header class="admin-header">
        <div>
            <p class="admin-eyebrow">Quiana &amp; Scott</p>
            <h1>Wedding Administration</h1>
            <p class="admin-subtitle">Invitations, addresses, and RSVP progress</p>
        </div>
        <div class="admin-identity">
            <span id="admin-email">Secure access required</span>
            <button id="refresh-dashboard" class="secondary-button" type="button">Refresh</button>
        </div>
    </header>
    <main class="admin-main">
        <section id="admin-loading" class="admin-message" aria-live="polite">
            <div class="loading-mark" aria-hidden="true"></div>
            <h2>Loading dashboard</h2>
            <p>Checking secure access and retrieving invitations.</p>
        </section>
        <section id="admin-error" class="admin-message admin-error hidden" role="alert">
            <h2>Dashboard unavailable</h2>
            <p id="admin-error-message"></p>
            <a id="admin-login-link" class="primary-link" href="/admin/">Sign in again</a>
        </section>
        <div id="admin-content" class="hidden">
            <section class="summary-grid" aria-label="RSVP summary">
                <article class="summary-card summary-card-alert">
                    <span class="summary-label">Addresses needed</span>
                    <strong id="missing-addresses">0</strong>
                    <span>Require mailing address</span>
                </article>
                <article class="summary-card">
                    <span class="summary-label">Households</span>
                    <strong id="total-households">0</strong>
                    <span id="submitted-households">0 submitted</span>
                </article>
                <article class="summary-card">
                    <span class="summary-label">Guests</span>
                    <strong id="total-guests">0</strong>
                    <span>Total invited</span>
                </article>
                <article class="summary-card">
                    <span class="summary-label">Wedding yes</span>
                    <strong id="wedding-attending">0</strong>
                    <span>Current responses</span>
                </article>
            </section>
            <section class="admin-panel">
                <div class="panel-heading">
                    <div>
                        <p class="admin-eyebrow">Invitation tracking</p>
                        <h2>Households</h2>
                    </div>
                    <p id="results-count" aria-live="polite"></p>
                </div>
                <div class="admin-filters">
                    <div class="filter-field filter-search">
                        <label for="household-search">Search</label>
                        <input id="household-search" type="search" placeholder="Household or guest name" autocomplete="off">
                    </div>
                    <div class="filter-field">
                        <label for="delivery-filter">Invitation</label>
                        <select id="delivery-filter">
                            <option value="all">All households</option>
                            <option value="addressNeeded">Address needed</option>
                            <option value="readyToMail">Ready to mail</option>
                            <option value="handDelivery">Hand delivery</option>
                        </select>
                    </div>
                    <div class="filter-field">
                        <label for="rsvp-filter">RSVP</label>
                        <select id="rsvp-filter">
                            <option value="all">All responses</option>
                            <option value="submitted">Submitted</option>
                            <option value="inProgress">In progress</option>
                            <option value="pending">Not started</option>
                        </select>
                    </div>
                </div>
                <div class="table-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th scope="col">Household</th>
                                <th scope="col">Guests</th>
                                <th scope="col">Invitation</th>
                                <th scope="col">Address</th>
                                <th scope="col">RSVP</th>
                                <th scope="col">Wedding</th>
                            </tr>
                        </thead>
                        <tbody id="household-rows"></tbody>
                    </table>
                </div>
                <div id="empty-results" class="empty-results hidden">No households match these filters.</div>
            </section>
            <p id="generated-at" class="generated-at"></p>
        </div>
    </main>
    <script defer src="/admin/assets/admin.js"></script>
</body>
</html>`;

export async function getAdminPage(
    request: Request,
    env: Env
): Promise<Response> {
    try {
        await authenticateAdmin(request, env);

        return new Response(adminPage, {
            headers: {
                "Content-Type": "text/html; charset=UTF-8",
                "Cache-Control": "no-store",
                "Content-Security-Policy": [
                    "default-src 'none'",
                    "script-src 'self'",
                    "style-src 'self' https://fonts.googleapis.com",
                    "font-src https://fonts.gstatic.com",
                    "connect-src 'self'",
                    "base-uri 'none'",
                    "frame-ancestors 'none'",
                    "form-action 'self'"
                ].join("; "),
                "Referrer-Policy": "no-referrer",
                "X-Content-Type-Options": "nosniff"
            }
        });
    } catch (error) {
        const status =
            error instanceof AdminAuthError
                ? error.status
                : 500;
        const message =
            error instanceof AdminAuthError
                ? error.message
                : "Unable to load the admin dashboard.";

        return Response.json(
            { error: message },
            { status }
        );
    }
}

const adminAssets: Record<
    string,
    { url: string; contentType: string }
> = {
    "variables.css": {
        url: "https://qstodder.github.io/wedding/css/variables.css",
        contentType: "text/css; charset=UTF-8"
    },
    "base.css": {
        url: "https://qstodder.github.io/wedding/css/base.css",
        contentType: "text/css; charset=UTF-8"
    },
    "admin.css": {
        url: "https://qstodder.github.io/wedding/css/admin.css",
        contentType: "text/css; charset=UTF-8"
    },
    "admin.js": {
        url: "https://qstodder.github.io/wedding/js/admin.js",
        contentType: "text/javascript; charset=UTF-8"
    }
};

export async function getAdminAsset(
    request: Request,
    env: Env,
    assetName: string
): Promise<Response> {
    try {
        await authenticateAdmin(request, env);

        const asset = adminAssets[assetName];
        if (!asset) {
            return Response.json(
                { error: "Admin asset not found." },
                { status: 404 }
            );
        }

        const source = await fetch(asset.url);
        if (!source.ok) {
            return Response.json(
                { error: "Unable to load the admin dashboard asset." },
                { status: 502 }
            );
        }

        return new Response(source.body, {
            headers: {
                "Content-Type": asset.contentType,
                "Cache-Control": "private, max-age=300",
                "X-Content-Type-Options": "nosniff"
            }
        });
    } catch (error) {
        const status =
            error instanceof AdminAuthError
                ? error.status
                : 500;
        const message =
            error instanceof AdminAuthError
                ? error.message
                : "Unable to load the admin dashboard asset.";

        return Response.json(
            { error: message },
            { status }
        );
    }
}
