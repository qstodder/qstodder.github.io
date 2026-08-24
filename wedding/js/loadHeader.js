async function loadHeader() {

    const response =
        await fetch("partials/header.html?v=2", {
            cache: "no-store"
        });

    if (!response.ok) {
        throw new Error("Unable to load the shared wedding header.");
    }

    const html =
        await response.text();

    document.getElementById(
        "header-placeholder"
    ).innerHTML = html;
}
