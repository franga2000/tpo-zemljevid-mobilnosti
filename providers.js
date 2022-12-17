let API_BASE = "https://api.modra.ninja";
let OJPP_BASE = "https://dev.vlak.si";

if (window.location.href.includes("127.0.0.1")) {
	// API_BASE = "http://127.0.0.1:42066";
	// OJPP_BASE = "http://127.0.0.1:8000";
}

let BASE_ICON_SIZE = .6;

class Provider {
	api_url = API_BASE;

	id = undefined;
	group = "unsorted";

	api_name = undefined;
	provider_name = undefined;

	hasHeading = false;
	hasCapacity = false;
	hasCustomIcon = false;
	refreshTime = 0;

	loaded = false;
	visible = false;

	iconSize = BASE_ICON_SIZE;
	allowOverlap = true;
	useCache = true;

	cacheStorage = localStorage;

	async fetch_geojson(coords) {
		let data = await fetch(this.api_url + this.endpoint);
		data = await data.json();
		return data;
	}

	getImages() {
		let imgs = [this.id];
		if (this.hasCapacity)
			imgs.push(this.id + '_capacity')
		if (this.image_id)
			imgs.push(this.image_id);
		return imgs;
	}

	async get_geojson() {
		let str = this.cacheStorage.getItem("cache__" + this.id);
		if (this.useCache && str !== null && str != "null") {
			let geojson = JSON.parse(str);
			setTimeout(() => this.refresh(), 100);
			return geojson;
		} else {
			let geojson =  await this.fetch_geojson();
			if (this.useCache)
				this.cacheStorage.setItem("cache__" + this.id, JSON.stringify(geojson));
			return geojson;
		}
	}

	async make_layer() {
		let layer = {
			id: this.id,
			type: "symbol",
			cluster: true,
			layout: {
				"icon-image": [
					"coalesce",
					["image", this.image_id ? this.image_id : this.id],
					["image", "error_image"],
				],
				"icon-size": [
					'interpolate',
					['linear'],
					['zoom'],
					12,
					this.iconSize * .70,
					13,
					this.iconSize,
				],
				"icon-allow-overlap": this.allowOverlap,
			},
		};

		if (this.hasCapacity) {
			Object.assign(layer.layout, {
				"text-allow-overlap": true,
				"text-size": [
					"step", 
					["zoom"], 
					0, 
					13, // min zoom
					10.5, // text size
				],
				//"icon-text-fit": "width",
				"text-field": [
					"format",
					["get", "vehicles_available"],
					{ "text-color": "green" },
					" : ",
					{ "text-color": "gray" },
					["get", "capacity_free"],
					{ "text-color": "red" },
				],
				"icon-size": [
					"interpolate",
					["linear"],
					["zoom"], 
					13, this.iconSize * .8, 
					13.1, this.iconSize * 1.2,
					20, this.iconSize * 2,
				],
				"icon-image": [
					"step", 
						["zoom"], 
						[
							"coalesce",
							["image", this.id],
							["image", "error_image"],
						], 
						13, // min zoom
						[
							"coalesce",
							["image", this.id + '_capacity'],
							["image", "error_image"],
						],
				],				
			});
			layer.paint = {
				"text-translate": [0, -10],
				"text-translate-anchor": "viewport",
			};
		}

		if (this.hasHeading) layer.layout["icon-rotate"] = ["get", "direction"];

		return layer;
	}

	async load() {
		this.loaded = true;
		let geojsonObject = await this.get_geojson();
		let layerName = this.id;

		let layer = await this.make_layer();

		layer.source = { type: "geojson", data: geojsonObject };

		map.addLayer(layer);

		map.on("click", layerName, async (e) => {
			let panel = await this.getPanel(e.features[0]);
			if (panel != null) {
				showInfoPanel(panel);
			}
		});

		map.on("mouseenter", layerName, async (e) => {
			map.getCanvas().style.cursor = "pointer";
			console.debug(e.features)
			let html = await this.getPopup(e.features[0]);
			
			var coordinates = e.features[0].geometry.coordinates.slice();
			if (html != null)
				popup.setLngLat(coordinates).setHTML(html).addTo(map);
		});

		// Change it back to a pointer when it leaves.
		map.on("mouseleave", layerName, function () {
			map.getCanvas().style.cursor = "";
			popup.remove();
		});
	}

