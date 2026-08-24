function initializeNavigation() {
    const currentPage = window.location.pathname.split("/").pop() || "schedule.html";
    const navigationPage = /^schedule(?:-[23])?\.html$/.test(currentPage)
        ? "schedule.html"
        : currentPage;
    const navigation = document.getElementById("site-navigation");
    const menuToggle = document.querySelector(".menu-toggle");

    for (const link of document.querySelectorAll(".site-nav a")) {
        const isCurrent = link.getAttribute("href") === navigationPage;
        link.classList.toggle("active", isCurrent);
        if (isCurrent) link.setAttribute("aria-current", "page");
    }

    function closeMenu() {
        navigation?.classList.remove("is-open");
        menuToggle?.setAttribute("aria-expanded", "false");
    }

    menuToggle?.addEventListener("click", () => {
        const isOpen = navigation?.classList.toggle("is-open") ?? false;
        menuToggle.setAttribute("aria-expanded", String(isOpen));
    });

    navigation?.addEventListener("click", (event) => {
        if (event.target.closest("a")) closeMenu();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeMenu();
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 720) closeMenu();
    });
}
