import { state } from "./state.js";

import {
    searchGuests,
    getRsvp,
    getDietaryRestrictions,
    submitRSVP
} from "./api.js";

import {
    renderSearchResults,
    renderHousehold
} from "./ui.js";


/* =========================================================
   Elements
   ========================================================= */

const searchScreen =
    document.getElementById("search-screen");

const householdScreen =
    document.getElementById("household-screen");

const contactScreen =
    document.getElementById("contact-screen");

const searchInput =
    document.getElementById("guest-search");

const resultsDiv =
    document.getElementById("search-results");

const searchStatus =
    document.getElementById("search-status");

const backToSearchButton =
    document.getElementById("back-to-search");

const continueToContactButton =
    document.getElementById("continue-to-contact");

const backToHouseholdButton =
    document.getElementById("back-to-household");

const contactForm =
    document.getElementById("contact-form");

const contactError =
    document.getElementById("contact-error");
const guestEmailFields =
    document.getElementById("guest-email-fields");


/* =========================================================
   Local state
   ========================================================= */

let searchTimer = null;
let latestSearchRequest = 0;

function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function draftKey(householdId) {
    return `wedding-rsvp-draft-${householdId}`;
}

function saveDraft() {
    const householdId = state.rsvp?.household?.id;
    if (!householdId) {
        return;
    }
    sessionStorage.setItem(
        draftKey(householdId),
        JSON.stringify(state.rsvp)
    );
}

function restoreDraft(rsvp) {
    try {
        const saved = sessionStorage.getItem(
            draftKey(rsvp.household.id)
        );
        return saved ? JSON.parse(saved) : rsvp;
    } catch {
        return rsvp;
    }
}


/* =========================================================
   Screen navigation
   ========================================================= */

function showScreen(screen) {

    const screens = [
        searchScreen,
        householdScreen,
        contactScreen,
        welcomeScreen,
        weddingScreen,
        dietaryScreen,
        acknowledgementsScreen,
        brunchScreen,
        reviewScreen
    ];

    for (const currentScreen of screens) {

        currentScreen.classList.toggle(
            "hidden",
            currentScreen !== screen
        );
    }

    window.scrollTo({
        top: 0,
        behavior: window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches ? "auto" : "smooth"
    });

    const heading = screen.querySelector("h2");
    if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
    }
}


/* =========================================================
   Contact form
   ========================================================= */

function populateContactForm() {

    const household = state.household;

    const guests = state.rsvp.guests;
    const hasGuestEmail = guests.some((guest) => guest.email);
    guestEmailFields.innerHTML = guests.map((guest, index) => {
        const value = guest.email ?? (
            !hasGuestEmail && index === 0 ? household.email ?? "" : ""
        );
        return `
            <div class="form-field">
                <label for="guest-email-${guest.id}">
                    ${escapeHtml(`${guest.firstName} ${guest.lastName}`.trim())}
                </label>
                <input id="guest-email-${guest.id}" type="email"
                    autocomplete="email" maxlength="254"
                    value="${escapeHtml(value)}">
            </div>
        `;
    }).join("");

    document.getElementById("street").value =
        household.street ?? "";

    document.getElementById("address-line-2").value =
        household.addressLine2 ?? "";

    document.getElementById("city").value =
        household.city ?? "";

    document.getElementById("state").value =
        household.state ?? "";

    document.getElementById("zip").value =
        household.zip ?? "";

    document.getElementById("country-code").value =
        household.countryCode ?? "US";

    const addressRequired = household.addressNeeded === true;
    for (const id of ["street", "city", "zip"]) {
        document.getElementById(id).required = addressRequired;
    }
    document.getElementById("address-requirement").textContent =
        addressRequired
            ? "A mailing address is required so we can send your invitation."
            : "Your invitation will be hand-delivered; a mailing address is optional.";
}


