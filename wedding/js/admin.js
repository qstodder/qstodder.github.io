const PRODUCTION_API_BASE =
    "https://wedding-rsvp-api.qstodder.workers.dev";

const isLocalhost =
    ["localhost", "127.0.0.1"]
        .includes(window.location.hostname);

const useProductionApi =
    new URLSearchParams(window.location.search)
        .get("api") === "production";

const API_BASE =
    isLocalhost && !useProductionApi
        ? "http://localhost:8787"
        : PRODUCTION_API_BASE;

const elements = {
    loading: document.querySelector("#admin-loading"),
    error: document.querySelector("#admin-error"),
    errorMessage: document.querySelector("#admin-error-message"),
    loginLink: document.querySelector("#admin-login-link"),
    content: document.querySelector("#admin-content"),
    adminEmail: document.querySelector("#admin-email"),
    refresh: document.querySelector("#refresh-dashboard"),
    addHousehold: document.querySelector("#add-household"),
    exportHouseholds: document.querySelector("#export-households"),
    householdSearch: document.querySelector("#household-search"),
    deliveryFilter: document.querySelector("#delivery-filter"),
    rsvpFilter: document.querySelector("#rsvp-filter"),
    rows: document.querySelector("#household-rows"),
    emptyResults: document.querySelector("#empty-results"),
    resultsCount: document.querySelector("#results-count"),
    generatedAt: document.querySelector("#generated-at"),
    missingAddresses: document.querySelector("#missing-addresses"),
    totalHouseholds: document.querySelector("#total-households"),
    submittedHouseholds: document.querySelector("#submitted-households"),
    totalGuests: document.querySelector("#total-guests"),
    weddingAttending: document.querySelector("#wedding-attending")
};

let dashboardData = null;
let editingHouseholdId = null;
let savingHouseholdId = null;

const deliveryLabels = {
    addressNeeded: "Address needed",
    readyToMail: "Ready to mail",
    handDelivery: "Hand delivery"
};

const rsvpLabels = {
    submitted: "Submitted",
    inProgress: "In progress",
    pending: "Not started"
};

function escapeHtml(value) {
    const element = document.createElement("div");
    element.textContent = value ?? "";
    return element.innerHTML;
}

function formatAddress(address) {
    if (!address?.street) {
        return "—";
    }

    const locality = [
        address.city,
        address.state,
        address.zip
    ].filter(Boolean).map(escapeHtml).join(" ");

    const country = address.countryCode && address.countryCode !== "US"
        ? escapeHtml(address.countryCode)
        : "";

    return [
        escapeHtml(address.street),
        address.line2 ? escapeHtml(address.line2) : "",
        locality,
        country
    ]
        .filter(Boolean)
        .join("<br>");
}

