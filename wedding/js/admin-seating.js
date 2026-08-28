const elements = {
    loading: document.querySelector("#admin-loading"),
    error: document.querySelector("#admin-error"),
    errorMessage: document.querySelector("#admin-error-message"),
    content: document.querySelector("#seating-content"),
    adminEmail: document.querySelector("#admin-email"),
    refresh: document.querySelector("#refresh-seating"),
    tables: document.querySelector("#seating-tables"),
    fixtures: document.querySelector("#seating-fixtures"),
    ballroom: document.querySelector("#ballroom"),
    seatedCount: document.querySelector("#seated-count"),
    unseatedCount: document.querySelector("#unseated-count"),
    saveStatus: document.querySelector("#save-status"),
    undo: document.querySelector("#undo-seating"),
    redo: document.querySelector("#redo-seating"),
    shuffle: document.querySelector("#shuffle-seating"),
    randomShuffle: document.querySelector("#random-shuffle-seating"),
    compatibilityScore: document.querySelector("#compatibility-score"),
    clearUnlocked: document.querySelector("#clear-unlocked-seating"),
    clearAll: document.querySelector("#clear-all-seating"),
    addTable: document.querySelector("#add-seating-table"),
    export: document.querySelector("#export-seating"),
    print: document.querySelector("#print-seating"),
    printList: document.querySelector("#seating-print-list"),
    workspace: document.querySelector("#seating-workspace"),
    unseatedPanel: document.querySelector("#unseated-panel"),
    unseatedList: document.querySelector("#unseated-list"),
    unseatedPanelCount: document.querySelector("#unseated-panel-count"),
    collapseUnseated: document.querySelector("#collapse-unseated"),
    unseatedResize: document.querySelector("#unseated-resize"),
    dialog: document.querySelector("#seat-dialog"),
    dialogLabel: document.querySelector("#seat-dialog-label"),
    closeDialog: document.querySelector("#close-seat-dialog"),
    search: document.querySelector("#seat-guest-search"),
    options: document.querySelector("#seat-guest-options"),
    clearSeat: document.querySelector("#clear-seat"),
    toggleLock: document.querySelector("#toggle-seat-lock"),
    confirmSeat: document.querySelector("#confirm-seat"),
    selectionMenu: document.querySelector("#selection-menu")
};

let state = null;
let activeSeat = null;
let history = [];
let future = [];
let revision = 0;
let saveTimer = null;
let saving = false;
let selectedGuestIds = new Set();
let suppressSeatClick = false;
let activeDropTarget = null;

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
        assignments: state.assignments,
        fixtures: state.fixtures
    });
}

