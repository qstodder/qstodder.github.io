document.addEventListener("DOMContentLoaded", async () => {

    try {

        await loadHeader();
        
        initializeNavigation();

        initializeCarousel();

        if (
            window.location.pathname.endsWith("/rsvp.html") &&
            window.location.hash === "#rsvp-form"
        ) {
            requestAnimationFrame(() => requestAnimationFrame(() => {
                document.getElementById("rsvp-form")?.scrollIntoView({
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
