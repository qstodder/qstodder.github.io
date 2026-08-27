document.addEventListener("DOMContentLoaded", async () => {

    try {

        await loadHeader();
        
        initializeNavigation();

        await initializeCarousel();

        document.getElementById("header-placeholder")?.classList.add("header-ready");

    }
    catch (error) {

        console.error(error);

    }

});