function restore(serialized) {
    const value = JSON.parse(serialized);
    state.tables = value.tables;
    state.assignments = value.assignments;
    state.fixtures = value.fixtures;
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

function isEligibleGuest(guest) {
    return guest?.rsvpStatus === "yes" || guest?.rsvpStatus === "pending";
}

function assignmentForGuest(guestId) {
    return state.assignments.find((assignment) => assignment.guestId === guestId) ?? null;
}

function isGuestLocked(guestId) {
    return assignmentForGuest(guestId)?.locked === true;
}

const COMPATIBILITY_WEIGHTS = Object.freeze({
    generationMatch: 55,
    generationMismatch: -35,
    socialGroupMatch: 35,
    sameCoupleSide: 12,
    matchingGroupAcrossSides: 10,
    relationshipTypeMatch: 7,
    familySideMatch: 6,
    householdMatch: 8
});

function socialGroupParts(group) {
    const match = String(group ?? "").match(/^([QS])_(.+)$/);
    return match ? { side: match[1], group: match[2] } : null;
}

function compatibilityBetween(left, right) {
    let score = 0;
    if (left.generation && right.generation) {
        score += left.generation === right.generation
            ? COMPATIBILITY_WEIGHTS.generationMatch
            : COMPATIBILITY_WEIGHTS.generationMismatch;
    }

    const leftGroup = socialGroupParts(left.socialGroup);
    const rightGroup = socialGroupParts(right.socialGroup);
    if (left.socialGroup && left.socialGroup === right.socialGroup) {
        score += COMPATIBILITY_WEIGHTS.socialGroupMatch;
    } else if (leftGroup && rightGroup) {
        if (leftGroup.side === rightGroup.side) {
            score += COMPATIBILITY_WEIGHTS.sameCoupleSide;
        } else if (leftGroup.group === rightGroup.group) {
            score += COMPATIBILITY_WEIGHTS.matchingGroupAcrossSides;
        }
    }

    const leftClassifications = left.classifications ?? {};
    const rightClassifications = right.classifications ?? {};
    if (leftClassifications.relationshipType &&
        leftClassifications.relationshipType === rightClassifications.relationshipType) {
        score += COMPATIBILITY_WEIGHTS.relationshipTypeMatch;
    }
    if (leftClassifications.familySide &&
        leftClassifications.familySide === rightClassifications.familySide) {
        score += COMPATIBILITY_WEIGHTS.familySideMatch;
    }
    if (leftClassifications.coupleSide &&
        leftClassifications.coupleSide === rightClassifications.coupleSide) {
        score += COMPATIBILITY_WEIGHTS.sameCoupleSide / 3;
    }
    if (left.householdId && left.householdId === right.householdId) {
        score += COMPATIBILITY_WEIGHTS.householdMatch;
    }
    return Math.max(0, Math.min(100, score));
}

function compatibilityForAssignments(assignments) {
    const guestsByTable = new Map();
    for (const assignment of assignments) {
        const guest = guestById(assignment.guestId);
        if (!guest) continue;
        const guests = guestsByTable.get(assignment.tableId) ?? [];
        guests.push(guest);
        guestsByTable.set(assignment.tableId, guests);
    }
    let total = 0;
    let pairs = 0;
    for (const guests of guestsByTable.values()) {
        for (let left = 0; left < guests.length; left += 1) {
            for (let right = left + 1; right < guests.length; right += 1) {
                total += compatibilityBetween(guests[left], guests[right]);
                pairs += 1;
            }
        }
    }
    return pairs ? Math.round(total / pairs) : null;
}

function scoreLabel(score) {
    if (score === null) return "Compatibility —";
    if (score >= 80) return `Compatibility ${score} · Excellent`;
    if (score >= 65) return `Compatibility ${score} · Strong`;
    if (score >= 50) return `Compatibility ${score} · Mixed`;
    return `Compatibility ${score} · Low`;
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
                    <button class="seating-seat seat-status-${status} ${guest ? "selectable-guest" : "seating-seat-empty"} ${guest && selectedGuestIds.has(guest.id) ? "is-selected" : ""}"
                        type="button" data-table-id="${escapeAttribute(table.id)}" data-seat-number="${seatNumber}"
                        ${guest ? `data-guest-id="${guest.id}"` : ""}
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

function renderFixtures() {
    elements.fixtures.innerHTML = state.fixtures.map((fixture) => `
        <div class="ballroom-fixture" data-fixture-id="${escapeAttribute(fixture.id)}"
            style="left:${fixture.positionX}%;top:${fixture.positionY}%;width:${fixture.width}%;height:${fixture.height}%"
            role="button" tabindex="0" aria-label="Drag ${escapeAttribute(fixture.label)}">
            ${escapeHtml(fixture.label)}
        </div>`).join("");
}

function renderUnseatedGuests() {
    const seatedIds = new Set(state.assignments.map((assignment) => assignment.guestId));
    const guests = state.guests
        .filter((guest) => isEligibleGuest(guest) && !seatedIds.has(guest.id))
        .sort((left, right) =>
            compareText(left.householdName, right.householdName) ||
            compareText(left.lastName, right.lastName) ||
            compareText(left.firstName, right.firstName)
        );
    elements.unseatedPanelCount.textContent = `${guests.length} ${guests.length === 1 ? "guest" : "guests"}`;
    elements.unseatedList.innerHTML = guests.length
        ? guests.map((guest) => `
            <button class="unseated-guest selectable-guest ${selectedGuestIds.has(guest.id) ? "is-selected" : ""}"
                type="button" data-guest-id="${guest.id}" title="${escapeAttribute(`${guestName(guest)} · ${guest.householdName} · ${statusLabel(guest.rsvpStatus)}`)}">
                <span class="unseated-guest-status status-${guest.rsvpStatus}" aria-hidden="true"></span>
                <span class="unseated-guest-name">${escapeHtml(guestName(guest))}</span>
                <span class="unseated-guest-household">${escapeHtml(guest.householdName)}</span>
            </button>`).join("")
        : '<p class="unseated-empty">Every attending or undecided guest has a seat.</p>';
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
    const eligibleUnseated = state.guests.filter((guest) =>
        isEligibleGuest(guest) && !seatedIds.has(guest.id)
    );
    elements.seatedCount.textContent = `${state.assignments.length} seated`;
    elements.unseatedCount.textContent = `${eligibleUnseated.length} eligible unseated`;
    elements.compatibilityScore.textContent = scoreLabel(
        compatibilityForAssignments(state.assignments)
    );
    elements.undo.disabled = history.length === 0;
    elements.redo.disabled = future.length === 0;
}

function render() {
    renderFixtures();
    renderTables();
    renderUnseatedGuests();
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
                assignments: state.assignments,
                fixtures: state.fixtures
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

function availableShuffleData(eligibleGuests) {
    const locked = state.assignments.filter((assignment) => assignment.locked);
    const lockedGuestIds = new Set(locked.map((assignment) => assignment.guestId));
    const occupied = new Set(locked.map((assignment) =>
        `${assignment.tableId}:${assignment.seatNumber}`
    ));
    const seats = [...state.tables]
        .sort((a, b) => a.tableNumber - b.tableNumber)
        .flatMap((table) => Array.from({ length: table.seatCount }, (_, index) => ({
            tableId: table.id,
            seatNumber: index + 1
        })))
        .filter((seat) => !occupied.has(`${seat.tableId}:${seat.seatNumber}`));
    return {
        locked,
        seats,
        guests: eligibleGuests.filter((guest) => !lockedGuestIds.has(guest.id))
    };
}

function shuffled(items) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
    }
    return result;
}

function buildSmartCandidate(locked, seats, guests) {
    const openSeatsByTable = new Map();
    for (const seat of seats) {
        const openSeats = openSeatsByTable.get(seat.tableId) ?? [];
        openSeats.push(seat);
        openSeatsByTable.set(seat.tableId, openSeats);
    }
    const guestsByTable = new Map(state.tables.map((table) => [table.id, []]));
    for (const assignment of locked) {
        const guest = guestById(assignment.guestId);
        if (guest) guestsByTable.get(assignment.tableId)?.push(guest);
    }

    const groupCounts = new Map();
    for (const guest of guests) {
        if (guest.socialGroup) {
            groupCounts.set(guest.socialGroup, (groupCounts.get(guest.socialGroup) ?? 0) + 1);
        }
    }
    const orderedGuests = shuffled(guests).sort((left, right) =>
        (groupCounts.get(right.socialGroup) ?? 0) - (groupCounts.get(left.socialGroup) ?? 0)
    );
    const assignments = [...locked];
    for (const guest of orderedGuests) {
        const choices = [...openSeatsByTable.entries()]
            .filter(([, openSeats]) => openSeats.length)
            .map(([tableId, openSeats]) => {
                const tableGuests = guestsByTable.get(tableId) ?? [];
                const compatibility = tableGuests.length
                    ? tableGuests.reduce((sum, seated) =>
                        sum + compatibilityBetween(guest, seated), 0) / tableGuests.length
                    : 32;
                return { tableId, openSeats, score: compatibility + Math.random() * 5 };
            })
            .sort((left, right) => right.score - left.score);
        if (!choices.length) break;
        const choice = choices[0];
        const seat = choice.openSeats.shift();
        guestsByTable.get(choice.tableId)?.push(guest);
        assignments.push({
            guestId: guest.id,
            tableId: choice.tableId,
            seatNumber: seat.seatNumber,
            locked: false
        });
    }
    return assignments;
}

function smartShuffleGuests() {
    const eligibleGuests = state.guests.filter((guest) =>
        guest.rsvpStatus === "yes" || guest.rsvpStatus === "pending"
    );
    if (!eligibleGuests.length) {
        window.alert("There are no attending or not-yet-responded guests to shuffle.");
        return;
    }
    if (!window.confirm("Smart shuffle every unlocked attending and not-yet-responded guest? Generation and social groups will be prioritized, while locked guests remain in place.")) return;
    change(() => {
        const { locked, seats, guests } = availableShuffleData(eligibleGuests);
        if (guests.length > seats.length) {
            window.alert(`${guests.length - seats.length} eligible guests could not be seated. Add another table and shuffle again.`);
        }
        let bestAssignments = locked;
        let bestScore = -1;
        const guestsToSeat = guests.slice(0, seats.length);
        for (let attempt = 0; attempt < 300; attempt += 1) {
            const candidate = buildSmartCandidate(locked, seats, guestsToSeat);
            const score = compatibilityForAssignments(candidate) ?? 0;
            if (score > bestScore) {
                bestScore = score;
                bestAssignments = candidate;
            }
        }
        state.assignments = bestAssignments;
    });
}

function randomShuffleGuests() {
    const eligibleGuests = state.guests.filter((guest) => isEligibleGuest(guest));
    if (!eligibleGuests.length) {
        window.alert("There are no attending or not-yet-responded guests to shuffle.");
        return;
    }
    if (!window.confirm("Randomly shuffle every unlocked eligible guest? Locked guests will remain in place.")) return;
    change(() => {
        const { locked, seats, guests } = availableShuffleData(eligibleGuests);
        if (guests.length > seats.length) {
            window.alert(`${guests.length - seats.length} eligible guests could not be seated. Add another table and shuffle again.`);
        }
        state.assignments = [
            ...locked,
            ...shuffled(guests).slice(0, seats.length).map((guest, index) => ({
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

function syncSelectionClasses() {
    document.querySelectorAll(".selectable-guest").forEach((element) => {
        element.classList.toggle(
            "is-selected",
            selectedGuestIds.has(Number(element.dataset.guestId))
        );
    });
}

function moveGuestsToSeat(guestIds, tableId, seatNumber) {
    const guestId = guestIds[0];
    const source = assignmentForGuest(guestId);
    const target = assignmentAt(tableId, seatNumber);
    if (source?.locked) return false;
    if (target?.locked && target.guestId !== guestId) {
        window.alert("That seat is locked. Unlock its guest before replacing them.");
        return false;
    }
    if (source?.tableId === tableId && source.seatNumber === seatNumber) return false;
    change(() => {
        state.assignments = state.assignments.filter((assignment) =>
            assignment.guestId !== guestId && assignment.guestId !== target?.guestId
        );
        state.assignments.push({ guestId, tableId, seatNumber, locked: false });
        if (source && target) {
            state.assignments.push({
                guestId: target.guestId,
                tableId: source.tableId,
                seatNumber: source.seatNumber,
                locked: false
            });
        }
    });
    return true;
}

function moveGuestsToTable(guestIds, tableId) {
    const table = state.tables.find((item) => item.id === tableId);
    if (!table) return false;
    const uniqueGuestIds = [...new Set(guestIds)].filter((guestId) => !isGuestLocked(guestId));
    const selectedSet = new Set(uniqueGuestIds);
    const assignmentsWithoutSelected = state.assignments.filter((assignment) =>
        !selectedSet.has(assignment.guestId)
    );
    const destination = assignmentsWithoutSelected.filter((assignment) => assignment.tableId === tableId);
    const lockedSeatCount = destination.filter((assignment) => assignment.locked).length;
    if (uniqueGuestIds.length > table.seatCount - lockedSeatCount) {
        window.alert(`Table ${table.tableNumber} does not have enough unlocked seats for this group.`);
        return false;
    }

    const occupiedSeats = new Set(destination.map((assignment) => assignment.seatNumber));
    const openSeats = Array.from({ length: table.seatCount }, (_, index) => index + 1)
        .filter((seatNumber) => !occupiedSeats.has(seatNumber));
    const displacementCount = Math.max(0, uniqueGuestIds.length - openSeats.length);
    const displacedIds = new Set(
        destination
            .filter((assignment) => !assignment.locked)
            .sort((left, right) => right.seatNumber - left.seatNumber)
            .slice(0, displacementCount)
            .map((assignment) => assignment.guestId)
    );

    change(() => {
        state.assignments = assignmentsWithoutSelected.filter((assignment) =>
            !displacedIds.has(assignment.guestId)
        );
        const nowOccupied = new Set(
            state.assignments
                .filter((assignment) => assignment.tableId === tableId)
                .map((assignment) => assignment.seatNumber)
        );
        const availableSeats = Array.from({ length: table.seatCount }, (_, index) => index + 1)
            .filter((candidate) => !nowOccupied.has(candidate));
        uniqueGuestIds.forEach((guestId, index) => {
            state.assignments.push({
                guestId,
                tableId,
                seatNumber: availableSeats[index],
                locked: false
            });
        });
    });
    return true;
}

function moveGuestsToUnseated(guestIds) {
    const movableIds = new Set(guestIds.filter((guestId) => !isGuestLocked(guestId)));
    if (!movableIds.size) return false;
    change(() => {
        state.assignments = state.assignments.filter((assignment) =>
            !movableIds.has(assignment.guestId)
        );
    });
    return true;
}

function clearUnlockedSeats() {
    const count = state.assignments.filter((assignment) => !assignment.locked).length;
    if (!count) {
        window.alert("There are no unlocked assignments to clear.");
        return;
    }
    if (!window.confirm(`Clear ${count} unlocked seat ${count === 1 ? "assignment" : "assignments"}?`)) return;
    change(() => {
        state.assignments = state.assignments.filter((assignment) => assignment.locked);
    });
    selectedGuestIds.clear();
    syncSelectionClasses();
}

function clearAllSeats() {
    if (!state.assignments.length) {
        window.alert("The seating chart is already empty.");
        return;
    }
    if (!window.confirm(`Clear all ${state.assignments.length} seat assignments, including locked guests?`)) return;
    change(() => { state.assignments = []; });
    selectedGuestIds.clear();
    syncSelectionClasses();
}

function applySelectionAction(action) {
    const selected = new Set(selectedGuestIds);
    if (!selected.size) return;
    if (action === "clear" && !window.confirm(`Clear ${selected.size} selected guests from their seats?`)) return;
    change(() => {
        if (action === "clear") {
            state.assignments = state.assignments.filter((assignment) => !selected.has(assignment.guestId));
            return;
        }
        state.assignments.forEach((assignment) => {
            if (selected.has(assignment.guestId)) assignment.locked = action === "lock";
        });
    });
    selectedGuestIds.clear();
    syncSelectionClasses();
    hideSelectionMenu();
}

function showSelectionMenu(event) {
    const guestElement = event.target.closest(".selectable-guest");
    if (!guestElement) return;
    event.preventDefault();
    const guestId = Number(guestElement.dataset.guestId);
    if (!selectedGuestIds.has(guestId)) selectedGuestIds = new Set([guestId]);
    syncSelectionClasses();
    elements.selectionMenu.classList.remove("hidden");
    const menuRect = elements.selectionMenu.getBoundingClientRect();
    elements.selectionMenu.style.left = `${Math.min(event.clientX, window.innerWidth - menuRect.width - 8)}px`;
    elements.selectionMenu.style.top = `${Math.min(event.clientY, window.innerHeight - menuRect.height - 8)}px`;
    elements.selectionMenu.querySelector("button")?.focus();
}

function hideSelectionMenu() {
    elements.selectionMenu.classList.add("hidden");
}

function clearDropTarget() {
    activeDropTarget?.classList.remove("guest-drop-target", "guest-drop-invalid");
    activeDropTarget = null;
}

function setDropTarget(element, invalid = false) {
    if (activeDropTarget === element) {
        activeDropTarget?.classList.toggle("guest-drop-invalid", invalid);
        return;
    }
    clearDropTarget();
    activeDropTarget = element;
    activeDropTarget?.classList.add("guest-drop-target");
    activeDropTarget?.classList.toggle("guest-drop-invalid", invalid);
}

function dragDestinationAt(clientX, clientY, guestCount) {
    const target = document.elementFromPoint(clientX, clientY);
    const seat = target?.closest(".seating-seat");
    const table = target?.closest(".seating-table");
    const panel = target?.closest("#unseated-panel");
    if (guestCount === 1 && seat) return { type: "seat", element: seat };
    if (table) return { type: "table", element: table };
    if (panel) return { type: "unseated", element: elements.unseatedPanel };
    return null;
}

function startGuestDrag(event, sourceElement) {
    if (event.button !== 0) return;
    const guestId = Number(sourceElement.dataset.guestId);
    if (!guestId) return;
    if (event.altKey) {
        event.preventDefault();
        if (selectedGuestIds.has(guestId)) selectedGuestIds.delete(guestId);
        else selectedGuestIds.add(guestId);
        syncSelectionClasses();
        suppressSeatClick = true;
        window.setTimeout(() => { suppressSeatClick = false; }, 0);
        return;
    }
    if (isGuestLocked(guestId)) return;
    if (!selectedGuestIds.has(guestId)) {
        selectedGuestIds = new Set([guestId]);
        syncSelectionClasses();
    }
    const draggedIds = [...selectedGuestIds].filter((id) => !isGuestLocked(id));
    const startX = event.clientX;
    const startY = event.clientY;
    let dragging = false;
    let preview = null;
    sourceElement.setPointerCapture(event.pointerId);

    const onMove = (moveEvent) => {
        if (!dragging && Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) < 5) return;
        if (!dragging) {
            dragging = true;
            preview = document.createElement("div");
            preview.className = "guest-drag-preview";
            preview.textContent = draggedIds.length === 1
                ? guestName(guestById(draggedIds[0]))
                : `${draggedIds.length} guests`;
            document.body.append(preview);
        }
        preview.style.left = `${moveEvent.clientX}px`;
        preview.style.top = `${moveEvent.clientY}px`;
        const destination = dragDestinationAt(moveEvent.clientX, moveEvent.clientY, draggedIds.length);
        setDropTarget(destination?.element ?? null);
    };
    const onEnd = (upEvent) => {
        sourceElement.removeEventListener("pointermove", onMove);
        sourceElement.removeEventListener("pointerup", onEnd);
        sourceElement.removeEventListener("pointercancel", onEnd);
        preview?.remove();
        clearDropTarget();
        if (!dragging) return;
        const destination = dragDestinationAt(upEvent.clientX, upEvent.clientY, draggedIds.length);
        if (destination?.type === "seat") {
            moveGuestsToSeat(
                draggedIds,
                destination.element.dataset.tableId,
                Number(destination.element.dataset.seatNumber)
            );
        } else if (destination?.type === "table") {
            moveGuestsToTable(draggedIds, destination.element.dataset.tableId);
        } else if (destination?.type === "unseated") {
            moveGuestsToUnseated(draggedIds);
        }
        selectedGuestIds.clear();
        syncSelectionClasses();
        suppressSeatClick = true;
        window.setTimeout(() => { suppressSeatClick = false; }, 0);
    };
    sourceElement.addEventListener("pointermove", onMove);
    sourceElement.addEventListener("pointerup", onEnd);
    sourceElement.addEventListener("pointercancel", onEnd);
}

function startBoxSelection(event) {
    if (event.button !== 0 || event.target.closest(".selectable-guest, .table-core, .ballroom-fixture")) return;
    const insideSelectionArea = event.target.closest("#ballroom, #unseated-list");
    if (!insideSelectionArea) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const startingSelection = event.altKey ? new Set(selectedGuestIds) : new Set();
    if (!event.altKey) {
        selectedGuestIds.clear();
        syncSelectionClasses();
    }
    let box = null;

    const onMove = (moveEvent) => {
        if (!box && Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) < 4) return;
        if (!box) {
            box = document.createElement("div");
            box.className = "guest-selection-box";
            document.body.append(box);
        }
        const left = Math.min(startX, moveEvent.clientX);
        const top = Math.min(startY, moveEvent.clientY);
        const right = Math.max(startX, moveEvent.clientX);
        const bottom = Math.max(startY, moveEvent.clientY);
        box.style.left = `${left}px`;
        box.style.top = `${top}px`;
        box.style.width = `${right - left}px`;
        box.style.height = `${bottom - top}px`;
        selectedGuestIds = new Set(startingSelection);
        document.querySelectorAll(".selectable-guest").forEach((candidate) => {
            const guestId = Number(candidate.dataset.guestId);
            const rect = candidate.getBoundingClientRect();
            if (rect.right >= left && rect.left <= right &&
                rect.bottom >= top && rect.top <= bottom) {
                selectedGuestIds.add(guestId);
            }
        });
        syncSelectionClasses();
    };
    const onEnd = () => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onEnd);
        document.removeEventListener("pointercancel", onEnd);
        box?.remove();
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onEnd);
    document.addEventListener("pointercancel", onEnd);
}

function startFixtureDrag(event, fixtureElement) {
    if (event.button !== 0) return;
    const fixture = state.fixtures.find((item) => item.id === fixtureElement.dataset.fixtureId);
    if (!fixture) return;
    const previous = snapshot();
    const roomRect = elements.ballroom.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const originX = fixture.positionX;
    const originY = fixture.positionY;
    let moved = false;
    fixtureElement.setPointerCapture(event.pointerId);
    const onMove = (moveEvent) => {
        const deltaX = ((moveEvent.clientX - startX) / roomRect.width) * 100;
        const deltaY = ((moveEvent.clientY - startY) / roomRect.height) * 100;
        fixture.positionX = Math.max(fixture.width / 2, Math.min(100 - fixture.width / 2, originX + deltaX));
        fixture.positionY = Math.max(fixture.height / 2, Math.min(100 - fixture.height / 2, originY + deltaY));
        fixtureElement.style.left = `${fixture.positionX}%`;
        fixtureElement.style.top = `${fixture.positionY}%`;
        moved ||= Math.abs(deltaX) > .1 || Math.abs(deltaY) > .1;
    };
    const onEnd = () => {
        fixtureElement.removeEventListener("pointermove", onMove);
        fixtureElement.removeEventListener("pointerup", onEnd);
        fixtureElement.removeEventListener("pointercancel", onEnd);
        if (moved) registerChange(previous);
    };
    fixtureElement.addEventListener("pointermove", onMove);
    fixtureElement.addEventListener("pointerup", onEnd);
    fixtureElement.addEventListener("pointercancel", onEnd);
}

function toggleUnseatedPanel() {
    const collapsed = elements.workspace.classList.toggle("is-panel-collapsed");
    elements.collapseUnseated.setAttribute("aria-expanded", String(!collapsed));
    elements.collapseUnseated.setAttribute("aria-label", collapsed ? "Expand unseated guests" : "Collapse unseated guests");
    localStorage.setItem("wedding-seating-panel-collapsed", String(collapsed));
}

function startPanelResize(event) {
    if (event.button !== 0 || elements.workspace.classList.contains("is-panel-collapsed")) return;
    const startX = event.clientX;
    const startWidth = elements.unseatedPanel.getBoundingClientRect().width;
    elements.unseatedResize.setPointerCapture(event.pointerId);
    const onMove = (moveEvent) => {
        const width = Math.max(230, Math.min(520, startWidth + moveEvent.clientX - startX));
        elements.workspace.style.setProperty("--unseated-width", `${width}px`);
    };
    const onEnd = () => {
        elements.unseatedResize.removeEventListener("pointermove", onMove);
        elements.unseatedResize.removeEventListener("pointerup", onEnd);
        elements.unseatedResize.removeEventListener("pointercancel", onEnd);
        const width = Math.round(elements.unseatedPanel.getBoundingClientRect().width);
        localStorage.setItem("wedding-seating-panel-width", String(width));
    };
    elements.unseatedResize.addEventListener("pointermove", onMove);
    elements.unseatedResize.addEventListener("pointerup", onEnd);
    elements.unseatedResize.addEventListener("pointercancel", onEnd);
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
    if (suppressSeatClick) return;
    const deleteButton = event.target.closest("[data-delete-table]");
    if (deleteButton) return deleteTable(deleteButton.dataset.deleteTable);
    const seat = event.target.closest(".seating-seat");
    if (seat) openSeatDialog(seat.dataset.tableId, Number(seat.dataset.seatNumber));
});
elements.tables.addEventListener("pointerdown", (event) => {
    const guest = event.target.closest(".seating-seat[data-guest-id]");
    if (guest) return startGuestDrag(event, guest);
    const core = event.target.closest(".table-core");
    if (core) startDrag(event, core.closest(".seating-table"));
});
elements.fixtures.addEventListener("pointerdown", (event) => {
    const fixture = event.target.closest(".ballroom-fixture");
    if (fixture) startFixtureDrag(event, fixture);
});
elements.unseatedList.addEventListener("pointerdown", (event) => {
    const guest = event.target.closest(".unseated-guest[data-guest-id]");
    if (guest) startGuestDrag(event, guest);
});
elements.ballroom.addEventListener("pointerdown", startBoxSelection);
elements.unseatedList.addEventListener("pointerdown", startBoxSelection);
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
elements.dialog.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.target.closest("button")) {
        event.preventDefault();
        closeSeatDialog();
    }
});
elements.clearSeat.addEventListener("click", clearActiveSeat);
elements.toggleLock.addEventListener("click", toggleActiveLock);
elements.confirmSeat.addEventListener("click", closeSeatDialog);
elements.undo.addEventListener("click", undo);
elements.redo.addEventListener("click", redo);
elements.shuffle.addEventListener("click", smartShuffleGuests);
elements.randomShuffle.addEventListener("click", randomShuffleGuests);
elements.clearUnlocked.addEventListener("click", clearUnlockedSeats);
elements.clearAll.addEventListener("click", clearAllSeats);
elements.addTable.addEventListener("click", addTable);
elements.export.addEventListener("click", exportCsv);
elements.print.addEventListener("click", () => window.print());
elements.collapseUnseated.addEventListener("click", toggleUnseatedPanel);
elements.unseatedResize.addEventListener("pointerdown", startPanelResize);
document.addEventListener("contextmenu", showSelectionMenu);
elements.selectionMenu.addEventListener("click", (event) => {
    const action = event.target.closest("[data-selection-action]")?.dataset.selectionAction;
    if (action) applySelectionAction(action);
});
document.addEventListener("pointerdown", (event) => {
    if (!event.target.closest("#selection-menu")) hideSelectionMenu();
});
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideSelectionMenu();
});
elements.refresh.addEventListener("click", () => {
    if (elements.saveStatus.dataset.state !== "saved" &&
        !window.confirm("Reload the last saved seating chart and discard unsaved changes?")) return;
    loadSeating();
});

const savedPanelWidth = Number(localStorage.getItem("wedding-seating-panel-width"));
if (Number.isFinite(savedPanelWidth) && savedPanelWidth >= 230 && savedPanelWidth <= 520) {
    elements.workspace.style.setProperty("--unseated-width", `${savedPanelWidth}px`);
}
if (localStorage.getItem("wedding-seating-panel-collapsed") === "true") {
    elements.workspace.classList.add("is-panel-collapsed");
    elements.collapseUnseated.setAttribute("aria-expanded", "false");
    elements.collapseUnseated.setAttribute("aria-label", "Expand unseated guests");
}

loadSeating();
