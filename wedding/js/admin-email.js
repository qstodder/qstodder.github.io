const elements = {
    loading: document.querySelector("#admin-loading"), error: document.querySelector("#admin-error"),
    errorMessage: document.querySelector("#admin-error-message"), content: document.querySelector("#email-content"),
    adminEmail: document.querySelector("#admin-email"), refresh: document.querySelector("#refresh-email"),
    search: document.querySelector("#email-search"), rsvp: document.querySelector("#email-rsvp-filter"),
    couple: document.querySelector("#email-couple-filter"), relationship: document.querySelector("#email-relationship-filter"),
    family: document.querySelector("#email-family-filter"), delivery: document.querySelector("#email-delivery-filter"),
    rows: document.querySelector("#email-recipient-rows"), selectAll: document.querySelector("#select-all-recipients"),
    count: document.querySelector("#recipient-count"), excluded: document.querySelector("#excluded-email-count"),
    empty: document.querySelector("#email-empty-results"), form: document.querySelector("#email-form"),
    template: document.querySelector("#email-template"), subject: document.querySelector("#email-subject"), body: document.querySelector("#email-body"),
    draft: document.querySelector("#load-invitation-draft"), review: document.querySelector("#email-review"),
    reviewCount: document.querySelector("#review-recipient-count"), greeting: document.querySelector("#preview-greeting"),
    preview: document.querySelector("#email-preview"), previewLabel: document.querySelector("#preview-template-label"),
    previewHeading: document.querySelector("#preview-invitation-heading"), previewAction: document.querySelector("#preview-template-action"),
    previewBody: document.querySelector("#preview-body"), confirm: document.querySelector("#confirm-send"),
    cancel: document.querySelector("#cancel-review"), status: document.querySelector("#send-status")
};

const invitationDraft = `You are cordially invited to celebrate the wedding of Quiana and Scott on September 18, 2027 in La Jolla, California.

Please RSVP by August 1st, 2027 on our website:
https://qstodder.com/wedding

We can’t wait to celebrate with you!

With love,
Quiana & Scott`;

let data = null;
let selectedIds = new Set();

function escapeHtml(value) {
    const node = document.createElement("div");
    node.textContent = value ?? "";
    return node.innerHTML;
}

function filteredHouseholds() {
    const search = elements.search.value.trim().toLowerCase();
    return data.households.filter((household) => {
        const classifications = household.classifications || {};
        const searchable = [household.householdName, ...household.guests].join(" ").toLowerCase();
        const classMatch = (filter, value) => filter === "all" || (filter === "unassigned" ? !value : value === filter);
        return !household.missingEmail &&
            (!search || searchable.includes(search)) &&
            (elements.rsvp.value === "all" || household.rsvpStatus === elements.rsvp.value ||
                (elements.rsvp.value === "notSubmitted" && household.rsvpStatus !== "submitted")) &&
            classMatch(elements.couple.value, classifications.coupleSide) &&
            classMatch(elements.relationship.value, classifications.relationshipType) &&
            classMatch(elements.family.value, classifications.familySide) &&
            (elements.delivery.value === "all" || household.deliveryStatus === elements.delivery.value);
    });
}

function resetSelectionToFiltered() {
    selectedIds = new Set(filteredHouseholds().map((household) => household.id));
    renderRecipients();
}

function renderRecipients() {
    const households = filteredHouseholds();
    elements.rows.innerHTML = households.map((household) => `
        <tr><td data-label="Selected"><input type="checkbox" data-household-id="${household.id}" aria-label="Email ${escapeHtml(household.householdName)}" ${selectedIds.has(household.id) ? "checked" : ""}></td>
        <th scope="row" data-label="Household">${escapeHtml(household.householdName)}<span class="guest-names">${household.guests.map(escapeHtml).join(", ")}</span></th>
        <td data-label="Email">${escapeHtml(household.email)}</td><td data-label="RSVP"><span class="status-pill status-${household.rsvpStatus}">${household.rsvpStatus === "submitted" ? "Submitted" : household.rsvpStatus === "inProgress" ? "In progress" : "Not started"}</span></td></tr>`).join("");
    const visibleSelected = households.filter((household) => selectedIds.has(household.id)).length;
    elements.count.textContent = `${visibleSelected} household${visibleSelected === 1 ? "" : "s"} selected`;
    elements.selectAll.checked = households.length > 0 && visibleSelected === households.length;
    elements.selectAll.indeterminate = visibleSelected > 0 && visibleSelected < households.length;
    elements.empty.classList.toggle("hidden", households.length > 0);
    const missing = data.households.filter((household) => household.missingEmail).length;
    elements.excluded.textContent = `${missing} household${missing === 1 ? " is" : "s are"} excluded because ${missing === 1 ? "it has" : "they have"} no email address.`;
}

