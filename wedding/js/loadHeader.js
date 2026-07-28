async function loadHeader() {

    const response =
        await fetch("partials/header.html");

    const html =
        await response.text();

    document.getElementById(
        "header-placeholder"
    ).innerHTML = html;
}