let API_BASE = "https://api.modra.ninja";

if (window.location.href.includes("127.0.0.1")) {
	//API_BASE = "http://127.0.0.1:42066";
}

class Provider {
	api_url = API_BASE;

	api_name = undefined;
	provider_name = undefined;

	hasHeading = false;
	hasCapacity = false;
	hasCustomIcon = false;
	refreshTime = 0;

	loaded = false;
	visible = false;

	async fetch_geojson(coords) {
		let data = await fetch(this.api_url + this.endpoint);
		data = await data.json();
		return data;
	}

	async make_layer() {
		let layer = {
			id: this.id,
			type: "symbol",
			cluster: true,
			layout: {
				"icon-image": this.hasCustomIcon ? ["get", "icon"] : this.id,
				"icon-size": 0.3,
				"icon-allow-overlap": true,
			},
		};

		if (this.hasCapacity) {
			Object.assign(layer.layout, {
				"text-allow-overlap": true,
				"text-size": 10,
				"text-field": [
					"format",
					["get", "capacity_free"],
					{ "text-color": "green" },
					" : ",
					{ "text-color": "gray" },
					["get", "capacity"],
					{ "text-color": "red" },
				],
			});
			layer.paint = {
				"text-translate": [0, -16],
				"text-translate-anchor": "viewport",
			};
		}

		if (this.hasHeading) layer.layout["icon-rotate"] = ["get", "direction"];

		return layer;
	}

	async load() {
		this.loaded = true;
		let geojsonObject = await this.fetch_geojson();
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
			if (html != null)
				popup.setLngLat(e.lngLat).setHTML(html).addTo(map);
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
		map.getSource(this.id).setData(geojson);
	}

	async getPopup(feature) {
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
				await this.load();
			}
			map.setLayoutProperty(this.id, "visibility", "visible");
			this.visible = true;
		} else if (!visible && this.visible) {
			map.setLayoutProperty(this.id, "visibility", "none");
			this.visible = false;
		}
	}

	async toggle() {
		await this.setVisible(!this.visible);
		return this.visible;
	}
}

class LPP_StationProvider extends Provider {
	api_url = "https://cors.proxy.prometko.si/https://data.lpp.si";
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
			routes += html`<span class="line line-${this.id} line-${line}">${line}</span>`;

		return html`
			<strong>${station.name}</strong><br>
			${routes}
		`;
	}
	async getPanel(feature) {
		let station = feature.properties;

		let routes = '';
		for (let line of JSON.parse(station.route_groups_on_station)) 
			routes += html`<span class="line line-${this.id} line-${line}">${line}</span>`;

		return {
			title: station.name,
			subtitle: routes
		};
	}
}

class BikeshareProvider extends Provider {
	async getPopup(feature) {
		let station = feature.properties;
		return html`
			<strong>${station.title}</strong><br>
			<strong>Kolesa:</strong> ${station.capacity - station.capacity_free} <strong>Prosto:</strong> ${station.capacity_free}
		`;
	}
}

