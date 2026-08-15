/**************************************************************************
 * Highlight current navigation page
 **************************************************************************/

function initializeNavigation() {

    const currentPage =
        window.location.pathname
            .split("/")
            .pop();

    const navigationPage =
        /^schedule(?:-[23])?\.html$/.test(currentPage)
            ? "schedule.html"
            : currentPage;


    const navLinks =
        document.querySelectorAll(".main-nav a");


    navLinks.forEach(link => {

        const linkPage =
            link.getAttribute("href");


        if (linkPage === navigationPage) {

            link.classList.add("active");

        }

    });

}
