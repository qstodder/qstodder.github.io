const elements = {
    loading: document.querySelector("#admin-loading"),
    error: document.querySelector("#admin-error"),
    errorMessage: document.querySelector("#admin-error-message"),
    content: document.querySelector("#seating-content"),
    adminEmail: document.querySelector("#admin-email"),
    refresh: document.querySelector("#refresh-seating"),
    tables: document.querySelector("#seating-tables"),
    ballroom: document.querySelector("#ballroom"),
    seatedCount: document.querySelector("#seated-count"),
    unseatedCount: document.querySelector("#unseated-count"),
    saveStatus: document.querySelector("#save-status"),
    undo: document.querySelector("#undo-seating"),
    redo: document.querySelector("#redo-seating"),
    shuffle: document.querySelector("#shuffle-seating"),
    addTable: document.querySelector("#add-seating-table"),
    export: document.querySelector("#export-seating"),
    print: document.querySelector("#print-seating"),
    printList: document.querySelector("#seating-print-list"),
    dialog: document.querySelector("#seat-dialog"),
    dialogLabel: document.querySelector("#seat-dialog-label"),
    closeDialog: document.querySelector("#close-seat-dialog"),
    search: document.querySelector("#seat-guest-search"),
    options: document.querySelector("#seat-guest-options"),
    clearSeat: document.querySelector("#clear-seat"),
    toggleLock: document.querySelector("#toggle-seat-lock")
};

let state = null;
let activeSeat = null;
let history = [];
let future = [];
let revision = 0;
let saveTimer = null;
let saving = false;

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

function guestName(guest) {
    return `${guest.firstName} ${guest.lastName}`.trim();
}

function compareText(left, right) {
    return String(left ?? "").localeCompare(
        String(right ?? ""),
        undefined,
        { sensitivity: "base" }
    );
}

function snapshot() {
    return JSON.stringify({
        tables: state.tables,
        assignments: state.assignments
    });
}

function restore(serialized) {
    const value = JSON.parse(serialized);
    state.tables = value.tables;
    state.assignments = value.assignments;
}

function registerChange(previous = snapshot()) {
    history.push(previous);
    if (history.length > 60) history.shift();
    future = [];
    revision += 1;
    render();
    scheduleSave();
}

function change(mutator) {
    const previous = snapshot();
    mutator();
    if (snapshot() !== previous) registerChange(previous);
}

function assignmentAt(tableId, seatNumber) {
    return state.assignments.find((assignment) =>
        assignment.tableId === tableId && assignment.seatNumber === seatNumber
    ) ?? null;
}

function guestById(id) {
    return state.guests.find((guest) => guest.id === id) ?? null;
}

function statusLabel(status) {
    return status === "yes"
        ? "Attending"
        : status === "no"
            ? "Not attending"
            : "Not responded";
}

function seatPosition(seatNumber, seatCount) {
    const angle = -Math.PI / 2 + ((seatNumber - 1) / seatCount) * Math.PI * 2;
    return {
        left: 50 + Math.cos(angle) * 43,
        top: 50 + Math.sin(angle) * 43
    };
}

