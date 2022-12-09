
for (let provider of Object.values(PROVIDERS)) {
  /*
  console.debug(provider);
  $provider_toggles.innerHTML += html`
    <a data-provider-id="${provider.id}">${provider.name}</a>
  `;
  */

  fetch(API_BASE + provider.endpoint)
    .then((r) => r.json())
    .then(async (geojsonObject) => {
      if (LEAFLET) {
        provider.layer = new L.GeoJSON(geojsonObject, {
          pointToLayer: function (feature, latlng) {
            let item = feature.properties;

            // var smallIcon = new L.Icon({
            //     iconSize: [10, 10],
            //     //iconAnchor: [13, 27],
            //     //popupAnchor:  [1, -24],
            //     iconUrl: 'assets/marker/optimized/' + provider.id + '.webp',

            // });

            let header = ``;
            if (item.capacity !== undefined)
              header += html`
            <div class='marker-header'>
              <span class='station-there'>${item.capacity - item.capacity_free}</span> : <span
                class='station-free'>${item.capacity_free}</span>
            </div>`;

            let smallIcon = new L.DivIcon({
              className: 'marker',
              html: header + html`<img src="assets/marker/optimized/${provider.id}.png">`
            })

            let marker = L.marker(latlng, { icon: smallIcon });
            let infoBox = html`
              <strong>${item.title}</strong>
            `;
            if (item.type.includes("station")) {
              infoBox += html`<br>
  <strong>Prosto:</strong> ${item.capacity_free} <strong>Vozila:</strong> ${item.capacity - item.capacity_free}`
            }
            marker.bindPopup(infoBox);
            return marker;
          },
        });

        provider.layer.addTo(map);

        layerControl.addOverlay(provider.layer, html`<span class="layer-control"><img src="assets/marker/${provider.id}.png"> ${provider.name}</span>`);

      } else {

        console.info("Loaded " + provider.id)

        map.addSource('provider_' + provider.id, { type: 'geojson', data: geojsonObject });
+
        document.querySelectorAll('[data-provider-group]')[0].classList.add("active")

        // add markers to map
        geojsonObject.features.forEach(function (feature) {
          let item = feature.properties;

          let header = ``;
          if (item.capacity !== undefined)
            header += html`
            <div class='marker-header'>
              <span class='station-there'>${item.capacity - item.capacity_free}</span> : <span
                class='station-free'>${item.capacity_free}</span>
            </div>`;

          // create a DOM element for the marker
          var el = document.createElement('span');
          el.innerHTML = header + html`<img src="assets/marker/optimized/${provider.id}.png">`;

          // add marker to map
          new maplibregl.Marker(el)
            .setLngLat(feature.geometry.coordinates)
            .addTo(map);
        });


      }



    });

}
