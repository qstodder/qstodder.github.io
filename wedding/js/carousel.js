/**************************************************************************
 * Wedding Website Photo Carousel
 *
 * Behavior:
 * - Loads engagement photos dynamically
 * - Displays as an infinite scrolling reel
 * - Advances one photo at a time
 * - Pauses between movements
 * - Pauses while hovering
 **************************************************************************/

function initializeCarousel() {

    const PHOTO_COUNT = 12;
    const PHOTO_PATH = "assets/photos/carousel/";

    const INITIAL_DELAY = 1000;
    const PAUSE_TIME = 3000;
    const SLIDE_TIME = 650;

    const track = document.getElementById("carousel-track");
    const carousel = document.querySelector(".photo-carousel");

    if (!track || !carousel) {
        console.error("Carousel elements not found.");
        return;
    }

    let currentIndex = 0;
    let stepWidth = 0;

    let isPaused = false;
    let timer = null;
    let startingOffset = 0;

    let timerStart;
    let remaining = 0;
    let elapsed = 0;

    /**************************************************************************
     * Create photo element
     **************************************************************************/

    function createPhoto(index) {

        const img = document.createElement("img");

        img.src =
            PHOTO_PATH + String(index).padStart(2, "0") + ".webp";

        img.alt = "Engagement photo";

        img.className = "carousel-photo";

        return img;

    }


    /**************************************************************************
     * Populate carousel
     **************************************************************************/

    function buildCarousel() {

        // Random starting number
        const rand_start = Math.floor(Math.random() * PHOTO_COUNT) + 1;

        const arr1 = Array.from({ length: PHOTO_COUNT - rand_start + 1 }, (_, i) => rand_start + i);
        const arr2 = Array.from({ length: rand_start - 1 }, (_, i) => i + 1);
        const photo_array = [...arr1, ...arr2]

        track.innerHTML = "";

        // three duplicate arrays
        for (let i = 0; i < PHOTO_COUNT; i++) {
            for (const photo of photo_array) {
                track.appendChild(createPhoto(photo));
            }
        }
    }


    /**************************************************************************
     * Calculate movement distance
     **************************************************************************/

    function measureStep() {

        const firstPhoto =
            track.querySelector(".carousel-photo");

        if (!firstPhoto) {
            return;
        }

        const gap =
            parseFloat(getComputedStyle(track).gap);


        stepWidth =
            firstPhoto.getBoundingClientRect().width + gap;


        const carouselWidth =
            document.querySelector(".photo-carousel")
            .getBoundingClientRect().width;


        const photoWidth =
            firstPhoto.getBoundingClientRect().width;


        startingOffset =
            (carouselWidth / 2) - (photoWidth * 2) - gap;

            /*
        track.style.transition = "none";

        track.style.transform =
            `translateX(${startingOffset - currentIndex * stepWidth}px)`;
            */


    }


    /**************************************************************************
     * Move carousel one photo
     **************************************************************************/

    function advanceCarousel() {

        if (isPaused) {
            return;
        }


        currentIndex++;


        track.style.transition =
            `transform ${SLIDE_TIME}ms ease-in-out`;


        track.style.transform =
            `translateX(-${currentIndex * stepWidth}px)`;

    }


    /**************************************************************************
     * Schedule next movement
     **************************************************************************/

    function scheduleNextSlide(delay = PAUSE_TIME) {

        timerStart = Date.now();

        clearTimeout(timer);

        timer = setTimeout(() => {
            if (!isPaused) {
                advanceCarousel();
            }
        }, delay);

    }

    track.addEventListener(
        "transitionend",
        () => {

            if (currentIndex === PHOTO_COUNT) {

                track.style.transition = "none";

                currentIndex = 0;

                track.style.transform =
                    "translateX(0px)";

                // Force browser to apply reset
                void track.offsetWidth;

            }

            scheduleNextSlide();

        }
    );

    carousel.addEventListener(
        "mouseenter",
        () => {

            isPaused = true;

            clearTimeout(timer);

            elapsed = Date.now() - timerStart;
            remaining = Math.max(0, PAUSE_TIME - elapsed);

            console.log(elapsed, remaining)

        }
    );


    carousel.addEventListener(
        "mouseleave",
        () => {

            isPaused = false;

            scheduleNextSlide(remaining);

        }
    );

    window.addEventListener(
        "resize",
        () => {

            measureStep();

            track.style.transition = "none";

            track.style.transform =
                `translateX(-${currentIndex * stepWidth}px)`;

        }
    );


    buildCarousel();

    requestAnimationFrame(() => {

        requestAnimationFrame(() => {

            measureStep();

            scheduleNextSlide(
                INITIAL_DELAY
            );

        });

    });


    }
