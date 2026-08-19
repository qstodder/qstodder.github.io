/**************************************************************************
 * Wedding Website Photo Carousel
 *
 * A small pool of image elements covers the viewport plus an off-screen
 * buffer. After each slide, the first element is recycled at the end with
 * the next photo. Keeping the pool size even centers the gap between the
 * two middle photos at every viewport width.
 **************************************************************************/

function initializeCarousel() {

    const PHOTO_COUNT = 12;
    const PHOTO_PATH = "assets/photos/carousel/";
    const BUFFER_PHOTOS = 4;

    const INITIAL_DELAY = 1000;
    const PAUSE_TIME = 3000;
    const SLIDE_TIME = 650;
    const RESIZE_DELAY = 120;

    const track = document.getElementById("carousel-track");
    const carousel = document.querySelector(".photo-carousel");

    if (!track || !carousel) {
        console.error("Carousel elements not found.");
        return;
    }

    let firstPhotoIndex = Math.floor(Math.random() * PHOTO_COUNT);
    let nextPhotoIndex = 0;
    let stepWidth = 0;
    let isPaused = false;
    let isAnimating = false;
    let timer = null;
    let resizeTimer = null;
    let timerStart = 0;
    let remaining = PAUSE_TIME;

    function photoUrl(index) {
        return PHOTO_PATH + String(index + 1).padStart(2, "0") + ".webp";
    }

    function createPhoto(index) {
        const img = document.createElement("img");

        img.src = photoUrl(index);
        img.alt = "Engagement photo";
        img.className = "carousel-photo";
        img.width = 260;
        img.height = 390;
        img.decoding = "async";

        return img;
    }

    function dimensions() {
        const styles = getComputedStyle(carousel);
        const photoWidth = parseFloat(styles.getPropertyValue("--carousel-photo-width"));
        const gap = parseFloat(styles.getPropertyValue("--carousel-gap"));

        return {
            photoWidth: Number.isFinite(photoWidth) ? photoWidth : 260,
            gap: Number.isFinite(gap) ? gap : 12
        };
    }

    function poolSize() {
        const { photoWidth, gap } = dimensions();
        const visiblePhotos = Math.ceil((carousel.clientWidth + gap) / (photoWidth + gap));
        let size = Math.max(6, visiblePhotos + BUFFER_PHOTOS);

        // An even number places the center gap—not a photo—at 50%.
        if (size % 2 !== 0) size++;

        return size;
    }

    function buildCarousel() {
        const fragment = document.createDocumentFragment();
        const size = poolSize();

        track.innerHTML = "";
        track.style.transition = "none";
        track.style.transform = "translateX(0)";

        for (let offset = 0; offset < size; offset++) {
            fragment.appendChild(createPhoto((firstPhotoIndex + offset) % PHOTO_COUNT));
        }

        track.appendChild(fragment);
        nextPhotoIndex = (firstPhotoIndex + size) % PHOTO_COUNT;

        const { photoWidth, gap } = dimensions();
        stepWidth = photoWidth + gap;
        isAnimating = false;
    }

    function scheduleNextSlide(delay = PAUSE_TIME) {
        clearTimeout(timer);

        if (isPaused || document.hidden) return;

        remaining = delay;
        timerStart = Date.now();
        timer = window.setTimeout(advanceCarousel, delay);
    }

    function advanceCarousel() {
        if (isPaused || isAnimating || document.hidden) return;

        isAnimating = true;
        track.style.transition = `transform ${SLIDE_TIME}ms ease-in-out`;
        track.style.transform = `translateX(-${stepWidth}px)`;
    }

    function recycleFirstPhoto(event) {
        if (event.propertyName !== "transform" || !isAnimating) return;

        const firstPhoto = track.firstElementChild;

        track.style.transition = "none";

        if (firstPhoto instanceof HTMLImageElement) {
            track.appendChild(firstPhoto);
            firstPhoto.src = photoUrl(nextPhotoIndex);
        }

        firstPhotoIndex = (firstPhotoIndex + 1) % PHOTO_COUNT;
        nextPhotoIndex = (nextPhotoIndex + 1) % PHOTO_COUNT;
        track.style.transform = "translateX(0)";
        isAnimating = false;

        scheduleNextSlide();
    }

    track.addEventListener("transitionend", recycleFirstPhoto);

    carousel.addEventListener("mouseenter", () => {
        isPaused = true;
        clearTimeout(timer);
        remaining = Math.max(0, remaining - (Date.now() - timerStart));
    });

    carousel.addEventListener("mouseleave", () => {
        isPaused = false;
        scheduleNextSlide(remaining || PAUSE_TIME);
    });

    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
            clearTimeout(timer);
            buildCarousel();
            scheduleNextSlide();
        }, RESIZE_DELAY);
    });

    document.addEventListener("visibilitychange", () => {
        clearTimeout(timer);
        if (!document.hidden) scheduleNextSlide();
    });

    buildCarousel();
    scheduleNextSlide(INITIAL_DELAY);
}
