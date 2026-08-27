/**************************************************************************
 * Wedding Website Photo Carousel
 *
 * A small pool of image elements covers the viewport plus an off-screen
 * buffer. After each slide, the first element is recycled at the end with
 * the next photo. Keeping the pool size even centers the gap between the
 * two middle photos at every viewport width.
 **************************************************************************/

async function initializeCarousel() {

    const PHOTO_COUNT = 12;
    const PHOTO_PATH = "assets/photos/carousel/";
    const BUFFER_PHOTOS = 4;
    const STORAGE_KEY = "weddingCarouselState";

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

    const restoredState = readCarouselState();
    let firstPhotoIndex = restoredState?.firstPhotoIndex
        ?? Math.floor(Math.random() * PHOTO_COUNT);
    let nextPhotoIndex = 0;
    let stepWidth = 0;
    let isPaused = false;
    let isAnimating = false;
    let timer = null;
    let resizeTimer = null;
    let timerStart = 0;
    let remaining = restoredState?.remaining ?? INITIAL_DELAY;
    let visibleEndOffset = 0;
    let incomingPhotoPromise = Promise.resolve();
    let nextPhotoPromise = Promise.resolve();

    function readCarouselState() {
        try {
            const savedState = JSON.parse(sessionStorage.getItem(STORAGE_KEY));

            if (
                !savedState
                || !Number.isInteger(savedState.firstPhotoIndex)
                || savedState.firstPhotoIndex < 0
                || savedState.firstPhotoIndex >= PHOTO_COUNT
                || !Number.isFinite(savedState.remaining)
            ) {
                return null;
            }

            return {
                firstPhotoIndex: savedState.firstPhotoIndex,
                remaining: Math.max(100, Math.min(PAUSE_TIME, savedState.remaining))
            };
        }
        catch {
            return null;
        }
    }

    function saveCarouselState() {
        let savedRemaining = remaining;

        if (timer && !isPaused && !document.hidden) {
            savedRemaining = Math.max(0, remaining - (Date.now() - timerStart));
        }

        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
                firstPhotoIndex,
                remaining: Math.max(100, savedRemaining)
            }));
        }
        catch {
            // The carousel still works when browser storage is disabled.
        }
    }

    function photoUrl(index) {
        return PHOTO_PATH + String(index + 1).padStart(2, "0") + ".webp";
    }

    function createPhoto(index, isVisible = false) {
        const img = document.createElement("img");

        img.src = photoUrl(index);
        img.alt = "Engagement photo";
        img.className = "carousel-photo";
        img.width = 260;
        img.height = 390;
        img.decoding = "async";
        img.loading = isVisible ? "eager" : "lazy";
        img.fetchPriority = isVisible ? "high" : "low";

        return img;
    }

    function waitForPhoto(photo) {
        const readiness = typeof photo.decode === "function"
            ? photo.decode().catch(() => undefined)
            : new Promise((resolve) => {
                if (photo.complete) {
                    resolve();
                    return;
                }

                const finish = () => resolve();

                photo.addEventListener("load", finish, { once: true });
                photo.addEventListener("error", finish, { once: true });

                // Close the small race where loading finishes while the
                // listeners above are being attached.
                if (photo.complete) resolve();
            });

        // A slow or unavailable photo must never hold the whole page hostage.
        return Promise.race([
            readiness,
            new Promise((resolve) => window.setTimeout(resolve, 1800))
        ]);
    }

    function warmCarouselCache() {
        const preload = () => {
            for (let index = 0; index < PHOTO_COUNT; index++) {
                const photo = new Image();

                photo.decoding = "async";
                photo.fetchPriority = "low";
                photo.src = photoUrl(index);
            }
        };

        if ("requestIdleCallback" in window) {
            window.requestIdleCallback(preload, { timeout: 1500 });
        }
        else {
            window.setTimeout(preload, 0);
        }
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

    function prepareUpcomingPhotos() {
        const incomingPhoto = track.children[visibleEndOffset + 1];
        const nextPhoto = new Image();

        if (incomingPhoto instanceof HTMLImageElement) {
            incomingPhoto.loading = "eager";
            incomingPhoto.fetchPriority = "high";
            incomingPhotoPromise = waitForPhoto(incomingPhoto);
        }
        else {
            incomingPhotoPromise = Promise.resolve();
        }

        nextPhoto.decoding = "async";
        nextPhoto.fetchPriority = "high";
        nextPhoto.src = photoUrl(nextPhotoIndex);
        nextPhotoPromise = waitForPhoto(nextPhoto);
    }

    function buildCarousel() {
        const fragment = document.createDocumentFragment();
        const size = poolSize();
        const { photoWidth, gap } = dimensions();
        const visibleCount = Math.ceil((carousel.clientWidth + gap) / (photoWidth + gap));
        const bufferBefore = Math.floor((size - visibleCount) / 2);
        const visiblePhotos = [];

        track.innerHTML = "";
        track.style.transition = "none";
        track.style.transform = "translateX(0)";

        for (let offset = 0; offset < size; offset++) {
            const isVisible = offset >= bufferBefore && offset < bufferBefore + visibleCount;
            const photo = createPhoto((firstPhotoIndex + offset) % PHOTO_COUNT, isVisible);

            if (isVisible) visiblePhotos.push(photo);
            fragment.appendChild(photo);
        }

        track.appendChild(fragment);
        nextPhotoIndex = (firstPhotoIndex + size) % PHOTO_COUNT;
        visibleEndOffset = bufferBefore + visibleCount - 1;

        stepWidth = photoWidth + gap;
        isAnimating = false;
        prepareUpcomingPhotos();

        return visiblePhotos;
    }

    function scheduleNextSlide(delay = PAUSE_TIME) {
        clearTimeout(timer);

        if (isPaused || document.hidden) return;

        remaining = delay;
        timerStart = Date.now();
        timer = window.setTimeout(advanceCarousel, delay);
        saveCarouselState();
    }

    async function advanceCarousel() {
        if (isPaused || isAnimating || document.hidden) return;

        isAnimating = true;

        await Promise.all([incomingPhotoPromise, nextPhotoPromise]);

        if (isPaused || document.hidden) {
            isAnimating = false;
            return;
        }

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
        prepareUpcomingPhotos();

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
        if (document.hidden) {
            if (timer && !isPaused) {
                remaining = Math.max(0, remaining - (Date.now() - timerStart));
            }
            clearTimeout(timer);
            saveCarouselState();
        }
        else {
            scheduleNextSlide(remaining);
        }
    });

    window.addEventListener("pagehide", saveCarouselState);

    const initialPhotos = buildCarousel();

    await Promise.all(initialPhotos.map(waitForPhoto));
    warmCarouselCache();
    scheduleNextSlide(remaining);
}