function saveContactFormToState() {

    for (const guest of state.rsvp.guests) {
        guest.email = document
            .getElementById(`guest-email-${guest.id}`)
            .value.trim().toLowerCase();
    }
    state.household.email = state.rsvp.guests
        .map((guest) => guest.email)
        .find(Boolean) ?? "";

    state.household.street =
        document.getElementById("street")
            .value
            .trim();

    state.household.addressLine2 =
        document.getElementById("address-line-2")
            .value
            .trim();

    state.household.city =
        document.getElementById("city")
            .value
            .trim();

    state.household.state =
        document.getElementById("state")
            .value
            .trim()
            .toUpperCase();

    state.household.zip =
        document.getElementById("zip")
            .value
            .trim();

    state.household.countryCode =
        document.getElementById("country-code")
            .value
            .trim()
            .toUpperCase();
}


/* =========================================================
   Guest search
   ========================================================= */

searchInput.addEventListener("input", () => {

    clearTimeout(searchTimer);

    const search = searchInput.value.trim();

    if (search.length < 2) {

        resultsDiv.innerHTML = "";
        searchStatus.textContent = "";

        return;
    }

    searchStatus.textContent = "Searching…";

    searchTimer = setTimeout(
        () => runGuestSearch(search),
        250
    );
});


async function runGuestSearch(search) {

    const requestId = ++latestSearchRequest;

    try {

        const guests =
            await searchGuests(search);

        /*
         * Ignore an older response if the user has
         * already entered a newer search.
         */
        if (requestId !== latestSearchRequest) {
            return;
        }

        renderSearchResults(guests);

        searchStatus.textContent =
            guests.length === 0
                ? "No invitations found."
                : "";

    } catch (error) {

        console.error(
            "Guest search failed:",
            error
        );

        resultsDiv.innerHTML = "";

        searchStatus.textContent =
            "We couldn't search invitations. Please try again.";
    }
}


/* =========================================================
   Select household
   ========================================================= */

resultsDiv.addEventListener(
    "click",
    async (event) => {

        const button =
            event.target.closest(".search-result");

        if (!button) {
            return;
        }

        const householdId =
            Number(button.dataset.householdId);

        if (!householdId) {
            return;
        }

        button.disabled = true;
        searchStatus.textContent =
            "Loading your invitation…";

        try {

            const serverRsvp =
                await getRsvp(householdId);
            const rsvp = restoreDraft(serverRsvp);


            /*
             * The complete RSVP endpoint returns:
             * {
             *   household,
             *   guests,
             *   acknowledgements
             * }
             */

            state.household =
                rsvp.household;

            state.guests =
                rsvp.guests;

            state.acknowledgements =
                rsvp.acknowledgements;

            /*
             * Preserve the complete object so later
             * screens can update and submit it.
             */
            state.rsvp =
                rsvp;

            renderHousehold(
                rsvp.household,
                rsvp.guests
            );

            searchStatus.textContent = "";

            showScreen(householdScreen);

        } catch (error) {

            console.error(
                "Household load failed:",
                error
            );

            searchStatus.textContent =
                "We couldn't load that invitation. Please try again.";

            button.disabled = false;
        }
    }
);


/* =========================================================
   Household navigation
   ========================================================= */

backToSearchButton.addEventListener(
    "click",
    () => {

        showScreen(searchScreen);

        searchInput.focus();
    }
);


continueToContactButton.addEventListener(
    "click",
    () => {

        populateContactForm();

        contactError.classList.add("hidden");
        contactError.textContent = "";

        showScreen(contactScreen);

        document
            .getElementById("street")
            .focus();
    }
);


/* =========================================================
   Contact navigation
   ========================================================= */

backToHouseholdButton.addEventListener(
    "click",
    () => {

        saveContactFormToState();

        if (!state.rsvp.guests.some((guest) => guest.email)) {
            contactError.textContent =
                "Please enter a valid email address for at least one household member.";
            contactError.classList.remove("hidden");
            guestEmailFields.querySelector("input")?.focus();
            return;
        }

        showScreen(householdScreen);
    }
);


