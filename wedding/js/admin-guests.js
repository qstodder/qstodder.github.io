const elements = {
    loading: document.querySelector("#admin-loading"),
    error: document.querySelector("#admin-error"),
    errorMessage: document.querySelector("#admin-error-message"),
    content: document.querySelector("#guest-content"),
    adminEmail: document.querySelector("#admin-email"),
    refresh: document.querySelector("#refresh-guests"),
    search: document.querySelector("#guest-search"),
    householdFilter: document.querySelector("#guest-household-filter"),
    dietaryFilter: document.querySelector("#guest-dietary-filter"),
    invitationFilter: document.querySelector("#guest-invitation-filter"),
    rsvpFilter: document.querySelector("#guest-rsvp-filter"),
    sort: document.querySelector("#guest-sort"),
    export: document.querySelector("#export-guests"),
    rows: document.querySelector("#guest-rows"),
    empty: document.querySelector("#guest-empty-results"),
    resultsCount: document.querySelector("#guest-results-count"),
    generatedAt: document.querySelector("#guest-generated-at")
};

let guestData = null;
let visibleGuests = [];

function escapeHtml(value) {
    const element = document.createElement("div");
    element.textContent = value ?? "";
    return element.innerHTML;
}

function compareText(left, right) {
    return String(left ?? "").localeCompare(
        String(right ?? ""),
        undefined,
        { sensitivity: "base" }
    );
}

function dietaryText(guest) {
    if (!guest.dietaryRestrictions.length) {
        return "None";
    }
    return guest.dietaryRestrictions.map((restriction) =>
        restriction.notes
            ? `${restriction.name}: ${restriction.notes}`
            : restriction.name
    ).join("; ");
}

function eventLabels(values) {
    return [
        values.welcome ? "Welcome" : null,
        values.wedding ? "Wedding" : null,
        values.brunch ? "Brunch" : null
    ].filter(Boolean);
}

function rsvpText(guest) {
    if (!guest.rsvp) {
        return "Not recorded";
    }
    return [
        `Welcome: ${guest.rsvp.welcome ? "Yes" : "No"}`,
        `Wedding: ${guest.rsvp.wedding ? "Yes" : "No"}`,
        `Brunch: ${guest.rsvp.brunch ? "Yes" : "No"}`
    ].join("; ");
}

function populateFilters() {
    const households = new Map();
    for (const guest of guestData.guests) {
        households.set(
            guest.household.id,
            guest.household.householdName
        );
    }
    elements.householdFilter.innerHTML = [
        '<option value="all">All households</option>',
        ...[...households.entries()]
            .sort((a, b) => compareText(a[1], b[1]))
            .map(([id, name]) =>
                `<option value="${id}">${escapeHtml(name)}</option>`
            )
    ].join("");

    elements.dietaryFilter.innerHTML = [
        '<option value="all">All dietary responses</option>',
        '<option value="none">No restrictions</option>',
        ...guestData.dietaryRestrictions.map((restriction) =>
            `<option value="${restriction.id}">${escapeHtml(restriction.name)}</option>`
        )
    ].join("");
}

function filteredAndSortedGuests() {
    const search = elements.search.value.trim().toLowerCase();
    const household = elements.householdFilter.value;
    const dietary = elements.dietaryFilter.value;
    const invitation = elements.invitationFilter.value;
    const rsvp = elements.rsvpFilter.value;

    const guests = guestData.guests.filter((guest) => {
        const searchable = [
            guest.firstName,
            guest.lastName,
            guest.household.householdName,
            guest.household.householdKey,
            dietaryText(guest)
        ].join(" ").toLowerCase();
        const dietaryMatches = dietary === "all" ||
            (dietary === "none"
                ? guest.dietaryRestrictions.length === 0
                : guest.dietaryRestrictions.some(
                    (item) => item.id === Number(dietary)
                ));
        const invitationMatches = invitation === "all" ||
            guest.invitations[invitation];
        const rsvpMatches = rsvp === "all" ||
            (rsvp === "pending" && !guest.rsvp) ||
            (rsvp === "responded" && Boolean(guest.rsvp)) ||
            (rsvp === "weddingYes" && guest.rsvp?.wedding) ||
            (rsvp === "weddingNo" && guest.rsvp && !guest.rsvp.wedding);

        return (
            (!search || searchable.includes(search)) &&
            (household === "all" || guest.household.id === Number(household)) &&
            dietaryMatches && invitationMatches && rsvpMatches
        );
    });

    const sort = elements.sort.value;
    guests.sort((left, right) => {
        if (sort === "firstNameAsc") {
            return compareText(left.firstName, right.firstName) ||
                compareText(left.lastName, right.lastName);
        }
        if (sort === "householdAsc") {
            return compareText(
                left.household.householdName,
                right.household.householdName
            ) || compareText(left.lastName, right.lastName);
        }
        if (sort === "dietaryAsc") {
            return compareText(dietaryText(left), dietaryText(right)) ||
                compareText(left.lastName, right.lastName);
        }
        if (sort === "weddingYesFirst") {
            return Number(Boolean(right.rsvp?.wedding)) -
                Number(Boolean(left.rsvp?.wedding)) ||
                compareText(left.lastName, right.lastName);
        }
        return compareText(left.lastName, right.lastName) ||
            compareText(left.firstName, right.firstName);
    });
    return guests;
}