function escapeAttribute(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function renderAddressEditor(household) {
    const address = household.address ?? {};
    const isSaving = savingHouseholdId === household.id;

    return `
        <form
            class="address-form"
            data-household-id="${household.id}"
        >
            <label class="address-field address-field-wide">
                <span>Street</span>
                <input
                    name="street"
                    value="${escapeAttribute(address.street)}"
                    maxlength="200"
                    autocomplete="street-address"
                    required
                    ${isSaving ? "disabled" : ""}
                >
            </label>
            <label class="address-field address-field-city">
                <span>City</span>
                <input
                    name="city"
                    value="${escapeAttribute(address.city)}"
                    maxlength="100"
                    autocomplete="address-level2"
                    required
                    ${isSaving ? "disabled" : ""}
                >
            </label>
            <label class="address-field address-field-state">
                <span>State</span>
                <input
                    name="state"
                    value="${escapeAttribute(address.state)}"
                    maxlength="2"
                    pattern="[A-Za-z]{2}"
                    autocomplete="address-level1"
                    required
                    ${isSaving ? "disabled" : ""}
                >
            </label>
            <label class="address-field address-field-zip">
                <span>ZIP</span>
                <input
                    name="zip"
                    value="${escapeAttribute(address.zip)}"
                    maxlength="10"
                    pattern="[0-9]{5}(-[0-9]{4})?"
                    inputmode="numeric"
                    autocomplete="postal-code"
                    required
                    ${isSaving ? "disabled" : ""}
                >
            </label>
            <p class="address-form-error" aria-live="polite"></p>
            <div class="address-form-actions">
                <button
                    class="address-save-button"
                    type="submit"
                    ${isSaving ? "disabled" : ""}
                >
                    ${isSaving ? "Saving…" : "Save address"}
                </button>
                <button
                    class="address-cancel-button"
                    type="button"
                    data-action="cancel-address"
                    ${isSaving ? "disabled" : ""}
                >
                    Cancel
                </button>
            </div>
        </form>
    `;
}

function renderAddressCell(household) {
    const content = household.missingAddress
        ? `<strong class="missing-address">Missing required address</strong>`
        : formatAddress(household.address);

    return `
        <div class="address-display">${content}</div>
    `;
}

function renderSummary(summary) {
    elements.missingAddresses.textContent =
        summary.missingAddresses;
    elements.totalHouseholds.textContent =
        summary.households;
    elements.submittedHouseholds.textContent =
        `${summary.submittedHouseholds} submitted`;
    elements.totalGuests.textContent =
        summary.guests;
    elements.weddingAttending.textContent =
        summary.attendingWedding;
}

function filteredHouseholds() {
    const search =
        elements.householdSearch.value
            .trim()
            .toLowerCase();
    const delivery = elements.deliveryFilter.value;
    const rsvp = elements.rsvpFilter.value;

    return dashboardData.households.filter((household) => {
        const searchable = [
            household.householdName,
            ...household.guests
        ].join(" ").toLowerCase();

        return (
            (!search || searchable.includes(search)) &&
            (delivery === "all" ||
                household.deliveryStatus === delivery) &&
            (rsvp === "all" ||
                household.rsvpStatus === rsvp)
        );
    });
}

function renderHouseholds() {
    const households = filteredHouseholds();

    elements.rows.innerHTML = households
        .map((household) => `
            <tr class="${household.missingAddress ? "address-alert-row" : ""}">
                <td data-label="Actions" class="household-actions-cell">
                    <a
                        class="address-edit-button household-edit-button"
                        href="/admin/households/${household.id}"
                    >
                        Edit household
                    </a>
                </td>
                <th scope="row" data-label="Household">
                    <a class="household-name household-detail-link" href="/admin/households/${household.id}">
                        ${escapeHtml(household.householdName)}
                    </a>
                    <span class="household-key">
                        ${escapeHtml(household.householdKey)}
                    </span>
                </th>
                <td data-label="Guests">
                    <span class="guest-count">
                        ${household.guestCount}
                    </span>
                    <span class="guest-names">
                        ${household.guests.map(escapeHtml).join(", ")}
                    </span>
                </td>
                <td data-label="Invitation">
                    <span class="status-pill status-${household.deliveryStatus}">
                        ${deliveryLabels[household.deliveryStatus]}
                    </span>
                </td>
                <td data-label="Address" class="address-cell">
                    ${renderAddressCell(household)}
                </td>
                <td data-label="RSVP">
                    <span class="status-pill status-${household.rsvpStatus}">
                        ${rsvpLabels[household.rsvpStatus]}
                    </span>
                </td>
                <td data-label="Wedding" class="attendance-cell">
                    ${household.attendance.wedding}
                    <span>of ${household.guestCount}</span>
                </td>
            </tr>
        `)
        .join("");

    elements.resultsCount.textContent =
        `${households.length} of ${dashboardData.households.length} households`;
    elements.emptyResults.classList.toggle(
        "hidden",
        households.length > 0
    );
}

function findHousehold(householdId) {
    return dashboardData.households.find(
        (household) => household.id === householdId
    );
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

function exportHouseholds() {
    const headings = [
        "Household", "Household Key", "Email", "Guests",
        "Guest Count", "Delivery Status", "Address Line 1",
        "Address Line 2", "City", "State/Province/Region",
        "Postal Code", "Country", "RSVP Status", "Responded Guests",
        "Welcome Attending", "Wedding Attending", "Brunch Attending"
    ];
    const rows = filteredHouseholds().map((household) => [
        household.householdName,
        household.householdKey,
        household.email,
        household.guests.join("; "),
        household.guestCount,
        deliveryLabels[household.deliveryStatus],
        household.address.street,
        household.address.line2,
        household.address.city,
        household.address.state,
        household.address.zip,
        household.address.countryCode,
        rsvpLabels[household.rsvpStatus],
        household.respondedGuestCount,
        household.attendance.welcome,
        household.attendance.wedding,
        household.attendance.brunch
    ]);
    downloadCsv(
        `wedding-households-${new Date().toISOString().slice(0, 10)}.csv`,
        headings,
        rows
    );
}

function beginAddressEdit(householdId) {
    editingHouseholdId = householdId;
    renderHouseholds();

    const form = elements.rows.querySelector(
        `.address-form[data-household-id="${householdId}"]`
    );
    form?.querySelector("input")?.focus();
}

function cancelAddressEdit() {
    if (savingHouseholdId !== null) {
        return;
    }

    editingHouseholdId = null;
    renderHouseholds();
}

async function saveAddress(form) {
    if (!form.reportValidity()) {
        return;
    }

    const householdId = Number(form.dataset.householdId);
    const formData = new FormData(form);
    const errorElement = form.querySelector(
        ".address-form-error"
    );

    savingHouseholdId = householdId;
    renderHouseholds();

    try {
        const response = await fetch(
            `${API_BASE}/api/admin/households/${householdId}/address`,
            {
                method: "PATCH",
                credentials: "include",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    street: formData.get("street"),
                    city: formData.get("city"),
                    state: formData.get("state"),
                    zip: formData.get("zip")
                })
            }
        );
        let result = null;

        try {
            result = await response.json();
        } catch {
            throw new Error(
                "Secure access expired. Sign in again, then retry the address update."
            );
        }

        if (!response.ok) {
            throw new Error(
                result.error || "Unable to save the address."
            );
        }

        const household = findHousehold(householdId);

        if (household) {
            household.address = result.address;
            household.missingAddress = false;
            household.deliveryStatus = household.addressNeeded
                ? "readyToMail"
                : "handDelivery";
        }

        editingHouseholdId = null;
        savingHouseholdId = null;
        await loadDashboard();
    } catch (error) {
        savingHouseholdId = null;
        renderHouseholds();

        const currentForm = elements.rows.querySelector(
            `.address-form[data-household-id="${householdId}"]`
        );
        const currentError = currentForm?.querySelector(
            ".address-form-error"
        ) ?? errorElement;

        if (currentError) {
            currentError.textContent =
                error instanceof Error
                    ? error.message
                    : "Unable to save the address.";
        }
    }
}

