const GOOGLE_API_KEY = "AIzaSyDdmz_fdXT1G84423IYIkgp5SxlCHKvUo8";

async function onSearch(field) {
	let nodes = [...field.parentElement.parentElement.children]
	let index = nodes.indexOf(field.parentElement);
	
	let results = await search(field.value.trim());

	let $_results = "";
	for (let result of results) {
		$_results += html`
		<div class="search-result" data-provider="${result.provider}" data-id="${result.id}" data-title="${result.title}" data-coordinates="${result.coordinates}">
			<strong>${result.title}</strong><br>
			<small>${result.provider}</small>
		</div>`
	}

	if (results.length < 1)
		hideInfoPanel()
	else
		showInfoPanel(`<div id="search-results">${$_results}</div>`);

	// document.getElementById("search-results").innerHTML = $_results;
	//document.getElementById("search-results").dataset.searchIndex = index;

	for (let $result of document.getElementsByClassName("search-result")) {
    

        let _callback = async e => {
			console.debug(index)
            let $search = document.getElementById("search-fields").children[index];
			$search.getElementsByTagName("input")[0].value = $result.dataset.title;
			$search.dataset.provider = $result.dataset.provider;
			$search.dataset.id = $result.dataset.id;
            $search.dataset.latLngString = $result.dataset.coordinates.split(",").reverse().join(",");

			document.getElementById("search-results").innerHTML = "";
            updateNavigation();

			// PROVIDERS[provider].
		};
        let callback = _callback;

        if ($result.dataset.provider == '_googlePlaces') {
            console.debug("googl");
            callback = async e => {
                let r = await fetch(`https://cors.proxy.prometko.si/https://maps.googleapis.com/maps/api/place/details/json?key=${GOOGLE_API_KEY}&fields=geometry&place_id=${$result.dataset.id}`)
                let place = await r.json();
                console.debug(place, place)
                $result.dataset.coordinates = [place.result.geometry.location.lng, place.result.geometry.location.lat];
                return await _callback(e);
            }
        }

        console.debug(callback);

        $result.addEventListener('click', callback);
    }
		
}

function searchField() {
	let $searchBar = document.createElement("div");
	$searchBar.classList.add("search-bar");
	$searchBar.innerHTML = html`
		<span class="drag-handle">⣶</span>
		<input type="text" placeholder="Iskanje" oninput="debounce(onSearch)(this)">
		<button class="clear-search-btn" onclick="this.parentElement.remove()">×</button>
		<button class="add-search-btn" onclick="addSearchAfter(this.parentElement)">+</button>
	`;
	return $searchBar;
}

function addSearchAfter($searchBar) {
	insertAfter(searchField(), $searchBar)
}


function updateNavigation() {
    let list = [];
	for (let $search of document.getElementsByClassName("search-bar")) 
		list.push($search.dataset.latLngString);
	
    if (list.length < 2) {
        hideInfoPanel();
        return;
    };

    let url = "https://otp.ojpp.derp.si/otp/routers/default/plan?";
    url += `fromPlace=${list[0]}&toPlace=${list[1]}`
    
    fetch(url).then(e => e.json()).then(displayNavigation);
}

window.NavigationState = {
    itineraries: [],
}

function displayNavigation(response) {
    NavigationState.itineraries = response.plan.itineraries;

    let $_nagivation = ""
    let index = 0;
    for (let itinerary of NavigationState.itineraries) {
        let $_itinerary = `<div class="itinerary" data-itinerary-index="${index}" onclick="onItineraryClick(parseInt(this.dataset.itineraryIndex))">`;
        
        let lastEnd = response.plan.date;
        $_itinerary += `<div class="legs">`
        let full_duration = (itinerary.endTime - itinerary.startTime) / 1000;
        for (let leg of itinerary.legs) {
            let percent = (leg.duration / full_duration * 100).toFixed(4);
            let gap = (leg.startTime - lastEnd) / 1000;
            let gapPercent = (leg.startTime/1000, lastEnd/1000, gap / full_duration * 100).toFixed(4);
            console.debug(full_duration, gap, leg.mode)
            lastEnd = leg.endTime;
            $_itinerary += `<span class="leg leg-GAP" style="width:${gapPercent}%;"></span>`
            $_itinerary += `<span class="leg leg-${leg.mode}" style="width:${percent}%; background-color: ${MODE_COLORS[leg.mode] || "black"}">${leg.routeShortName || leg.mode}</span>`;
        }
        $_itinerary += `
            </div>
            <strong>Trajanje: </strong>${formatDuration(itinerary.duration)} <strong>Prihod: </strong>${formatTime(new Date(itinerary.endTime))}
        </div>`;

        $_nagivation += $_itinerary;

        index++;
    }
    showInfoPanel($_nagivation)
    onItineraryClick(0);
}

function onItineraryClick(index) {
    let itinerary = NavigationState.itineraries[index];
    
    let geojson = itinerary_to_geojson(itinerary);
    map.getSource("lines").setData(geojson);

    zoomToGeoJSON(geojson);
}

let MODE_COLORS = {
    'BUS': 'red',
    'WALK': 'grey',
    'BICYCLE': 'green',
    'CAR_SHARE': 'blue',
}

function itinerary_to_geojson(itinerary) {
    let collection = {
        'type': 'FeatureCollection',
        'features': []
    };
    for (let leg of itinerary.legs) {
        collection.features.push( {
            'type': 'Feature',
            'properties': {
                'color': MODE_COLORS[leg.mode] || "black"
            },
            'geometry': polyline.toGeoJSON(leg.legGeometry.points)
        });
    }
    return collection;        
}

function initSearch() {
	document.getElementById("search-fields").appendChild(searchField());	
	
}