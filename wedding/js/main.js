document.addEventListener("DOMContentLoaded", async () => {

    try {

        await loadHeader();
        
        initializeNavigation();

        initializeCarousel();

    }
    catch (error) {

        console.error(error);

    }

});