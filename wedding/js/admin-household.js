const householdId = Number(
    window.location.pathname.match(/\/households\/(\d+)/)?.[1]
);

const elements = {
    loading: document.querySelector("#admin-loading"),
    error: document.querySelector("#admin-error"),
    errorMessage: document.querySelector("#admin-error-message"),
    content: document.querySelector("#detail-content"),
    title: document.querySelector("#detail-title"),
    adminEmail: document.querySelector("#admin-email"),
    householdForm: document.querySelector("#household-form"),
    householdStatus: document.querySelector("#household-form-status"),
    archiveHousehold: document.querySelector("#archive-household"),
    addGuestForm: document.querySelector("#add-guest-form"),
    guestList: document.querySelector("#guest-list"),
    noGuests: document.querySelector("#no-guests")
};

let detail = null;

function escapeHtml(value) {
    const element = document.createElement("div");
    element.textContent = value ?? "";
    return element.innerHTML;
}

function escapeAttribute(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

async function api(path, options = {}) {
    const response = await fetch(path, {
        credentials: "same-origin",
        ...options,
        headers: {
            "Accept": "application/json",
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...options.headers
        }
    });
    let result;
    try {
        result = await response.json();
    } catch {
        throw new Error("Your secure session may have expired. Sign in again and retry.");
    }
    if (!response.ok) {
        throw new Error(result.error || "The request could not be completed.");
    }
    return result;
}

function value(form, name) {
    return new FormData(form).get(name)?.toString() ?? "";
}

function fillHouseholdForm() {
    const household = detail.household;
    const form = elements.householdForm;
    form.elements.householdName.value = household.householdName;
    form.elements.householdKey.value = household.householdKey;
    form.elements.email.value = household.email ?? "";
    form.elements.coupleSide.value =
        household.classifications?.coupleSide ?? "";
    form.elements.relationshipType.value =
        household.classifications?.relationshipType ?? "";
    form.elements.familySide.value =
        household.classifications?.familySide ?? "";
    syncFamilySide(form);
    form.elements.addressNeeded.checked = household.addressNeeded;
    form.elements.line1.value = household.address.line1 ?? "";
    form.elements.line2.value = household.address.line2 ?? "";
    form.elements.city.value = household.address.city ?? "";
    form.elements.region.value = household.address.region ?? "";
    form.elements.postalCode.value = household.address.postalCode ?? "";
    form.elements.countryCode.value = household.address.countryCode ?? "US";
    form.elements.notes.value = household.notes ?? "";
    elements.title.textContent = household.householdName;
    document.title = `${household.householdName} · Wedding Administration`;
}

function invitationCheckbox(name, label, checked) {
    return `<label class="admin-checkbox"><input type="checkbox" name="${name}" ${checked ? "checked" : ""}><span>${label}</span></label>`;
}

function rsvpSelect(name, label, value, hasRsvp) {
    return `<label class="address-field"><span>${label}</span><select name="${name}"><option value="none" ${!hasRsvp ? "selected" : ""}>Not recorded</option><option value="yes" ${hasRsvp && value ? "selected" : ""}>Attending</option><option value="no" ${hasRsvp && !value ? "selected" : ""}>Not attending</option></select></label>`;
}

function syncFamilySide(form) {
    const relationship = form.elements.relationshipType;
    const familySide = form.elements.familySide;
    if (!relationship || !familySide) return;

    const isFamily = relationship.value === "family";
    familySide.disabled = !isFamily;
    familySide.required = isFamily;
    if (!isFamily) familySide.value = "";
}

function renderGuest(guest) {
    const restrictionOptions = detail.dietaryRestrictions.map((restriction) =>
        `<label class="admin-checkbox"><input type="checkbox" name="dietaryRestrictionIds" value="${restriction.id}" ${guest.dietaryRestrictionIds.includes(restriction.id) ? "checked" : ""}><span>${escapeHtml(restriction.name)}</span></label>`
    ).join("");
    const householdOptions = detail.householdOptions.map((household) =>
        `<option value="${household.id}" ${household.id === guest.householdId ? "selected" : ""}>${escapeHtml(household.householdName)}</option>`
    ).join("");

    return `<article class="guest-editor-card" id="guest-${guest.id}">
        <form class="guest-form" data-guest-id="${guest.id}">
            <div class="guest-editor-heading"><h3>${escapeHtml(`${guest.firstName} ${guest.lastName}`.trim())}</h3><span>Guest #${guest.id}</span></div>
            <div class="detail-form-grid">
                <label class="address-field"><span>First name</span><input name="firstName" value="${escapeAttribute(guest.firstName)}" maxlength="100" required></label>
                <label class="address-field"><span>Last name</span><input name="lastName" value="${escapeAttribute(guest.lastName)}" maxlength="100"></label>
                <label class="address-field detail-field-wide"><span>Household</span><select name="householdId">${householdOptions}</select></label>
            </div>
            <fieldset class="guest-fieldset"><legend>Invited to</legend><div class="guest-options">
                ${invitationCheckbox("inviteWelcome", "Welcome gathering", guest.invitations.welcome)}
                ${invitationCheckbox("inviteWedding", "Wedding", guest.invitations.wedding)}
                ${invitationCheckbox("inviteBrunch", "Morning-after brunch", guest.invitations.brunch)}
            </div></fieldset>
            <fieldset class="guest-fieldset"><legend>RSVP response</legend><div class="detail-form-grid guest-rsvp-grid">
                ${rsvpSelect("rsvpWelcome", "Welcome", guest.rsvp?.welcome, Boolean(guest.rsvp))}
                ${rsvpSelect("rsvpWedding", "Wedding", guest.rsvp?.wedding, Boolean(guest.rsvp))}
                ${rsvpSelect("rsvpBrunch", "Brunch", guest.rsvp?.brunch, Boolean(guest.rsvp))}
            </div><p class="field-help">Choose “Not recorded” for all three to clear this guest’s RSVP.</p></fieldset>
            <fieldset class="guest-fieldset"><legend>Dietary preferences</legend><div class="guest-options">${restrictionOptions}</div>
                <label class="address-field"><span>Additional dietary details</span><textarea name="dietaryNotes" rows="2" maxlength="1000">${escapeHtml(guest.dietaryNotes ?? "")}</textarea></label>
            </fieldset>
            <p class="form-status" aria-live="polite"></p>
            <div class="detail-actions"><button class="address-save-button" type="submit">Save guest</button><button class="danger-button" type="button" data-action="archive-guest">Archive guest</button></div>
        </form>
    </article>`;
}

function renderGuests() {
    elements.guestList.innerHTML = detail.guests.map(renderGuest).join("");
    elements.noGuests.classList.toggle("hidden", detail.guests.length > 0);
    const target = window.location.hash
        ? document.getElementById(
            decodeURIComponent(window.location.hash.slice(1))
        )
        : null;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function guestPayload(form) {
    const formData = new FormData(form);
    const rsvpValues = ["rsvpWelcome", "rsvpWedding", "rsvpBrunch"]
        .map((name) => formData.get(name));
    const hasRsvp = rsvpValues.some((answer) => answer !== "none");
    if (hasRsvp && rsvpValues.some((answer) => answer === "none")) {
        throw new Error("Record all three RSVP answers, or set all three to Not recorded.");
    }
    const dietaryRestrictionIds = formData
        .getAll("dietaryRestrictionIds")
        .map(Number);
    const otherRestriction = detail.dietaryRestrictions.find(
        (restriction) => restriction.name.toLowerCase() === "other"
    );
    const dietaryNotes = formData.get("dietaryNotes")?.toString().trim() ?? "";
    if (
        otherRestriction &&
        dietaryRestrictionIds.includes(otherRestriction.id) &&
        !dietaryNotes
    ) {
        throw new Error("Add dietary details when Other is selected.");
    }

    return {
        firstName: formData.get("firstName"),
        lastName: formData.get("lastName"),
        householdId: Number(formData.get("householdId")),
        invitations: {
            welcome: formData.has("inviteWelcome"),
            wedding: formData.has("inviteWedding"),
            brunch: formData.has("inviteBrunch")
        },
        rsvp: hasRsvp ? {
            welcome: formData.get("rsvpWelcome") === "yes",
            wedding: formData.get("rsvpWedding") === "yes",
            brunch: formData.get("rsvpBrunch") === "yes"
        } : null,
        dietaryRestrictionIds,
        dietaryNotes
    };
}

async function loadDetail() {
    if (!Number.isInteger(householdId)) {
        throw new Error("Invalid household URL.");
    }
    detail = await api(`/api/admin/households/${householdId}`);
    elements.adminEmail.textContent = detail.admin.email;
    fillHouseholdForm();
    renderGuests();
    elements.loading.classList.add("hidden");
    elements.error.classList.add("hidden");
    elements.content.classList.remove("hidden");
}

elements.householdForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    const form = event.currentTarget;
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    elements.householdStatus.textContent = "Saving…";
    try {
        await api(`/api/admin/households/${householdId}`, {
            method: "PATCH",
            body: JSON.stringify({
                householdName: value(form, "householdName"),
                householdKey: value(form, "householdKey"),
                email: value(form, "email"),
                addressNeeded: form.elements.addressNeeded.checked,
                classifications: {
                    coupleSide: value(form, "coupleSide"),
                    relationshipType: value(form, "relationshipType"),
                    familySide: value(form, "relationshipType") === "family"
                        ? value(form, "familySide") || null
                        : null
                },
                address: {
                    line1: value(form, "line1"), line2: value(form, "line2"),
                    city: value(form, "city"), region: value(form, "region"),
                    postalCode: value(form, "postalCode"),
                    countryCode: value(form, "countryCode")
                },
                notes: value(form, "notes")
            })
        });
        elements.householdStatus.textContent = "Household saved.";
        await loadDetail();
    } catch (error) {
        elements.householdStatus.textContent = error.message;
    } finally {
        submit.disabled = false;
    }
});

