const mapPins = {
    hikes: [
      {
        name: "Waihee Ridge Trail - 4.2mi out-n-back",
        coords: [20.95288643098566, -156.53235143335684],
        description: "Incredible ridge views, just don't go during/after a rain unless you want a mud bath."
      },
      {
        name: "Iao Valley State Park - varried lengths",
        coords: [20.880595321010254, -156.5459331219148],
        description: "Historic site with various river hikes/swims and ridge hikes."
      },
      {
        name: "Lahaina Pali Trail - East Side",
        coords: [20.807562465448296, -156.5128997314616],
        description: "Hike up to the wind turbines and get an amazing ocean view the entire way. Do it as an out n back, or take two cars to end at the west trail head."
      },
      {
        name: "Lahaina Pali Trail - West Side",
        coords: [20.79167517052978, -156.56390622862236],
        description: "Hike up to the wind turbines and get an amazing ocean view the entire way. Do it as an out n back, or take two cars to end at the east trail head."
      },
      {
        name: "Twin Falls - varried lengths",
        coords: [20.912349958470646, -156.242834810727],
        description: "Waterfall/river hike, great place to spend half a day."
      },
      {
        name: "Bamboo Forest",
        coords: [20.88471110887755, -156.20767595721733],
        description: "Fun place to romp around, lots of waterfalls and rivers. Parking can be tough."
      },
      {
        name: "Hana Highway Lavatube",
        coords: [20.815033764634933, -156.11945864852356],
        description: "Fun stop along the Hana drive. There's lava tubes to explore and a river/waterfall to hike up as well."
      },
      {
        name: "Wai'anapanapa Coastal Trail",
        coords: [20.78945056413794, -156.00294181124727],
        description: "Beautiful coastal trail in one of my favorite state parks. There's a couple blowholes too! Warning - parking reservations are requried now!"
      },
      {
        name: "Waimoku Falls - 3.4 mi out n back",
        coords: [20.662001893487385, -156.04519069333296],
        description: "Incredible trail through bamboo forests and rainforest, up to a big 'ol waterfall. It's technically in the Haleakala National Park, so there's an entrance fee."
      },
      {
        name: "Waihou Spring Forest Reserve - 2-3 mi",
        coords: [20.806453203663217, -156.28005842282028],
        description: "Lush forest loop with an optional side quest into a gulch that has lava tubes."
      },
      {
        name: "Halemau'u (Haleakala Crater)",
        coords: [20.75338708646935, -156.22855928681355],
        description: "Start at the lush side of the crater, and down switch backs to the crater floor. Make it an out n back, or a through hike to the crater top (12 mi)."
      },
      {
        name: "Keonehe'ehe'e (Haleakala Crater)",
        coords: [20.714565174509385, -156.25072240221715],
        description: "Hike into the crater, or hike straight through (12 mi) to the Halemau'u Trail Head. The latter is one of the most incredible hikes I've ever been on. You'll just need to hitch hike back to your car, or use two cars."
      },
      {
        name: "La Perouse (King's Highway)",
        coords: [20.593823856552756, -156.4133633803695],
        description: "Out n back over the last lava flow on Maui. Lots of coves along the way to hang and swim. Great snorkling!"
      }
    ],
    surf: [
      {
        name: "Thousand Peaks (Ukemehame)",
        coords: [20.795128146590937, -156.5819791190511],
        description: "Longboard break with lots of little peaks. Also has a parking lot with porta potties."
      },
      {
        name: "Lefts",
        coords: [20.799139578252177, -156.59047872879017],
        description: "Longboard break with good lefts (obviously)."
      },
      {
        name: "Olowalu",
        coords: [20.821942873081646, -156.63000863557096],
        description: "Mostly a longboard spot, but do NOT pass the chance to bring a shortboard here on a good south swell."
      },
      {
        name: "Launiupoko",
        coords: [20.84376799417297, -156.65266302333313],
        description: "Love this spot so much I'll go even when it's trash. Longboards recommended, and be ready to see some turtles! Super cute grassy park too, with real bathrooms and a *shower*. This is an awesome spot to hang for awhile, have a BBQ with your people, and pop in-n-out for surf sessions. If you go out, just be weary of the shallow reef!"
      },
      {
        name: "Breakwall (Lahaina Harbor)",
        coords: [20.869743793073184, -156.6773337826309],
        description: "Where I grew up surfing! Solid all-day longboard spot, just be ready to manuver around surf schools. As of Spring 2025 the area is still closed from the fire. See details below for parking."
      },
      {
        name: "S-Turns (Pohaku)",
        coords: [20.966991252309132, -156.68148399998464],
        description: "Great spot for your high volume shortboard on a south swell. Otherwise grab the trusty log. It never seems crowded but that might be due to it's sharky reputation (I haven't seen any but don't say I didn't warn you). Park in Pohaku lot."
      },
      {
        name: "Honolua",
        coords: [21.013206438990473, -156.6391746247982],
        description: "I've actually never been but it's a famous right on Maui and comes highly recommended. Pin is at the lookout, I'm not sure how to get down."
      },
      {
        name: "Kahului Harbor - Inside",
        coords: [20.896126254610778, -156.475674338415],
        description: "'Good enough' describes the best day I've had here. More sheltered than outside the harbor."
      },
      {
        name: "Kahului Harbor - Outside",
        coords: [20.896126254610778, -156.475674338415],
        description: "Conditions a little rougher than inside the harbor. I've never had a great day here, but I've heard it can be decent."
      },
      {
        name: "Kanaha",
        coords: [20.90024336908859, -156.43963708202463],
        description: "Windy as heck (world-famous for wind sports), but outside the reef can really go off (gun or log recommended). The park has great parking, bathrooms, vball courts, and CATS!"
      },
      {
        name: "Ho'okipa",
        coords: [20.933838521249726, -156.35628021982652],
        description: "Some are wary of the locals here, but just know your etiquette and they'll be the friendly bunch you've ever surfed with. Careful of the reef, and DON'T TOUCH THE TURTLES."
      },
      {
        name: "Jaws (Peahi)",
        coords: [20.942455884247657, -156.2968804621523],
        description: "Worth a looksie if it's going off!"
      },
      {
        name: "Honomanu",
        coords: [20.860421305059415, -156.16621025158142],
        description: "Only place I've surfed in Hana, and I spent more time fighting the current than surfing. But Shaun had fun! 4WD recommended for the road down."
      },
      {
        name: "Maalaea Harbor",
        coords: [20.791477407191703, -156.5082101864592],
        description: "Never surfed it, but I know it's a great shortboard spot on a good south swell!"
      },
      {
        name: "The Cove",
        coords: [20.727360242055177, -156.44991579011813],
        description: "Don't be fooled by it's lake-like appearance. With the right attitude you can catch anything!"
      },
      {
        name: "La Perouse",
        coords: [20.594145007615793, -156.41369892804232],
        description: "My dad says you can surf here ¯\\_(ツ)_/¯"
      }
      
    ],
    food: [
        {
            name: "Haili'imaile General Store",
            coords: [20.868357787374762, -156.34007121071843],
            description: "No longer a general store, it's now a top rated restaurant. A bit pricey, but definitely worth it!"
        },
        {
            name: "Polly's Mexican",
            coords: [20.85388538250084, -156.31010079993027],
            description: "As far from Mexican as you can get, but absolutely solid place for good eats, frozen margaritas, and epic vintage surf footage."
        },
        {
            name: "Casanovas",
            coords: [20.85374301073981, -156.31039027987052],
            description: "Excellent pasta, pizza, and cocktails. There's also an attached cafe with great take out lunches."
        },
        {
            name: "Komoda's Bakery",
            coords: [20.85415325115527, -156.31058563900893],
            description: "Get there early, they run out fast! And they also have weird hours."
        },
        {
            name: "Pukalani Suparette",
            coords: [20.834424524181568, -156.3334936133111],
            description: "Best hot plate lunch up country, highly recommend if you need a quick bite."
        },
        {
            name: "Serpico's",
            coords: [20.83608115540446, -156.33616336959963],
            description: "Owned by the nicest family! Great pizzas/subs/pasta. The philly cheesesteak was a go-to of my brother's."
        },
        {
            name: "Foodland Pukalani",
            coords: [20.8376804951822, -156.34225683683948],
            description: "The poke! The spam musubis! The hot plate lunch! Foodland is a staple. Hot tip: go in the morning to get half-off yesterday's poke."
        },
        {
            name: "Marlo's",
            coords: [20.8219749302262, -156.3305878412187],
            description: "Exquisite, unique, delicious pizzas. Order take-out and bring it over to the Aleworks balcony next door!"
        },
        {
            name: "Mahalo Aleworks",
            coords: [20.821801788911767, -156.33078576814407],
            description: "Order takeout from Marlo's next door, then grab some brewski's on the balcony here. You can't beat that view."
        },
        {
            name: "La Provence",
            coords: [20.776023455520292, -156.32596929676947],
            description: "Never got food here but the pastries are simply superb."
        },
        {
            name: "Ocean Vodka",
            coords: [20.809295566804096, -156.36822907451216],
            description: "Great view, great drinks, great food! It is outdoors, so it might get a bit windy. Jacket recommended."
        },
      {
        name: "Paia Fish Market",
        coords: [20.920948490356462, -156.38109929250905],
        description: "Sooo good, but also soooo crowded."
      },
      {
        name: "Cafe Des Amis",
        coords: [20.915417892624546, -156.38029941264662],
        description: "Solid mediterranian, great tropical drinks, KILLER crepes."
      },
      {
        name: "Flatbread Pizza",
        coords: [20.915875867959617, -156.3820191150115],
        description: "Very popular; pizza is quite decent. Reservation recommended."
      },
      {
        name: "Cafe O'Lei at the Plantation",
        coords: [20.849274715100833, -156.50719173719824],
        description: "Incredible view and atmosphere, and food/drinks are spectacular."
      },
      {
        name: "Times Supermarket",
        coords: [20.74824093593518, -156.45578324102024],
        description: "My go-to spot for fresh mochi. Although TBH it's good everywhere."
      },
      {
        name: "Maui Pie",
        coords: [20.74987352680759, -156.4553763366996],
        description: "The Chocolate Haupia (coconut) was my all time fav as a kid."
      },
      {
        name: "South Maui Fish Co",
        coords: [20.73526984743381, -156.453636906176],
        description: "Usually pretty busy, but so so worth the wait."
      },
      {
        name: "Leoda's Pie Shop",
        coords: [20.81142831426548, -156.6219818811092],
        description: "Super popular. Worth a stop if you're in the area."
      },
      {
        name: "Hana Farms Roadside Stand",
        coords: [20.78310207842246, -156.02023314346877],
        description: "Absolutely worth a stop if you're in the area. Killer pizza at the restaurant, and crazy good banana bread at the shop. This farm also has beautiful scenary and ambiance."
      }
    ],
    other: [
        {
            name: "Surfing Goat Dairy",
            coords: [20.806764772242857, -156.36517846208375],
            description: "Behind the scenes tour of some adorable goats and some killer cheese. There's also a cafe on sight for lunch!"
        },
      {
        name: "Kula Lavendar Farm",
        coords: [20.733358563821586, -156.31975853602586],
        description: "Very peaceful and beautiful lavendar garden with a cafe and giftshop."
      },
      {
        name: "Star Gazing",
        coords: [20.727208774445483, -156.31152380882932],
        description: "Star gazing is excellent anywhere upcountry, but Poli Poli is a great location for it."
      },
      {
        name: "Poli Poli Disc Golf",
        coords: [20.72620148204212, -156.31157403912044],
        description: "Beautifully-maintained course. A must if you're a disc-golfer. Be careful to not lose your disc in the dense foliage."
      },
      {
        name: "Haleakala Crater",
        coords: [20.710137248959793, -156.25346449358085],
        description: "Definitely a must-see if you're on-island. I also highly recommend watching the sunrise and/or sunset here."
      },
      {
        name: "Wai'anapanapa State Park",
        coords: [20.786348745547606, -156.00289782849856],
        description: "My favorite state park on Maui! Beautiful coast line, and so many fun hidden spots. If you can get a reservation, the cabins in this park are an insane deal."
      },
      {
        name: "Maui Ocean Center",
        coords: [20.792632180806677, -156.51220451975584],
        description: "To this day one of the best aquariums I've ever been to. No better place to learn about humpback whales and their annual migration patterns! There's also usually exhibits on ancient hawaiian life, and the restoration projects on Koho'olawe."
      },
      {
        name: "Olowalu Petroglyphs",
        coords: [20.819472208107484, -156.61820259527218],
        description: "I recommend this quick stop if you're in the area! It's just a ~10min detor for some pretty neat petroglyphs."
      },
      {
        name: "Whale Watching",
        coords: [20.787055935110594, -156.4990737227847],
        description: "If it's the season for whale watching, this is a 100000% must."
      },
      {
        name: "Molokini Snorkling",
        coords: [20.633342257326817, -156.49616671394884],
        description: "You'll need to join a snorkling tour to get here, but it's some of the best snorkling off maui."
      }
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
  