const mapPins = {
    hikes: [
      {
        name: "Waihee Ridge Trail",
        coords: [20.9402, -156.5044],
        description: "Scenic ridge hike with ocean and valley views."
      },
      {
        name: "Iao Valley State Park",
        coords: [20.8851, -156.5451],
        description: "Historic site with lush scenery."
      },
      // Add more hikes here
    ],
    surf: [
      {
        name: "Ho'okipa Beach Park",
        coords: [20.9393, -156.3717],
        description: "Famous surf spot for advanced surfers."
      },
      // Add more surf spots
    ],
    food: [
      {
        name: "Tin Roof",
        coords: [20.8841, -156.4643],
        description: "Local favorite for Hawaiian comfort food."
      },
      // Add more food spots
    ],
    other: [
      {
        name: "Kula Lavendar Farm",
        coords: [20.733358563821586, -156.31975853602586],
        description: "Views, lavendar varietals, gift shop, cafe?."
      },
      // Add more other spots
    ]
  };

  // Utility to initialize a single combined map for all categories with layer control

document.addEventListener("DOMContentLoaded", function () {
    const map = L.map("map").setView([20.8, -156.3], 9);
  
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
    }).addTo(map);
  
    const iconMap = {
      hikes: L.icon({
        iconUrl: "rec-icons/hike.png",
        iconSize: [24, 30],
        iconAnchor: [12, 30],
      }),
      surf: L.icon({
        iconUrl: "rec-icons/surf.png",
        iconSize: [24, 30],
        iconAnchor: [12, 30],
      }),
      food: L.icon({
        iconUrl: "rec-icons/food.png",
        iconSize: [24, 30],
        iconAnchor: [12, 30],
      }),
      other: L.icon({
        iconUrl: "rec-icons/other.png",
        iconSize: [24, 30],
        iconAnchor: [12, 30],
      }),
    };
  
    const layerGroups = {
      hikes: L.layerGroup(),
      surf: L.layerGroup(),
      food: L.layerGroup(),
      other: L.layerGroup(),
    };
  
    // Loop through all categories and add markers to respective layer group
    Object.keys(mapPins).forEach((category) => {
      const icon = iconMap[category];
      mapPins[category].forEach((pin) => {
        const marker = L.marker(pin.coords, { icon })
          .bindPopup(`<strong>${pin.name}</strong><br>${pin.description}`);
        layerGroups[category].addLayer(marker);
      });
      layerGroups[category].addTo(map);
    });
  
    // Add layer control
    L.control.layers(null, {
      Hikes: layerGroups.hikes,
      Surf: layerGroups.surf,
      Food: layerGroups.food,
      Other: layerGroups.other,
    }).addTo(map);
  });
  