function renderTables() {
    elements.tables.innerHTML = [...state.tables]
        .sort((a, b) => a.tableNumber - b.tableNumber)
        .map((table) => {
            const seats = Array.from({ length: table.seatCount }, (_, index) => {
                const seatNumber = index + 1;
                const assignment = assignmentAt(table.id, seatNumber);
                const guest = assignment ? guestById(assignment.guestId) : null;
                const position = seatPosition(seatNumber, table.seatCount);
                const status = guest?.rsvpStatus ?? "empty";
                const label = guest ? guestName(guest) : `Seat ${seatNumber}`;
                const title = guest
                    ? `${guestName(guest)} · ${guest.householdName} · ${statusLabel(guest.rsvpStatus)}`
                    : `Table ${table.tableNumber}, empty seat ${seatNumber}`;
                return `
                    <button class="seating-seat seat-status-${status} ${guest ? "" : "seating-seat-empty"}"
                        type="button" data-table-id="${escapeAttribute(table.id)}" data-seat-number="${seatNumber}"
                        style="left:${position.left}%;top:${position.top}%" title="${escapeAttribute(title)}">
                        ${escapeHtml(label)}${assignment?.locked ? '<span class="seat-lock" aria-label="Locked">🔒</span>' : ""}
                    </button>`;
            }).join("");
            return `
                <div class="seating-table" data-table-id="${escapeAttribute(table.id)}"
                    style="left:${table.positionX}%;top:${table.positionY}%;transform:translate(-50%,-50%) rotate(${table.rotation || 0}deg)">
                    <div class="table-core" role="button" tabindex="0" aria-label="Drag table ${table.tableNumber}">
                        <span class="table-number">${table.tableNumber}</span>
                        <button class="table-delete" type="button" data-delete-table="${escapeAttribute(table.id)}" aria-label="Delete table ${table.tableNumber}">×</button>
                    </div>
                    ${seats}
                </div>`;
        }).join("");
}

function renderPrintList() {
    elements.printList.innerHTML = [...state.tables]
        .sort((a, b) => a.tableNumber - b.tableNumber)
        .map((table) => {
            const seats = Array.from({ length: table.seatCount }, (_, index) => {
                const assignment = assignmentAt(table.id, index + 1);
                const guest = assignment ? guestById(assignment.guestId) : null;
                return `<li>${guest ? escapeHtml(guestName(guest)) : "—"}${assignment?.locked ? " 🔒" : ""}</li>`;
            }).join("");
            return `<article class="print-table-card"><h3>Table ${table.tableNumber}</h3><ol>${seats}</ol></article>`;
        }).join("");
}

function renderSummary() {
    const seatedIds = new Set(state.assignments.map((item) => item.guestId));
    const attending = state.guests.filter((guest) => guest.rsvpStatus === "yes");
    const attendingUnseated = attending.filter((guest) => !seatedIds.has(guest.id));
    elements.seatedCount.textContent = `${state.assignments.length} seated`;
    elements.unseatedCount.textContent = `${attendingUnseated.length} attending unseated`;
    elements.undo.disabled = history.length === 0;
    elements.redo.disabled = future.length === 0;
}

function render() {
    renderTables();
    renderPrintList();
    renderSummary();
}

function setSaveStatus(message, status = "saved") {
    elements.saveStatus.textContent = message;
    elements.saveStatus.dataset.state = status;
}

function scheduleSave() {
    window.clearTimeout(saveTimer);
    setSaveStatus("Unsaved changes", "saving");
    saveTimer = window.setTimeout(saveState, 350);
}

async function saveState() {
    if (saving) {
        scheduleSave();
        return;
    }
    saving = true;
    const savingRevision = revision;
    setSaveStatus("Saving…", "saving");
    try {
        const response = await fetch("/api/admin/seating", {
            method: "PUT",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                version: state.version,
                tables: state.tables,
                assignments: state.assignments
            })
        });
        const result = await response.json();
        if (!response.ok) {
            const error = new Error(result.error || "Unable to save the seating chart.");
            error.status = response.status;
            throw error;
        }
        state.version = result.version;
        if (revision === savingRevision) {
            setSaveStatus("Saved", "saved");
        } else {
            scheduleSave();
        }
    } catch (error) {
        setSaveStatus(error.message, "error");
        if (error.status === 409) {
            window.alert(`${error.message}\n\nYour current browser layout has not been discarded.`);
        }
    } finally {
        saving = false;
    }
}

