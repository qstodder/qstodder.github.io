const registryMethods = {
    venmo: {
        name: "Venmo",
        logo: '<span class="payment-logo venmo" aria-hidden="true">V</span>',
        copy: () => `
            <p>You’ll be taken to Quiana’s Venmo profile at <strong>@quiana-stodder</strong>.</p>
            <p>Please indicate which fund you’re contributing to!</p>
        `,
        action: '<a class="dialog-action" href="https://venmo.com/u/quiana-stodder" target="_blank" rel="noopener noreferrer">Continue to Venmo</a>'
    },
    zelle: {
        name: "Zelle",
        logo: '<span class="payment-logo zelle" aria-hidden="true">Z</span>',
        copy: () => `
            <p>Open Zelle through your bank’s website or mobile app and choose <strong>Send money</strong>.</p>
            <p>Send your gift to <strong>Quiana at 808-214-7336</strong>. Please confirm the recipient name shown by your bank before completing the transfer.</p>
            <p>Please indicate which fund you're contributing to!</p>
        `,
        action: ""
    }
};

const registryButtonMarkup = Object.entries(registryMethods).map(([key, method]) => `
    <button class="payment-button" type="button" data-method="${key}" aria-label="${method.name} payment information">
        ${method.logo}
    </button>
`).join("");

function closeRegistryDialog() {
    document.getElementById("payment-dialog")?.close();
}

function openRegistryDialog(button) {
    const card = button.closest(".fund-card");
    const method = registryMethods[button.dataset.method];
    const dialog = document.getElementById("payment-dialog");
    if (!card || !method || !dialog) return;

    document.getElementById("payment-dialog-fund").textContent = card.dataset.fundName;
    document.getElementById("payment-dialog-title").textContent = method.name;
    document.getElementById("payment-dialog-icon").innerHTML = method.logo;
    document.getElementById("payment-dialog-copy").innerHTML = method.copy();
    document.getElementById("payment-dialog-actions").innerHTML =
        `${method.action}<button class="dialog-action secondary" type="button" data-close-dialog>Close</button>`;
    dialog.showModal();
}

window.initializeRegistryPage = function initializeRegistryPage() {
    document.querySelectorAll(".payment-options").forEach((container) => {
        container.innerHTML = registryButtonMarkup;
    });
};

if (!window.registryNavigationBound) {
    window.registryNavigationBound = true;
    document.addEventListener("click", (event) => {
        const paymentButton = event.target.closest(".payment-button");
        if (paymentButton) openRegistryDialog(paymentButton);
        if (event.target.closest(".dialog-close, [data-close-dialog]")) {
            closeRegistryDialog();
        }
        if (event.target.id === "payment-dialog") closeRegistryDialog();
    });
}

window.initializeRegistryPage();