contactForm.addEventListener(
    "submit",
    (event) => {

        event.preventDefault();

        contactError.classList.add("hidden");
        contactError.textContent = "";

        if (!contactForm.reportValidity()) {
            return;
        }

        saveContactFormToState();

        /*
         * The next step will replace this log with:
         *
         * showWelcomeScreen();
         */

        /*
        * Keep the complete RSVP object's household
        * synchronized with state.household.
        */
        state.rsvp.household =
            state.household;

        saveDraft();

        renderWelcomeGuests();

        showScreen(welcomeScreen);
    }
);

const welcomeScreen =
    document.getElementById("welcome-screen");

const welcomeForm =
    document.getElementById("welcome-form");

const welcomeGuests =
    document.getElementById("welcome-guests");

const welcomeError =
    document.getElementById("welcome-error");

const backToContactButton =
    document.getElementById("back-to-contact");

const weddingScreen =
    document.getElementById("wedding-screen");

const weddingForm =
    document.getElementById("wedding-form");

const weddingGuests =
    document.getElementById("wedding-guests");

const weddingError =
    document.getElementById("wedding-error");

const backToWelcomeButton =
    document.getElementById("back-to-welcome");

const dietaryScreen =
    document.getElementById("dietary-screen");

const dietaryForm =
    document.getElementById("dietary-form");

const dietaryGuests =
    document.getElementById("dietary-guests");

const dietaryError =
    document.getElementById("dietary-error");

const backToWeddingButton =
    document.getElementById("back-to-wedding");

const acknowledgementsScreen =
    document.getElementById(
        "acknowledgements-screen"
    );

const acknowledgementsForm =
    document.getElementById(
        "acknowledgements-form"
    );

const acknowledgementsError =
    document.getElementById(
        "acknowledgements-error"
    );

const noChildrenCheckbox =
    document.getElementById(
        "acknowledge-no-children"
    );

const noPlusOnesCheckbox =
    document.getElementById(
        "acknowledge-no-plus-ones"
    );

const backToDietaryButton =
    document.getElementById(
        "back-to-dietary"
    );

const brunchScreen =
    document.getElementById("brunch-screen");

const brunchForm =
    document.getElementById("brunch-form");

const brunchGuests =
    document.getElementById("brunch-guests");

const brunchError =
    document.getElementById("brunch-error");

const backToAcknowledgementsButton =
    document.getElementById(
        "back-to-acknowledgements"
    );

const reviewScreen =
    document.getElementById("review-screen");

const rsvpReview =
    document.getElementById("rsvp-review");

const submitError =
    document.getElementById("submit-error");

const submitSuccess =
    document.getElementById("submit-success");

const backToBrunchButton =
    document.getElementById("back-to-brunch");

const submitRsvpButton =
    document.getElementById("submit-rsvp");

const returnHomeLink =
    document.getElementById("return-home");

let dietaryOptions = [];
let rsvpSubmitted = false;


function renderWelcomeGuests() {

    welcomeGuests.innerHTML = "";

    const invitedGuests =
        state.rsvp.guests.filter(
            (guest) =>
                guest.isInvitedToWelcome
        );

    if (invitedGuests.length === 0) {

        welcomeGuests.innerHTML = `
            <p>
                No members of this household are invited
                to the welcome event.
            </p>
        `;

        return;
    }

    for (const guest of invitedGuests) {

        const guestCard =
            document.createElement("fieldset");

        guestCard.className =
            "guest-response-card";

        const currentAnswer =
            guest.attendance?.welcome;

        guestCard.innerHTML = `
            <legend>
                ${escapeHtml(guest.firstName)}
                ${escapeHtml(guest.lastName)}
            </legend>

            <label class="attendance-option">
                <input
                    type="radio"
                    name="welcome-${guest.id}"
                    value="yes"
                    ${
                        currentAnswer === true
                            ? "checked"
                            : ""
                    }
                >

                Yes, I'll be there
            </label>

            <label class="attendance-option">
                <input
                    type="radio"
                    name="welcome-${guest.id}"
                    value="no"
                    ${
                        currentAnswer === false
                            ? "checked"
                            : ""
                    }
                >

                No, I can't attend
            </label>
        `;

        welcomeGuests.appendChild(
            guestCard
        );
    }
}