function availableGuestsForSeat() {
    const current = activeSeat
        ? assignmentAt(activeSeat.tableId, activeSeat.seatNumber)
        : null;
    if (current?.locked) {
        const guest = guestById(current.guestId);
        return guest ? [guest] : [];
    }
    const lockedElsewhere = new Set(
        state.assignments
            .filter((item) => item.locked && item.guestId !== current?.guestId)
            .map((item) => item.guestId)
    );
    const search = elements.search.value.trim().toLowerCase();
    return state.guests
        .filter((guest) => !lockedElsewhere.has(guest.id))
        .filter((guest) => !search ||
            guestName(guest).toLowerCase().includes(search) ||
            guest.householdName.toLowerCase().includes(search))
        .sort((left, right) =>
            compareText(left.householdName, right.householdName) ||
            compareText(left.lastName, right.lastName) ||
            compareText(left.firstName, right.firstName)
        );
}

function renderGuestOptions() {
    const guests = availableGuestsForSeat();
    elements.options.innerHTML = guests.length
        ? guests.map((guest) => `
            <button class="guest-option" type="button" role="option" data-guest-id="${guest.id}">
                <span class="guest-option-name">${escapeHtml(guestName(guest))}</span>
                <span class="guest-option-household">${escapeHtml(guest.householdName)}</span>
                <span class="guest-option-status status-${guest.rsvpStatus}" title="${statusLabel(guest.rsvpStatus)}"></span>
            </button>`).join("")
        : '<p class="guest-options-empty">No available guests match this search.</p>';
}

function updateDialogControls() {
    if (!activeSeat) return;
    const assignment = assignmentAt(activeSeat.tableId, activeSeat.seatNumber);
    elements.search.readOnly = assignment?.locked === true;
    elements.clearSeat.disabled = !assignment || assignment.locked;
    elements.toggleLock.disabled = !assignment;
    elements.toggleLock.textContent = assignment?.locked ? "Unlock guest" : "Lock guest";
}

function openSeatDialog(tableId, seatNumber) {
    activeSeat = { tableId, seatNumber };
    const table = state.tables.find((item) => item.id === tableId);
    const assignment = assignmentAt(tableId, seatNumber);
    const guest = assignment ? guestById(assignment.guestId) : null;
    elements.dialogLabel.textContent = `Table ${table.tableNumber} · Seat ${seatNumber}`;
    elements.search.value = guest ? guestName(guest) : "";
    updateDialogControls();
    renderGuestOptions();
    elements.dialog.showModal();
    elements.search.focus();
    elements.search.select();
}

function closeSeatDialog() {
    elements.dialog.close();
    activeSeat = null;
}

function assignGuest(guestId) {
    if (!activeSeat) return;
    const current = assignmentAt(activeSeat.tableId, activeSeat.seatNumber);
    if (current?.locked && current.guestId !== guestId) return;
    change(() => {
        state.assignments = state.assignments.filter((assignment) =>
            assignment.guestId !== guestId && !(
                assignment.tableId === activeSeat.tableId &&
                assignment.seatNumber === activeSeat.seatNumber
            )
        );
        state.assignments.push({
            guestId,
            tableId: activeSeat.tableId,
            seatNumber: activeSeat.seatNumber,
            locked: false
        });
    });
    const guest = guestById(guestId);
    elements.search.value = guestName(guest);
    updateDialogControls();
    renderGuestOptions();
}

function clearActiveSeat() {
    if (!activeSeat) return;
    change(() => {
        state.assignments = state.assignments.filter((assignment) => !(
            assignment.tableId === activeSeat.tableId &&
            assignment.seatNumber === activeSeat.seatNumber
        ));
    });
    elements.search.value = "";
    updateDialogControls();
    renderGuestOptions();
}

function toggleActiveLock() {
    if (!activeSeat) return;
    change(() => {
        const assignment = assignmentAt(activeSeat.tableId, activeSeat.seatNumber);
        if (assignment) assignment.locked = !assignment.locked;
    });
    updateDialogControls();
    renderGuestOptions();
}

