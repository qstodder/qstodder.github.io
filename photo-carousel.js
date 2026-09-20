(() => {
  const gallery = document.querySelector("#mygallery");
  if (!gallery) return;

  const modal = document.createElement("div");
  modal.className = "photo-modal";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="photo-modal__dialog" role="dialog" aria-modal="true" aria-label="Photo album">
      <button class="photo-modal__close" type="button" aria-label="Close album">&times;</button>
      <button class="photo-modal__button photo-modal__previous" type="button" aria-label="Previous photo">&#8249;</button>
      <figure class="photo-modal__figure">
        <img class="photo-modal__image" alt="">
      </figure>
      <button class="photo-modal__button photo-modal__next" type="button" aria-label="Next photo">&#8250;</button>
      <div class="photo-modal__footer">
        <span class="photo-modal__count" aria-live="polite"></span>
        <a class="photo-modal__gallery-link">View gallery</a>
      </div>
    </div>`;
  document.body.append(modal);

  const image = modal.querySelector(".photo-modal__image");
  const previous = modal.querySelector(".photo-modal__previous");
  const next = modal.querySelector(".photo-modal__next");
  const count = modal.querySelector(".photo-modal__count");
  const galleryLink = modal.querySelector(".photo-modal__gallery-link");
  let photos = [];
  let current = 0;
  let lastFocused = null;
  let renderToken = 0;

  function show(index) {
    if (!photos.length) return;
    current = (index + photos.length) % photos.length;
    const token = ++renderToken;
    const photo = photos[current];
    image.src = photo.thumbnail || photo.full;
    image.alt = `Photo ${current + 1} of ${photos.length}`;
    count.textContent = `${current + 1} / ${photos.length}`;
    previous.disabled = next.disabled = photos.length < 2;

    if (photo.thumbnail && photo.thumbnail !== photo.full) {
      const fullImage = new Image();
      fullImage.onload = () => { if (token === renderToken) image.src = photo.full; };
      fullImage.src = photo.full;
    }

    [-1, 1].forEach((offset) => {
      if (photos.length > 1) new Image().src = photos[(current + offset + photos.length) % photos.length].full;
    });
  }

  async function openAlbum(link) {
    lastFocused = link;
    const url = new URL(link.href, window.location.href);
    galleryLink.href = url.href;
    galleryLink.textContent = /\.html$/i.test(url.pathname) ? "View gallery" : "View full image";
    photos = [];

    if (/\.html$/i.test(url.pathname)) {
      try {
        const response = await fetch(url.href);
        if (!response.ok) throw new Error("Album could not be loaded");
        const doc = new DOMParser().parseFromString(await response.text(), "text/html");
        photos = [...doc.querySelectorAll("#mygallery a[href]")].map((item) => {
          const thumbnail = item.querySelector("img")?.getAttribute("src");
          return {
            full: new URL(item.getAttribute("href"), url).href,
            thumbnail: thumbnail ? new URL(thumbnail, url).href : null,
          };
        });
      } catch (error) {
        window.location.href = url.href;
        return;
      }
    } else {
      photos = [{ full: url.href, thumbnail: link.querySelector("img")?.src || null }];
    }

    modal.hidden = false;
    document.body.classList.add("photo-modal-open");
    show(0);
    modal.querySelector(".photo-modal__close").focus();
  }

  function close() {
    modal.hidden = true;
    image.removeAttribute("src");
    document.body.classList.remove("photo-modal-open");
    if (lastFocused) lastFocused.focus();
  }

  gallery.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link) return;
    event.preventDefault();
    openAlbum(link);
  });
  previous.addEventListener("click", () => show(current - 1));
  next.addEventListener("click", () => show(current + 1));
  modal.querySelector(".photo-modal__close").addEventListener("click", close);
  modal.addEventListener("click", (event) => { if (event.target === modal) close(); });
  document.addEventListener("keydown", (event) => {
    if (modal.hidden) return;
    if (event.key === "Escape") close();
    if (event.key === "ArrowLeft") show(current - 1);
    if (event.key === "ArrowRight") show(current + 1);
  });

  let touchStart = null;
  modal.addEventListener("touchstart", (event) => { touchStart = event.changedTouches[0].clientX; }, { passive: true });
  modal.addEventListener("touchend", (event) => {
    if (touchStart === null) return;
    const distance = event.changedTouches[0].clientX - touchStart;
    if (Math.abs(distance) > 45) show(current + (distance < 0 ? 1 : -1));
    touchStart = null;
  }, { passive: true });
})();