function saveWelcomeResponses() {

    const invitedGuests =
        state.rsvp.guests.filter(
            (guest) =>
                guest.isInvitedToWelcome
        );

    for (const guest of invitedGuests) {

        const selected =
            document.querySelector(
                `input[name="welcome-${guest.id}"]:checked`
            );

        if (!selected) {

            return {
                success: false,
                guest
            };
        }

        guest.attendance.welcome =
            selected.value === "yes";
    }

    saveDraft();

    return {
        success: true
    };
}

backToContactButton.addEventListener(
    "click",
    () => {

        showScreen(contactScreen);
    }
);


welcomeForm.addEventListener(
    "submit",
    (event) => {

        event.preventDefault();

        welcomeError.textContent = "";
        welcomeError.classList.add("hidden");

        const result =
            saveWelcomeResponses();

        if (!result.success) {

            welcomeError.textContent =
                `Please select an answer for ` +
                `${result.guest.firstName}.`;

            welcomeError.classList.remove(
                "hidden"
            );

            return;
        }

        renderWeddingGuests();

        showScreen(weddingScreen);
    }
);


/* =========================================================
   Wedding attendance
   ========================================================= */

function renderWeddingGuests() {

    weddingGuests.innerHTML = "";

    const invitedGuests =
        state.rsvp.guests.filter(
            (guest) =>
                guest.isInvitedToWedding
        );

    if (invitedGuests.length === 0) {

        weddingGuests.innerHTML = `
            <p>
                No members of this household are invited
                to the wedding.
            </p>
        `;

        return;
    }

    for (const guest of invitedGuests) {

        const guestCard =
            document.createElement("fieldset");

        guestCard.className =
            "guest-response-card";

        const currentAnswer =
            guest.attendance?.wedding;

        guestCard.innerHTML = `
            <legend>
                ${escapeHtml(guest.firstName)}
                ${escapeHtml(guest.lastName)}
            </legend>

            <label class="attendance-option">
                <input
                    type="radio"
                    name="wedding-${guest.id}"
                    value="yes"
                    ${
                        currentAnswer === true
                            ? "checked"
                            : ""
                    }
                >

                Yes, I'll be there
            </label>

            <label class="attendance-option">
                <input
                    type="radio"
                    name="wedding-${guest.id}"
                    value="no"
                    ${
                        currentAnswer === false
                            ? "checked"
                            : ""
                    }
                >

                No, I can't attend
            </label>
        `;

        weddingGuests.appendChild(
            guestCard
        );
    }
}


function saveWeddingResponses() {

    const invitedGuests =
        state.rsvp.guests.filter(
            (guest) =>
                guest.isInvitedToWedding
        );

    for (const guest of invitedGuests) {

        const selected =
            document.querySelector(
                `input[name="wedding-${guest.id}"]:checked`
            );

        if (!selected) {

            return {
                success: false,
                guest
            };
        }

        guest.attendance.wedding =
            selected.value === "yes";
    }

    saveDraft();

    return {
        success: true
    };
}


backToWelcomeButton.addEventListener(
    "click",
    () => {

        weddingError.textContent = "";
        weddingError.classList.add("hidden");

        renderWelcomeGuests();
        showScreen(welcomeScreen);
    }
);


weddingForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        weddingError.textContent = "";
        weddingError.classList.add("hidden");

        const result =
            saveWeddingResponses();

        if (!result.success) {

            weddingError.textContent =
                `Please select an answer for ` +
                `${result.guest.firstName}.`;

            weddingError.classList.remove(
                "hidden"
            );

            return;
        }

        try {

            if (dietaryOptions.length === 0) {
                dietaryOptions =
                    await getDietaryRestrictions();
            }

            renderDietaryGuests();
            showScreen(dietaryScreen);

        } catch (error) {

            console.error(
                "Dietary restrictions load failed:",
                error
            );

            weddingError.textContent =
                "We couldn't load the dietary options. " +
                "Please try again.";

            weddingError.classList.remove(
                "hidden"
            );
        }
    }
);


