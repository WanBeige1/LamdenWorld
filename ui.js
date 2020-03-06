UI = {
	tool: 'pan',
	tools: {
		'barracks': {mesh: 'building'},
		'factory': {mesh: 'building'},
		'farm': {mesh: 'Farm1'},
	},
	selectedTile: null,
	tooltipMesh: null,
	// returns unix timestamp
	now() {
		return Math.round((new Date()).getTime() / 1000);
	},
	formatAddress(a) {
		return a.substr(a, 0, 10) + '...';
	},
	settings: {
		_increaseCameraZoom: false,
		get increaseCameraZoom() {
			return this._increaseCameraZoom;
		},
		set increaseCameraZoom(b) {
			this._increaseCameraZoom = b;
			camera.upperRadiusLimit = b ? 120 :85;
			World.water.dispose();
			World.createWater({position: v(32, -.3, 32)});
			drawWorld(true);
		}
	}
}
// Resize
window.addEventListener('resize', () => {
	engine.resize();
});
window.addEventListener('mouseout', () => {
	$('#tooltip').hide();
});

canvas.addEventListener('mousemove', (e) => {
	if (e.target != canvas) {
		$('#tooltip').hide();
		return;
	}
	let pickResult = scene.pick(scene.pointerX, scene.pointerY, function(mesh) {
		return mesh.name == 'water' || (mesh.parent && mesh.parent.type == 'unit');
	});
	if (!pickResult.hit) {
		return;
	}
	let point = pickResult.pickedPoint;
	let mesh = pickResult.pickedMesh;
	if (mesh.parent) {
		mesh = mesh.parent;
	}

	// remove any highlight
	if (UI.hover) {
		UI.hover.renderOutline = false;
		let children = UI.hover.getChildren();
		for (let c in children) {
			children[c].renderOutline = false;
		}
	}


	if (mesh.type  == 'unit') {
		UI.tileHover.position.y = -100;
		UI.hover = mesh;
		let children = mesh.getChildren();
		for (let c in children) {
			children[c].outlineWidth = .1 / children[c].scaling.x;
			children[c].outlineColor = mesh.owner == Lamden.wallet ? color(0,1,0) : color(1,0,0);
			children[c].renderOutline = true;
		}
		let html = '<p style="color: ' + (mesh.owner == Lamden.wallet ? '#fff' : '#f88') + '">Unit</p>';
		html += '<p>Owner: ' + formatName(Lamden.Players[mesh.owner] ? Lamden.Players[mesh.owner].name : mesh.owner) + '</p>';
		html += '<p>Num Troops: ' + mesh.troops + '</p>';
		$('#tooltip').show().html(html).css({left: scene.pointerX + 10, top: scene.pointerY + 10});
		return;
	}

	let tile = pos2tile(v(point.x, point.z));
	let id = (tile.x) + ',' + (tile.y);
	UI.tileHover.position = mapPosition(tile.x, tile.y).add(v(0,.06,0));
	if (UI.launchMissile) {
		UI.tileTarget.position = mapPosition(tile.x, tile.y).add(v(0,.03,0));
	} else {
		UI.tileTarget.position.y = -100;
	}

	// colonize
	// flag cue
	if (UI.mesh && UI.tool == 'colonize') {
		UI.mesh.position = UI.tileHover.position.clone();
	}
	if (UI.tool == 'colonize') {
		let tile = Tiles[id];
		let html = '';
		UI.mesh.material.diffuseColor = color(1,1,1);
		if (tile.owner) {
			html = 'This tile is already owned. ';
			UI.mesh.material.diffuseColor = color(1,0,0);
		} else if (UI.availableTiles.indexOf(tile.x + ',' + tile.y) == -1) {
			html = 'You can only colonize tiles adjacent to tiles you already own';
			UI.mesh.material.diffuseColor = color(1,0,0);
		} else {
			html = 'Click to colonize this tile';
			UI.mesh.material.diffuseColor = color(0,1,0);
		}
		$('#tooltip').show().html(html).css({left: scene.pointerX + 10, top: scene.pointerY + 10});
		return;
	}

	// if dragging mesh
	if (UI.mesh) {
		UI.mesh.position = UI.tileHover.position.add(v(0,.3,0));
		let tile = Tiles[id];
		let html = '';
		UI.mesh.material.diffuseColor = color(0,1,0);
		if (UI.building != 12 && tile.type == 'water') {
			UI.mesh.material.diffuseColor = color(1,0,0);
			html += 'Cannot place on water. ';
		} else if (UI.building == 12 && tile.type != 'water') {
			UI.mesh.material.diffuseColor = color(1,0,0);
			html += 'Must be placed on water. ';
		} else if (tile.owner != Lamden.wallet) {
			UI.mesh.material.diffuseColor = color(1,0,0);
			html += 'You must colonize this tile first before you can build there. ';
		} else if (tile.building) {
			UI.mesh.material.diffuseColor = color(1,0,0);
			html += 'Tile occupied already';
		} else {
			html += 'Left-click to place building here. ';
		}
		$('#tooltip').show().html(html).css({left: scene.pointerX + 10, top: scene.pointerY + 10});
		return;
	}

	let html = '';
	if (Tiles[id]) {
		if (Tiles[id].building) {
			html += '<h3>[' + tile.x + ',' + tile.y + '] ' + World.buildingData[Tiles[id].building].name + '</h3>';
		} else {
			html += '<h3>[' + tile.x + ',' + tile.y + '] ' + World.tileTypes[Tiles[id].type].name + '</h3>';
		}
		if (Tiles[id].owner) {
			html += '<p>Owner: ' + formatName(Lamden.Players[Tiles[id].owner] ? Lamden.Players[Tiles[id].owner].name : Tiles[id].owner) + '</p>';
		}
		if (Tiles[id].unit) {
			html += '<p>Troops: ' + Tiles[id].unit.troops + '</p>';
		}
		if (UI.selectedUnit && UI.selectedUnit.owner) {
			let unitPos = v(Tiles[UI.selectedUnit.tileID].x, Tiles[UI.selectedUnit.tileID].y);
			let tilePos = v(Tiles[id].x, Tiles[id].y);
			let d = World.offset_distance(unitPos, tilePos);
			if (d <= 3) {
				html += d + ' tiles away. Costs ' + (d * UI.selectedUnit.troops) + ' energy to move here; right-click to move to this tile. ';
			} else {
				html += 'Too far away to move here';
			}
		}

	}
	$('#tooltip').show().html(html).css({left: scene.pointerX + 10, top: scene.pointerY + 10});
});
function techHasResearched(id) {
	let tech = World.Technologies[id];
	let now = UI.now();
	if (tech.started && tech.started + tech.duration < now) {
		return true;
	}
	return false;
}
function isResearching(id) {
	for (let r in World.Technologies) {
		let t = World.Technologies[r];
		if (t.researchedAt == id && t.started && t.started + t.duration > UI.now()) {
			return r;
		}
	}
	return false;
}
function updateConstructionProgress() {
	if (!UI.selectedTile || Tiles[UI.selectedTile].owner != Lamden.wallet) {
		return;
	}
	let now = UI.now();

	if (!Tiles[UI.selectedTile].constructionFinished || Tiles[UI.selectedTile].constructionFinished <= now - 5) {
		$('#building-progress').hide();
		return;
	} else if (!Tiles[UI.selectedTile].constructionFinished || (Tiles[UI.selectedTile].constructionFinished < now && Tiles[UI.selectedTile].constructionFinished > now - 5)) {
		tileHtml(UI.selectedTile);
		return;
	}
	$('#building-progress').show();
	$('#building-progress progress').attr('value', 100 - (Tiles[UI.selectedTile].constructionFinished - now));
}
function updateResearchProgress() {
	if (!UI.selectedTile || Tiles[UI.selectedTile].owner != Lamden.wallet) {
		return;
	}
	$('#research-progress').hide();
	$('#techs').show();
	let techID = isResearching(Tiles[UI.selectedTile].building);
	let tech = null;
	if (techID) {
		tech = World.Technologies[techID];
		$('#research-progress').show();
		$('#techs').hide();
	}
	if (!tech) {
		return;
	}
	let now = UI.now();
	// find current tech being researched
	$('#research-progress').show();
	let min = tech.started;
	let current = now - tech.started;
	let progress = current / tech.duration;
	console.log(current, progress);
	$('#research-progress progress').attr('value', progress * 100);
}
function updateConversionProgress() {
	if (!UI.selectedTile || Tiles[UI.selectedTile].owner != Lamden.wallet) {
		return;
	}
	let tile = Tiles[UI.selectedTile];
	let level = tile.level;
	let now = UI.now();
	let min = tile.lastHarvest;
	let current = now - tile.lastHarvest;
	let progress = current / custom.refineryDuration(level, tile.convertAmount);
	if (tile.collected || !conversionFinished(tile)) {
		$('#collect-button').hide();
	}
	if (!tile.convertAmount || tile.lastHarvest + custom.refineryDuration(level, tile.convertAmount) < now && tile.collected) {
		$('#conversion-progress').hide();
		$('#conversion-form').show();
		return;
	}
	if (tile.lastHarvest + custom.refineryDuration(level, tile.convertAmount) < now && !tile.collected) {
		$('#collect-button').show();
	}
	$('#conversion-progress').show();
	$('#conversion-form').hide();
	$('#conversion-progress progress').attr('value', progress * 100);
}
function isTraining(tile) {
	return tile.trainAmount && tile.lastHarvest + custom.trainDuration(tile) > UI.now() && !tile.collected;
}
function updateTrainProgress() {
	if (!UI.selectedTile || Tiles[UI.selectedTile].owner != Lamden.wallet) {
		return;
	}
	let tile = Tiles[UI.selectedTile];
	let level = tile.level;
	let now = UI.now();
	let min = tile.lastHarvest;
	let current = now - tile.lastHarvest; // time passed in seconds since starting training
	let duration = custom.trainDuration(tile);
	let progress = current / duration;
	$('#collect-troops-button').hide();
	if (trainingFinished(tile) && !tile.collected) {
		$('#collect-troops-button').show();
	}
	if (!isTraining(tile) && tile.collected) {
		$('#train-progress').hide();
		$('#train-troops').show();
		return;
	}
	$('#train-progress').show();
	$('#train-troops').hide();
	$('#train-progress progress').attr('value', progress * 100);
}

