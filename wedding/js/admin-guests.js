const elements = {
    loading: document.querySelector("#admin-loading"),
    error: document.querySelector("#admin-error"),
    errorMessage: document.querySelector("#admin-error-message"),
    content: document.querySelector("#guest-content"),
    adminEmail: document.querySelector("#admin-email"),
    refresh: document.querySelector("#refresh-guests"),
    search: document.querySelector("#guest-search"),
    householdFilter: document.querySelector("#guest-household-filter"),
    coupleFilter: document.querySelector("#guest-couple-filter"),
    relationshipFilter: document.querySelector("#guest-relationship-filter"),
    familySideFilter: document.querySelector("#guest-family-side-filter"),
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
let dashboardCards = null;

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
        values.wedding ? "Ceremony" : null,
        values.reception ? "Reception" : null,
        values.brunch ? "Brunch" : null
    ].filter(Boolean);
}

function rsvpText(guest) {
    if (!guest.rsvp) {
        return "Not recorded";
    }
    return [
        `Welcome: ${guest.rsvp.welcome ? "Yes" : "No"}`,
        `Ceremony: ${guest.rsvp.wedding ? "Yes" : "No"}`,
        `Reception: ${guest.rsvp.reception ? "Yes" : "No"}`,
        `Brunch: ${guest.rsvp.brunch ? "Yes" : "No"}`
    ].join("; ");
}

const classificationLabels = {
    scott: "Scott",
    quiana: "Quiana",
    friend: "Friend",
    family: "Family",
    "moms-side": "Mom's side",
    "dads-side": "Dad's side"
};

const guestDashboardMetrics = {
    all: { label: "Guests", description: "All guest rows", matches: () => true },
    missingAddress: { label: "Address needed", description: "Guests in households needing an address", tone: "alert", matches: (row) => row.household.missingAddress },
    missingEmail: { label: "Email needed", description: "Guests in households missing email", tone: "alert", matches: (row) => row.household.missingEmail },
    submitted: { label: "RSVP submitted", description: "Guests in submitted households", matches: (row) => row.household.rsvpStatus === "submitted" },
    pending: { label: "RSVP not submitted", description: "Guests without a submitted household RSVP", matches: (row) => row.household.rsvpStatus !== "submitted" },
    welcomeAttending: { label: "Welcome gathering", description: "Guests attending", matches: (row) => Boolean(row.rsvp?.welcome) },
    ceremonyAttending: { label: "Ceremony", description: "Guests attending", matches: (row) => Boolean(row.rsvp?.wedding) },
    receptionAttending: { label: "Reception", description: "Guests attending", matches: (row) => Boolean(row.rsvp?.reception) },
    brunchAttending: { label: "Brunch", description: "Guests attending", matches: (row) => Boolean(row.rsvp?.brunch) }
};

function classificationTags(guest) {
    return [
        guest.classifications.coupleSide,
        guest.classifications.relationshipType,
        guest.classifications.familySide
    ].filter(Boolean);
}

