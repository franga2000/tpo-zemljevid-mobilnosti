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
			<span class="provider-group-toggle" onclick="groupSetVisible(this.dataset.providerGroup)" data-provider-group='${group.name}'>
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

function infoPanelTemplate(content) {
	let $_panel = ``;

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


initSearch();

$infoPanel = document.getElementById("info-panel");

$infoPanelBody = document.getElementById("info-panel");

function showInfoPanel(content) {
	if (content !== undefined) {
		if (typeof content != "string")
			content = infoPanelTemplate(content);
		
		$infoPanel.innerHTML = content;
	}
	$infoPanel.parentElement.classList.remove("hidden");
	setTimeout( () => $infoPanel.parentElement.classList.remove("hiding"), 100);
}

function hideInfoPanel() {
	$infoPanel.parentElement.classList.add("hiding");
	setTimeout(() => {
		$infoPanel.parentElement.classList.add("hidden");
		$infoPanel.parentElement.classList.remove("hiding");
	}, 300);
}