function updateUnitCooldown() {
	if (!UI.selectedUnit || UI.selectedUnit.owner != Lamden.wallet) {
		return;
	}
	let now = UI.now();
	if (UI.selectedUnit.ready < now) {
		$('#cooldown').hide();
		return;
	}
	$('#cooldown').show();
	let diff = UI.selectedUnit.ready - now;
	$('#cooldown progress').attr('value', diff);
}
window.setInterval(updateConstructionProgress, 1000);
window.setInterval(updateResearchProgress, 1000);
window.setInterval(updateConversionProgress, 1000);
window.setInterval(updateTrainProgress, 1000);
window.setInterval(updateUnitCooldown, 1000);
canvas.addEventListener('click', () => {
	let pickResult = scene.pick(scene.pointerX, scene.pointerY, function(mesh) {
		return mesh.name == 'water' || (mesh.parent && mesh.parent.type == 'unit');
	});
	if (!pickResult.hit) {
		return;
	}
	let point = pickResult.pickedPoint;
	let mesh = pickResult.pickedMesh;
	if (mesh.parent) {
		mesh = mesh.parent;
	}
	UI.unitSelect.position.y = -100;
	UI.tileSelect.position.y = -100;

	$('#marketplace').hide();

	// unit selection
	UI.selectedUnit = null;
	UI.selectedTile = null;
	let tile = pos2tile(v(point.x, point.z));
	if (mesh.type == 'unit') { // unit info panel
		UI.selectedUnit = mesh;
		UI.unitSelect.material.diffuseColor = mesh.owner == Lamden.wallet ? color(0,1,0) : color(1,0,0);
		html = '<h1>' + mesh.name + '</h1>';
		html += '<p>Owner: ' + (Lamden.Players[mesh.owner] ? Lamden.Players[mesh.owner].name : mesh.owner) + '</p>';
		html += '<p>Troops: <span id="num-troops">' + mesh.troops + '</span></p>';
		if (mesh.owner == Lamden.wallet) {
			let now = UI.now();
			if (mesh.ready > now) {
				let diff = mesh.ready - now;
				html += '<div id="cooldown"><progress max="30" value="' + (diff) + '"></progress></div>';
				html += '<p>Unit still cooling down before next action can be performed. </p>';
			} else {
				html += '<p>Right-click on a tile to move there</p>';
			}
		}
		$('#info-panel').html(html).show();
		return;
	}

	UI.tileSelect.position = mapPosition(tile.x, tile.y).add(v(0,.09,0));

	let id = (tile.x) + ',' + (tile.y);
	UI.selectedTile = id;
	UI.x = tile.x;
	UI.y = tile.y;
	if (UI.tool == 'colonize') {
		colonizeTile();
		return;
	}
	if (UI.building) {
		placeBuilding();
		return;
	}

	if (Tiles[id]) {
		tileHtml(id);
	}

	if (Tiles[id].building == 13) {
		$('#marketplace').show();
	}
});
function tileHtml(id) {
	let html = '';
	let tile = Tiles[id];
	if (tile.building > 0) {
		html = '<h1>Level ' + tile.level + ' ' + World.buildingData[tile.building].name;
		html += ' (' + UI.x + ',' + UI.y + ')</h1>';
		if ([3,4,5].indexOf(parseInt(tile.building)) > 1) {
			html += '<p> on ' + World.tileTypes[tile.type] + '</p>';
		}
		html += '<progress id="building-hp" value="' + tile.currentHP + '" max="' + tile.maxHP + '" title="' + tile.currentHP + '/' + tile.maxHP + '"></progress>';
	} else {
		html = '<h1>' + World.tileTypes[tile.type].name + ' (' + UI.x + ',' + UI.y + ')</h1>';
	}
	if (tile.fortification) {
		html += '<progress id="fortification-hp" value="' + tile.fortification + '" max="' + (2000 * (techHasResearched(10) ? 1.1 : 1)) + '" ';
		html += 'title="' + tile.fortification + '/' + 2000 + '" style="height: 5px; margin-top: 5px; "></progress>';
	}
	if (tile.owner) {
		html += '<p>Owner: ' + (Lamden.Players[tile.owner] ? Lamden.Players[tile.owner].name : tile.owner) + '</p>';
	} else {
		html += '<p>Uncolonized</p>';
	}
	html += '<p>Current troops: <span id="num-troops">' + (tile.unit ? tile.unit.troops : 0) + '</span> (Capacity: ' + custom.maxOccupancy(tile) + ')</p>';
	if (!tile.owner) {
		if (!Player.capital && tile.type == 'grass' && Lamden.wallet) {
			html += '<button id="settle-button">Settle here</button>';
		} else if (World.ownAdjacentTile(UI.x, UI.y)) {
			//html += '<button id="colonize-button">Colonize</button> (100 Energy)';
			html += 'This tile can be colonized for 100 energy. ';
		} else {
			html += '<p class="error">You cannot colonize this tile, it is not adjacent to a tile you own. </p>';
		}
	}

	if (!tile.fortification && tile.owner == Lamden.wallet) {
		html += '<button id="fortify-button">Fortify</button><br>' + costHtml({0:1000, 2:1000,4:1000});
	}

	if (!tile.building || [3,4,5].indexOf(tile.building) > -1) {
		html += '<h2>Yield Multipliers</h2><dl>';
		html += '<dt>Sedementary Rock</dt><dd>' + World.tileTypes[tile.type].yield[1] + '</dd>';
		html += '<dt>Raw Ore</dt><dd>' + World.tileTypes[tile.type].yield[2] + '</dd>';
		html += '<dt>Fossil Fuels</dt><dd>' + World.tileTypes[tile.type].yield[3] + '</dd>';
		html += '</dl>';
	}
	if (tile.owner != Lamden.wallet) {
		$('#info-panel').html(html).show();
		return;
	}

	let now = UI.now();
	if (tile.building > 0) {
		html += '<div id="building-progress" style="display: ' + (tile.constructionFinished > now ? 'block' : 'none') + '; ">Constructing';
		html += '<progress max="100"></progress>';
		html += '</div>';
		html += '<div id="research-progress" style="display: ' + (isResearching(Tiles[UI.selectedTile].building) ? 'block' : 'none') + '; ">Researching';
		html += '<progress max="100"></progress>';
		html += '</div>';
		if (Tiles[UI.selectedTile].constructionFinished > now) {
			$('#info-panel').html(html).show();
			return;
		}
		let data = World.buildingData[tile.building];
		if (data.produces != undefined) {
			html += '<p>Last Harvest: ' + (now - tile.lastHarvest) + 's ago</p>';
			let resource = World.buildingData[tile.building].produces;
			html += '<dl>';
			html += '<dt>Mining<dt><dd>' + World.Resources[data.produces].name + '</dd>';
			html += '<dt>Yield Multiplier<dt><dd>' + custom.yieldMultiplier(tile) + '</dd>';
			html += '<dt>Capacity<dt><dd>' + custom.mineCapacity(tile.level) + '</dd>';
			html += '<button id="harvest-button">Harvest</button><br>Current Yield: '
			html += custom.calcYield(tile) + ' ' + World.Resources[data.produces].name;
			if ([3,4,5].indexOf(parseInt(tile.building)) > -1) {
				html += '<h2>Switch Resource</h2>';
				html += '<ul id="mine-switch">';
				html += '<li><a data-id="3"><img src="images/lamden.svg"><b>Ore Mine</b>500 Energy</a></li>';
				html += '<li><a data-id="4"><img src="images/lamden.svg"><b>Fossil Fuel Pump</b>500 Energy</a></li>';
				html += '<li><a data-id="5"><img src="images/lamden.svg"><b>Sedimentary Rock Mine</b>500 Energy</a></li>';
				html += '</ul>';
			}
		}
		if (1) {
			html += '<h2>Research</h2>';
			html += '<ul id="techs" style="display: ' + (isResearching(tile.building) ? 'none' : 'block') + '">';
			for (let t in World.Technologies) {
				let tech = World.Technologies[t];
				if (tech.researchedAt == tile.building && !tech.started && (!tech.requiresTech || techHasResearched(tech.requiresTech))) {
					html += '<li><a data-id="' + t + '"><img src="images/lamden.svg"><b>'
					html += World.Technologies[t].name + ' (' + World.Technologies[t].duration + 's)</b> '
					html += costHtml(World.Technologies[t].cost) + '</a></li>';
				}
			}
			html += '</ul>';
			if ([3,4,5,8,9,11].indexOf(parseInt(tile.building)) > -1) { //if building with levels
				html += '<button id="levelup-button">Level to ' + (tile.level + 1) + '</button><br>';
				let cost = World.buildingData[tile.building].cost;
				html += costHtml(custom.levelUpCost(cost, tile.level + 1));
			}
		}
		if (tile.building == 11) { // conversions
			html += '<h2>Refine Goods</h2>';
			html += '<dl>';
			html += '<dt>Rate</dt><dd>' + custom.refinerySpeed(tile.level) + 'resources/s</dd>';
			let capacity = custom.refineryCapacity(tile.level);
			html += '<dt>Capacity</dt><dd>' + capacity + '</dd>';
			html += '<dt>Time to Capacity</dt><dd>' + custom.refineryDuration(tile.level) + '</dd>';
			html += '</dl>';
			html += '<div id="conversion-progress" style="display: none; ">Refining';
			html += '<progress max="100"></progress>';
			html += '<button id="collect-button">Collect</button>';
			html += '</div>';
			html += '<form id="conversion-form">';
			html += '<select id="convert-id">';
			for (let c in World.Conversions) {
				html += '<option value="' + c + '">' + World.Conversions[c].name + '</option>';
			}
			html += '</select>';
			html += '<input id="convert-amount" type="text">';
			html += '<button id="convert-button">Convert</button>';
			html += '';
			html += '</form>';
		}
		if ([8,9,12].indexOf(tile.building) > -1) {
			html += '<h2>Train Troops</h2><dl>';
			html += '<dt>Rate</dt><dd>' + custom.trainRate(tile) + ' troops/min</dd>';
			html += '<dt>Capacity</dt><dd>' + custom.trainCapacity(tile) + ' troops</dd>';
			html += '<dt>Cost Multiplier</dt><dd>' + custom.trainCostMultiplier(tile) + ' troops</dd>';
			html += '</dl>';
			html += '<div id="train-progress" style="display: ' + (isTraining(tile) ? 'block' : 'none') + '; ">Train';
			html += '<progress max="100"></progress>';
			html += '<button id="collect-troops-button">Deploy Troops</button>';
			html += '</div>';
			//html += '<li><button data-num="1">Create 1 Unit</button> (1 Energy, 1 food)</li>';
			//html += '<li><button data-num="10">Create 10 Unit</button> (10 Energy, 10 food)</li>';
			html += '<button id="train-troops" style="display: none; ">Train</button><br>' + custom.trainDuration(tile) + ' seconds';
		}
/*		if (tile.building == 9) {
			html += '<h2>Create Tanks</h2>';
			html += '<ul id="create-tank">';
			html += '<li><button id="u2">Create Tank (1000 Energy, 1000 food)</button></li>';
			html += '</ul>';
		}
		if (tile.building == 12) {
			html += '<h2>Create Ship</h2>';
			html += '<ul id="create-ship">';
			html += '<li><button id="u2">Create Ship (1000 Energy, 1000 food)</button></li>';
			html += '</ul>';
		}*/
		if (tile.building == 14) {
			html += '<h2>Launch Missile</h2>';
			html += '<label>Payload</label> ';
			html += '<input id="missile-power" type="text" value="1000"> tonnes TnT';
			html += '<button id="missile-button">Launch Missile</button><br>';
			html += '10,000 Energy, <span id="missile-cost">1000</span> Uranium';
		}
	}
	$('#info-panel').html(html).show();
}
function tabHtml(tab) {
	let html = '';
	if (tab == 'build') {
		html = '<ul id="buildings">';
		for (let b in World.buildingData) {
			let d = World.buildingData[b];
			if (b > 1 && (!d.requiresTech || techHasResearched(d.requiresTech))) {
				let icon = World.buildingData[b].icon;
				html += '<li><a data-id="' + b + '"><img src="icons/' + (icon ? icon : 'blank') + '.png">';
				//<b>'
				//html += World.buildingData[b].name + '</b>' + costHtml(World.buildingData[b].cost) + '</a>';
				html += '</li>';
			}
		}
		html += '</ul>';
	} else if (tab == 'defense') {
		html = '<ul id=""></ul>';
	}
	$('#actions').html(html);
}
tabHtml('build');
$('#tabs li').click(function(e) {
	let tab = $(e.target).parent().attr('data-tab');
	tabHtml(tab);
});