function undo() {
    if (!history.length) return;
    future.push(snapshot());
    restore(history.pop());
    revision += 1;
    render();
    scheduleSave();
}

function redo() {
    if (!future.length) return;
    history.push(snapshot());
    restore(future.pop());
    revision += 1;
    render();
    scheduleSave();
}

function shuffleGuests() {
    const attending = state.guests.filter((guest) => guest.rsvpStatus === "yes");
    if (!attending.length) {
        window.alert("No guests have RSVP’d yes to the wedding yet.");
        return;
    }
    if (!window.confirm("Shuffle every unlocked attending guest into the available seats? Locked guests will remain in place.")) return;
    change(() => {
        const locked = state.assignments.filter((assignment) => assignment.locked);
        const lockedGuestIds = new Set(locked.map((assignment) => assignment.guestId));
        const occupied = new Set(locked.map((assignment) => `${assignment.tableId}:${assignment.seatNumber}`));
        const seats = [...state.tables]
            .sort((a, b) => a.tableNumber - b.tableNumber)
            .flatMap((table) => Array.from({ length: table.seatCount }, (_, index) => ({
                tableId: table.id,
                seatNumber: index + 1
            })))
            .filter((seat) => !occupied.has(`${seat.tableId}:${seat.seatNumber}`));
        const guests = attending.filter((guest) => !lockedGuestIds.has(guest.id));
        for (let index = guests.length - 1; index > 0; index -= 1) {
            const randomIndex = Math.floor(Math.random() * (index + 1));
            [guests[index], guests[randomIndex]] = [guests[randomIndex], guests[index]];
        }
        if (guests.length > seats.length) {
            window.alert(`${guests.length - seats.length} attending guests could not be seated. Add another table and shuffle again.`);
        }
        state.assignments = [
            ...locked,
            ...guests.slice(0, seats.length).map((guest, index) => ({
                guestId: guest.id,
                tableId: seats[index].tableId,
                seatNumber: seats[index].seatNumber,
                locked: false
            }))
        ];
    });
}

function addTable() {
    if (state.tables.length >= 40) {
        window.alert("The seating chart supports up to 40 tables.");
        return;
    }
    const nextNumber = Math.max(0, ...state.tables.map((table) => table.tableNumber)) + 1;
    change(() => state.tables.push({
        id: `table-${crypto.randomUUID()}`,
        tableNumber: nextNumber,
        positionX: 50,
        positionY: 58,
        seatCount: 10,
        rotation: 0
    }));
}

function deleteTable(tableId) {
    const table = state.tables.find((item) => item.id === tableId);
    if (state.assignments.some((assignment) => assignment.tableId === tableId)) {
        window.alert(`Table ${table.tableNumber} must be empty before it can be removed.`);
        return;
    }
    if (state.tables.length === 1) {
        window.alert("The seating chart must contain at least one table.");
        return;
    }
    if (!window.confirm(`Remove empty Table ${table.tableNumber}? Its number will not be reused automatically.`)) return;
    change(() => {
        state.tables = state.tables.filter((item) => item.id !== tableId);
    });
}

