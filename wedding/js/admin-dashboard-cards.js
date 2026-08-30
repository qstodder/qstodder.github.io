(function () {
    function escapeHtml(value) {
        const node = document.createElement("div");
        node.textContent = value ?? "";
        return node.innerHTML;
    }

    function escapeAttribute(value) {
        return String(value ?? "").replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    }

    window.initializeDashboardCards = function initializeDashboardCards(options) {
        const container = document.querySelector("#dashboard-cards");
        const dialog = document.querySelector("#dashboard-cards-dialog");
        const editor = document.querySelector("#dashboard-card-editor");
        const form = document.querySelector("#dashboard-cards-form");
        const clear = document.querySelector("#clear-dashboard-card-filter");
        const status = document.querySelector("#dashboard-card-filter-status");
        let cards = [...(options.cards ?? [])];
        let activeMetric = null;

        function metricOptions(selected) {
            return Object.entries(options.metrics).map(([value, metric]) =>
                `<option value="${value}" ${value === selected ? "selected" : ""}>${escapeHtml(metric.label)}</option>`
            ).join("");
        }

        function renderCards() {
            const rows = options.getRows();
            container.innerHTML = cards.map((card) => {
                const metric = options.metrics[card.metric];
                if (!metric) return "";
                const count = rows.filter(metric.matches).length;
                return `<button class="summary-card dashboard-card ${card.tone === "alert" ? "summary-card-alert" : ""} ${activeMetric === card.metric ? "is-active" : ""}" type="button" data-dashboard-metric="${card.metric}" aria-pressed="${activeMetric === card.metric}">
                    <span class="summary-label">${escapeHtml(card.label)}</span>
                    <strong>${count}</strong>
                    <span>${escapeHtml(metric.description)}</span>
                </button>`;
            }).join("");
            clear.classList.toggle("hidden", !activeMetric);
            status.textContent = activeMetric
                ? `Filtering by: ${cards.find((card) => card.metric === activeMetric)?.label ?? activeMetric}`
                : "";
        }

        function renderEditor() {
            editor.innerHTML = cards.map((card, index) => `
                <div class="dashboard-card-editor-row" data-card-index="${index}">
                    <label class="address-field"><span>Metric</span><select name="metric">${metricOptions(card.metric)}</select></label>
                    <label class="address-field"><span>Label</span><input name="label" maxlength="80" required value="${escapeAttribute(card.label)}"></label>
                    <label class="address-field"><span>Style</span><select name="tone"><option value="default" ${card.tone !== "alert" ? "selected" : ""}>Standard</option><option value="alert" ${card.tone === "alert" ? "selected" : ""}>Alert</option></select></label>
                    <div class="dashboard-card-row-actions"><button type="button" class="secondary-button" data-card-action="up" aria-label="Move card up">↑</button><button type="button" class="secondary-button" data-card-action="down" aria-label="Move card down">↓</button><button type="button" class="danger-button" data-card-action="remove">Remove</button></div>
                </div>`).join("");
        }

        function readEditor() {
            return [...editor.querySelectorAll(".dashboard-card-editor-row")].map((row) => ({
                metric: row.querySelector('[name="metric"]').value,
                label: row.querySelector('[name="label"]').value.trim(),
                tone: row.querySelector('[name="tone"]').value
            }));
        }

        container.addEventListener("click", (event) => {
            const card = event.target.closest("[data-dashboard-metric]");
            if (!card) return;
            activeMetric = activeMetric === card.dataset.dashboardMetric
                ? null : card.dataset.dashboardMetric;
            renderCards();
            options.onFilterChanged();
        });
        clear.addEventListener("click", () => {
            activeMetric = null;
            renderCards();
            options.onFilterChanged();
        });
        document.querySelector("#customize-dashboard-cards").addEventListener("click", () => {
            document.querySelector("#dashboard-cards-error").textContent = "";
            renderEditor();
            dialog.showModal();
        });
        document.querySelector("#close-dashboard-cards-dialog").addEventListener("click", () => dialog.close());
        document.querySelector("#add-dashboard-card").addEventListener("click", () => {
            const used = new Set(readEditor().map((card) => card.metric));
            const metric = Object.keys(options.metrics).find((key) => !used.has(key));
            if (!metric) return;
            cards = [...readEditor(), {
                metric,
                label: options.metrics[metric].label,
                tone: options.metrics[metric].tone ?? "default"
            }];
            renderEditor();
        });
        editor.addEventListener("click", (event) => {
            const action = event.target.closest("[data-card-action]")?.dataset.cardAction;
            const row = event.target.closest("[data-card-index]");
            if (!action || !row) return;
            cards = readEditor();
            const index = Number(row.dataset.cardIndex);
            if (action === "remove") cards.splice(index, 1);
            if (action === "up" && index > 0) [cards[index - 1], cards[index]] = [cards[index], cards[index - 1]];
            if (action === "down" && index < cards.length - 1) [cards[index + 1], cards[index]] = [cards[index], cards[index + 1]];
            renderEditor();
        });
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            cards = readEditor();
            const metrics = cards.map((card) => card.metric);
            if (new Set(metrics).size !== metrics.length) {
                document.querySelector("#dashboard-cards-error").textContent = "Each metric can only be used once.";
                return;
            }
            try {
                const response = await fetch("/api/admin/dashboard-cards", {
                    method: "PUT", credentials: "same-origin",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ page: options.page, cards })
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || "Unable to save cards.");
                cards = result.cards;
                activeMetric = cards.some((card) => card.metric === activeMetric) ? activeMetric : null;
                dialog.close();
                renderCards();
                options.onFilterChanged();
            } catch (error) {
                document.querySelector("#dashboard-cards-error").textContent = error.message || "Unable to save cards.";
            }
        });

        renderCards();
        return {
            matches: (row) => !activeMetric || options.metrics[activeMetric]?.matches(row),
            render: renderCards
        };
    };
})();