$('#info-panel').on('keyup keypress', '#missile-power', function(e) {
	let val = parseInt($('#missile-power').val());
	if (!val || val <= 0) {
		val = 0;
	}
	$('#missile-cost').html(val);
});

window.addEventListener('keydown', (e) => {
	if (e.keyCode == 27) { // esc
		deleteHighlight();
		UI.tool = 'pan';
		UI.building = null;
		if (UI.mesh) {
			UI.mesh.dispose();
			UI.mesh = null;
		}
		if (scene.getMaterialByName('Drag')) {
			scene.getMaterialByName('Drag').dispose();
		}
		UI.selectedTile = null;
		UI.tileSelect.position.y = -1;
		$('#info-panel').fadeOut();
	}
	if (e.keyCode == 87) { // W
		camera.inertialPanningY = 2;
	}
	if (e.keyCode == 83) { // S
		camera.inertialPanningY = -2;
	}
	if (e.keyCode == 65) { // A
		camera.inertialPanningX = -2;
	}
	if (e.keyCode == 68) { // D
		camera.inertialPanningX = 2;
	}
});
canvas.addEventListener('contextmenu', () => {
	let pickResult = scene.pick(scene.pointerX, scene.pointerY, function(mesh) {
		return mesh.name == 'water';
	});
	if (!pickResult.hit) {
		return;
	}
	let point = pickResult.pickedPoint;
	let mesh = pickResult.pickedMesh;

	let tile = pos2tile(v(point.x, point.z));
	tilePos = mapPosition(tile.x, tile.y);
	let id = (tile.x) + ',' + (tile.y);

	// contextmenu

	// fire missile from silo
	if (UI.selectedTile && UI.selectedTile != id && UI.launchMissile) {
		UI.launchMissile = false;
		UI.tileTarget.position.y = -100;
		let val = parseInt($('#missile-power').val());
		// get power
		if (!val || val <= 0) {
			addMessage('Enter a positive value for power');
			return false;
		}
		if (!deductCost(custom.missileCost(val))) {
			return false;
		}
		$.post('./missile.php', {
			x: Tiles[UI.selectedTile].x,
			y: Tiles[UI.selectedTile].y,
			x2: tile.x,
			y2: tile.y,
			power: val
		}, function(e) {
			console.log(e);
		});
		return;
		fireMissile(Tiles[UI.selectedTile], Tiles[id], val);
		return;
	}

	if (!UI.selectedUnit) {
		return false;
	}
	if (UI.selectedUnit.owner != Lamden.wallet) {
		addMessage('Not your unit', '#f88');
		return false;
	}
	if (UI.selectedUnit.target) {
		addMessage('Unit still underway, wait until arrival', '#f88');
		return false;
	}
	let now = UI.now();
	if (UI.selectedUnit.ready > now) {
		addMessage('Unit still cooling down, wait until cooldown complete', '#f88');
		return false;
	}

	if (UI.selectedUnit.name == 'Ship' && Tiles[id].type != 'water') {
		addMessage('Cannot move ship on land', '#f88');
		return;
	}
	if (UI.selectedUnit.name != 'Ship' && Tiles[id].type == 'water') {
		addMessage('Cannot move unit on water', '#f88');
		return;
	}

	let a = v(tile.x, tile.y);
	let b = v(Tiles[UI.selectedUnit.tileID].x, Tiles[UI.selectedUnit.tileID].y);
	if (World.offset_distance(a, b) > 3 + (techHasResearched(8) ? 1 : 0)) {
		addMessage('Too far', '#f80');
		return;
	}

	// unit operations
	if (distance(UI.selectedUnit.position, Tiles[id].pos) > 60) {
		addMessage('Too far', '#f88');
	}

	$.post('./move.php', {
		x: Tiles[UI.selectedUnit.tileID].x,
		y: Tiles[UI.selectedUnit.tileID].y,
		x2: Tiles[id].x,
		y2: Tiles[id].y,
	}, function(e) {
		console.log(e);
		let data = JSON.parse(e);
		console.log(data);
		if (UI.selectedUnit) {
			if (!deductCost({0:UI.selectedUnit.troops})) {
				return false;
			}
//			Tiles[UI.selectedUnit.tileID].unit = null;
		}
/*		if (Tiles[id].unit && Tiles[id].unit.owner != Lamden.wallet) { // attack units
			if (distance(UI.selectedUnit.position, Tiles[id].unit.position) > 60) {
				addMessage('Too far to attack', '#f88');
			}
			UI.selectedUnit.lookAt(Tiles[id].unit.position);
			Tiles[id].unit.lookAt(UI.selectedUnit.position);
			UI.selectedUnit.ready = now + 30;
			battle(UI.selectedUnit, Tiles[id].unit, data[0].numTroops, data[1].numTroops);
			return;
		}*/
/*		if (Tiles[id].building && Tiles[id].owner != Lamden.wallet) { // attack buildings/forts
			UI.selectedUnit.lookAt(Tiles[id].pos);
			let unit = UI.selectedUnit;
			let tile = Tiles[id];
			UI.selectedUnit.ready = now + 30;
			window.setTimeout(function() {
				siege(unit, tile, data[0].numTroops, data[1].hp);
			}, 1000);
			return;

		}*/
/*		if (Tiles[id].unit && Tiles[id].unit.owner == Lamden.wallet) { // merge units
			let troops = parseInt(UI.selectedUnit.troops);
			UI.selectedUnit.dispose();
			Tiles[id].unit.troops += troops;
			addMessage('Units merged. now counting ' + Tiles[id].unit.troops);
			UI.selectedUnit = Tiles[id].unit; // change selection to
			UI.selectedUnit.ready = now + 30;
			return;
		}*/

		// move unit
/*		UI.selectedUnit.lookAt(tilePos);
		UI.selectedUnit.target = tilePos;
		UI.selectedUnit.tileID = id;
		UI.selectedUnit.ready = now + 30;
		if (UI.selectedUnit.mesh) {
			scene.beginAnimation(UI.selectedUnit.mesh, 51, 80, true, 1);
		}
		Tiles[id].unit = UI.selectedUnit; */
	});
});