function selectedHouseholds() {
    const visibleIds = new Set(filteredHouseholds().map((household) => household.id));
    return data.households.filter((household) => visibleIds.has(household.id) && selectedIds.has(household.id));
}

function showReview() {
    const recipients = selectedHouseholds();
    if (!recipients.length) {
        window.alert("Select at least one household with an email address.");
        return;
    }
    elements.reviewCount.textContent = `${recipients.length} individual email${recipients.length === 1 ? "" : "s"}`;
    elements.greeting.textContent = `Dear ${recipients[0].householdName},`;
    const templateLabels = { plain: "Plain email", classic: "Option 1 · Classic HTML", animated: "Option 2 · Animated coastal", reveal: "Option 4 · Website reveal" };
    elements.preview.dataset.template = elements.template.value;
    elements.previewLabel.textContent = templateLabels[elements.template.value];
    const isInvitation = elements.template.value !== "plain";
    elements.previewHeading.classList.toggle("hidden", !isInvitation);
    elements.previewAction.classList.toggle("hidden", !isInvitation);
    elements.previewAction.textContent = elements.template.value === "reveal" ? "Open our invitation →" : "View details & RSVP";
    elements.previewBody.replaceChildren(...elements.body.value.split(/\n{2,}/).map((text) => {
        const paragraph = document.createElement("p");
        paragraph.textContent = text;
        return paragraph;
    }));
    elements.status.textContent = "";
    elements.review.classList.remove("hidden");
    elements.review.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function sendEmails() {
    const recipients = selectedHouseholds();
    if (!window.confirm(`Send ${recipients.length} individual email${recipients.length === 1 ? "" : "s"} now? This cannot be undone.`)) return;
    elements.confirm.disabled = true;
    elements.cancel.disabled = true;
    const failed = [];
    let sent = 0;
    try {
        for (let index = 0; index < recipients.length; index += 20) {
            const batch = recipients.slice(index, index + 20);
            elements.status.textContent = `Sending ${sent + 1}–${sent + batch.length} of ${recipients.length}…`;
            const response = await fetch("/api/admin/email/send", { method: "POST", credentials: "include", headers: { "Accept": "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ householdIds: batch.map((item) => item.id), subject: elements.subject.value, body: elements.body.value, template: elements.template.value }) });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.error || "Unable to send this email batch.");
            sent += result.sent.length;
            failed.push(...result.failed);
        }
        elements.status.textContent = failed.length ? `${sent} sent; ${failed.length} failed. The failed households remain selected.` : `Successfully sent ${sent} individual email${sent === 1 ? "" : "s"}.`;
        if (!failed.length) selectedIds.clear();
        else selectedIds = new Set(failed.map((item) => item.householdId));
        renderRecipients();
    } catch (error) {
        elements.status.textContent = `${sent} sent before sending stopped. ${error instanceof Error ? error.message : "Unable to continue."}`;
    } finally {
        elements.confirm.disabled = false;
        elements.cancel.disabled = false;
    }
}

async function loadData() {
    elements.loading.classList.remove("hidden"); elements.error.classList.add("hidden"); elements.content.classList.add("hidden");
    try {
        const response = await fetch("/api/admin", { credentials: "include", headers: { "Accept": "application/json" } });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load households.");
        data = result; elements.adminEmail.textContent = result.admin.email; elements.body.value ||= invitationDraft;
        resetSelectionToFiltered(); elements.loading.classList.add("hidden"); elements.content.classList.remove("hidden");
    } catch (error) {
        elements.loading.classList.add("hidden"); elements.error.classList.remove("hidden"); elements.errorMessage.textContent = error instanceof Error ? error.message : "Unable to load households.";
    }
}

[elements.search, elements.rsvp, elements.couple, elements.relationship, elements.family, elements.delivery].forEach((element) => element.addEventListener(element.tagName === "INPUT" ? "input" : "change", resetSelectionToFiltered));
elements.rows.addEventListener("change", (event) => { const input = event.target.closest("input[data-household-id]"); if (!input) return; const id = Number(input.dataset.householdId); input.checked ? selectedIds.add(id) : selectedIds.delete(id); renderRecipients(); });
elements.selectAll.addEventListener("change", () => { for (const household of filteredHouseholds()) elements.selectAll.checked ? selectedIds.add(household.id) : selectedIds.delete(household.id); renderRecipients(); });
elements.draft.addEventListener("click", () => { elements.subject.value = "You’re invited to Quiana & Scott’s wedding"; elements.body.value = invitationDraft; });
elements.form.addEventListener("submit", (event) => { event.preventDefault(); if (elements.form.reportValidity()) showReview(); });
elements.cancel.addEventListener("click", () => elements.review.classList.add("hidden"));
elements.confirm.addEventListener("click", sendEmails);
elements.refresh.addEventListener("click", loadData);
loadData();
