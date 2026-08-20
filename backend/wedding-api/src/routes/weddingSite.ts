import { Env } from "../types";

const COOKIE_NAME = "wedding_access";
const SESSION_SECONDS = 60 * 60 * 24 * 180;
const RAW_SITE_ORIGIN = "https://raw.githubusercontent.com/qstodder/qstodder.github.io/master";
const ADMIN_DASHBOARD_URL = "https://wedding-rsvp-api.qstodder.workers.dev/admin/";

function encode(bytes: Uint8Array): string {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

async function digest(value: string): Promise<Uint8Array> {
    return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

function equal(left: Uint8Array, right: Uint8Array): boolean {
    if (left.length !== right.length) return false;
    let difference = 0;
    for (let index = 0; index < left.length; index++) difference |= left[index] ^ right[index];
    return difference === 0;
}

async function signature(value: string, secret: string): Promise<string> {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    return encode(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}

async function session(secret: string): Promise<string> {
    const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
    const value = `v1.${expires}`;
    return `${value}.${await signature(value, secret)}`;
}

async function validSession(value: string | undefined, secret: string): Promise<boolean> {
    if (!value) return false;
    const [version, expiresText, suppliedSignature, extra] = value.split(".");
    const expires = Number(expiresText);
    if (version !== "v1" || extra !== undefined || !Number.isInteger(expires) || expires <= Date.now() / 1000) return false;
    const expected = await signature(`${version}.${expiresText}`, secret);
    return equal(new TextEncoder().encode(suppliedSignature ?? ""), new TextEncoder().encode(expected));
}

function cookie(request: Request): string | undefined {
    const cookies = request.headers.get("Cookie") ?? "";
    for (const item of cookies.split(";")) {
        const [name, ...value] = item.trim().split("=");
        if (name === COOKIE_NAME) return value.join("=");
    }
    return undefined;
}

function safeNext(value: unknown): string {
    if (typeof value !== "string") return "/wedding/";
    try {
        const decoded = decodeURIComponent(value);
        return decoded.startsWith("/wedding/") && !decoded.startsWith("/wedding/login") ? decoded : "/wedding/";
    } catch {
        return "/wedding/";
    }
}

function loginPage(error = "", next = "/wedding/", status = 200): Response {
    const errorMessage = error ? `<p class="error" role="alert">${error}</p>` : "";
    const safeNextValue = next.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><title>Quiana &amp; Scott · Wedding</title><style>
@import url("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Italianno&family=Montserrat:wght@500;600&display=swap");
:root{--navy:#243746;--deep:#29465a;--blue:#91aebe;--pale:#dbe7eb;--gold:#c5a75e;--paper:#f7faf9}*{box-sizing:border-box}html,body{min-height:100%}body{margin:0;color:var(--navy);background:radial-gradient(circle at 50% 16%,#f9fbfb 0,#e5eef1 46%,#bdced5 100%);font-family:"Cormorant Garamond",Georgia,serif}main{display:grid;min-height:100vh;place-items:center;padding:38px 22px}.mount{position:relative;isolation:isolate;width:min(100%,590px);padding:10px;background:var(--deep);box-shadow:0 18px 45px rgba(25,47,61,.16)}.mount:before{position:absolute;z-index:-1;inset:-7px;background:var(--blue);box-shadow:0 9px 20px rgba(25,47,61,.11);content:""}.card{position:relative;padding:clamp(46px,9vw,78px) clamp(30px,9vw,74px);background-color:var(--paper);background-image:radial-gradient(circle at 18% 22%,rgba(181,150,87,.04),transparent 30%),repeating-linear-gradient(90deg,rgba(70,58,42,.014) 0 1px,transparent 1px 3px);border:6px solid var(--pale);box-shadow:inset 0 0 0 1px rgba(56,88,106,.42);text-align:center}.card:before,.card:after{position:absolute;pointer-events:none;content:""}.card:before{inset:18px;border:1px solid #8aa5b4}.card:after{inset:23px;border:1px solid var(--gold)}.content{position:relative;z-index:1}.eyebrow{margin:0;color:#66818e;font:600 .67rem Montserrat,sans-serif;letter-spacing:.2em;text-transform:uppercase}h1{margin:1.05rem 0 .2rem;font:500 clamp(2.15rem,8vw,3.55rem)/1.08 Montserrat,sans-serif;letter-spacing:.08em;text-transform:uppercase}h1 span{display:block;margin:.05em 0;color:#7093a6;font:400 clamp(2.2rem,8vw,3.45rem)/.75 Italianno,"Cormorant Garamond",cursive;letter-spacing:0;text-transform:none}.welcome{margin:1.25rem 0 .35rem;font-size:1.22rem}.date{margin:0 0 2rem;color:#66818e;font:600 .67rem Montserrat,sans-serif;letter-spacing:.15em;text-transform:uppercase}form{display:grid;gap:.7rem;max-width:360px;margin:0 auto;text-align:left}.visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}label{font:600 .65rem Montserrat,sans-serif;letter-spacing:.12em;text-transform:uppercase}input[type=password]{width:100%;min-height:48px;padding:.7rem .85rem;color:var(--navy);background:#fff;border:1px solid rgba(36,55,70,.28);border-radius:3px;font:1rem Montserrat,sans-serif}input:focus{outline:3px solid rgba(122,157,176,.3);border-color:#7093a6}button{min-height:48px;margin-top:.25rem;color:#fff;background:var(--deep);border:1px solid var(--deep);border-radius:999px;font:600 .7rem Montserrat,sans-serif;letter-spacing:.1em;text-transform:uppercase;cursor:pointer}button:hover,button:focus-visible{background:#365f74}.hint{margin:1.2rem 0 0;color:#71828b;font-size:.94rem}.error{margin:.2rem 0 .5rem;padding:.65rem .8rem;color:#7b3d2c;background:#f7e7df;border-radius:3px;text-align:center}@media(max-width:480px){main{padding:20px 12px}.mount{padding:7px}.mount:before{inset:-4px}.card{padding:54px 28px}.card:before{inset:13px}.card:after{inset:17px}}
</style></head><body><main><section class="mount" aria-labelledby="login-title"><div class="card"><div class="content"><h1 id="login-title">Quiana <span>&amp;</span> Scott</h1><form method="post" action="/wedding/login" autocomplete="on"><label class="visually-hidden" for="wedding-username">Username</label><input class="visually-hidden" id="wedding-username" name="username" type="text" value="wedding-guest" autocomplete="username" tabindex="-1"><input type="hidden" name="next" value="${safeNextValue}"><label for="wedding-password">Password</label><input id="wedding-password" name="password" type="password" autocomplete="current-password" required autofocus>${errorMessage}<button type="submit">Enter wedding website</button></form><p class="hint">Please enter the password included with your invitation email and Save the Date.</p></div></div></section></main></body></html>`;
    return new Response(html, { status, headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "no-store", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; form-action 'self'; base-uri 'none'; frame-ancestors 'none'", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" } });
}

function configured(env: Env): env is Env & { WEDDING_SITE_PASSWORD: string; WEDDING_SESSION_SECRET: string } {
    return Boolean(env.WEDDING_SITE_PASSWORD?.trim() && env.WEDDING_SESSION_SECRET?.trim());
}

function redirect(location: string, cookieHeader?: string): Response {
    const headers = new Headers({ Location: location, "Cache-Control": "no-store" });
    if (cookieHeader) headers.set("Set-Cookie", cookieHeader);
    return new Response(null, { status: 303, headers });
}

function contentType(pathname: string): string {
    const extension = pathname.split(".").pop()?.toLowerCase();
    return ({ html: "text/html; charset=UTF-8", css: "text/css; charset=UTF-8", js: "text/javascript; charset=UTF-8", json: "application/json; charset=UTF-8", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", ico: "image/x-icon", svg: "image/svg+xml", ics: "text/calendar; charset=UTF-8", csv: "text/csv; charset=UTF-8", woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf" } as Record<string, string>)[extension ?? ""] ?? "application/octet-stream";
}

async function protectedAsset(request: Request): Promise<Response> {
    const url = new URL(request.url);
    let pathname = url.pathname;
    if (pathname === "/wedding") return redirect("/wedding/");
    if (pathname.endsWith("/")) pathname += "index.html";
    const source = await fetch(`${RAW_SITE_ORIGIN}${pathname}`, { method: request.method, redirect: "follow" });
    if (!source.ok) return new Response("Not found", { status: source.status === 404 ? 404 : 502 });
    const headers = new Headers({ "Content-Type": contentType(pathname), "Cache-Control": "private, no-store", "Referrer-Policy": "strict-origin-when-cross-origin", "X-Content-Type-Options": "nosniff" });
    return new Response(request.method === "HEAD" ? null : source.body, { status: 200, headers });
}

export async function handleWeddingSiteRequest(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (
        request.method === "GET" &&
        (url.pathname === "/wedding/admin" || url.pathname === "/wedding/admin/")
    ) {
        return redirect(ADMIN_DASHBOARD_URL);
    }
    if (!configured(env)) return loginPage("The wedding website password has not been configured yet.", "/wedding/", 503);
    if (url.pathname === "/wedding/logout") return redirect("/wedding/login", `${COOKIE_NAME}=; Path=/wedding; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
    if (url.pathname === "/wedding/login") {
        const next = safeNext(url.searchParams.get("next"));
        if (request.method === "GET") {
            if (await validSession(cookie(request), env.WEDDING_SESSION_SECRET)) return redirect(next);
            return loginPage("", next);
        }
        if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
        const form = await request.formData().catch(() => null);
        const submitted = typeof form?.get("password") === "string" ? String(form.get("password")) : "";
        const submittedNext = safeNext(form?.get("next") ?? null);
        if (!equal(await digest(submitted), await digest(env.WEDDING_SITE_PASSWORD))) return loginPage("That password doesn’t match. Please try again.", submittedNext, 401);
        const value = await session(env.WEDDING_SESSION_SECRET);
        return redirect(submittedNext, `${COOKIE_NAME}=${value}; Path=/wedding; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Lax`);
    }
    if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
    if (!await validSession(cookie(request), env.WEDDING_SESSION_SECRET)) return redirect(`/wedding/login?next=${encodeURIComponent(`${url.pathname}${url.search}`)}`);
    return protectedAsset(request);
}