function moveUnit(a, b) {
	let unit = a.unit;
	a.unit = null;
	b.unit = unit;
	unit.lookAt(mapPosition(b.x, b.y));
	unit.target = mapPosition(b.x, b.y);
	unit.tileID = b.x + ',' + b.y;
	unit.ready = UI.now() + 30;
	if (unit.mesh) {
		scene.beginAnimation(unit.mesh, 51, 80, true, 1);
	}
}
function attackUnit(a, b, aRemain, bRemain) {
	a.unit.lookAt(b.unit.position);
	b.unit.lookAt(a.unit.position);
	a.ready = UI.now() + 30;
	battle(a.unit, b.unit, aRemain, bRemain);
}
function attackBuilding(a, b, aRemain, bRemain, fortRemain) {
	a.unit.lookAt(b.pos);
	UI.selectedUnit.ready = UI.now() + 30;
	siege(a.unit, b, aRemain, bRemain, fortRemain);
}

// animate units
scene.registerBeforeRender(function() {
	for (let u in World.units) {
		if (World.units[u].target) {
			World.units[u].movePOV(0,0,4/engine.fps);
			let pos = getScreenCoords(World.units[u].position.add(v(0,10,0)));
			let id = World.units[u].id;
			$('#' + id).css({left: pos.x - (document.getElementById(id).offsetWidth / 2) + 'px', top: pos.y - 10 + 'px'});
			if (distance(World.units[u].position, World.units[u].target) < .2) {
				World.units[u].target = null;
				if (World.units[u].mesh) {
					scene.beginAnimation(World.units[u].mesh, 0, 50, true, 1);
				}
			}
		}
	}
});