	async refresh() {
		if (!this.visible) return;
		let geojson = await this.fetch_geojson();
		this.cacheStorage.setItem("cache__" + this.id, JSON.stringify(geojson));
		map.getSource(this.id).setData(geojson);
	}

	async getPopup(feature) {
		if (feature.title)
			return feature.title;
		if (feature.name)
			return feature.name;
		return feature.id + " (" + this.id + ")";
	}

	async getPanel(feature) {
		return null;
	}

	async setVisible(visible) {
		if (visible && !this.visible) {
			if (!this.loaded) {
				try {
					await this.load();
				} catch (e) {
					console.error("Error loading provider " + this.id, e)
					return e;
				}
			}
			map.setLayoutProperty(this.id, "visibility", "visible");
			this.visible = true;
		} else if (!visible && this.visible) {
			map.setLayoutProperty(this.id, "visibility", "none");
			this.visible = false;
		}
		return this.visible;
	}

	async toggle() {
		await this.setVisible(!this.visible);
		return this.visible;
	}
}

class LPP_StationProvider extends Provider {
	api_url = "https://cors.proxy.prometko.si/https://data.lpp.si";
	line_colors = {};
	iconSize = BASE_ICON_SIZE * .9;
	allowOverlap = false;
	async fetch_geojson() {
		let r = await fetch(this.api_url + "/api/station/station-details");
		let json = await r.json();
		let geojson = geojson_convert(json.data, {
			id: "int_id",
			lat: "latitude",
			lng: "longitude",
		});
		return geojson;
	}
	async getPopup(feature) {
		let station = feature.properties;

		let routes = '';
		for (let line of JSON.parse(station.route_groups_on_station)) 
			routes += html`<span class="line line-${this.id} line-${line}" style="background-color:#${this.line_colors[line] || 'aaa'}">${line}</span>`;

		return html`
			<strong>${station.name}</strong><br>
			${routes}
		`;
	}
	async getPanel(feature) {
		let station = feature.properties;

		let routes = '';
		for (let line of JSON.parse(station.route_groups_on_station)) 
			routes += html`<span class="line line-${this.id} line-${line}" style="background-color:#${this.line_colors[line] || 'aaa'}">${line}</span>`;

		return {
			title: station.name,
			subtitle: `<div class="lines">${routes}</div>`
		};
	}
}

class RideshareProvider extends Provider {
	text_vehicles = 'Kolesa';
	vehiclesEndpoint = undefined;

	async getPopup(feature) {
		let station = feature.properties;
		return html`
			<strong>${station.title}</strong><br>
			<strong>${this.text_vehicles}:</strong> ${station.vehicles_available} <strong>Prosto:</strong> ${station.capacity_free}
		`;
	}
	async getPanel(feature) {
		let station = feature.properties;
		let panel = {
			title: station.title,
			subtitle: station.address,
		}
		if (station.image_url)
			panel.image_url = station.image_url;
		
		panel.body = `
			<strong>${this.text_vehicles}:</strong> ${station.vehicles_available} <strong>Prosto:</strong> ${station.capacity_free}
			<hr>
			<div id="info-panel-vehicles" class="vehicle-list"></div>
		`
		
		showInfoPanel(panel);

		if (this.vehiclesEndpoint)
			fetch(this.api_url + `${this.vehiclesEndpoint}?station_id=${station.id}`).then(r => r.json()).then(vehicles => {
				let $_vehicles = "";
				for (let vehicle of vehicles) {
					let image = "";
					if (vehicle.image_url)
						image = `<img src="${vehicle.image_url}" alt="">`;

					$_vehicles += html`
						<div class="vehicle">
							${image}
							<div class="flex-main">
								<div><strong>${vehicle.model}</strong></div>
								<small>
									${vehicle.price_minimum ? vehicle.price_minimum + " € + " : ""}
									${vehicle.price_per_min ? vehicle.price_per_min + " €/min" : ""}
									${vehicle.price_per_km ? vehicle.price_per_km + " €/km" : ""}	
								</small>
							</div>
							<div>
								<div><strong>Baterija:</strong> ${vehicle.charge_level} %</div>
								<div><strong>Doseg:</strong> ~${vehicle.range_estimate} km</div>
							</div>
						</div>
					`
				}
				document.getElementById("info-panel-vehicles").innerHTML = $_vehicles;
			})
	}

}

