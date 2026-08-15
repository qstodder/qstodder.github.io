const opening = document.querySelector("#opening");
const button = document.querySelector("#open-invitation");
const invitation = document.querySelector("#invitation");
const letter = document.querySelector(".letter");

button.addEventListener("click", () => {
    if (opening.classList.contains("is-open")) return;
    letter.style.transitionDelay = "0.8s";
    opening.classList.add("is-open");
    button.setAttribute("aria-expanded", "true");
    window.setTimeout(() => {
        letter.style.zIndex = "5";
    }, 800);
    window.setTimeout(() => opening.classList.add("is-departing"), 1100);
    window.setTimeout(() => {
        opening.hidden = true;
        invitation.setAttribute("aria-hidden", "false");
        invitation.classList.add("is-visible");
        invitation.focus({ preventScroll: true });
    }, 1750);
});
