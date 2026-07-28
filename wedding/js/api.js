const API_BASE =
    "http://localhost:8787";

export async function searchGuests(search) {

    const response =
        await fetch(
            `${API_BASE}/api/guests?search=${encodeURIComponent(search)}`
        );

    if (!response.ok) {
        throw new Error("Failed to search guests.");
    }

    return await response.json();
}

export async function getHousehold(householdId) {

    const response =
        await fetch(
            `${API_BASE}/api/household/${householdId}`
        );

    if (!response.ok) {
        throw new Error("Failed to load household.");
    }

    return await response.json();
}

export async function submitRSVP(data) {

    const response =
        await fetch(
            `${API_BASE}/api/rsvp`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            }
        );

    if (!response.ok) {
        throw new Error("Failed to save RSVP.");
    }

    return await response.json();
}

export async function getRsvp(householdId) {

    const response =
        await fetch(
            `${API_BASE}/api/rsvp/${householdId}`
        );

    const result =
        await response.json();

    if (!response.ok) {

        throw new Error(
            result.error ||
            "Failed to load RSVP."
        );
    }

    return result;
}