/* =========================================================
   Dietary restrictions
   ========================================================= */

function renderDietaryGuests() {

    dietaryGuests.innerHTML = "";

    const attendingGuests =
        state.rsvp.guests.filter(
            (guest) =>
                guest.isInvitedToWedding &&
                guest.attendance?.wedding === true
        );

    if (attendingGuests.length === 0) {

        dietaryGuests.innerHTML = `
            <p>
                No dietary information is needed because
                no guests in this household are attending
                the wedding.
            </p>
        `;

        return;
    }

    for (const guest of attendingGuests) {

        const guestCard =
            document.createElement("fieldset");

        guestCard.className =
            "guest-response-card";

        const selectedIds =
            new Set(
                (guest.dietaryRestrictions ?? [])
                    .map((restriction) =>
                        Number(restriction.id)
                    )
            );

        const optionsMarkup =
            dietaryOptions.map((option) => `
                <label class="dietary-option">
                    <input
                        type="checkbox"
                        name="dietary-${guest.id}"
                        value="${option.id}"
                        data-option-name="${escapeHtml(option.name)}"
                        ${
                            selectedIds.has(Number(option.id))
                                ? "checked"
                                : ""
                        }
                    >

                    ${escapeHtml(option.name)}
                </label>
            `).join("");

        const otherOption =
            dietaryOptions.find(
                (option) =>
                    option.name.toLowerCase() === "other"
            );

        const otherSelected =
            otherOption &&
            selectedIds.has(Number(otherOption.id));

        guestCard.innerHTML = `
            <legend>
                ${escapeHtml(guest.firstName)}
                ${escapeHtml(guest.lastName)}
            </legend>

            <div class="dietary-options">
                ${optionsMarkup}
            </div>

            ${
                otherOption
                    ? `
                        <div
                            class="dietary-other ${
                                otherSelected
                                    ? ""
                                    : "hidden"
                            }"
                            data-other-details="${guest.id}"
                        >
                            <label for="dietary-other-${guest.id}">
                                Please provide details
                            </label>

                            <input
                                id="dietary-other-${guest.id}"
                                type="text"
                                value="${
                                    escapeHtml(
                                        guest.otherDietaryDetails
                                    )
                                }"
                                autocomplete="off"
                            >
                        </div>
                    `
                    : ""
            }
        `;

        dietaryGuests.appendChild(
            guestCard
        );
    }
}


dietaryGuests.addEventListener(
    "change",
    (event) => {

        const checkbox =
            event.target.closest(
                'input[type="checkbox"][data-option-name]'
            );

        if (
            !checkbox ||
            checkbox.dataset.optionName
                .toLowerCase() !== "other"
        ) {
            return;
        }

        const guestId =
            checkbox.name.replace(
                "dietary-",
                ""
            );

        const details =
            dietaryGuests.querySelector(
                `[data-other-details="${guestId}"]`
            );

        details.classList.toggle(
            "hidden",
            !checkbox.checked
        );

        const input =
            details.querySelector("input");

        input.required =
            checkbox.checked;

        if (checkbox.checked) {
            input.focus();
        }
    }
);