const PROVIDERS = {
	lpp_postaje: new (class lpp_postaje extends LPP_StationProvider {
		id = "lpp_postaje";
		group = "mestni_postaje";
		name = "LPP postaje";
		line_colors = { "1": "C93336", "2": "8C8841", "3": "EC593A", "5": "9F539E", "6": "939598", "7": "1CBADC", "8": "116AB0", "9": "86AACD", "11": "EDC23B", "12": "214AA0", "13": "CFD34D", "14": "EF59A1", "15": "A2238E", "18": "895735", "19": "EA9EB4", "20": "1F8751", "21": "52BA50", "22": "F6A73A", "24": "ED028C", "25": "0F95CA", "26": "231F20", "27": "57A897", "30": "9AD2AE", "40": "496E6D", "42": "A78B6B", "43": "4E497A", "44": "817EA8", "51": "6C8BC6", "52": "00565D", "53": "C7B3CA", "56": "953312", "60": "ACBB71", "61": "F9A64A", "71": "6C8BC6", "72": "4CA391", "73": "FECA0A", "78": "C96D6A", "16": "582C81", "23": "40AE49",}
	})(),
	marprom_postaje: new (class marprom_postaje extends LPP_StationProvider {
		id = "marprom_postaje";
		group = "mestni_postaje";
		name = "Marprom postaje";
		api_url = "https://marprom.modra.ninja";
		async getPanel(feature) {
			let panel = await super.getPanel(feature);
			let station = feature.properties;
			if (station._station_num != "null")
				panel.image = {src: `https://www.marprom.si/webmap/website/assets/img/postaje/s${station._station_num}.jpg`};
			return panel;
		}
	})(),
	arriva_koper_postaje: new (class arriva_koper_postaje extends Provider {
		group = "mestni_postaje";
		id = "arriva_koper_postaje";
		name = "Arriva Koper postaje";
		image_id = "arriva_postaje";
		iconSize = BASE_ICON_SIZE * .9;
		allowOverlap = false;
		async get_geojson() {
			let res = await fetch('https://cors.proxy.prometko.si/http://pic.tekaso.si/geoserver/koper/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=koper%3AAvtobusnaPostajalisca&outputFormat=application%2Fjson');
			let geojson = await res.json();
			return geojson;
		}
		async getPopup(feature) {
			let station = feature.properties;
			return html`
				<strong>${station.ime_postaje}</strong>
			`;
		}
	})(),
	nomago_celje_postaje: new (class nomago_celje_postaje extends Provider {
		group = "mestni_postaje";
		id = "nomago_celje_postaje";
		name = "Nomago Celje postaje";
		image_id = "nomago_postaje";
		iconSize = BASE_ICON_SIZE * .9;
		allowOverlap = false;
		async get_geojson() {
			let res = await fetch('https://cors.proxy.prometko.si/https://prostor.celje.si/ows/public/wfs?SERVICE=WFS&REQUEST=GetFeature&VERSION=2.0.0&TYPENAMES=public:int_promet_bus_postaje&outputFormat=application%2Fjson&srsName=EPSG:4326');
			let geojson = await res.json();
			return geojson;
		}
		async getPopup(feature) {
			let station = feature.properties;
			return html`
				<strong>${station.ime_postaje}</strong>
			`;
		}
	})(),
	nomago_bikes: new (class nomago_bikes extends RideshareProvider {
		id = "nomago_bikes";
		group = "nomago_bikes";
		endpoint = "/nextbike/SI/stations";
		name = "Nomago Bikes";
		hasCapacity = true;
	})(),
	sharengo: new (class sharengo extends Provider {
		id = "sharengo";
		group = "sharengo";
		endpoint = "/sharengo/cars";
		name = "Share'N Go";
	})(),
	greengo: new (class greengo extends Provider {
		id = "greengo";
		group = "greengo";
		endpoint = "/greengo/cars";
		name = "GreenGo";
	})(),
	bicikelj: new (class bicikelj extends RideshareProvider {
		id = "bicikelj";
		group = "europlakat";
		endpoint = "/jcdecaux/ljubljana/stations";
		name = "BicikeLJ";
		hasCapacity = true;
	})(),
	mbajk: new (class mbajk extends RideshareProvider {
		id = "mbajk";
		group = "europlakat";
		endpoint = "/jcdecaux/maribor/stations";
		name = "MBajk";
		hasCapacity = true;
	})(),
	avant2go: new (class avant2go extends RideshareProvider {
		id = "avant2go";
		group = "avant2go";
		endpoint = "/avant2go/stations";
		vehiclesEndpoint = "/avant2go/vehicles";
		name = "Avant2Go";
		hasCapacity = true;
		text_vehicles = 'Vozila'
	})(),
	lpp_lokacije: new (class lpp_postaje extends Provider {
		id = "lpp_lokacije";
		group = "mestni_lokacije";
		name = "LPP lokacije";
		line_colors = { "1": "C93336", "2": "8C8841", "3": "EC593A", "5": "9F539E", "6": "939598", "7": "1CBADC", "8": "116AB0", "9": "86AACD", "11": "EDC23B", "12": "214AA0", "13": "CFD34D", "14": "EF59A1", "15": "A2238E", "18": "895735", "19": "EA9EB4", "20": "1F8751", "21": "52BA50", "22": "F6A73A", "24": "ED028C", "25": "0F95CA", "26": "231F20", "27": "57A897", "30": "9AD2AE", "40": "496E6D", "42": "A78B6B", "43": "4E497A", "44": "817EA8", "51": "6C8BC6", "52": "00565D", "53": "C7B3CA", "56": "953312", "60": "ACBB71", "61": "F9A64A", "71": "6C8BC6", "72": "4CA391", "73": "FECA0A", "78": "C96D6A", "16": "582C81", "23": "40AE49",}
		hasHeading = true;
		refreshTime = 15;
		useCache = false;
		async fetch_geojson() {
			let r = await fetch(
				"https://mestnipromet.cyou/api/v1/resources/buses/info"
			);
			let json = await r.json();
			let geojson = geojson_convert(json.data, {
				id: "bus_id",
				lat: "latitude",
				lng: "longitude",
			});
			return geojson;
		}
		async getPopup(feature) {
			let bus = feature.properties;
			return html`
				<strong><span class="line" style="background-color:#${this.line_colors[bus.line_number] || 'aaa'}">${bus.line_number}</span> ${bus.line_name}</strong><br>
				<strong>Proti:</strong> ${bus.line_destination}
			`;
		}
		async getPanel(feature) {
			let bus = feature.properties;
			if (bus.trip_id)
				this.showTrip(bus);
			return {
				title: html`<span class="line" style="background-color:#${this.line_colors[bus.line_number] || 'aaa'}">${bus.line_number}</span> ${bus.line_name}`,
				image: {src: `https://mestnipromet.cyou/tracker/img/avtobusi/${bus.bus_name.split("-")[1]}.jpg`},
				body: html`
					<strong>Proti:</strong> ${bus.line_destination}
				`
			};
		}
		async make_layer() {
			let layer = await super.make_layer();
			(layer.filter = ["!=", ["get", "trip_id"], null]),
				Object.assign(layer.layout, {
					"text-allow-overlap": false,
					"icon-size": this.iconSize,
					"text-size": [
						"step", 
						["zoom"], 
						0, 
						12, // min zoom
						9.5, // text size
					],
					"text-field": ["get", "line_number"],
					"text-font": ["Open Sans Bold","Arial Unicode MS Bold"],
					"icon-rotation-alignment": "map",
					"icon-size": [
						'interpolate',
						['linear'],
						['zoom'],
						 8, this.iconSize * .1,
						 10, this.iconSize,
						20, this.iconSize * 1.5,
					],
				});

			layer.paint = {
				"text-translate": [0, 0],
				"text-translate-anchor": "viewport",
				"text-halo-color": "#1d7b4e",
				"text-halo-width": 3,
				"text-color": "white",

			};

			return layer;
		}
		async showTrip(bus) {
			let r = await fetch('https://mestnipromet.cyou/api/v1/resources/buses/shape?trip_id=' + bus.trip_id);
			let json = await r.json();
			let coords = fixCoordOrder(json.data);
			let geojson = {
				'type': 'Feature',
				'properties': {
					'color': '#' + (this.line_colors[bus.line_number] || 'aaa'),
				},
				'geometry': {
					"type": "LineString",
					"coordinates": coords,
				}
			};
			console.debug(geojson)
			map.getSource('lines').setData(geojson);
			//zoomToGeoJSON({features:[geojson]});
		}
	})(),
	sz_lokacije: new (class sz_lokacije extends Provider {
		id = "sz_lokacije";
		group = "sz_lokacije";
		name = "SŽ lokacije";
		refreshTime = 16;
		useCache = false;
		async fetch_geojson() {
			let r = await fetch(
				"https://api.map.vlak.si/SI/sz/trips/active"
			);
			let json = await r.json();
			let features = [];
			for (let item of json.data) {
				features.push({
					"type":"Feature",
					"geometry":{"coordinates":[item['coordinates']['lng'],item['coordinates']['lat']],"type":"Point"},
					"properties":item,
					"id":item['train_number'],
					"bbox":null
				})
			}
			return {"type":"FeatureCollection","features": features};
		}
		async getPopup(feature) {
			let train = feature.properties;
			return html`
				<strong>${train.train_name}</strong><br>
				<strong>Vlak:</strong> ${train.train_type} ${train.train_number} (${train.train_model})<br>
				<strong>Zamuda:</strong> ${train.delay} min
			`;
		}
		async getPanel(feature) {
			let train = feature.properties;
			let typ = train.train_model.slice(0, 3);
			let title = train.train_type + " " + train.train_no;
			setTimeout(() => this.showTrip(train), 0);
			return {
				title: `<img src="https://mestnipromet.cyou/tracker/img/sz/mini/sz${typ}.png" onerror=”this.onerror=null;this.src='https://mestnipromet.cyou/tracker/img/sz/mini/unknown.png'>${title} <br><small>${train.route}</small>`,
				subtitle: "<small>Podatki o lokaciji so le približni!</small>",
			}
		}
		async showTrip(train) {
			let r = await fetch('https://mestnipromet.cyou/api/v1/resources/sz/geometry?route=' + train.train_no);
			let json = await r.json();
			let coords = fixCoordOrder(json.data);
			let geojson = {
				'type': 'Feature',
				'properties': {
					'color': '#3da5e7',
				},
				'geometry': {
					"type": "LineString",
					"coordinates": coords,
				}
			};
			map.getSource('lines').setData(geojson);
			//zoomToGeoJSON({features:[geojson]});
		}
	})(),
	ijpp_lokacije: new (class ijpp_lokacije extends Provider {
		id = "ijpp_lokacije";
		group = "ijpp_lokacije";
		name = "IJPP lokacije";
		refreshTime = 10;
		useCache = false;
		hasHeading = true;
		async fetch_geojson() {
			let r = await fetch(
				`${OJPP_BASE}/api/vehicle_locations?active=1&exclude_lpp=1`
			);
			return await r.json()
		}
		async getPopup(feature) {
			let train = feature.properties;
			return html`
				<strong>${train.route_name}</strong><br>
			`;
		}
		async getPanel(feature) {
			let train = feature.properties;
			setTimeout(() => this.showTrip(train), 0);
			return {
				title: `<img src="${OJPP_BASE}/operators/${train.operator_id}/logo_square">${train.route} <br><small>${train.operator_name}</small>`,
				body: `
				<strong>oJPP:</strong> <a href="${OJPP_BASE}/vehicles/${train.vehicle_id}" target="_blank">#${train.vehicle_id}</a><br>
				<strong>Model:</strong> ${train.model_name}<br>
				<strong>Linija:</strong>${train.route_name}<br>
				`,
			}
		}
		async showTrip(train) {
			let r = await fetch(`${OJPP_BASE}/api/routes/${train.route_id}?geometry=1`);
			let json = await r.json();
			let coords = fixCoordOrder(json.data);
			let geojson = {
				'type': 'Feature',
				'properties': {
					'color': '#3da5e7',
				},
				'geometry': {
					"type": "LineString",
					"coordinates": coords,
				}
			};
			map.getSource('lines').setData(geojson);
			//zoomToGeoJSON({features:[geojson]});
		}
	})(),
	scbikes: new (class scbikes extends RideshareProvider {
		id = "scbikes";
		group = "kolesa_ostali";
		endpoint = "/scbikes/stations";
		name = "SCBikes";
		async make_layer() {
			let layer = await super.make_layer();
			layer.layout['icon-image'] = [
				"coalesce",
				["image", ['concat', 
					'scbikes_', 
					['get', 'system']
				]],
				["image", this.id],
			];

			return layer;
		}
	})(),
	micikel: new (class micikel extends RideshareProvider {
		id = "micikel";
		group = "kolesa_ostali";
		endpoint = "/micikel/stations";
		name = "micikel";
	})(),
};

