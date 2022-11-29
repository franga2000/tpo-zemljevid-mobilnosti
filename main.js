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




for (let provider of Object.values(PROVIDERS)) {

  fetch(API_BASE + provider.endpoint)
    .then((r) => r.json())
    .then((geojsonObject) => {

      provider.layer = new L.GeoJSON(geojsonObject, {
        pointToLayer: function (feature, latlng) {
          let item = feature.properties;

          let header = ``;
          if (item.capacity !== undefined)
            header += html`
          <div class='marker-header'>
            <span class='station-there'>${item.capacity - item.capacity_free}</span> : <span
              class='station-free'>${item.capacity_free}</span>
          </div>`;

          /*
          var smallIcon = new L.Icon({
              iconSize: [27, 27],
              iconAnchor: [13, 27],
              popupAnchor:  [1, -24],
              iconUrl: 'assets/marker/' + provider.id + '.png',
            
          }); */

          let smallIcon = new L.DivIcon({
            className: 'marker',
            html: header + html`<img src="assets/marker/${provider.id}.png">`
          })

          let infoBox = html`
            <strong>${item.title}</strong>
          `;
          if (item.type.includes("station")) {
            infoBox += html`<br>
            <strong>Prosto:</strong> ${item.capacity_free} <strong>Vozila:</strong> ${item.capacity - item.capacity_free}`
            }
          marker.bindPopup(infoBox);

          let marker = L.marker(latlng, { icon: smallIcon });

          return marker;
        },
      });

      provider.layer.addTo(map);

      layerControl.addOverlay(provider.layer, html`<span class="layer-control"><img src="assets/marker/${provider.id}.png"> ${provider.name}</span>`);
    });
}
