let LEAFLET = false;

function noop(strings, ...exp) {
  const lastIndex = strings.length - 1;

  if (!lastIndex) return strings[0];
  let acc = "",
    part;

  for (let i = 0; i < lastIndex; i++) {
    part = strings[i];
    if (part) acc += part;
    acc += exp[i];
  }
  part = strings[lastIndex];
  return part ? (acc += part) : acc;
}
html = noop;



let SECTIONS = [
  {
    title: "Izposoja koles",
    icon: "bike",
    provider_groups: [
      {
        name: "europlakat",
        providers: ["bicikelj", "mbajk"],
      },
      {
        name: "nomago",
        providers: ["nextbike"],
      },
      {
        name: "ostali",
        providers: ["krskolesom", "gorenjska", "soboskibiciklin", "posbikes", "micikel"],
      },
    ]
  },
  {
    title: "Izposoja avtomobilov",
    icons: "car",
    provider_groups: [
      {
        name: "avant2go",
        providers: ["avant2go"]
      },
      {
        name: "sharengo",
        providers: ["sharengo"]
      },
    ]
  }
];


let PROVIDERS = {
  nomago_bikes: {
    id: "nomago_bikes",
    endpoint: "/nextbike/SI/stations",
    name: "Nomago Bikes",
  },
  sharengo: {
    id: "sharengo",
    endpoint: "/sharengo/cars",
    name: "Share'N Go",
  },
  bicikelj: {
    id: "bicikelj",
    endpoint: "/jcdecaux/ljubljana/stations",
    name: "BicikeLJ",
  },
  mbajk: {
    id: "mbajk",
    endpoint: "/jcdecaux/maribor/stations",
    name: "MBajk",
  },
  avant2go: {
    id: "avant2go",
    endpoint: "/avant2go/stations",
    name: "Avant2Go",
  },
  krskolesom: {
    id: "krskolesom",
    endpoint: "/scbikes/stations?system=krskolesom",
    name: "krskolesom",
  },
  gorenjska: {
    id: "gorenjska",
    endpoint: "/scbikes/stations?system=gorenjska",
    name: "gorenjska",
  },
  soboskibiciklin: {
    id: "soboskibiciklin",
    endpoint: "/scbikes/stations?system=soboskibiciklin",
    name: "soboskibiciklin",
  },
  posbikes: {
    id: "posbikes",
    endpoint: "/scbikes/stations?system=posbikes",
    name: "posbikes",
  },
  micikel: {
    id: "micikel",
    endpoint: "/micikel/stations",
    name: "micikel",
  },
};
let API_BASE = "https://api.modra.ninja";

if (window.location.href.includes("127.0.0.1")) {
  //API_BASE = "http://127.0.0.1:42066";
}

$provider_toggles = document.getElementById("provider-toggles");



darkMode(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);


function darkMode(dark) {
  if (LEAFLET) {
    if (dark) {
      document.body.classList.add("dark");
      CartoDB_DarkMatter.addTo(map);
      document.querySelectorAll('.leaflet-control-layers-expanded label')[1].click();
    } else {
      document.body.classList.remove("dark");
      CartoDB_VoyagerLabelsUnder.addTo(map);
      document.querySelectorAll('.leaflet-control-layers-expanded label')[0].click();
    }
  }
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
  darkMode(e.matches);
});



function initSidebar() {
  let $sidebar = document.getElementById("providers");
  let $_sidebar = "";

  for (let section of SECTIONS) {

    let $_group = "";
    for (let group of section.provider_groups) {

      $_group += `
      <span class="layer-control" onclick="toggleGroup(this)" data-provider-group='${group.name}'>
        <img src="assets/marker/${group.name}.png"> ${group.name}
      </span>
      `;
    }

    $_sidebar += $_group;

  }

  $sidebar.innerHTML = $_sidebar;
}

initSidebar()

function toggleGroup(el) {
  let group_name = el.dataset.providerGroup;

  for (let section of SECTIONS) {
    for (let provider_group of section.provider_groups) {
      
      if (provider_group.name != group_name)
          continue

      for (let provider of provider_group.providers) {
        
        const clickedLayer = 'provider_' + provider;

        const visibility = map.getLayoutProperty(
          clickedLayer,
          'visibility'
        );

        // Toggle layer visibility by changing the layout object's visibility property.
        if (visibility === 'visible') {
          map.setLayoutProperty(clickedLayer, 'visibility', 'none');
          el.classList.remove("active");
        } else {
          el.classList.add("active")
          map.setLayoutProperty(
            clickedLayer,
            'visibility',
            'visible'
          );
        }
      }
    }
  }
}