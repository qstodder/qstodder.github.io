const mealGrid = document.getElementById("meal-grid");
const searchInput = document.getElementById("meal-search");
const timeFilter = document.getElementById("time-filter");
const resultsCount = document.getElementById("results-count");
const emptyState = document.getElementById("empty-state");
const loadError = document.getElementById("load-error");
const dialog = document.getElementById("meal-dialog");
const dialogClose = document.getElementById("dialog-close");
const dialogGallery = document.getElementById("dialog-gallery");
const dialogTitle = document.getElementById("dialog-title");
const dialogTime = document.getElementById("dialog-time");
const dialogDescription = document.getElementById("dialog-description");
const dialogIngredients = document.getElementById("dialog-ingredients");
const descriptionSection = document.getElementById("dialog-description-section");
const ingredientsSection = document.getElementById("dialog-ingredients-section");
const dialogPlaceholder = document.getElementById("dialog-placeholder");

let meals = [];

function parseCsv(csv) {
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;

    for (let index = 0; index < csv.length; index += 1) {
        const character = csv[index];
        const next = csv[index + 1];

        if (character === '"' && quoted && next === '"') {
            field += '"';
            index += 1;
        } else if (character === '"') {
            quoted = !quoted;
        } else if (character === "," && !quoted) {
            row.push(field);
            field = "";
        } else if ((character === "\n" || character === "\r") && !quoted) {
            if (character === "\r" && next === "\n") index += 1;
            row.push(field);
            if (row.some((value) => value.trim())) rows.push(row);
            row = [];
            field = "";
        } else {
            field += character;
        }
    }

    row.push(field);
    if (row.some((value) => value.trim())) rows.push(row);

    const headers = rows.shift().map((header) => header.trim());
    return rows.map((values) => Object.fromEntries(
        headers.map((header, index) => [header, (values[index] ?? "").trim()])
    ));
}

function imageUrl(filename) {
    return `photos/${filename}`;
}

function timeDots(level) {
    const dots = document.createElement("span");
    dots.className = "time-dots";
    dots.setAttribute("aria-hidden", "true");

    for (let index = 1; index <= 5; index += 1) {
        const dot = document.createElement("span");
        dot.className = `time-dot${index <= level ? " is-filled" : ""}`;
        dots.appendChild(dot);
    }

    return dots;
}

function timeRating(level, className = "time-rating") {
    const rating = document.createElement("div");
    rating.className = className;
    rating.setAttribute("aria-label", `Time commitment: ${level} of 5`);

    const label = document.createElement("span");
    label.textContent = "Time commitment:";
    label.setAttribute("aria-hidden", "true");
    rating.append(label, timeDots(level));
    return rating;
}

function openMeal(meal) {
    dialogTitle.textContent = meal.name;
    dialogTime.replaceChildren(...timeRating(meal.timeCommitment, "dialog-time").childNodes);

    const images = [meal.coverImage, ...meal.additionalImages];
    dialogGallery.replaceChildren(...images.map((filename, index) => {
        const image = document.createElement("img");
        image.src = imageUrl(filename);
        image.alt = index === 0 ? meal.name : `${meal.name}, additional view ${index}`;
        image.loading = index === 0 ? "eager" : "lazy";
        image.decoding = "async";
        return image;
    }));

    dialogDescription.textContent = meal.description;
    dialogIngredients.textContent = meal.ingredients;
    descriptionSection.hidden = !meal.description;
    ingredientsSection.hidden = !meal.ingredients;
    dialogPlaceholder.hidden = Boolean(meal.description || meal.ingredients);

    dialog.showModal();
}

function mealCard(meal) {
    const card = document.createElement("button");
    card.className = "meal-card";
    card.type = "button";
    card.setAttribute("aria-label", `View ${meal.name}`);

    const imageWrap = document.createElement("div");
    imageWrap.className = "meal-card-image-wrap";
    const image = document.createElement("img");
    image.src = imageUrl(meal.coverImage);
    image.alt = meal.name;
    image.loading = "lazy";
    image.decoding = "async";
    imageWrap.appendChild(image);

    const copy = document.createElement("div");
    copy.className = "meal-card-copy";
    const title = document.createElement("h2");
    title.textContent = meal.name;
    copy.append(title, timeRating(meal.timeCommitment));

    card.append(imageWrap, copy);
    card.addEventListener("click", () => openMeal(meal));
    return card;
}

function renderMeals() {
    const search = searchInput.value.trim().toLocaleLowerCase();
    const selectedTime = timeFilter.value;
    const filtered = meals.filter((meal) => (
        meal.name.toLocaleLowerCase().includes(search) &&
        (selectedTime === "all" || meal.timeCommitment === Number(selectedTime))
    ));

    mealGrid.replaceChildren(...filtered.map(mealCard));
    emptyState.hidden = filtered.length !== 0;
    resultsCount.textContent = `${filtered.length} ${filtered.length === 1 ? "meal" : "meals"}`;
}

async function loadMeals() {
    try {
        const response = await fetch("meals.csv", { cache: "no-store" });
        if (!response.ok) throw new Error("Unable to load meals.csv");

        meals = parseCsv(await response.text()).map((meal) => ({
            name: meal.name,
            timeCommitment: Math.min(5, Math.max(1, Number(meal.time_commitment) || 1)),
            coverImage: meal.cover_image,
            additionalImages: meal.additional_images
                ? meal.additional_images.split(",").map((name) => name.trim()).filter(Boolean)
                : [],
            description: meal.description,
            ingredients: meal.ingredients
        }));

        renderMeals();
    } catch (error) {
        console.error(error);
        loadError.hidden = false;
        resultsCount.textContent = "";
    }
}

searchInput.addEventListener("input", renderMeals);
timeFilter.addEventListener("change", renderMeals);
dialogClose.addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
});

loadMeals();
