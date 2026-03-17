import { loadFactions, loadShips, loadWeapons } from './data-loader.js';
import { initNav, initFooter } from './nav.js';

const state = {
  factions: [],
  ships: [],
  weapons: [],
  selectedFaction: null,
  selectedShip: null,
  weaponSlots: [null, null, null],
  weaponTraits: ['', '', ''],
  customFeatures: [],
};

const $ = (id) => document.getElementById(id);

function showToast(message, type = 'info') {
  let container = $('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-msg">${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 2400);
}

function availableShips() {
  if (!state.selectedFaction) return [];
  return state.ships.filter((ship) => ship.faction === state.selectedFaction.id);
}

function availableWeapons() {
  if (!state.selectedShip) return [];
  return state.weapons.filter((weapon) => {
    const factionOk = !weapon.factionRestricted || weapon.factionRestricted.includes(state.selectedFaction.id);
    return factionOk;
  });
}

function totalFP() {
  const base = state.selectedShip?.baseCost ?? 0;
  const weaponCost = state.weaponSlots
    .map((id) => state.weapons.find((weapon) => weapon.id === id)?.cost || 0)
    .reduce((sum, cost) => sum + cost, 0);
  return base + weaponCost;
}

function renderFactionSelect() {
  const select = $('faction-select');
  select.innerHTML = '<option value="">— Select Faction —</option>' +
    state.factions.map((faction) => `<option value="${faction.id}">${faction.name}</option>`).join('');
}

function renderShipSelect() {
  const select = $('ship-select');
  const ships = availableShips();
  select.innerHTML = '<option value="">— Select Hull —</option>' +
    ships.map((ship) => `<option value="${ship.id}">${ship.name}</option>`).join('');
}

function setTrack(trackId, count) {
  const container = $(trackId);
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < count; i += 1) {
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.className = 'track-box';
    box.setAttribute('aria-label', `${trackId} box ${i + 1}`);
    container.appendChild(box);
  }
}

function syncTracks() {
  if (!state.selectedShip) {
    setTrack('track-structure', 12);
    setTrack('track-engineering', 10);
    setTrack('track-weapons', 10);
    setTrack('track-systems', 10);
    $('structure-total').textContent = '12';
    $('engineering-total').textContent = '10';
    $('weapons-total').textContent = '10';
    $('systems-total').textContent = '10';
    return;
  }

  const { stats, slots } = state.selectedShip;
  const structureBoxes = Math.max(8, stats.hull * 2);
  const engineeringBoxes = Math.max(8, (stats.shields + stats.crew) * 2);
  const weaponsBoxes = Math.max(8, slots.weapons * 5);
  const systemsBoxes = Math.max(8, slots.modules * 4);

  setTrack('track-structure', structureBoxes);
  setTrack('track-engineering', engineeringBoxes);
  setTrack('track-weapons', weaponsBoxes);
  setTrack('track-systems', systemsBoxes);

  $('structure-total').textContent = String(structureBoxes);
  $('engineering-total').textContent = String(engineeringBoxes);
  $('weapons-total').textContent = String(weaponsBoxes);
  $('systems-total').textContent = String(systemsBoxes);
}

