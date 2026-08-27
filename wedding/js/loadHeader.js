async function loadHeader() {
    const placeholder = document.getElementById("header-placeholder");

    if (!placeholder) return;

    placeholder.setAttribute("aria-busy", "true");

    try {
        const response = await fetch("partials/header.html?v=3");

        if (!response.ok) {
            throw new Error("Unable to load the shared wedding header.");
        }

        placeholder.innerHTML = await response.text();
    }
    catch (error) {
        placeholder.classList.add("header-load-failed");
        throw error;
    }
    finally {
        placeholder.removeAttribute("aria-busy");
    }
}