elements.guestList.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.target.closest(".guest-form");
    if (!form?.reportValidity()) return;
    const status = form.querySelector(".form-status");
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    status.textContent = "Saving…";
    try {
        const payload = guestPayload(form);
        const existingGuest = detail.guests.find(
            (guest) => guest.id === Number(form.dataset.guestId)
        );
        const removesAcceptedInvitation = existingGuest?.rsvp && [
            ["welcome", "welcome"],
            ["wedding", "wedding"],
            ["brunch", "brunch"]
        ].some(([invitation, response]) =>
            existingGuest.rsvp[response] &&
            !payload.invitations[invitation]
        );
        if (
            removesAcceptedInvitation &&
            !window.confirm(
                "This guest has an attending RSVP for an event you are removing from their invitation. Save anyway?"
            )
        ) {
            return;
        }
        await api(`/api/admin/guests/${form.dataset.guestId}`, {
            method: "PATCH", body: JSON.stringify(payload)
        });
        if (payload.householdId !== householdId) {
            await loadDetail();
        } else {
            status.textContent = "Guest saved.";
            await loadDetail();
        }
    } catch (error) {
        status.textContent = error.message;
    } finally {
        submit.disabled = false;
    }
});

elements.guestList.addEventListener("click", async (event) => {
    const button = event.target.closest('[data-action="archive-guest"]');
    if (!button) return;
    const form = button.closest(".guest-form");
    const name = `${value(form, "firstName")} ${value(form, "lastName")}`.trim();
    if (!window.confirm(`Archive ${name}? Their RSVP and dietary history will be retained.`)) return;
    button.disabled = true;
    try {
        await api(`/api/admin/guests/${form.dataset.guestId}`, { method: "DELETE" });
        await loadDetail();
    } catch (error) {
        form.querySelector(".form-status").textContent = error.message;
        button.disabled = false;
    }
});