function normalize(text) {
	return text.toLowerCase();
}

async function search(text) {
	text = normalize(text);
	if (text.length < 1) return [];
	let results = [];
	for (let provider of Object.values(PROVIDERS)) {
		if (!provider.visible) continue;
		for (let feature of map.getSource(provider.id)._data.features || []) {
			let title = feature.properties.title || feature.properties.name || "";
			if (normalize(title).indexOf(text) >= 0)
				results.push({
					id: feature.id,
					title: title,
					provider: provider.name,
					feature: feature.properties,
					coordinates: feature.geometry.coordinates,
				})
		}
	}

	let res = await fetch(`https://cors.proxy.prometko.si/https://maps.googleapis.com/maps/api/place/autocomplete/json?key=${GOOGLE_API_KEY}&components=country:si&input=${text}`);
	let googleResults = await res.json();
	for (let prediction of googleResults.predictions) {
		results.push({
			id: prediction.place_id,
			title: prediction.structured_formatting.main_text,
			provider: '_googlePlaces',
			feature: prediction,
		})
	}	
	return results;
}

let SECTIONS = [
	{
		title: "Izposoja koles",
		icon: "bike",
		provider_groups: [
			{
				name: "europlakat",
			},
			{
				name: "nomago_bikes",
			},
			{
				name: "kolesa_ostali",
			},
		],
	},
	{
		title: "Javni prevoz",
		icons: "bus",
		provider_groups: [
			{
				name: "mestni_postaje",
			},
			{
				name: "sz_postaje",
			},
			{
				name: "ijpp_postaje",
			},
		],
	},
	{
		title: "Izposoja avtomobilov",
		icons: "car",
		provider_groups: [
			{
				name: "avant2go",
			},
			{
				name: "sharengo",
			},
			{
				name: "greengo",
			},
		],
	},
	{
		title: "Lokacije vozil",
		icons: "gps",
		provider_groups: [
			{
				name: "mestni_lokacije",
			},
			{
				name: "ijpp_lokacije",
			},
			{
				name: "sz_lokacije",
			},
		],
	},
];

