const weekendLocations = [
    {
        name: "Welcome Gathering",
        venue: "The Public House",
        address: "830 Kline St, La Jolla, CA 92037",
        coordinates: [32.84336, -117.27529],
        icon: "✦",
        className: "icon-welcome",
        mapUrl: "https://www.google.com/maps/search/?api=1&query=The+Public+House+830+Kline+St+La+Jolla+CA+92037"
    },
    {
        name: "Ceremony",
        venue: "Wedding Bowl",
        address: "590 Coast S Blvd, La Jolla, CA 92037",
        coordinates: [32.84412, -117.27919],
        icon: "♥",
        className: "icon-ceremony",
        mapUrl: "https://www.google.com/maps/search/?api=1&query=Wedding+Bowl+590+Coast+S+Blvd+La+Jolla+CA+92037"
    },
    {
        name: "Reception",
        venue: "La Jolla Woman’s Club",
        address: "7791 Draper Ave, La Jolla, CA 92037",
        coordinates: [32.84413, -117.27752],
        icon: "♪",
        className: "icon-reception",
        mapUrl: "https://www.google.com/maps/search/?api=1&query=La+Jolla+Womans+Club+7791+Draper+Ave+La+Jolla+CA+92037"
    },
    {
        name: "Morning-After Brunch",
        venue: "Ellen Browning Scripps Park",
        address: "1100 Coast Blvd, La Jolla, CA 92037",
        coordinates: [32.84995087869962, -117.27439982883561],
        icon: "☀",
        className: "icon-brunch",
        mapUrl: "https://www.google.com/maps/search/?api=1&query=Ellen+Browning+Scripps+Park+1100+Coast+Blvd+La+Jolla+CA+92037"
    },
    {
        name: "Empress Hotel La Jolla",
        coordinates: [32.84464, -117.27566],
        icon: "⌂",
        className: "icon-lodging",
        isLodging: true
    },
    {
        name: "Inn by the Sea",
        coordinates: [32.84544, -117.27582],
        icon: "⌂",
        className: "icon-lodging",
        isLodging: true
    },
    {
        name: "Grande Colonial",
        coordinates: [32.84730, -117.27482],
        icon: "⌂",
        className: "icon-lodging",
        isLodging: true
    }
];

function escapeMapText(value) {
    const node = document.createElement("div");
    node.textContent = value;
    return node.innerHTML;
}

let weekendMap = null;

function initializeWeekendMap() {
    const mapElement = document.getElementById("weekend-map");

    if (!mapElement || typeof L === "undefined") return;

    if (weekendMap) weekendMap.remove();

    const map = L.map(mapElement, {
        scrollWheelZoom: false
    });
    weekendMap = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);

    const bounds = [];

    for (const location of weekendLocations) {
        const markerIcon = L.divIcon({
            className: "event-map-marker",
            html: `<span class="event-map-icon ${location.className}"><span class="event-map-symbol">${location.icon}</span></span>`,
            iconSize: [34, 34],
            iconAnchor: [17, 32],
            popupAnchor: [0, -31]
        });

        const popup = location.isLodging
            ? `
                <strong>${escapeMapText(location.name)}</strong>
                See our <a href="accommodation.html">Accommodation</a> tab for more info.
            `
            : `
                <strong>${escapeMapText(location.name)}</strong>
                ${escapeMapText(location.venue)}<br>
                ${escapeMapText(location.address)}<br>
                <a href="${location.mapUrl}" target="_blank" rel="noopener">Open in Google Maps ↗</a>
            `;

        L.marker(location.coordinates, {
            icon: markerIcon,
            title: location.isLodging
                ? location.name
                : `${location.name}: ${location.venue}`
        }).addTo(map).bindPopup(popup);

        bounds.push(location.coordinates);
    }

    map.fitBounds(bounds, {
        padding: [45, 45],
        maxZoom: 16
    });
}

window.initializeWeekendMap = initializeWeekendMap;
window.destroyWeekendMap = function destroyWeekendMap() {
    weekendMap?.remove();
    weekendMap = null;
};

initializeWeekendMap();
