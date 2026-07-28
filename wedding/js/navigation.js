/**************************************************************************
 * Highlight current navigation page
 **************************************************************************/

function initializeNavigation() {

    const currentPage =
        window.location.pathname
            .split("/")
            .pop();


    const navLinks =
        document.querySelectorAll(".main-nav a");


    navLinks.forEach(link => {

        const linkPage =
            link.getAttribute("href");


        if (linkPage === currentPage) {

            link.classList.add("active");

        }

    });

}