function setBuildingData(tile, id, owner, constructionFinished) {
	if (!tile) {
		console.log(id);
	}
	if (owner) {
		tile.owner = owner;
	}
	tile.building = parseInt(id);
	if (tile.building == 0) {
		return;
	}
	addBuilding(tile);
	updateSPSMeshes();
	tile.lastHarvest = Math.round((new Date()).getTime() / 1000);
	if ([8,9,11,12].indexOf(id) > -1) { // refinery/barracks
		tile.collected = true;
	}
	let buildingData = World.buildingData[id];
	tile.currentHP = buildingData.hp;
	tile.maxHP = buildingData.hp;
	tile.power = buildingData.power;
	tile.level = 1;
	if (constructionFinished) {
		tile.constructionFinished = constructionFinished;
	}
}
//$('#info-panel').on('click', '#buildings li', function(e) {
function placeBuilding() {
	//let id = $(e.target.parentNode).attr('data-id') || $(e.target).attr('data-id');
	let id = UI.building;
	if (!id) {
		return false;
	}

	if (Tiles[UI.x + ',' + UI.y].building) {
		addMessage('Tile already occupied', '#f88');
		return false;
	}
	if (!deductCost(World.buildingData[id].cost)) {
		return false;
	}

	if (id == 12 && Tiles[UI.x + ',' + UI.y].type != 'water') {
		addMessage('Must be placed on water', '#f88');
		return false;
	}
	if (id != 12 && Tiles[UI.x + ',' + UI.y].type == 'water') {
		addMessage('Cannot be placed on water', '#f88');
		return false;
	}

	$.post('./build.php', {x: UI.x, y: UI.y, id: id, cost: World.buildingData[id].cost}, function(e) {
		console.log(e);
		let data = JSON.parse(e);
		if (data.error) {
			addMessage(data.error, '#f80');
			return;
		}
		let tile = data.x + ',' + data.y;
//		setBuildingData(Tiles[tile], id, Lamden.wallet,  UI.now() + 2);
		addMessage(World.buildingData[id].name + ' created');
		Tiles[UI.selectedTile].constructionFinished = UI.now() + 30;
		// remove dragger mesh
		UI.building = null;
		if (UI.mesh &&  scene.meshes.indexOf(UI.mesh) > -1) {
			UI.mesh.dispose();
			UI.mesh = null;
		}
	});
	return;
	setBuildingData(Tiles[UI.selectedTile], id, Lamden.wallet,  UI.now() + 30);
	addMessage(World.buildingData[id].name + ' created');
	tileHtml(UI.selectedTile);
}

