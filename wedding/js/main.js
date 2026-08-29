document.addEventListener("DOMContentLoaded", async () => {

    try {

        await loadHeader();
        
        initializeNavigation();

        initializeCarousel();

        if (
            window.location.pathname.endsWith("/rsvp.html") &&
            window.location.hash === "#search-screen"
        ) {
            requestAnimationFrame(() => requestAnimationFrame(() => {
                document.getElementById("search-screen")?.scrollIntoView({
                    block: "start",
                    behavior: "instant"
                });
            }));
        }

    }
    catch (error) {

        console.error(error);

    }

});