async function groupSetVisible(group_name, visible) {
	let providers = Object.values(PROVIDERS).filter(p => p.group === group_name);
	let $el = document.querySelector(`.provider-group-toggle[data-provider-group="${group_name}"]`);

	if (visible === undefined)
		visible = !$el.classList.contains("active");
	
	$el.classList.add("loading");

	let groupVisible = false;

	for (let provider of providers) {
		let res = await provider.setVisible(visible);
		if (res === true)
			groupVisible = true;
	}

	$el.classList.remove("loading");
	$el.classList.toggle("active", groupVisible);

	console.debug(group_name, providers, groupVisible)

	let hidden_groups = JSON.parse(localStorage.getItem('hidden_groups') || "[]");
	
	if (hidden_groups.includes(group_name) && groupVisible)
		hidden_groups.remove(group_name);
	else if (!hidden_groups.includes(group_name) && !groupVisible)
		hidden_groups.push(group_name);
	
	localStorage.setItem('hidden_groups', JSON.stringify(hidden_groups));

}

async function load_all() {
	let hidden_groups = JSON.parse(localStorage.getItem("hidden_groups"));
	if (hidden_groups === null) {
		hidden_groups = [];
		localStorage.setItem("hidden_groups", "[]");
	}

	for (let provider of Object.values(PROVIDERS)) {
		// provider.setVisible(!hidden_groups.includes(provider.id));
		if (provider.refreshTime > 0)
			setInterval(async () => {
				if (!document.hidden)
					await provider.refresh()
			}, provider.refreshTime * 1000);
	}

	for (let section of SECTIONS) 
		for (let provider_group of section.provider_groups)
			if (!hidden_groups.includes(provider_group.name))
				await groupSetVisible(provider_group.name, true)
	return null
}