$('#info-panel').on('click', '#mine-switch a', function(e) {
	let id = $(e.target.parentNode).attr('data-id') || $(e.target).attr('data-id');
	let cost = World.buildingData[id].cost;
	cost = jQuery.extend(true, {}, cost);
	cost[0] = 500;
	if (!deductCost(cost)) {
		addMessage('Not enough resources', '#f88');
		return false;
	}
	$('#mine-switch').hide();
	$.post('./build.php', {x: UI.x, y: UI.y, id: parseInt(id)}, function() {
		// remove old building
		if (Tiles[UI.selectedTile].mesh) {
			Tiles[UI.selectedTile].mesh.dispose();
		}
		Tiles[UI.selectedTile].building = parseInt(id);
	//	if (Tiles[UI.selectedTile].nameplate)  { // todo: put nameplate creation in its own function
	//		Tiles[UI.selectedTile].nameplate.dispose();
	//	}
	//	Tiles[UI.selectedTile].nameplate = null;
		tileHtml(UI.selectedTile);
	});
});

$('#info-panel').on('click', '#harvest-button', function() {
	let amount = custom.calcYield(Tiles[UI.selectedTile]);
	let resource = World.buildingData[Tiles[UI.selectedTile].building].produces;
	$.post('./harvest.php', {owner: Lamden.wallet, x: UI.x,y: UI.y, id: resource, amount: amount}, function(e) {
		console.log(e);
		changePlayerResource(resource, amount);
		Tiles[UI.selectedTile].lastHarvest = UI.now();
		tileHtml(UI.selectedTile);
	});
});
function conversionFinished(tile) {
	tile = Tiles[tile];
	if (!tile || tile.building != 11) { // check if refinery
		return false;
	}
	let now = UI.now();
	let duration = custom.refineryDuration(tile.level, tile.convertAmount);
	if (tile.lastHarvest + duration < now) {
		return true;
	}
	return false;
}
$('#info-panel').on('click', '#convert-button', function(e) {
	e.preventDefault();
	if (Tiles[UI.selectedTile].convertAmount && !Tiles[UI.selectedTile].collected) {
		addMessage('Refiner busy, try again later', '#f80');
		return false;
	}
	let now = UI.now();
	let id = $('#convert-id').val();
	let amount = parseInt($('#convert-amount').val()) || custom.refineryCapacity(Tiles[UI.selectedTile].level);
	if (amount > custom.refineryCapacity(Tiles[UI.selectedTile].level)) {
		addMessage('Requested amount higher than capacity.', '#f88');
		return false;
	}
	let resource = World.Conversions[id].consumes;
	cost = {}
	cost[resource] = amount;
	//if (!deductCost(cost)) {
	//	return false;
	//}
	if (amount == 0) {
		return;
	}
	$('#conversion-form').hide();
	$.post('./refine.php', {
		owner: Lamden.wallet,
		x: UI.x, y: UI.y,
		id: World.Conversions[id].consumes,
		convertID: id, amount: amount
	}, function(e) {
		console.log(e);
		let data = JSON.parse(e);
		if (data.error) {
			addMessage(data.error, '#f80');
			return false;
		}
		Tiles[UI.selectedTile].lastHarvest = UI.now();
		Tiles[UI.selectedTile].convertID = id;
		Tiles[UI.selectedTile].convertAmount = amount;
		Tiles[UI.selectedTile].collected = false;
	});
	return false;
});
$('#info-panel').on('click', '#collect-button', function(e) {
	e.preventDefault();
	if (!conversionFinished(UI.selectedTile) || Tiles[UI.selectedTile].collected) {
		addMessage('Refining not yet completed, or already collected.');
		return false;
	}
	let id = Tiles[UI.selectedTile].convertID;
	let amount = Tiles[UI.selectedTile].convertAmount;
	$.post('./collect.php', {x: UI.x, y: UI.y, id: World.Conversions[id].produces}, function(e) {
		console.log(e);
		let data = JSON.parse(e);
		if (data.error) {
			addMessage(data.error, '#f80');
			return false;
		}
		Tiles[UI.selectedTile].collected = true;
		changePlayerResource(World.Conversions[id].produces, amount);
	});

});
function trainingFinished(tile) {
	if (!tile || [8,9,12].indexOf(tile.building) == -1) { // check if barracks
		return false;
	}
	let now = UI.now();
	if (tile.lastHarvest + custom.trainDuration(tile) < now) {
		return true;
	}
	return false;
}

$('#info-panel').on('click', '#train-troops', function(e) {
	e.preventDefault();
	let now = UI.now();
	let amount = custom.trainCapacity(Tiles[UI.selectedTile]);
	cost = {0:amount};
	if (!deductCost(cost)) {
		return false;
	}
	$.post('./train.php', {x: UI.x, y: UI.y, amount: amount}, function(e) {
		console.log(e);
		Tiles[UI.selectedTile].lastHarvest = now;
		Tiles[UI.selectedTile].trainAmount = parseInt(amount);
		Tiles[UI.selectedTile].collected = false;
		updateTrainProgress();
	});
	return false;
});
$('#info-panel').on('click', '#collect-troops-button', function(e) {
	e.preventDefault();
	if (!trainingFinished(Tiles[UI.selectedTile]) || Tiles[UI.selectedTile].collected) {
		addMessage('Training not yet completed, or already deployed.');
		return false;
	}
	$('#collect-troops-button').hide();
	$.post('./deploytroops.php', {x: UI.x, y: UI.y}, function(e) {
		let data = JSON.parse(e);
		if (data.error) {
			addMessage('No troops being trained', '#f80');
		}
		if (data.numTroops) {
			addMessage('Troops on tile: ' + data.numTroops);
		}
		//tileHtml(UI.selectedTile);
		return;
/*		let amount = Tiles[UI.selectedTile].trainAmount;
		Tiles[UI.selectedTile].collected = true;
		if (Tiles[UI.selectedTile].unit) {
			Tiles[UI.selectedTile].unit.troops += parseInt(amount);
			addMessage('Unit count on tile increased to ' + Tiles[UI.selectedTile].unit.troops);
		} else {
			if (Tiles[UI.selectedTile].building == 8) {
				addUnit(amount, mapPosition(UI.x, UI.y), UI.selectedTile, Lamden.wallet);
			} else if (Tiles[UI.selectedTile].building == 9) {
				addTank(UI.x, UI.y, UI.selectedTile, Lamden.wallet);
			} else if (Tiles[UI.selectedTile].building == 12) {
				addShip(UI.x, UI.y, UI.selectedTile, Lamden.wallet);
			}
			addMessage('Unit count on tile ' + Tiles[UI.selectedTile].unit.troops);
		}
		updateUnitCount(amount);*/
	});
});