function showError(message) {
    elements.loading.classList.add("hidden");
    elements.content.classList.add("hidden");
    elements.error.classList.remove("hidden");
    elements.errorMessage.textContent = message;
    elements.adminEmail.textContent = "Secure access required";
}

async function loadDashboard() {
    elements.loading.classList.remove("hidden");
    elements.error.classList.add("hidden");
    elements.content.classList.add("hidden");
    elements.refresh.disabled = true;
    elements.loginLink.href = `${API_BASE}/api/admin`;

    try {
        const response = await fetch(
            `${API_BASE}/api/admin`,
            {
                credentials: "include",
                headers: {
                    "Accept": "application/json"
                }
            }
        );

        let result = null;

        try {
            result = await response.json();
        } catch {
            throw new Error(
                "Secure access is not active in this browser. Open the sign-in link, authenticate, then refresh this page."
            );
        }

        if (!response.ok) {
            throw new Error(
                result.error ||
                "Unable to load the admin dashboard."
            );
        }

        dashboardData = result;
        renderSummary(result.summary);
        renderHouseholds();

        elements.adminEmail.textContent =
            result.admin.email;
        elements.generatedAt.textContent =
            `Last refreshed ${new Date(result.generatedAt).toLocaleString()}`;
        elements.loading.classList.add("hidden");
        elements.content.classList.remove("hidden");

    } catch (error) {
        showError(
            error instanceof Error
                ? error.message
                : "Unable to load the admin dashboard."
        );
    } finally {
        elements.refresh.disabled = false;
    }
}

elements.refresh.addEventListener("click", loadDashboard);
elements.exportHouseholds.addEventListener("click", exportHouseholds);
elements.addHousehold.addEventListener("click", async () => {
    const householdName = window.prompt("New household name");
    if (!householdName?.trim()) {
        return;
    }

    elements.addHousehold.disabled = true;
    try {
        const response = await fetch(
            `${API_BASE}/api/admin/households`,
            {
                method: "POST",
                credentials: "include",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    householdName: householdName.trim()
                })
            }
        );
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "Unable to add the household.");
        }
        window.location.assign(
            `/admin/households/${result.householdId}`
        );
    } catch (error) {
        window.alert(
            error instanceof Error
                ? error.message
                : "Unable to add the household."
        );
        elements.addHousehold.disabled = false;
    }
});
elements.householdSearch.addEventListener("input", renderHouseholds);
elements.deliveryFilter.addEventListener("change", renderHouseholds);
elements.rsvpFilter.addEventListener("change", renderHouseholds);
elements.rows.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");

    if (!button) {
        return;
    }

    if (button.dataset.action === "edit-address") {
        beginAddressEdit(
            Number(button.dataset.householdId)
        );
    } else if (
        button.dataset.action === "cancel-address"
    ) {
        cancelAddressEdit();
    }
});
elements.rows.addEventListener("submit", (event) => {
    const form = event.target.closest(".address-form");

    if (!form) {
        return;
    }

    event.preventDefault();
    saveAddress(form);
});

loadDashboard();
