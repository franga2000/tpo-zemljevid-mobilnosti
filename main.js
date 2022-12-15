$provider_toggles = document.getElementById("provider-toggles");

function darkMode(dark) {
	if (dark) {
		document.body.classList.add("dark"); 
	} else {
		document.body.classList.remove("dark");
	}
}

darkMode(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
	darkMode(e.matches);
});


function initSidebar() {
	let $sidebar = document.getElementById("providers");
	let $_sidebar = `<div>`;

	for (let section of SECTIONS) {
		let $_section = html`
		<div class="provider-section">
			<div class="provider-section-header">${section.title}</div>
		`;

		let $_group = "";
		for (let group of section.provider_groups) {
			$_group += html`
			<span class="provider-group-toggle active" onclick="toggleGroup(this)" data-provider-group='${group.name}'>
				<img src="assets/marker/optimized/${group.name}.webp" alt="${group.name}" title="${group.name}"> 
			</span>
			`;
		}
		$_section += $_group;
		$_section += html`</div>`;

		$_sidebar += $_section;
	}
	$_sidebar += html`</div>`;

	$sidebar.innerHTML = $_sidebar;
}

initSidebar()

function getGroup(group_name) {
	for (let section of SECTIONS) 
		for (let provider_group of section.provider_groups)
			if (provider_group.name == group_name)
					return provider_group;
}

async function toggleGroup(el) {
	let group_name = el.dataset.providerGroup;
	let provider_group = getGroup(group_name);

	let hidden_groups = JSON.parse(localStorage.getItem('hidden_providers'));
	if (hidden_groups === null) hidden_groups = [];

	for (let provider_name of provider_group.providers) {
		let provider = PROVIDERS[provider_name];

		let visible = await provider.toggle();
		if (visible) {
			el.classList.add("active");
			hidden_groups.remove(provider_name);
		} else {
			el.classList.remove("active");
			hidden_groups.push(provider_name);
		}
	}

	localStorage.setItem('hidden_providers', JSON.stringify(hidden_groups));
}

function infoPanelTemplate(content) {
	let $_panel = `<span id="info-panel-close" onclick="hideInfoPanel()">×</span>`;

	if (content.image) {
		$_panel += html`<img class="info-panel-img" src="${content.image.src}">`
	}

	if (content.title)
		$_panel += html`<h2>${content.title}</h2>`;

	if (content.subtitle)
		$_panel += html`<p>${content.subtitle}</p>`;

	if (content.body)
		$_panel += content.body

	return $_panel;
}

$infoPanel = document.getElementById("info-panel");

$infoPanelBody = document.getElementById("info-panel");

function showInfoPanel(content) {
	if (typeof content != "string")
		content = infoPanelTemplate(content);
	
	$infoPanel.innerHTML = content;
	$infoPanel.classList.remove("hidden");
	setTimeout( () => $infoPanel.classList.remove("hiding"), 100);
}

function hideInfoPanel() {
	$infoPanel.classList.add("hiding");
	setTimeout(() => {
		$infoPanel.classList.add("hidden");
		$infoPanel.classList.remove("hiding");
	}, 300);
}