function saveDietaryResponses() {

    const attendingGuests =
        state.rsvp.guests.filter(
            (guest) =>
                guest.isInvitedToWedding &&
                guest.attendance?.wedding === true
        );

    for (const guest of attendingGuests) {

        const selected =
            Array.from(
                dietaryGuests.querySelectorAll(
                    `input[name="dietary-${guest.id}"]:checked`
                )
            );

        const other =
            selected.find(
                (input) =>
                    input.dataset.optionName
                        .toLowerCase() === "other"
            );

        const otherInput =
            document.getElementById(
                `dietary-other-${guest.id}`
            );

        const otherDetails =
            otherInput?.value.trim() ?? "";

        if (other && !otherDetails) {

            return {
                success: false,
                guest,
                message:
                    `Please provide dietary details for ` +
                    `${guest.firstName}.`,
                input: otherInput
            };
        }

        guest.dietaryRestrictions =
            selected.map((input) => ({
                id: Number(input.value),
                name: input.dataset.optionName
            }));

        guest.otherDietaryDetails =
            other
                ? otherDetails
                : "";
    }

    saveDraft();

    return {
        success: true
    };
}


backToWeddingButton.addEventListener(
    "click",
    () => {

        dietaryError.textContent = "";
        dietaryError.classList.add("hidden");

        renderWeddingGuests();
        showScreen(weddingScreen);
    }
);


dietaryForm.addEventListener(
    "submit",
    (event) => {

        event.preventDefault();

        dietaryError.textContent = "";
        dietaryError.classList.add("hidden");

        const result =
            saveDietaryResponses();

        if (!result.success) {

            dietaryError.textContent =
                result.message;

            dietaryError.classList.remove(
                "hidden"
            );

            result.input?.focus();

            return;
        }

        /*
         * Save before leaving the screen so the review and
         * final API payload use the current selections.
         */
        populateAcknowledgements();
        showScreen(acknowledgementsScreen);
    }
);


/* =========================================================
   Acknowledgements
   ========================================================= */

function populateAcknowledgements() {

    const acknowledgements =
        state.rsvp.acknowledgements ?? {};

    noChildrenCheckbox.checked =
        acknowledgements.noChildren === true;

    noPlusOnesCheckbox.checked =
        acknowledgements.noPlusOnes === true;

    acknowledgementsError.textContent = "";
    acknowledgementsError.classList.add("hidden");
}


function saveAcknowledgements() {

    state.rsvp.acknowledgements = {
        noChildren:
            noChildrenCheckbox.checked,
        noPlusOnes:
            noPlusOnesCheckbox.checked
    };

    saveDraft();
}


backToDietaryButton.addEventListener(
    "click",
    () => {

        saveAcknowledgements();
        renderDietaryGuests();
        showScreen(dietaryScreen);
    }
);


acknowledgementsForm.addEventListener(
    "submit",
    (event) => {

        event.preventDefault();

        acknowledgementsError.textContent = "";
        acknowledgementsError.classList.add("hidden");

        if (!acknowledgementsForm.reportValidity()) {

            acknowledgementsError.textContent =
                "Please confirm both acknowledgements " +
                "before continuing.";

            acknowledgementsError.classList.remove(
                "hidden"
            );

            return;
        }

        saveAcknowledgements();
        renderBrunchGuests();
        showScreen(brunchScreen);
    }
);


/* =========================================================
   Morning-after brunch
   ========================================================= */

function renderBrunchGuests() {

    brunchGuests.innerHTML = "";

    const invitedGuests =
        state.rsvp.guests.filter(
            (guest) =>
                guest.isInvitedToBrunch
        );

    if (invitedGuests.length === 0) {

        brunchGuests.innerHTML = `
            <p>
                No members of this household are invited
                to the morning-after brunch.
            </p>
        `;

        return;
    }

    for (const guest of invitedGuests) {

        const guestCard =
            document.createElement("fieldset");

        guestCard.className =
            "guest-response-card";

        const currentAnswer =
            guest.attendance?.brunch;

        guestCard.innerHTML = `
            <legend>
                ${escapeHtml(guest.firstName)}
                ${escapeHtml(guest.lastName)}
            </legend>

            <label class="attendance-option">
                <input
                    type="radio"
                    name="brunch-${guest.id}"
                    value="yes"
                    ${
                        currentAnswer === true
                            ? "checked"
                            : ""
                    }
                >

                Yes, I'll be there
            </label>

            <label class="attendance-option">
                <input
                    type="radio"
                    name="brunch-${guest.id}"
                    value="no"
                    ${
                        currentAnswer === false
                            ? "checked"
                            : ""
                    }
                >

                No, I can't attend
            </label>
        `;

        brunchGuests.appendChild(
            guestCard
        );
    }
}


