const paymentOptions = document.querySelectorAll(".payment-options");
const dialog = document.getElementById("payment-dialog");
const dialogTitle = document.getElementById("payment-dialog-title");
const dialogFund = document.getElementById("payment-dialog-fund");
const dialogCopy = document.getElementById("payment-dialog-copy");
const dialogIcon = document.getElementById("payment-dialog-icon");
const dialogActions = document.getElementById("payment-dialog-actions");

const methods = {
    venmo: {
        name: "Venmo",
        logo: '<span class="payment-logo venmo" aria-hidden="true">V</span>',
        copy: ({ emoji }) => `
            <p>You’ll be taken to Quiana’s Venmo profile at <strong>@quiana-stodder</strong>.</p>
            <p>Please include a ${emoji} emoji in your payment message so we know which fund you’re contributing to.</p>
        `,
        action: '<a class="dialog-action" href="https://venmo.com/u/quiana-stodder" target="_blank" rel="noopener noreferrer">Continue to Venmo</a>'
    },
    zelle: {
        name: "Zelle",
        logo: '<span class="payment-logo zelle" aria-hidden="true">Z</span>',
        copy: () => `
            <p>Open Zelle through your bank’s website or mobile app and choose <strong>Send money</strong>.</p>
            <p>Send your gift to <strong>Quiana at 808-214-7336</strong>. Please confirm the recipient name shown by your bank before completing the transfer.</p>
        `,
        action: ""
    },
    card: {
        name: "Bank, Debit or Credit",
        logo: '<span class="payment-logo card" aria-hidden="true"></span>',
        copy: () => `
            <p>You’ll be taken to our registry on The Knot, where you can contribute by bank account, debit card, or credit card.</p>
            <p><strong>A processing fee will apply.</strong> Our Knot registry link is coming soon.</p>
        `,
        action: ""
    }
};

const buttonMarkup = Object.entries(methods).map(([key, method]) => `
    <button class="payment-button" type="button" data-method="${key}" aria-label="${method.name} payment information">
        ${method.logo}
    </button>
`).join("");

for (const container of paymentOptions) {
    container.innerHTML = buttonMarkup;
}

function closeDialog() {
    dialog.close();
}

function openDialog(button) {
    const card = button.closest(".fund-card");
    const method = methods[button.dataset.method];
    const fund = {
        name: card.dataset.fundName,
        emoji: card.dataset.emoji
    };

    dialogFund.textContent = fund.name;
    dialogTitle.textContent = method.name;
    dialogIcon.innerHTML = method.logo;
    dialogCopy.innerHTML = method.copy(fund);
    dialogActions.innerHTML = `${method.action}<button class="dialog-action secondary" type="button" data-close-dialog>Close</button>`;
    dialog.showModal();
}

document.addEventListener("click", (event) => {
    const paymentButton = event.target.closest(".payment-button");
    if (paymentButton) openDialog(paymentButton);
    if (event.target.closest(".dialog-close, [data-close-dialog]")) closeDialog();
});

dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeDialog();
});