function csvCell(value) {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function exportCsv() {
    const rows = [[
        "table_number", "guest_name", "guest_dietary_restrictions", "guest_dietary_other"
    ]];
    for (const table of [...state.tables].sort((a, b) => a.tableNumber - b.tableNumber)) {
        for (const assignment of state.assignments
            .filter((item) => item.tableId === table.id)
            .sort((a, b) => a.seatNumber - b.seatNumber)) {
            const guest = guestById(assignment.guestId);
            rows.push([
                table.tableNumber,
                guestName(guest),
                guest.dietaryRestrictions.join("; "),
                guest.dietaryOther
            ]);
        }
    }
    const blob = new Blob([
        `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\n")}`
    ], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "wedding-seating-chart.csv";
    link.click();
    URL.revokeObjectURL(link.href);
}

function startDrag(event, tableElement) {
    if (event.target.closest(".table-delete")) return;
    const tableId = tableElement.dataset.tableId;
    const table = state.tables.find((item) => item.id === tableId);
    const previous = snapshot();
    const roomRect = elements.ballroom.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const originX = table.positionX;
    const originY = table.positionY;
    let moved = false;
    const captureTarget = event.currentTarget;
    captureTarget.setPointerCapture(event.pointerId);

    const onMove = (moveEvent) => {
        const deltaX = ((moveEvent.clientX - startX) / roomRect.width) * 100;
        const deltaY = ((moveEvent.clientY - startY) / roomRect.height) * 100;
        table.positionX = Math.max(8, Math.min(92, originX + deltaX));
        table.positionY = Math.max(20, Math.min(92, originY + deltaY));
        tableElement.style.left = `${table.positionX}%`;
        tableElement.style.top = `${table.positionY}%`;
        moved ||= Math.abs(deltaX) > .1 || Math.abs(deltaY) > .1;
    };
    const onEnd = () => {
        captureTarget.removeEventListener("pointermove", onMove);
        captureTarget.removeEventListener("pointerup", onEnd);
        captureTarget.removeEventListener("pointercancel", onEnd);
        if (moved) registerChange(previous);
    };
    captureTarget.addEventListener("pointermove", onMove);
    captureTarget.addEventListener("pointerup", onEnd);
    captureTarget.addEventListener("pointercancel", onEnd);
}

async function loadSeating() {
    elements.loading.classList.remove("hidden");
    elements.error.classList.add("hidden");
    elements.content.classList.add("hidden");
    try {
        const response = await fetch("/api/admin/seating", { credentials: "same-origin" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load the seating chart.");
        state = result;
        history = [];
        future = [];
        revision = 0;
        elements.adminEmail.textContent = result.admin.email;
        setSaveStatus("Saved", "saved");
        render();
        elements.content.classList.remove("hidden");
    } catch (error) {
        elements.errorMessage.textContent = error.message;
        elements.error.classList.remove("hidden");
    } finally {
        elements.loading.classList.add("hidden");
    }
}

elements.tables.addEventListener("click", (event) => {
    const deleteButton = event.target.closest("[data-delete-table]");
    if (deleteButton) return deleteTable(deleteButton.dataset.deleteTable);
    const seat = event.target.closest(".seating-seat");
    if (seat) openSeatDialog(seat.dataset.tableId, Number(seat.dataset.seatNumber));
});
elements.tables.addEventListener("pointerdown", (event) => {
    const core = event.target.closest(".table-core");
    if (core) startDrag(event, core.closest(".seating-table"));
});
elements.options.addEventListener("click", (event) => {
    const option = event.target.closest("[data-guest-id]");
    if (option) assignGuest(Number(option.dataset.guestId));
});
elements.search.addEventListener("input", () => {
    if (!elements.search.value && activeSeat && assignmentAt(activeSeat.tableId, activeSeat.seatNumber)) {
        clearActiveSeat();
    } else {
        renderGuestOptions();
    }
});
elements.closeDialog.addEventListener("click", closeSeatDialog);
elements.dialog.addEventListener("cancel", () => { activeSeat = null; });
elements.clearSeat.addEventListener("click", clearActiveSeat);
elements.toggleLock.addEventListener("click", toggleActiveLock);
elements.undo.addEventListener("click", undo);
elements.redo.addEventListener("click", redo);
elements.shuffle.addEventListener("click", shuffleGuests);
elements.addTable.addEventListener("click", addTable);
elements.export.addEventListener("click", exportCsv);
elements.print.addEventListener("click", () => window.print());
elements.refresh.addEventListener("click", () => {
    if (elements.saveStatus.dataset.state !== "saved" &&
        !window.confirm("Reload the last saved seating chart and discard unsaved changes?")) return;
    loadSeating();
});

loadSeating();
