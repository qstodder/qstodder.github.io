const INFORMATIONAL_PAGES = new Set([
    "schedule.html",
    "accommodation.html",
    "registry.html",
    "faq.html"
]);

const pageCache = new Map();
const scriptPromises = new Map();
let navigationRequest = null;

function pageName(url = window.location.href) {
    const name = new URL(url, window.location.href).pathname.split("/").pop();
    return /^schedule(?:-[23])?\.html$/.test(name)
        ? "schedule.html"
        : name || "schedule.html";
}

function updateActiveNavigation(url = window.location.href) {
    const currentPage = pageName(url);
    for (const link of document.querySelectorAll(".site-nav a")) {
        const isCurrent = pageName(link.href) === currentPage;
        link.classList.toggle("active", isCurrent);
        if (isCurrent) {
            link.setAttribute("aria-current", "page");
        } else {
            link.removeAttribute("aria-current");
        }
    }
}

function closeNavigationMenu() {
    document.getElementById("site-navigation")?.classList.remove("is-open");
    document.querySelector(".menu-toggle")?.setAttribute("aria-expanded", "false");
}

function loadScript(src) {
    const absoluteSrc = new URL(src, window.location.href).href;
    const existing = [...document.scripts].find((script) => script.src === absoluteSrc);
    if (existing) return Promise.resolve();
    if (scriptPromises.has(absoluteSrc)) return scriptPromises.get(absoluteSrc);

    const promise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = absoluteSrc;
        script.addEventListener("load", resolve, { once: true });
        script.addEventListener("error", reject, { once: true });
        document.body.appendChild(script);
    });
    scriptPromises.set(absoluteSrc, promise);
    return promise;
}

async function loadPageStyles(pageDocument, targetUrl) {
    const targetStyles = [...pageDocument.querySelectorAll("link[data-page-style]")]
        .map((link) => ({
            href: new URL(link.getAttribute("href"), targetUrl).href,
            media: link.media || "all"
        }));

    const loadedStyles = [];
    await Promise.all(targetStyles.map(({ href, media }) => {
        const existing = [...document.querySelectorAll("link[rel='stylesheet']")]
            .find((link) => link.href === href);
        if (existing) {
            existing.setAttribute("data-page-style", "");
            loadedStyles.push(existing);
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = href;
            link.media = media;
            link.setAttribute("data-page-style", "");
            link.addEventListener("load", () => {
                loadedStyles.push(link);
                resolve();
            }, { once: true });
            link.addEventListener("error", reject, { once: true });
            document.head.appendChild(link);
        });
    }));

    for (const link of document.querySelectorAll("link[data-page-style]")) {
        if (!loadedStyles.includes(link)) link.remove();
    }
}

async function initializePage(page) {
    if (page !== "schedule.html") window.destroyWeekendMap?.();

    if (page === "schedule.html") {
        await loadScript("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js");
        await loadScript("js/schedule-map.js?v=3");
        window.initializeWeekendMap?.();
    }
    if (page === "registry.html") {
        await loadScript("js/registry.js?v=3");
        window.initializeRegistryPage?.();
    }
}

async function fetchPage(url, signal) {
    const cacheKey = url.href;
    if (pageCache.has(cacheKey)) return pageCache.get(cacheKey);

    const response = await fetch(url, {
        signal,
        headers: { "X-Wedding-Navigation": "partial" }
    });
    if (!response.ok) throw new Error(`Unable to load ${url.pathname}.`);
    const pageDocument = new DOMParser().parseFromString(
        await response.text(),
        "text/html"
    );
    if (!pageDocument.querySelector("main")) {
        throw new Error(`The page ${url.pathname} does not contain its main content.`);
    }
    pageCache.set(cacheKey, pageDocument);
    return pageDocument;
}

async function navigateWithinSite(url, { push = true } = {}) {
    const targetUrl = new URL(url, window.location.href);
    const targetPage = pageName(targetUrl);
    if (!INFORMATIONAL_PAGES.has(targetPage)) {
        window.location.assign(targetUrl.href);
        return;
    }

    navigationRequest?.abort();
    navigationRequest = new AbortController();
    document.documentElement.classList.add("is-page-loading");

    try {
        const pageDocument = await fetchPage(targetUrl, navigationRequest.signal);
        await loadPageStyles(pageDocument, targetUrl);

        const incomingMain = pageDocument.querySelector("main");
        const currentMain = document.querySelector("main");
        if (!currentMain) throw new Error("The current page does not contain its main content.");

        window.destroyWeekendMap?.();
        currentMain.replaceWith(document.importNode(incomingMain, true));
        document.querySelectorAll("[data-spa-portal]").forEach((node) => node.remove());

        const paymentDialog = pageDocument.getElementById("payment-dialog");
        if (paymentDialog) {
            const portal = document.importNode(paymentDialog, true);
            portal.setAttribute("data-spa-portal", "");
            document.querySelector(".main-stage")?.after(portal);
        }

        document.title = pageDocument.title;
        const description = pageDocument.querySelector('meta[name="description"]')?.content ?? "";
        const currentDescription = document.querySelector('meta[name="description"]');
        if (currentDescription) {
            currentDescription.content = description;
        } else if (description) {
            const meta = document.createElement("meta");
            meta.name = "description";
            meta.content = description;
            document.head.appendChild(meta);
        }

        if (push) history.pushState({ weddingPage: targetPage }, "", targetUrl);
        updateActiveNavigation(targetUrl);
        closeNavigationMenu();
        window.scrollTo({ top: 0, behavior: "instant" });

        await initializePage(targetPage);
        const heading = document.querySelector("main h2, main h1");
        if (heading) {
            heading.setAttribute("tabindex", "-1");
            heading.focus({ preventScroll: true });
        }
    } catch (error) {
        if (error.name === "AbortError") return;
        console.error(error);
        window.location.assign(targetUrl.href);
    } finally {
        document.documentElement.classList.remove("is-page-loading");
    }
}

function initializeNavigation() {
    const navigation = document.getElementById("site-navigation");
    const menuToggle = document.querySelector(".menu-toggle");
    updateActiveNavigation();

    menuToggle?.addEventListener("click", () => {
        const isOpen = navigation?.classList.toggle("is-open") ?? false;
        menuToggle.setAttribute("aria-expanded", String(isOpen));
    });

    document.addEventListener("click", (event) => {
        const link = event.target.closest("a[href]");
        if (!link || event.defaultPrevented || event.button !== 0 ||
            event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
            link.target || link.hasAttribute("download")) return;

        const url = new URL(link.href, window.location.href);
        if (url.origin !== window.location.origin ||
            !INFORMATIONAL_PAGES.has(pageName(url))) return;

        event.preventDefault();
        navigateWithinSite(url);
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeNavigationMenu();
    });
    window.addEventListener("resize", () => {
        if (window.innerWidth > 720) closeNavigationMenu();
    });
    window.addEventListener("popstate", () => {
        if (INFORMATIONAL_PAGES.has(pageName())) {
            navigateWithinSite(window.location.href, { push: false });
        } else {
            window.location.reload();
        }
    });
}