function saveBrunchResponses() {

    const invitedGuests =
        state.rsvp.guests.filter(
            (guest) =>
                guest.isInvitedToBrunch
        );

    for (const guest of invitedGuests) {

        const selected =
            document.querySelector(
                `input[name="brunch-${guest.id}"]:checked`
            );

        if (!selected) {

            return {
                success: false,
                guest
            };
        }

        guest.attendance.brunch =
            selected.value === "yes";
    }

    saveDraft();

    return {
        success: true
    };
}


backToAcknowledgementsButton.addEventListener(
    "click",
    () => {

        brunchError.textContent = "";
        brunchError.classList.add("hidden");

        populateAcknowledgements();
        showScreen(acknowledgementsScreen);
    }
);


brunchForm.addEventListener(
    "submit",
    (event) => {

        event.preventDefault();

        brunchError.textContent = "";
        brunchError.classList.add("hidden");

        const result =
            saveBrunchResponses();

        if (!result.success) {

            brunchError.textContent =
                `Please select an answer for ` +
                `${result.guest.firstName}.`;

            brunchError.classList.remove(
                "hidden"
            );

            return;
        }

        renderRsvpReview();
        showScreen(reviewScreen);
    }
);


/* =========================================================
   Review and submit
   ========================================================= */

function attendanceLabel(
    guest,
    invitationField,
    attendanceField
) {

    if (!guest[invitationField]) {
        return "Not invited";
    }

    return guest.attendance?.[attendanceField]
        ? "Attending"
        : "Not attending";
}

function reviewAddressMarkup(household) {
    const locality = [
        household.city,
        household.state,
        household.zip
    ].filter(Boolean).join(", ");
    const lines = [
        household.street,
        household.addressLine2,
        locality,
        household.countryCode
    ].filter(Boolean).map(escapeHtml);

    return lines.length > 1
        ? lines.join("<br>")
        : "Mailing address not needed";
}


function renderRsvpReview() {

    const household =
        state.rsvp.household;

    const guestMarkup =
        state.rsvp.guests.map((guest) => {

            const restrictions =
                (guest.dietaryRestrictions ?? [])
                    .map((restriction) =>
                        restriction.name === "Other" &&
                        guest.otherDietaryDetails
                            ? `Other: ${
                                guest.otherDietaryDetails
                            }`
                            : restriction.name
                    );

            const dietarySummary =
                guest.attendance?.wedding
                    ? (
                        restrictions.length > 0
                            ? restrictions.join(", ")
                            : "None"
                    )
                    : "Not applicable";

            return `
                <div class="review-guest">
                    <h4>
                        ${escapeHtml(guest.firstName)}
                        ${escapeHtml(guest.lastName)}
                    </h4>

                    <p>
                        Welcome Event:
                        ${attendanceLabel(
                            guest,
                            "isInvitedToWelcome",
                            "welcome"
                        )}
                    </p>

                    <p>
                        Wedding:
                        ${attendanceLabel(
                            guest,
                            "isInvitedToWedding",
                            "wedding"
                        )}
                    </p>

                    <p>
                        Morning-After Brunch:
                        ${attendanceLabel(
                            guest,
                            "isInvitedToBrunch",
                            "brunch"
                        )}
                    </p>

                    <p>
                        Dietary restrictions:
                        ${escapeHtml(dietarySummary)}
                    </p>
                </div>
            `;
        }).join("");

    rsvpReview.innerHTML = `
        <section class="review-section">
            <h3>Contact Information</h3>

            <p>${reviewAddressMarkup(household)}</p>

            ${state.rsvp.guests
                .filter((guest) => guest.email)
                .map((guest) => `<p>${escapeHtml(`${guest.firstName} ${guest.lastName}`.trim())}: ${escapeHtml(guest.email)}</p>`)
                .join("")}
        </section>

        <section class="review-section">
            <h3>Guest Responses</h3>
            ${guestMarkup}
        </section>

        <section class="review-section">
            <h3>Acknowledgements</h3>

            <p>
                ✓ Adults-only celebration acknowledged
            </p>

            <p>
                ✓ Named guests only acknowledged
            </p>
        </section>
    `;

    submitError.textContent = "";
    submitError.classList.add("hidden");
    submitSuccess.textContent = "";
    submitSuccess.classList.add("hidden");
    submitRsvpButton.disabled = false;
}


