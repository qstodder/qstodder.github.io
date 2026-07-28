export function renderSearchResults(guests) {

    const resultsDiv =
        document.getElementById("search-results");

    resultsDiv.innerHTML = "";

    if (guests.length === 0) {

        resultsDiv.innerHTML = `
            <div class="search-empty">
                No guests found.
            </div>
        `;

        return;
    }

    guests.forEach(guest => {

        const button =
            document.createElement("button");

        button.className =
            "search-result";

        button.textContent =
            guest.display_name;

        button.dataset.householdId =
            guest.household_id;

        resultsDiv.appendChild(button);

    });

}

export function renderHousehold(household, guests) {

    document
        .getElementById("search-screen")
        .classList
        .add("hidden");


    const householdScreen =
        document.getElementById("household-screen");

    householdScreen.classList.remove("hidden");


    document.getElementById("household-name")
        .textContent =
        household.household_name;


    const guestsDiv =
        document.getElementById("household-guests");

    guestsDiv.innerHTML = "";


    guests.forEach(guest => {

        const div =
            document.createElement("div");

        div.textContent =
            `${guest.firstName} ${guest.lastName}`;

        guestsDiv.appendChild(div);

    });

}

export function showRSVPScreen() {

    document
        .getElementById("household-screen")
        .classList
        .add("hidden");

    document
        .getElementById("rsvp-screen")
        .classList
        .remove("hidden");

}