function renderGuests() {
    visibleGuests = filteredAndSortedGuests();
    elements.rows.innerHTML = visibleGuests.map((guest) => {
        const invited = eventLabels(guest.invitations);
        return `<tr>
            <td data-label="Actions" class="household-actions-cell"><a class="address-edit-button household-edit-button" href="/admin/households/${guest.household.id}#guest-${guest.id}">Edit guest</a></td>
            <th scope="row" data-label="Guest"><span class="household-name">${escapeHtml(`${guest.firstName} ${guest.lastName}`.trim())}</span><span class="household-key">Guest #${guest.id}</span></th>
            <td data-label="Household"><a class="household-detail-link" href="/admin/households/${guest.household.id}">${escapeHtml(guest.household.householdName)}</a></td>
            <td data-label="Invited to">${invited.length ? invited.map((name) => `<span class="guest-event-tag">${name}</span>`).join(" ") : "—"}</td>
            <td data-label="RSVP">${escapeHtml(rsvpText(guest))}</td>
            <td data-label="Dietary preferences">${escapeHtml(dietaryText(guest))}</td>
        </tr>`;
    }).join("");
    elements.resultsCount.textContent =
        `${visibleGuests.length} of ${guestData.guests.length} guests`;
    elements.empty.classList.toggle("hidden", visibleGuests.length > 0);
}

function csvCell(value) {
    const raw = String(value ?? "");
    const text = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
    return /[",\r\n]/.test(text)
        ? `"${text.replaceAll('"', '""')}"`
        : text;
}

function downloadCsv(filename, headings, rows) {
    const csv = [headings, ...rows]
        .map((row) => row.map(csvCell).join(","))
        .join("\r\n");
    const url = URL.createObjectURL(new Blob(
        ["\uFEFF", csv],
        { type: "text/csv;charset=utf-8" }
    ));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function exportGuests() {
    const headings = [
        "First Name", "Last Name", "Household", "Household Key",
        "Household Email", "Invited: Welcome", "Invited: Wedding",
        "Invited: Brunch", "RSVP Recorded", "Attending: Welcome",
        "Attending: Wedding", "Attending: Brunch",
        "Dietary Restrictions", "Dietary Details"
    ];
    const rows = visibleGuests.map((guest) => [
        guest.firstName, guest.lastName, guest.household.householdName,
        guest.household.householdKey, guest.household.email,
        guest.invitations.welcome ? "Yes" : "No",
        guest.invitations.wedding ? "Yes" : "No",
        guest.invitations.brunch ? "Yes" : "No",
        guest.rsvp ? "Yes" : "No",
        guest.rsvp ? (guest.rsvp.welcome ? "Yes" : "No") : "",
        guest.rsvp ? (guest.rsvp.wedding ? "Yes" : "No") : "",
        guest.rsvp ? (guest.rsvp.brunch ? "Yes" : "No") : "",
        guest.dietaryRestrictions.map((item) => item.name).join("; "),
        guest.dietaryRestrictions.map((item) => item.notes).filter(Boolean).join("; ")
    ]);
    downloadCsv(
        `wedding-guests-${new Date().toISOString().slice(0, 10)}.csv`,
        headings,
        rows
    );
}

async function loadGuests() {
    elements.refresh.disabled = true;
    elements.loading.classList.remove("hidden");
    elements.error.classList.add("hidden");
    try {
        const response = await fetch("/api/admin/guests", {
            credentials: "same-origin",
            headers: { "Accept": "application/json" }
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load guests.");
        guestData = result;
        elements.adminEmail.textContent = result.admin.email;
        populateFilters();
        renderGuests();
        elements.generatedAt.textContent =
            `Last refreshed ${new Date(result.generatedAt).toLocaleString()}`;
        elements.loading.classList.add("hidden");
        elements.content.classList.remove("hidden");
    } catch (error) {
        elements.loading.classList.add("hidden");
        elements.content.classList.add("hidden");
        elements.error.classList.remove("hidden");
        elements.errorMessage.textContent = error.message;
    } finally {
        elements.refresh.disabled = false;
    }
}

[elements.search].forEach((element) =>
    element.addEventListener("input", renderGuests)
);
[
    elements.householdFilter, elements.dietaryFilter,
    elements.invitationFilter, elements.rsvpFilter, elements.sort
].forEach((element) => element.addEventListener("change", renderGuests));
elements.export.addEventListener("click", exportGuests);
elements.refresh.addEventListener("click", loadGuests);
loadGuests();