function classificationMatches(actual, selected) {
    return selected === "all" ||
        (selected === "unassigned" ? !actual : actual === selected);
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
    const coupleSide = elements.coupleFilter.value;
    const relationship = elements.relationshipFilter.value;
    const familySide = elements.familySideFilter.value;
    const invitation = elements.invitationFilter.value;
    const rsvp = elements.rsvpFilter.value;

    const guests = guestData.guests.filter((guest) => {
        const searchable = [
            guest.firstName,
            guest.lastName,
            guest.household.householdName,
            guest.household.householdKey,
            dietaryText(guest),
            ...classificationTags(guest).map(
                (tag) => classificationLabels[tag]
            )
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
            (rsvp === "weddingNo" && guest.rsvp && !guest.rsvp.wedding) ||
            (rsvp === "receptionYes" && guest.rsvp?.reception) ||
            (rsvp === "receptionNo" && guest.rsvp && !guest.rsvp.reception);

        return (
            (!search || searchable.includes(search)) &&
            (household === "all" || guest.household.id === Number(household)) &&
            classificationMatches(
                guest.classifications.coupleSide,
                coupleSide
            ) &&
            classificationMatches(
                guest.classifications.relationshipType,
                relationship
            ) &&
            classificationMatches(
                guest.classifications.familySide,
                familySide
            ) &&
            dietaryMatches && invitationMatches && rsvpMatches &&
            (!dashboardCards || dashboardCards.matches(guest))
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
        if (sort === "coupleSideAsc") {
            return compareText(
                classificationLabels[left.classifications.coupleSide] ?? "ZZZ Unassigned",
                classificationLabels[right.classifications.coupleSide] ?? "ZZZ Unassigned"
            ) || compareText(left.lastName, right.lastName);
        }
        if (sort === "relationshipAsc") {
            return compareText(
                classificationLabels[left.classifications.relationshipType] ?? "ZZZ Unassigned",
                classificationLabels[right.classifications.relationshipType] ?? "ZZZ Unassigned"
            ) || compareText(left.lastName, right.lastName);
        }
        if (sort === "familySideAsc") {
            return compareText(
                classificationLabels[left.classifications.familySide] ?? "ZZZ Unassigned",
                classificationLabels[right.classifications.familySide] ?? "ZZZ Unassigned"
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
        const tags = classificationTags(guest);
        return `<tr>
            <td data-label="Actions" class="household-actions-cell"><a class="address-edit-button household-edit-button" href="/admin/households/${guest.household.id}#guest-${guest.id}">Edit guest</a></td>
            <th scope="row" data-label="Guest"><span class="household-name">${escapeHtml(`${guest.firstName} ${guest.lastName}`.trim())}</span><span class="household-key">Guest #${guest.id}</span></th>
            <td data-label="Email">${escapeHtml(guest.email || "—")}</td>
            <td data-label="Household"><a class="household-detail-link" href="/admin/households/${guest.household.id}">${escapeHtml(guest.household.householdName)}</a></td>
            <td data-label="Tags">${tags.length ? tags.map((tag) => `<span class="guest-classification-tag tag-${tag}">${escapeHtml(classificationLabels[tag])}</span>`).join(" ") : '<span class="tag-unassigned">Unassigned</span>'}</td>
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
        "Guest Email", "Household Email", "Scott / Quiana", "Friend / Family", "Family Side",
        "Invited: Welcome", "Invited: Ceremony", "Invited: Reception",
        "Invited: Brunch", "RSVP Recorded", "Attending: Welcome",
        "Attending: Ceremony", "Attending: Reception", "Attending: Brunch",
        "Dietary Restrictions", "Dietary Details"
    ];
    const rows = visibleGuests.map((guest) => [
        guest.firstName, guest.lastName, guest.household.householdName,
        guest.household.householdKey, guest.email, guest.household.email,
        classificationLabels[guest.classifications.coupleSide] ?? "",
        classificationLabels[guest.classifications.relationshipType] ?? "",
        classificationLabels[guest.classifications.familySide] ?? "",
        guest.invitations.welcome ? "Yes" : "No",
        guest.invitations.wedding ? "Yes" : "No",
        guest.invitations.reception ? "Yes" : "No",
        guest.invitations.brunch ? "Yes" : "No",
        guest.rsvp ? "Yes" : "No",
        guest.rsvp ? (guest.rsvp.welcome ? "Yes" : "No") : "",
        guest.rsvp ? (guest.rsvp.wedding ? "Yes" : "No") : "",
        guest.rsvp ? (guest.rsvp.reception ? "Yes" : "No") : "",
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
        if (!dashboardCards) {
            dashboardCards = window.initializeDashboardCards({
                page: "guests", cards: result.dashboardCards,
                metrics: guestDashboardMetrics,
                getRows: () => guestData.guests,
                onFilterChanged: renderGuests
            });
        } else {
            dashboardCards.render();
        }
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
    elements.householdFilter, elements.coupleFilter,
    elements.relationshipFilter, elements.familySideFilter,
    elements.dietaryFilter,
    elements.invitationFilter, elements.rsvpFilter, elements.sort
].forEach((element) => element.addEventListener("change", renderGuests));
elements.export.addEventListener("click", exportGuests);
elements.refresh.addEventListener("click", loadGuests);
loadGuests();