$('#info-panel').on('click', '#levelup-button', function(e) {
	let cost = World.buildingData[Tiles[UI.selectedTile].building].cost;
	cost = custom.levelUpCost(cost, Tiles[UI.selectedTile].level + 1);
	if (!deductCost(cost)) {
		return false;
	}
	$.post('./levelup.php', {x: UI.x, y: UI.y, cost: cost}, function(e) {
		console.log(e);
		Tiles[UI.selectedTile].level++;
		tileHtml(UI.selectedTile);
	});
});
$('#info-panel').on('click', '#missile-button', function(e) {
	UI.launchMissile = true;
});
function updateUnitCount(num) {
	Player.unitCount = parseInt(num);
	$('#unit-count').text(Player.unitCount);
}
function checkPlayerResource(id, amount) {
	if (amount <= 0) {
		return true;
	}
	if (!Player.Resources[id]) {
		return false;
	}
	return Player.Resources[id] >= amount;
}
function formatNumber(num, fixed) {
	num = parseInt(num);
	if (!num) {
		return 0;
	}
	fixed = (!fixed || fixed < 0) ? 0 : fixed; // number of decimal places to show
	var b = (num).toPrecision(2).split("e"), // get power
		k = b.length === 1 ? 0 : Math.floor(Math.min(b[1].slice(1), 14) / 3), // floor at decimals, ceiling at trillions
		c = k < 1 ? num.toFixed(0 + fixed) : (num / Math.pow(10, k * 3) ).toFixed(1 + fixed), // divide by power
		d = c < 0 ? c : Math.abs(c), // enforce -0 is 0
		e = d + ['', 'k', 'm', 'b', 't'][k]; // append power
	return e;
}
function changePlayerResource(id, amount) {
	if (amount < 0 && !Player.Resources[id] || Player.Resources[id] < -amount) {
		addMessage('Not enough ' + World.Resources[id].name, '#f88');
		//return;
	}
	if (!Player.Resources[id]) {
		Player.Resources[id] = amount;
	} else {
		Player.Resources[id] += amount;
	}
	if (!$('#r' + id)[0] && Player.Resources[id] > 0) {
		$('#resources').append('<li id="r' + id + '"><img src="icons/ingot.png"><span>' + formatNumber(Player.Resources[id]) + '</span></li>');
	}
	$('#r' + id + ' span').html(formatNumber(Player.Resources[id]));
	addMessage((amount > 0 ? '+' : '') + amount + ' ' + World.Resources[id].name, '#aaa');
}
function costHtml(cost) {
	let html = '';
	for (let c in cost) {
		html += World.Resources[c].name + ': ' + cost[c] + ' ';
	}
	return html;
}
function checkCost(cost) {
	for (let i in cost) {
		if (!checkPlayerResource(i, cost[i])) {
			console.log(i, World.Resources[i]);
			addMessage('Not enough ' + World.Resources[i].name + ', required ' + cost[i], '#f88');
			//return false;
		}
	}
	return true;
}
function deductCost(cost) {
	if (!checkCost(cost)) {
		addMessage('Not enough resources', '#f88');
		return false;
	}
	for (let i in cost) {
		changePlayerResource(i, -cost[i]);
	}
	return true;
}

function checkSettleLocation(tile) {
	for (let t in Tiles) {
		if (Tiles[t].building == 1 && World.offset_distance(tile, Tiles[t]) <= 5) {
			return false;
		}
	}
	return true;
}
$('#info-panel').on('click', '#settle-button', function(e) {
	if (!checkSettleLocation(Tiles[UI.selectedTile])) {
		addMessage('Location too close to other settlement; chose farther away. ', '#f88');
		return false;
	}
	$.post('./settle.php', {x: UI.x, y: UI.y, owner: Lamden.wallet}, function(e) {
		console.log(e);
		var data = JSON.parse(e);
		addMessage('Settled at [' + data.x + ',' + data.y + ']');
		Lamden.getCapital();

	});
});
//$('#info-panel').on('click', '#colonize-button', function(e) {
// colonizes selected tile
function deleteHighlight() {
	meshTransformationData['HighlightTile'] = null;
	if (modelSPS['HighlightTile']) {
		modelSPS['HighlightTile'].dispose();
	}
	UI.availableTiles = [];
	UI.tool = null;
	if (UI.mesh) {
		UI.mesh.dispose();
		UI.mesh = null;
	}
	if (scene.getMaterialByName('Drag')) {
		scene.getMaterialByName('Drag').dispose();
	}

}
UI.availableTiles = [];
function colonizeMode() {
	deleteHighlight();
	UI.tool = 'colonize';
	UI.mesh = World.assets['Flag'].clone('Drag');
	for (var t in Tiles) {
		if (Tiles[t].owner == Lamden.wallet) {
			let neighbors = World.getAdjacentTiles(Tiles[t].x, Tiles[t].y);
			for (let n in neighbors) {
				if (!neighbors[n].owner) {
					UI.availableTiles.push(neighbors[n].x + ',' + neighbors[n].y);
					addModel(UI.tileHighlight, neighbors[n].pos.add(v(0,.1,0)), v(Math.PI/2,Math.PI / 6,0), 1);
				}
			}
		}
	}
	updateSPSMeshes();
}
$('#colonize-button').click(colonizeMode);
function colonizeTile() {
	if (!deductCost({0:100})) {
		return false;
	}
	if (Tiles[UI.x + ',' + UI.y].owner) {
		addMessage('This tile is already owned', '#f88');
		return false;
	} else if (!World.ownAdjacentTile(UI.x, UI.y)) {
		addMessage('You can only colonize tiles adjacent to tiles you already own', '#f88');
		return false;
	}
	$.post('./buytile.php', {x: UI.x, y: UI.y, owner: Lamden.wallet}, function(e) {
		console.log(e);
		var data = JSON.parse(e);
		addMessage('Colonized [' + UI.x + ',' + UI.y + ']', '#ccc');
		beamEffect(Tiles[UI.selectedTile].pos.clone());
		//UI.tool = 'pan';
		//deleteHighlight();
		World.drawWorld(true);
	});
	return;
	Lamden.sendTx('buyTile', {x: UI.x, y: UI.y});
	return;
	Tiles[UI.selectedTile].owner = Lamden.wallet;
	addModel(UI.friendlyTerritory, Tiles[UI.selectedTile].pos.add(v(0,.02,0)), v(0,Math.PI / 2,0), .22);
	tileHtml(UI.selectedTile);
	updateSPSMeshes();
	addMessage('Colonized [' + UI.selectedTile + ']', '#ccc');
}