const PROVIDERS = {
	nomago_bikes: new (class nomago_bikes extends BikeshareProvider {
		id = "nomago_bikes";
		endpoint = "/nextbike/SI/stations";
		name = "Nomago Bikes";
		hasCapacity = true;
	})(),
	sharengo: new (class sharengo extends Provider {
		id = "sharengo";
		endpoint = "/sharengo/cars";
		name = "Share'N Go";
	})(),
	bicikelj: new (class bicikelj extends BikeshareProvider {
		id = "bicikelj";
		endpoint = "/jcdecaux/ljubljana/stations";
		name = "BicikeLJ";
		hasCapacity = true;
	})(),
	mbajk: new (class mbajk extends Provider {
		id = "mbajk";
		endpoint = "/jcdecaux/maribor/stations";
		name = "MBajk";
		hasCapacity = true;
	})(),
	avant2go: new (class avant2go extends Provider {
		id = "avant2go";
		endpoint = "/avant2go/stations";
		name = "Avant2Go";
		hasCapacity = true;
	})(),
	lpp_postaje: new (class lpp_postaje extends LPP_StationProvider {
		id = "lpp_postaje";
		name = "LPP postaje";
		line_colors = { "1": "C93336", "2": "8C8841", "3": "EC593A", "5": "9F539E", "6": "939598", "7": "1CBADC", "8": "116AB0", "9": "86AACD", "11": "EDC23B", "12": "214AA0", "13": "CFD34D", "14": "EF59A1", "15": "A2238E", "18": "895735", "19": "EA9EB4", "20": "1F8751", "21": "52BA50", "22": "F6A73A", "24": "ED028C", "25": "0F95CA", "26": "231F20", "27": "57A897", "30": "9AD2AE", "40": "496E6D", "42": "A78B6B", "43": "4E497A", "44": "817EA8", "51": "6C8BC6", "52": "00565D", "53": "C7B3CA", "56": "953312", "60": "ACBB71", "61": "F9A64A", "71": "6C8BC6", "72": "4CA391", "73": "FECA0A", "78": "C96D6A", "16": "582C81", "23": "40AE49",}
	})(),
	lpp_lokacije: new (class lpp_postaje extends Provider {
		id = "lpp_lokacije";
		name = "LPP lokacije";
		hasHeading = true;
		refreshTime = 15;
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
				<strong>${bus.line_number} ${bus.line_name}</strong><br>
				<strong>Proti:</strong> ${bus.line_destination}
			`;
		}
		async getPanel(feature) {
			let bus = feature.properties;
			if (bus.trip_id)
				this.showTrip(bus.trip_id);
			return {
				title: html`<span class="line line-${bus.line_number}">${bus.line_number}</span> ${bus.line_name}`,
				image: {src: `https://mestnipromet.cyou/tracker/img/avtobusi/${bus.bus_name.split("-")[1]}.jpg`},
				body: html`
					<strong>${bus.line_number} ${bus.line_name}</strong><br>
					<strong>Proti:</strong> ${bus.line_destination}
				`
			};
		}
		async make_layer() {
			let layer = await super.make_layer();
			(layer.filter = ["!=", ["get", "trip_id"], null]),
				Object.assign(layer.layout, {
					"text-allow-overlap": true,
					"text-size": 8,
					"icon-size": 0.4,
					"text-field": [
						"format",
						["get", "line_number"],
						{ "text-color": "white" },
					],
				});

			layer.paint = {
				"text-translate": [0, 3],
				"text-translate-anchor": "viewport",
				"text-halo-color": "#1d7b4e",
				"text-halo-width": 3,
			};

			return layer;
		}
		async showTrip(trip_id) {
			let r = await fetch('https://mestnipromet.cyou/api/v1/resources/buses/shape?trip_id=' + trip_id);
			let json = await r.json();
			let geojson = {
				'type': 'Feature',
				'properties': {},
				'geometry': {
					"type": "LineString",
					"coordinates": json.data,
				}
			};
			map.getSource('lines').setData(geojson);
		}
	})(),
	marprom_postaje: new (class marprom_postaje extends LPP_StationProvider {
		id = "marprom_postaje";
		name = "Marprom postaje";
		api_url = "https://marprom.modra.ninja";
		async getPanel(feature) {
			let panel = await super.getPanel(feature);
			let station = feature.properties;
			console.debug(station._station_num)
			if (station._station_num != "null")
				panel.image = {src: `https://www.marprom.si/webmap/website/assets/img/postaje/s${station._station_num}.jpg`};
			return panel;
		}
	})(),
	sz_lokacije: new (class lpp_postaje extends Provider {
		id = "sz_lokacije";
		name = "LPP lokacije";
		async fetch_geojson() {
			let r = await fetch(
				"https://mestnipromet.cyou/api/v1/resources/sz/locations"
			);
			let json = await r.json();
			let geojson = geojson_convert(json.data, {
				id: "train_no",
				lat: "latitude",
				lng: "longitude",
			});
			return geojson;
		}
		async getPopup(feature) {
			let train = feature.properties;
			return html`
				<strong>${train.route}</strong><br>
				<strong>Vlak:</strong> ${train.train_type} ${train.train_no} (${train.train_model})<br>
				<strong>Zamuda:</strong> ${train.delay} min
			`;
		}
	})(),
	gorenjska: new (class gorenjska extends Provider {
		id = "gorenjska";
		endpoint = "/scbikes/stations?system=gorenjska";
		name = "gorenjska";
	})(),
	micikel: new (class micikel extends Provider {
		id = "micikel";
		endpoint = "/micikel/stations";
		name = "micikel";
	})(),
};

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
				name: "nomago_bikes",
				providers: ["nomago_bikes"],
			},
			{
				name: "ostali",
				providers: [
					"krskolesom",
					"gorenjska",
					"soboskibiciklin",
					"posbikes",
					"micikel",
				],
			},
		],
	},
	{
		title: "Javni prevoz",
		icons: "bus",
		provider_groups: [
			{
				name: "lpp_postaje",
				providers: ["lpp_postaje", "marprom_postaje"],
			},
			{
				name: "sz_postaje",
				providers: ["sz_postaje"],
			},
			{
				name: "ijpp_postaje",
				providers: ["ijpp_postaje"],
			},
		],
	},
	{
		title: "Izposoja avtomobilov",
		icons: "car",
		provider_groups: [
			{
				name: "avant2go",
				providers: ["avant2go"],
			},
			{
				name: "sharengo",
				providers: ["sharengo"],
			},
		],
	},
	{
		title: "Lokacije vozil",
		icons: "gps",
		provider_groups: [
			{
				name: "mestni_lokacije",
				providers: ["lpp_lokacije"],
			},
			{
				name: "ijpp_lokacije",
				providers: ["ijpp_lokacije"],
			},
			{
				name: "sz_lokacije",
				providers: ["sz_lokacije"],
			},
		],
	},
];

function load_all() {
	let hidden_providers = JSON.parse(localStorage.getItem("hidden_providers"));
	if (hidden_providers === null) {
		hidden_providers = [];
		localStorage.setItem("hidden_providers", "[]");
	}

	for (let provider of Object.values(PROVIDERS)) {
		provider.setVisible(!hidden_providers.includes(provider.id));
		if (provider.refreshTime > 0)
			setInterval(provider.refresh.bind(provider), provider.refreshTime * 1000);
	}
}