function renderWeaponSlots() {
  const container = $('weapon-list');
  const options = availableWeapons();
  const slotCap = state.selectedShip?.slots.weapons ?? 0;
  container.innerHTML = '';

  for (let slot = 0; slot < 3; slot += 1) {
    const disabled = slot >= slotCap;
    const selectedId = state.weaponSlots[slot];
    const selectedWeapon = state.weapons.find((weapon) => weapon.id === selectedId);

    const card = document.createElement('article');
    card.className = 'weapon-slot';
    card.innerHTML = `
      <div class="weapon-slot-header">Weapon Slot ${slot + 1}${disabled ? ' (Locked by Hull)' : ''}</div>
      <select class="form-select" data-weapon-slot="${slot}" ${disabled ? 'disabled' : ''}>
        <option value="">— Select Weapon —</option>
        ${options.map((weapon) => `<option value="${weapon.id}" ${weapon.id === selectedId ? 'selected' : ''}>${weapon.name}</option>`).join('')}
      </select>
      <div class="weapon-meta">
        <div>DMG ${selectedWeapon?.damage || '—'}</div>
        <div>RNG ${selectedWeapon?.range || '—'}</div>
        <div>x${selectedWeapon ? Math.max(1, Math.ceil((selectedWeapon.cost || 1) / 8)) : '—'}</div>
      </div>
      <input class="form-input" type="text" data-weapon-trait="${slot}" maxlength="80" placeholder="Trait text" value="${state.weaponTraits[slot] || ''}" ${disabled ? 'disabled' : ''}>
    `;
    container.appendChild(card);
  }

  container.querySelectorAll('[data-weapon-slot]').forEach((select) => {
    select.addEventListener('change', (event) => {
      const slot = Number(event.target.dataset.weaponSlot);
      state.weaponSlots[slot] = event.target.value || null;
      syncHeaderAndStats();
      renderWeaponSlots();
    });
  });

  container.querySelectorAll('[data-weapon-trait]').forEach((input) => {
    input.addEventListener('input', (event) => {
      const slot = Number(event.target.dataset.weaponTrait);
      state.weaponTraits[slot] = event.target.value;
    });
  });
}

function renderFeatures() {
  const list = $('feature-list');
  $('feature-count').textContent = String(state.customFeatures.length);

  if (!state.customFeatures.length) {
    list.innerHTML = '<div class="feature-item"><span>No custom features</span></div>';
    return;
  }

  list.innerHTML = state.customFeatures.map((feature, index) => `
    <div class="feature-item">
      <span>${feature}</span>
      <button class="btn btn-danger btn-sm btn-remove-feature" data-remove-feature="${index}">Remove</button>
    </div>
  `).join('');

  list.querySelectorAll('[data-remove-feature]').forEach((button) => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.removeFeature);
      state.customFeatures = state.customFeatures.filter((_, itemIndex) => itemIndex !== index);
      renderFeatures();
    });
  });
}

function syncHeaderAndStats() {
  const ship = state.selectedShip;
  $('sheet-faction').textContent = state.selectedFaction?.name || 'Unaligned';
  $('sheet-fp').textContent = String(totalFP());
  $('print-date').textContent = new Date().toLocaleDateString();

  if (!ship) {
    $('sheet-subtitle').textContent = 'No Hull Selected';
    $('stat-speed').textContent = '0';
    $('stat-agility').textContent = '0';
    $('stat-sensors').textContent = '0';
    $('stat-hull').textContent = '0';
    $('stat-shields').textContent = '0';
    $('stat-crew').textContent = '0';
    return;
  }

  $('sheet-subtitle').textContent = ship.type;
  $('stat-speed').textContent = String(ship.stats.speed);
  $('stat-agility').textContent = String(ship.stats.agility);
  $('stat-sensors').textContent = String(ship.stats.sensors);
  $('stat-hull').textContent = String(ship.stats.hull);
  $('stat-shields').textContent = String(ship.stats.shields);
  $('stat-crew').textContent = String(ship.stats.crew);
}

function applyShipSelection() {
  if (!state.selectedShip) {
    state.weaponSlots = [null, null, null];
    state.weaponTraits = ['', '', ''];
    $('ship-name-input').value = '';
    $('ship-type-input').value = '';
    $('sheet-title').value = 'Unnamed Class';
  } else {
    state.weaponSlots = [null, null, null];
    state.weaponTraits = ['', '', ''];
    const shipName = state.selectedShip.name.replace(/-class\s*/i, '').trim();
    $('ship-name-input').value = shipName;
    $('ship-type-input').value = state.selectedShip.type;
    $('sheet-title').value = shipName.toUpperCase();
  }

  state.customFeatures = [];
  renderFeatures();
  syncTracks();
  syncHeaderAndStats();
  renderWeaponSlots();
}

