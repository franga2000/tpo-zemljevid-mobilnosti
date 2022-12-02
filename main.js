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



let PROVIDERS = {
  nomago_bikes: {
    id: "nomago_bikes",
    endpoint: "/nextbike/SI/stations",
    name: "Nomago Bikes",
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

};
let API_BASE = "https://api.modra.ninja";

if (window.location.href.includes("127.0.0.1")) {
  API_BASE = "http://127.0.0.1:42066";
}

$provider_toggles = document.getElementById("provider-toggles");



var map = L.map('map', {
  zoomDelta: 0.01,
  zoomSnap: 0,
  minZoom: 8,
  maxBounds: L.latLngBounds(L.latLng(46.928896753962, 13.072134813746672), L.latLng(45.32440935087733, 16.95960338174632)),
  doubleTouchDragZoom: true
}).setView([46.051, 14.505], 13);

var layerControl = L.control.layers([], [], {
  collapsed: false,
}).addTo(map);

L.control.locate().addTo(map);


var CartoDB_VoyagerLabelsUnder = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: 'abcd',
  maxZoom: 20
});
layerControl.addBaseLayer(CartoDB_VoyagerLabelsUnder, "Svetlo");

var CartoDB_DarkMatter = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: 'abcd',
  maxZoom: 20
});
layerControl.addBaseLayer(CartoDB_DarkMatter, "Temno");



function darkMode(dark) {
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

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
  darkMode(e.matches);
});
darkMode(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);


map.on('baselayerchange', e => {
  console.debug(e)
  darkMode(e.name == 'Temno')
});


for (let provider of Object.values(PROVIDERS)) {

  fetch(API_BASE + provider.endpoint)
    .then((r) => r.json())
    .then((geojsonObject) => {

      provider.layer = new L.GeoJSON(geojsonObject, {
        pointToLayer: function (feature, latlng) {
          let item = feature.properties;

          var smallIcon = new L.Icon({
              iconSize: [27, 27],
              iconAnchor: [13, 27],
              popupAnchor:  [1, -24],
              iconUrl: 'assets/marker/' + provider.id + '.png',
            
          });        

          let marker = L.marker(latlng, { icon: smallIcon });

          return marker;
        },
      });

      provider.layer.addTo(map);

      layerControl.addOverlay(provider.layer, html`<span class="layer-control"><img src="assets/marker/${provider.id}.png"> ${provider.name}</span>`);
    });
}
