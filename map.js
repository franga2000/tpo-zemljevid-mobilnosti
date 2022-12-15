var map = new maplibregl.Map({
	container: 'map',
	//style: 'https://api.maptiler.com/maps/basic-v2/style.json?key=8tDQz5wMQ3NjP4jqmQSN',
	style: 'https://api.maptiler.com/maps/streets/style.json?key=8tDQz5wMQ3NjP4jqmQSN',
	center: [14.505, 46.051],
	zoom: 11,
	minZoom: 6,
	renderWorldCopies: false,
	hash: true,
});

var nav = new maplibregl.NavigationControl();
map.addControl(nav, 'top-right');

var scale = new maplibregl.ScaleControl({
	maxWidth: 80,
	unit: 'metric'
});
map.addControl(scale);

var popup = new maplibregl.Popup({
	closeButton: false,
	closeOnClick: false
});

for (let provider in PROVIDERS) {
	map.loadImage(`assets/marker/optimized/${provider}.webp`, function (error, image) {
		if (error) throw error;
		if (!map.hasImage(provider)) map.addImage(provider, image);
	});
}

map.addControl(new maplibregl.GeolocateControl({
	positionOptions: {
		enableHighAccuracy: true
	},
	trackUserLocation: true
}));

map.on('load', function () {

	// Start loading provider asynchronously
	load_all()

	//
	// 3D buildings
	//

	// Insert the layer beneath any symbol layer.
	var layers = map.getStyle().layers;

	var labelLayerId;
	for (var i = 0; i < layers.length; i++) {
		if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
			labelLayerId = layers[i].id;
			break;
		}
	}


	map.addLayer(
		{
			'id': '3d-buildings',
			'source': 'openmaptiles',
			'source-layer': 'building',
			'filter': ['==', 'extrude', 'true'],
			'type': 'fill-extrusion',
			'minzoom': 15,
			'paint': {
				'fill-extrusion-color': '#aaa',

				// use an 'interpolate' expression to add a smooth transition effect to the
				// buildings as the user zooms in
				'fill-extrusion-height': [
					'interpolate',
					['linear'],
					['zoom'],
					15,
					0,
					15.05,
					['get', 'height']
				],
				'fill-extrusion-base': [
					'interpolate',
					['linear'],
					['zoom'],
					15,
					0,
					15.05,
					['get', 'min_height']
				],
				'fill-extrusion-opacity': 0.6
			}
		},
		labelLayerId
	);

	//
	// Route line layer
	//

	map.addSource("lines", {
		"type": "geojson",
		"data": {
			"type": "Feature",
			"properties": {},
			"geometry": {
				"type": "LineString",
				"coordinates": [

				]
			}
		}
	})
	map.addLayer({
		"id": "lines_bottom",
		"type": "line",
		"source": 'lines',
		"paint": {
			"line-color": "#F88",
			"line-width": 8
		}
	});

	if (true) {
		map.addLayer({
			"id": "lines_top",
			"type": "line",
			"source": 'lines',
			"layout": {
				"line-join": "round",
				"line-cap": "butt"
			},
			"paint": {
				"line-color": "#888",
				"line-width": 8
			}
		});

		var dashLength = -1.5;
		var gapLength = -2;

		// We divide the animation up into 40 steps to make careful use of the finite space in
		// LineAtlas
		var steps = 40;
		// A # of steps proportional to the dashLength are devoted to manipulating the dash
		var dashSteps = steps * dashLength / (gapLength + dashLength);
		// A # of steps proportional to the gapLength are devoted to manipulating the gap
		var gapSteps = steps - dashSteps;

		// The current step #
		var step = 0;

		let start = undefined;
		function animate(timestamp) {
			if (start === undefined)
				start = timestamp;
			
			step = (timestamp - start)/25;
			//step = step + 1;
			if (step >= steps) start = timestamp;

			var t, a, b, c, d;
			if (step < dashSteps) {
				t = step / dashSteps;
				a = (1 - t) * dashLength;
				b = gapLength;
				c = t * dashLength;
				d = 0;
			} else {
				t = (step - dashSteps) / (gapSteps);
				a = 0;
				b = (1 - t) * gapLength;
				c = dashLength;
				d = t * gapLength;
			}

			map.setPaintProperty("lines_top", "line-dasharray", [a, b, c, d]);

			window.requestAnimationFrame(animate);
		};

		window.requestAnimationFrame(animate);
	}


}); // end: load

map.on('styleimagemissing', (e) => {
	const rgb = [255, 100, 100];
	 
	const width = 64; // The image will be 64 pixels square.
	const bytesPerPixel = 4; // Each pixel is represented by 4 bytes: red, green, blue, and alpha.
	const data = new Uint8Array(width * width * bytesPerPixel);
	 
	for (let x = 0; x < width; x++) {
		for (let y = 0; y < width; y++) {
			const offset = (y * width + x) * bytesPerPixel;
			data[offset + 0] = rgb[0]; // red
			data[offset + 1] = rgb[1]; // green
			data[offset + 2] = rgb[2]; // blue
			data[offset + 3] = 255; // alpha
		}
	}
	 
	map.addImage(e.id, { width: width, height: width, data: data });
});