$('#info-panel').on('click', '#fortify-button', function(e) {
	if (!deductCost({0:1000, 2:1000,4:1000})) {
		return false;
	}
	tileHtml(UI.selectedTile);
	let tile = Tiles[UI.selectedTile];
	$.post('./fort.php', {x: UI.x, y: UI.y}, function() {
		tile.fortMesh = addFort(UI.x, UI.y, Lamden.wallet);
		tile.fortification = custom.fortHP();
		addMessage('Fort added');
		tileHtml(UI.selectedTile);
	});
});

/*$('#minimap').load(function() {
	$('#minimap').click(function(e) {
		let x = e.pageX - $('#minimap').offset().left;
		let y = e.pageY - $('#minimap').offset().top;
		console.log(x, y);
	});
});*/
$('#minimap').load(function(){

        var iframe = $('#minimap').contents();

        iframe.find('canvas').click(function(e) {
			let x = e.pageX - 512; // - $('#minimap').offset().left;
			let y = e.pageY - 512; // - $('#minimap').offset().top;
			console.log(x, y);
			camera.target.position = mapPosition(x, y).clone();
        });
});

$('#actions').on('mouseover', '#buildings a', function(e) {
	let id = $(e.target.parentNode).attr('data-id') || $(e.target).attr('data-id');
	let html = '<h3>' + World.buildingData[id].name + '</h3>'
	html += '<p>' + World.buildingData[id].description + '</p>'
	html += costHtml(World.buildingData[id].cost);
	$('#tooltip').css({left: e.pageX - 20, top: e.pageY - 100}).html(html).show();
});
$('#actions').on('click', '#buildings a', function(e) {
	let id = $(e.target.parentNode).attr('data-id') || $(e.target).attr('data-id');
	UI.building = id;
	// remove previous drag mesh
	deleteHighlight();

	// add new drag mesh
	UI.mesh = World.assets[World.buildingData[id].mesh].clone('Drag');
	UI.mesh.material = World.assets[World.buildingData[id].mesh].material.clone('Drag');
	UI.mesh.material.alpha = .8;
	UI.mesh.rotation.y = Math.PI / 6;
	if (scene.meshes.indexOf(UI.mesh) == -1) {
		scene.meshes.push(UI.mesh);
	}
});
$('#info-panel').on('mouseover', '#techs a', function(e) {
	let id = $(e.target.parentNode).attr('data-id') || $(e.target).attr('data-id');
	let html = '<h3>' + World.Technologies[id].name + '</h3>' + World.Technologies[id].description;
	$('#tooltip').css({right: e.pageX - 300, top: e.pageY}).html(html).show();
});
$('#info-panel').on('click', '#techs a', function(e) {
	let id = $(e.target.parentNode).attr('data-id') || $(e.target).attr('data-id');
	if (isResearching(Tiles[UI.selectedTile].building)) {
		addMessage('Already researching, wait until finished', '#f88');
		return false;
	}
	let tech = World.Technologies[id];
	if (!deductCost(tech.cost)) {
		return false;
	}
	if (isResearching(Tiles[UI.selectedTile].building)) {
		addMesesage('Already researching', '#f88');
		return;
	}
	tech.started = UI.now();
	tileHtml(UI.selectedTile);
	$.post('./research.php', {owner: Lamden.wallet, id: id}, function(e) {
		console.log(e);
		tech.started = UI.now();
		addMessage('Started Research ' + tech.name, '#ccc');
		tileHtml(UI.selectedTile);
	});
});
// deprecated
$('#info-panel').on('click', '#create-units button', function(e) {
	let num = $(e.target).attr('data-num');
	if (Tiles[UI.selectedTile].unit && Tiles[UI.selectedTile].unit.troops > num) {
		addMessage('Too many to fit on tile', '#f88');
		return false;
	}
	if (!deductCost({0:num,1:num})) {
		return false;
	}
	if (Tiles[UI.selectedTile].unit) {
		Tiles[UI.selectedTile].unit.troops += parseInt(num);
	} else {
		addUnit(num, mapPosition(UI.x, UI.y), UI.selectedTile, Lamden.wallet);
	}
	updateUnitCount(num);
});
$('#info-panel').on('click', '#create-tank button', function() {
	if (Tiles[UI.selectedTile].unit && Tiles[UI.selectedTile].unit.troops + 1000 > (techHasResearched(7) ? 2000 : 1000)) {
		addMessage('Tile full', '#f80');
		return false;
	}
	if (!deductCost({0:10, 4:10})) {
		return false;
	}
	if (Tiles[UI.selectedTile].unit) {
		Tiles[UI.selectedTile].unit.troops += 1000;
	} else {
		addTank(UI.x, UI.y, UI.selectedTile, Lamden.wallet);
	}
	updateUnitCount(1000);
});
$('#info-panel').on('click', '#create-ship button', function() {
	if (Tiles[UI.selectedTile].unit) {
		addMessage('Tile full', '#f80');
		return false;
	}
	if (!deductCost({0:10, 4:10})) {
		return false;
	}
	addShip(UI.x, UI.y, UI.selectedTile, Lamden.wallet);
	updateUnitCount(1000);
});
function addMessage(message, c) {
	c = c || '#fff';
	$('#chat-panel ul').append('<li style="color: ' + c + '">' + message + '</li>');
	$('#loading-screen p').html(message);
	$("#chat-panel").scrollTop($("#chat-panel")[0].scrollHeight);
}