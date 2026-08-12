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
    <header class="admin-header admin-header-with-tabs">
        <div class="admin-header-content">
            <div>
                <p class="admin-eyebrow">Quiana &amp; Scott</p>
                <h1>Wedding Administration</h1>
                <p class="admin-subtitle">Invitations, addresses, and RSVP progress</p>
            </div>
            <div class="admin-identity">
                <span id="admin-email">Secure access required</span>
                <button id="refresh-dashboard" class="secondary-button" type="button">Refresh</button>
            </div>
        </div>
        <nav class="admin-tabs" aria-label="Administration sections">
            <a class="admin-tab is-active" href="/admin/" aria-current="page">Households</a>
            <a class="admin-tab" href="/admin/guests/">Guests</a>
        </nav>
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
                    <div class="panel-actions">
                        <button id="export-households" class="secondary-button" type="button">Export view</button>
                        <button id="add-household" class="address-save-button" type="button">Add household</button>
                    </div>
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
                                <th scope="col"><span class="visually-hidden">Actions</span></th>
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
    },
    "admin-household.js": {
        url: "https://qstodder.github.io/wedding/js/admin-household.js",
        contentType: "text/javascript; charset=UTF-8"
    },
    "admin-guests.js": {
        url: "https://qstodder.github.io/wedding/js/admin-guests.js",
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

const adminHouseholdPage = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <title>Household · Wedding Administration</title>
    <link rel="stylesheet" href="/admin/assets/variables.css">
    <link rel="stylesheet" href="/admin/assets/base.css">
    <link rel="stylesheet" href="/admin/assets/admin.css">
</head>
<body>
    <header class="admin-header admin-detail-header">
        <div>
            <a class="admin-back-link" href="/admin/">← Back to households</a>
            <p class="admin-eyebrow">Quiana &amp; Scott</p>
            <h1 id="detail-title">Household details</h1>
            <p class="admin-subtitle">Household, invitations, RSVPs, and dietary preferences</p>
        </div>
        <span id="admin-email">Secure access required</span>
    </header>
    <main class="admin-main admin-detail-main">
        <section id="admin-loading" class="admin-message" aria-live="polite">
            <div class="loading-mark" aria-hidden="true"></div>
            <h2>Loading household</h2>
        </section>
        <section id="admin-error" class="admin-message admin-error hidden" role="alert">
            <h2>Household unavailable</h2>
            <p id="admin-error-message"></p>
            <a class="primary-link" href="/admin/">Return to dashboard</a>
        </section>
        <div id="detail-content" class="admin-detail-layout hidden">
            <section class="admin-panel detail-section">
                <div class="panel-heading">
                    <div><p class="admin-eyebrow">Household</p><h2>Contact and mailing</h2></div>
                </div>
                <form id="household-form" class="detail-form">
                    <div class="detail-form-grid">
                        <label class="address-field"><span>Household name</span><input name="householdName" maxlength="150" required></label>
                        <label class="address-field"><span>Household key</span><input name="householdKey" maxlength="150" pattern="[a-z0-9]+(-[a-z0-9]+)*" required></label>
                        <label class="address-field detail-field-wide"><span>Email</span><input name="email" type="email" maxlength="254" autocomplete="email"></label>
                        <label class="admin-checkbox detail-field-wide"><input name="addressNeeded" type="checkbox"><span>This household needs a mailed invitation</span></label>
                        <label class="address-field detail-field-wide"><span>Address line 1</span><input name="line1" maxlength="200" autocomplete="address-line1"></label>
                        <label class="address-field detail-field-wide"><span>Address line 2</span><input name="line2" maxlength="200" autocomplete="address-line2"></label>
                        <label class="address-field"><span>City / locality</span><input name="city" maxlength="100" autocomplete="address-level2"></label>
                        <label class="address-field"><span>State / province / region</span><input name="region" maxlength="100" autocomplete="address-level1"></label>
                        <label class="address-field"><span>Postal code</span><input name="postalCode" maxlength="32" autocomplete="postal-code"></label>
                        <label class="address-field"><span>Country code</span><input name="countryCode" maxlength="2" pattern="[A-Za-z]{2}" list="country-codes" autocomplete="country" required><datalist id="country-codes"><option value="US">United States</option><option value="NL">Netherlands</option><option value="CA">Canada</option><option value="GB">United Kingdom</option><option value="FR">France</option><option value="DE">Germany</option></datalist></label>
                        <label class="address-field detail-field-wide"><span>Household notes</span><textarea name="notes" rows="3" maxlength="2000"></textarea></label>
                    </div>
                    <p id="household-form-status" class="form-status" aria-live="polite"></p>
                    <div class="detail-actions">
                        <button class="address-save-button" type="submit">Save household</button>
                        <button id="archive-household" class="danger-button" type="button">Archive household</button>
                    </div>
                </form>
            </section>
            <section class="admin-panel detail-section">
                <div class="panel-heading">
                    <div><p class="admin-eyebrow">Invitees</p><h2>Guests</h2></div>
                </div>
                <form id="add-guest-form" class="add-guest-form">
                    <label class="address-field"><span>First name</span><input name="firstName" maxlength="100" required></label>
                    <label class="address-field"><span>Last name</span><input name="lastName" maxlength="100"></label>
                    <label class="address-field"><span>Scott / Quiana</span><select name="coupleSide" required><option value="">Select…</option><option value="scott">Scott</option><option value="quiana">Quiana</option></select></label>
                    <label class="address-field"><span>Friend / Family</span><select name="relationshipType" required><option value="">Select…</option><option value="friend">Friend</option><option value="family">Family</option></select></label>
                    <label class="address-field"><span>Family side</span><select name="familySide"><option value="">Not applicable</option><option value="moms-side">Mom's side</option><option value="dads-side">Dad's side</option></select></label>
                    <button class="address-save-button" type="submit">Add guest</button>
                    <p class="form-status" aria-live="polite"></p>
                </form>
                <div id="guest-list" class="guest-editor-list"></div>
                <div id="no-guests" class="empty-results hidden">This household has no active guests.</div>
            </section>
        </div>
    </main>
    <script defer src="/admin/assets/admin-household.js"></script>
</body>
</html>`;

export async function getAdminHouseholdPage(
    request: Request,
    env: Env
): Promise<Response> {
    try {
        await authenticateAdmin(request, env);
        return new Response(adminHouseholdPage, {
            headers: {
                "Content-Type": "text/html; charset=UTF-8",
                "Cache-Control": "no-store",
                "Content-Security-Policy": [
                    "default-src 'none'", "script-src 'self'",
                    "style-src 'self' https://fonts.googleapis.com",
                    "font-src https://fonts.gstatic.com", "connect-src 'self'",
                    "base-uri 'none'", "frame-ancestors 'none'", "form-action 'self'"
                ].join("; "),
                "Referrer-Policy": "no-referrer",
                "X-Content-Type-Options": "nosniff"
            }
        });
    } catch (error) {
        return Response.json(
            { error: error instanceof AdminAuthError ? error.message : "Unable to load the household editor." },
            { status: error instanceof AdminAuthError ? error.status : 500 }
        );
    }
}

const adminGuestsPage = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <title>Guests · Wedding Administration</title>
    <link rel="stylesheet" href="/admin/assets/variables.css">
    <link rel="stylesheet" href="/admin/assets/base.css">
    <link rel="stylesheet" href="/admin/assets/admin.css">
</head>
<body>
    <header class="admin-header admin-header-with-tabs">
        <div class="admin-header-content">
            <div>
                <p class="admin-eyebrow">Quiana &amp; Scott</p>
                <h1>Guests</h1>
                <p class="admin-subtitle">Invitations, responses, and dietary preferences</p>
            </div>
            <div class="admin-identity">
                <span id="admin-email">Secure access required</span>
                <button id="refresh-guests" class="secondary-button" type="button">Refresh</button>
            </div>
        </div>
        <nav class="admin-tabs" aria-label="Administration sections">
            <a class="admin-tab" href="/admin/">Households</a>
            <a class="admin-tab is-active" href="/admin/guests/" aria-current="page">Guests</a>
        </nav>
    </header>
    <main class="admin-main">
        <section id="admin-loading" class="admin-message" aria-live="polite">
            <div class="loading-mark" aria-hidden="true"></div><h2>Loading guests</h2>
        </section>
        <section id="admin-error" class="admin-message admin-error hidden" role="alert">
            <h2>Guest list unavailable</h2><p id="admin-error-message"></p>
        </section>
        <div id="guest-content" class="hidden">
            <section class="admin-panel">
                <div class="panel-heading">
                    <div><p class="admin-eyebrow">Guest directory</p><h2>All active guests</h2></div>
                    <p id="guest-results-count" aria-live="polite"></p>
                    <button id="export-guests" class="secondary-button" type="button">Export view</button>
                </div>
                <div class="admin-filters guest-filters">
                    <div class="filter-field filter-search"><label for="guest-search">Search</label><input id="guest-search" type="search" placeholder="Guest or household" autocomplete="off"></div>
                    <div class="filter-field"><label for="guest-household-filter">Household</label><select id="guest-household-filter"><option value="all">All households</option></select></div>
                    <div class="filter-field"><label for="guest-couple-filter">Scott / Quiana</label><select id="guest-couple-filter"><option value="all">Either side</option><option value="scott">Scott</option><option value="quiana">Quiana</option><option value="unassigned">Unassigned</option></select></div>
                    <div class="filter-field"><label for="guest-relationship-filter">Friend / Family</label><select id="guest-relationship-filter"><option value="all">Either relationship</option><option value="friend">Friend</option><option value="family">Family</option><option value="unassigned">Unassigned</option></select></div>
                    <div class="filter-field"><label for="guest-family-side-filter">Family side</label><select id="guest-family-side-filter"><option value="all">Either family side</option><option value="moms-side">Mom's side</option><option value="dads-side">Dad's side</option><option value="unassigned">Unassigned</option></select></div>
                    <div class="filter-field"><label for="guest-dietary-filter">Dietary</label><select id="guest-dietary-filter"><option value="all">All dietary responses</option><option value="none">No restrictions</option></select></div>
                    <div class="filter-field"><label for="guest-invitation-filter">Invited to</label><select id="guest-invitation-filter"><option value="all">Any event</option><option value="welcome">Welcome gathering</option><option value="wedding">Wedding</option><option value="brunch">Brunch</option></select></div>
                    <div class="filter-field"><label for="guest-rsvp-filter">RSVP</label><select id="guest-rsvp-filter"><option value="all">All responses</option><option value="pending">Not recorded</option><option value="responded">Response recorded</option><option value="weddingYes">Wedding: attending</option><option value="weddingNo">Wedding: not attending</option></select></div>
                    <div class="filter-field"><label for="guest-sort">Sort</label><select id="guest-sort"><option value="lastNameAsc">Last name A–Z</option><option value="firstNameAsc">First name A–Z</option><option value="householdAsc">Household A–Z</option><option value="coupleSideAsc">Scott / Quiana</option><option value="relationshipAsc">Friend / Family</option><option value="familySideAsc">Family side</option><option value="dietaryAsc">Dietary A–Z</option><option value="weddingYesFirst">Wedding attending first</option></select></div>
                </div>
                <div class="table-scroll">
                    <table class="guest-table"><thead><tr>
                        <th scope="col"><span class="visually-hidden">Actions</span></th>
                        <th scope="col">Guest</th><th scope="col">Household</th><th scope="col">Tags</th>
                        <th scope="col">Invited to</th><th scope="col">RSVP</th>
                        <th scope="col">Dietary preferences</th>
                    </tr></thead><tbody id="guest-rows"></tbody></table>
                </div>
                <div id="guest-empty-results" class="empty-results hidden">No guests match these filters.</div>
            </section>
            <p id="guest-generated-at" class="generated-at"></p>
        </div>
    </main>
    <script defer src="/admin/assets/admin-guests.js"></script>
</body>
</html>`;

export async function getAdminGuestsPage(
    request: Request,
    env: Env
): Promise<Response> {
    try {
        await authenticateAdmin(request, env);
        return new Response(adminGuestsPage, {
            headers: {
                "Content-Type": "text/html; charset=UTF-8",
                "Cache-Control": "no-store",
                "Content-Security-Policy": [
                    "default-src 'none'", "script-src 'self'",
                    "style-src 'self' https://fonts.googleapis.com",
                    "font-src https://fonts.gstatic.com", "connect-src 'self'",
                    "base-uri 'none'", "frame-ancestors 'none'", "form-action 'self'"
                ].join("; "),
                "Referrer-Policy": "no-referrer",
                "X-Content-Type-Options": "nosniff"
            }
        });
    } catch (error) {
        return Response.json(
            { error: error instanceof AdminAuthError ? error.message : "Unable to load the guest list." },
            { status: error instanceof AdminAuthError ? error.status : 500 }
        );
    }
}
