document.addEventListener("DOMContentLoaded", async () => {

    const headerPlaceholder = document.getElementById("header-placeholder");

    try {

        await loadHeader();
        
        initializeNavigation();

        await initializeCarousel();

    }
    catch (error) {

        console.error(error);

    }
    finally {

        headerPlaceholder?.classList.add("header-ready");

    }

});
