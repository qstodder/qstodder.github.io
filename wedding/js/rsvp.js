import { state } from "./state.js";

import {
    searchGuests,
    getRsvp
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


/* =========================================================
   Local state
   ========================================================= */

let searchTimer = null;
let latestSearchRequest = 0;


/* =========================================================
   Screen navigation
   ========================================================= */

function showScreen(screen) {

    const screens = [
        searchScreen,
        householdScreen,
        contactScreen,
        welcomeScreen
    ];

    for (const currentScreen of screens) {

        currentScreen.classList.toggle(
            "hidden",
            currentScreen !== screen
        );
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =========================================================
   Contact form
   ========================================================= */

function populateContactForm() {

    const household = state.household;

    console.log(
            JSON.stringify(
                state.rsvp,
                null,
                2
            )
        );

    document.getElementById("email").value =
        household.email ?? "";

    document.getElementById("street").value =
        household.street ?? "";

    document.getElementById("city").value =
        household.city ?? "";

    document.getElementById("state").value =
        household.state ?? "";

    document.getElementById("zip").value =
        household.zip ?? "";
}


function saveContactFormToState() {

    state.household.email =
        document.getElementById("email")
            .value
            .trim();

    state.household.street =
        document.getElementById("street")
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

            const rsvp =
                await getRsvp(householdId);


            console.log(
                "Complete RSVP response:",
                rsvp
            );

            console.table(state.rsvp.guests);

            console.log(
                "Guests:",
                rsvp.guests
            );

            console.table(rsvp.guests);

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
            .getElementById("email")
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
                ${guest.firstName}
                ${guest.lastName}
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

        if (!guest.attendance) {

            guest.attendance = {
                welcome: false,
                wedding: false,
                brunch: false
            };
        }

        guest.attendance.welcome =
            selected.value === "yes";
    }

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

        console.log(
            "Welcome responses:",
            state.rsvp.guests
        );

        alert(
            "Welcome Event responses saved. " +
            "The Wedding attendance step is next."
        );
    }
);