elements.addGuestForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const status = form.querySelector(".form-status");
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    status.textContent = "Adding…";
    try {
        await api(`/api/admin/households/${householdId}/guests`, {
            method: "POST",
            body: JSON.stringify({
                firstName: value(form, "firstName"),
                lastName: value(form, "lastName")
            })
        });
        form.reset();
        await loadDetail();
    } catch (error) {
        status.textContent = error.message;
    } finally {
        submit.disabled = false;
    }
});

elements.householdForm.addEventListener("change", (event) => {
    if (event.target.name === "relationshipType") {
        syncFamilySide(elements.householdForm);
    }
});

elements.archiveHousehold.addEventListener("click", async () => {
    const name = detail.household.householdName;
    if (!window.confirm(`Archive ${name} and all guests in it? RSVP history will be retained.`)) return;
    elements.archiveHousehold.disabled = true;
    try {
        await api(`/api/admin/households/${householdId}`, { method: "DELETE" });
        window.location.assign("/admin/");
    } catch (error) {
        elements.householdStatus.textContent = error.message;
        elements.archiveHousehold.disabled = false;
    }
});

loadDetail().catch((error) => {
    elements.loading.classList.add("hidden");
    elements.error.classList.remove("hidden");
    elements.errorMessage.textContent = error.message;
});