function buildRsvpPayload() {

    const household =
        state.rsvp.household;

    return {
        contact: {
            householdId: household.id,
            email: household.email,
            guestEmails: state.rsvp.guests.map((guest) => ({
                guestId: guest.id,
                email: guest.email ?? ""
            })),
            street: household.street,
            addressLine2: household.addressLine2,
            city: household.city,
            state: household.state,
            zip: household.zip,
            countryCode: household.countryCode
        },

        guestRsvps:
            state.rsvp.guests.map((guest) => ({
                guestId: guest.id,
                attendingWelcome:
                    guest.isInvitedToWelcome &&
                    guest.attendance?.welcome === true,
                attendingWedding:
                    guest.isInvitedToWedding &&
                    guest.attendance?.wedding === true,
                attendingBrunch:
                    guest.isInvitedToBrunch &&
                    guest.attendance?.brunch === true
            })),

        guestDietary:
            state.rsvp.guests.map((guest) => ({
                guestId: guest.id,
                restrictionIds:
                    guest.attendance?.wedding === true
                        ? (
                            guest.dietaryRestrictions ?? []
                        ).map((restriction) =>
                            Number(restriction.id)
                        )
                        : [],
                otherDietaryDetails:
                    guest.attendance?.wedding === true
                        ? guest.otherDietaryDetails ?? ""
                        : ""
            })),

        acknowledgements: {
            householdId: household.id,
            acknowledgeNoChildren:
                state.rsvp.acknowledgements
                    .noChildren,
            acknowledgeNoPlusOnes:
                state.rsvp.acknowledgements
                    .noPlusOnes
        }
    };
}


backToBrunchButton.addEventListener(
    "click",
    () => {

        renderBrunchGuests();
        showScreen(brunchScreen);
    }
);

returnHomeLink.addEventListener(
    "click",
    (event) => {
        if (
            !rsvpSubmitted &&
            !window.confirm(
                "Are you sure? Your RSVP has not been submitted."
            )
        ) {
            event.preventDefault();
        }
    }
);


submitRsvpButton.addEventListener(
    "click",
    async () => {

        submitError.textContent = "";
        submitError.classList.add("hidden");
        submitSuccess.textContent = "";
        submitSuccess.classList.add("hidden");

        submitRsvpButton.disabled = true;
        submitRsvpButton.textContent =
            "Submitting…";

        try {

            const result = await submitRSVP(
                buildRsvpPayload()
            );

            submitSuccess.textContent =
                result.emailSent
                    ? "Your RSVP has been submitted, and a " +
                        "confirmation email was sent. Thank you!"
                    : "Your RSVP has been submitted. We couldn't " +
                        "send the confirmation email, but your " +
                        "responses were saved successfully.";

            submitSuccess.classList.remove(
                "hidden"
            );

            backToBrunchButton.disabled = true;
            rsvpSubmitted = true;
            submitRsvpButton.textContent =
                "RSVP Submitted";
            sessionStorage.removeItem(
                draftKey(state.rsvp.household.id)
            );

        } catch (error) {

            console.error(
                "RSVP submission failed:",
                error
            );

            submitError.textContent =
                `${error.message} Your responses are still here, ` +
                "so please try again.";

            submitError.classList.remove(
                "hidden"
            );

            submitRsvpButton.disabled = false;
            submitRsvpButton.textContent =
                "Submit RSVP";
        }
    }
);