function buildSaveData() {
  return {
    faction: state.selectedFaction?.id || null,
    ship: state.selectedShip?.id || null,
    sheetTitle: $('sheet-title').value,
    shipName: $('ship-name-input').value,
    shipType: $('ship-type-input').value,
    weaponSlots: state.weaponSlots,
    weaponTraits: state.weaponTraits,
    customFeatures: state.customFeatures,
  };
}

function saveSheet() {
  localStorage.setItem('nsv_ssd_sheet', JSON.stringify(buildSaveData()));
  showToast('SSD sheet saved.', 'success');
}

function loadSheet() {
  const raw = localStorage.getItem('nsv_ssd_sheet');
  if (!raw) {
    showToast('No SSD sheet saved yet.', 'warning');
    return;
  }

  try {
    const data = JSON.parse(raw);
    state.selectedFaction = state.factions.find((faction) => faction.id === data.faction) || null;
    renderShipSelect();
    if (state.selectedFaction) $('faction-select').value = state.selectedFaction.id;

    state.selectedShip = state.ships.find((ship) => ship.id === data.ship) || null;
    if (state.selectedShip) $('ship-select').value = state.selectedShip.id;

    state.weaponSlots = Array.isArray(data.weaponSlots) ? data.weaponSlots.slice(0, 3) : [null, null, null];
    state.weaponTraits = Array.isArray(data.weaponTraits) ? data.weaponTraits.slice(0, 3) : ['', '', ''];
    state.customFeatures = Array.isArray(data.customFeatures) ? data.customFeatures : [];

    $('sheet-title').value = data.sheetTitle || 'Unnamed Class';
    $('ship-name-input').value = data.shipName || '';
    $('ship-type-input').value = data.shipType || '';

    syncTracks();
    syncHeaderAndStats();
    renderFeatures();
    renderWeaponSlots();
    showToast('SSD sheet loaded.', 'success');
  } catch (error) {
    showToast('Unable to load saved sheet.', 'error');
  }
}

function wireEvents() {
  $('faction-select').addEventListener('change', (event) => {
    state.selectedFaction = state.factions.find((faction) => faction.id === event.target.value) || null;
    state.selectedShip = null;
    renderShipSelect();
    applyShipSelection();
  });

  $('ship-select').addEventListener('change', (event) => {
    state.selectedShip = state.ships.find((ship) => ship.id === event.target.value) || null;
    applyShipSelection();
  });

  $('ship-name-input').addEventListener('input', (event) => {
    $('sheet-title').value = event.target.value.trim() ? event.target.value.toUpperCase() : 'Unnamed Class';
  });

  $('ship-type-input').addEventListener('input', (event) => {
    $('sheet-subtitle').textContent = event.target.value.trim() || state.selectedShip?.type || 'No Hull Selected';
  });

  $('sheet-title').addEventListener('input', (event) => {
    $('ship-name-input').value = event.target.value;
  });

  $('add-feature-btn').addEventListener('click', () => {
    const input = $('feature-input');
    const value = input.value.trim();
    if (!value) return;
    state.customFeatures.push(value);
    input.value = '';
    renderFeatures();
  });

  $('feature-input').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      $('add-feature-btn').click();
    }
  });

  $('save-sheet-btn').addEventListener('click', saveSheet);
  $('load-sheet-btn').addEventListener('click', loadSheet);
  $('print-sheet-btn').addEventListener('click', () => {
    if (!state.selectedShip) {
      showToast('Select a hull before printing.', 'warning');
      return;
    }
    window.print();
  });
}

async function init() {
  initNav();
  initFooter();

  try {
    [state.factions, state.ships, state.weapons] = await Promise.all([
      loadFactions(),
      loadShips(),
      loadWeapons(),
    ]);
  } catch (error) {
    showToast(`Failed to load data: ${error.message}`, 'error');
    return;
  }

  renderFactionSelect();
  renderShipSelect();
  renderFeatures();
  syncTracks();
  syncHeaderAndStats();
  renderWeaponSlots();
  wireEvents();
}

init();
