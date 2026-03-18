/* ============================================================
   builder.js — SSD Builder logic
   Schema: name, class, faction, pointCost, stats (agility,
   toughness, shields per facing), tracks (structure/engineering/
   weapons/systems with boxCount+thresholds), power, weapons[],
   subsystems[]
   ============================================================ */
import { loadFactions, loadShips, loadWeapons } from './data-loader.js';
import { initNav, initFooter } from './nav.js';

/* ── State ─────────────────────────────────────────────────── */
const state = {
  factions: [],
  ships: [],
  weaponCatalog: [],
  selectedFaction: null,
  selectedShip: null,

  // Editable ship fields (deep-copied from selected ship)
  shipName: '',
  shipClass: '',
  pointCost: 0,
  stats: {
    agility: 0,
    toughness: 0,
    shields: { fore: 0, aft: 0, port: 0, starboard: 0 },
  },
  tracks: {
    structure:   { boxCount: 0, thresholds: [] },
    engineering: { boxCount: 0, thresholds: [] },
    weapons:     { boxCount: 0, thresholds: [] },
    systems:     { boxCount: 0, thresholds: [] },
  },
  power: { basePower: 0, scalingRule: '' },
  weapons: [],
  subsystems: [],

  editThresholds: false,
};

const $ = (id) => document.getElementById(id);

/* ── Toast ─────────────────────────────────────────────────── */
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

/* ── Helpers ───────────────────────────────────────────────── */
function availableShips() {
  if (!state.selectedFaction) return [];
  return state.ships.filter((s) => s.faction === state.selectedFaction.id);
}

function availableWeapons() {
  const fid = state.selectedFaction?.id;
  return state.weaponCatalog.filter((w) => {
    if (!w.factionRestricted || w.factionRestricted.length === 0) return true;
    return fid && w.factionRestricted.includes(fid);
  });
}

/* ── Selects ───────────────────────────────────────────────── */
function renderFactionSelect() {
  const sel = $('faction-select');
  sel.innerHTML = '<option value="">— Select Faction —</option>' +
    state.factions.map((f) => `<option value="${f.id}">${f.name}</option>`).join('');
  if (state.selectedFaction) sel.value = state.selectedFaction.id;
}

function renderShipSelect() {
  const sel = $('ship-select');
  sel.innerHTML = '<option value="">— Select Hull —</option>' +
    availableShips().map((s) => `<option value="${s.id}">${s.class}</option>`).join('');
  if (state.selectedShip) sel.value = state.selectedShip.id;
}

function renderWeaponCatalogSelect() {
  const sel = $('weapon-add-select');
  const weapons = availableWeapons();
  sel.innerHTML = '<option value="">— Add Weapon —</option>' +
    weapons.map((w) => `<option value="${w.id}">${w.name}</option>`).join('');
}

/* ── Track rendering ───────────────────────────────────────── */
function renderTrack(containerId, trackKey) {
  const container = $(containerId);
  if (!container) return;
  const track = state.tracks[trackKey];

  const cols = Math.ceil(track.boxCount / 2);
  container.style.gridTemplateColumns = `repeat(${cols}, 20px)`;
  container.innerHTML = '';

  for (let i = 0; i < track.boxCount; i++) {
    const isThreshold = track.thresholds.includes(i);

    if (state.editThresholds) {
      // Every position is a toggle button in edit mode
      const btn = document.createElement('button');
      btn.className = 'track-toggle' + (isThreshold ? ' is-threshold' : '');
      btn.type = 'button';
      btn.title = isThreshold ? 'Click to remove threshold' : 'Click to add threshold';
      btn.dataset.track = trackKey;
      btn.dataset.pos = String(i);
      container.appendChild(btn);
    } else if (isThreshold) {
      const div = document.createElement('div');
      div.className = 'track-threshold';
      container.appendChild(div);
    } else {
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.className = 'track-box';
      box.setAttribute('aria-label', `${trackKey} box ${i + 1}`);
      container.appendChild(box);
    }
  }

  if (state.editThresholds) {
    container.querySelectorAll('.track-toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tKey = btn.dataset.track;
        const pos = Number(btn.dataset.pos);
        const thresholds = state.tracks[tKey].thresholds;
        if (thresholds.includes(pos)) {
          state.tracks[tKey].thresholds = thresholds.filter((p) => p !== pos);
        } else {
          state.tracks[tKey].thresholds = [...thresholds, pos].sort((a, b) => a - b);
        }
        renderTrack(containerId, trackKey);
      });
    });
  }
}

function renderAllTracks() {
  renderTrack('track-structure', 'structure');
  renderTrack('track-engineering', 'engineering');
  renderTrack('track-weapons', 'weapons');
  renderTrack('track-systems', 'systems');

  $('structure-total').textContent = String(state.tracks.structure.boxCount);
  $('engineering-total').textContent = String(state.tracks.engineering.boxCount);
  $('weapons-total').textContent = String(state.tracks.weapons.boxCount);
  $('systems-total').textContent = String(state.tracks.systems.boxCount);
}

/* ── Power level indicators ────────────────────────────────── */
function renderPowerLevels() {
  const container = $('power-levels');
  if (!container) return;
  const bp = state.power.basePower;
  if (!bp) { container.innerHTML = ''; return; }

  // Generate descending power labels (basePower → 1)
  const levels = [];
  for (let p = bp; p >= 1; p--) {
    levels.push(`<div class="power-level-badge">⚡${p}</div>`);
  }
  container.innerHTML = levels.join('');
}

/* ── Shield boxes ──────────────────────────────────────────── */
function renderShieldBoxes(containerId, count) {
  const container = $(containerId);
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.className = 'shield-box';
    box.setAttribute('aria-label', `Shield box ${i + 1}`);
    container.appendChild(box);
  }
  // Show numeric value if no boxes
  if (count === 0) {
    container.innerHTML = '<span class="shield-zero">—</span>';
  }
}

function renderShields() {
  const s = state.stats.shields;
  renderShieldBoxes('shields-fore', s.fore);
  renderShieldBoxes('shields-aft', s.aft);
  renderShieldBoxes('shields-port', s.port);
  renderShieldBoxes('shields-starboard', s.starboard);
}

/* ── Stats ─────────────────────────────────────────────────── */
function renderStats() {
  $('stat-agility').textContent = String(state.stats.agility);
  $('stat-toughness').textContent = String(state.stats.toughness);
  $('stat-power').textContent = String(state.power.basePower);
}

/* ── Header ────────────────────────────────────────────────── */
function renderHeader() {
  $('sheet-faction').textContent = state.selectedFaction?.name || 'Unaligned';
  $('sheet-fp').textContent = String(state.pointCost);
  $('sheet-subtitle').textContent = state.shipClass || 'No Hull Selected';
  $('print-date').textContent = new Date().toLocaleDateString();
}

/* ── Weapons ───────────────────────────────────────────────── */
function renderWeapons() {
  const container = $('weapon-list');
  const countEl = $('weapon-count');
  if (countEl) countEl.textContent = String(state.weapons.length);

  if (!state.weapons.length) {
    container.innerHTML = '<div class="no-weapons">No weapons assigned</div>';
    return;
  }

  container.innerHTML = '';
  state.weapons.forEach((weapon, index) => {
    const card = document.createElement('article');
    card.className = `weapon-card ${weapon.role === 'primary' ? 'weapon-primary' : 'weapon-secondary'}`;

    const rangeText = `${weapon.rangeMin}–${weapon.rangeMax}"`;
    const diceText = weapon.dice > 0 ? `${weapon.dice}d6` : '—';
    const ammoHtml = weapon.ammo != null
      ? `<span class="weapon-stat-tag">AMO ${weapon.ammo}</span>`
      : '';
    const traitsText = (weapon.traits || []).join(', ');

    card.innerHTML = `
      <div class="weapon-card-inner">
        <div class="weapon-role-icon ${weapon.role === 'primary' ? 'icon-primary' : 'icon-secondary'}"></div>
        <div class="weapon-details">
          <div class="weapon-name">
            ${weapon.name}
            <button class="btn-remove-weapon" data-idx="${index}" type="button" title="Remove weapon">✕</button>
          </div>
          <div class="weapon-stats-row">
            <span class="weapon-stat-tag">RNG ${rangeText}</span>
            <span class="weapon-stat-tag">DICE ${diceText}</span>
            <span class="weapon-stat-tag">PWR ${weapon.powerCost}</span>
            ${ammoHtml}
          </div>
          ${traitsText ? `<div class="weapon-traits">${traitsText}</div>` : ''}
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  container.querySelectorAll('.btn-remove-weapon').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.idx);
      state.weapons = state.weapons.filter((_, i) => i !== idx);
      renderWeapons();
    });
  });
}

/* ── Subsystems ────────────────────────────────────────────── */
function renderSubsystems() {
  const container = $('subsystem-list');
  if (!state.subsystems.length) {
    container.innerHTML = '<span class="no-subsystems">No subsystems</span>';
    return;
  }
  container.innerHTML = state.subsystems.map((sys) => `
    <div class="subsystem-card">
      <input type="checkbox" class="subsystem-check" aria-label="${sys.name}">
      <div class="subsystem-info">
        <span class="subsystem-name">${sys.name}</span>
        ${sys.hp != null ? `<span class="subsystem-hp">HP:${sys.hp}</span>` : ''}
        <span class="subsystem-effect">${sys.effect}</span>
      </div>
    </div>
  `).join('');
}

/* ── Render all ────────────────────────────────────────────── */
function renderAll() {
  renderHeader();
  renderAllTracks();
  renderPowerLevels();
  renderShields();
  renderStats();
  renderWeapons();
  renderSubsystems();
  renderWeaponCatalogSelect();
}

/* ── Load ship from catalog ────────────────────────────────── */
function loadShipData(ship) {
  if (!ship) {
    state.shipName = '';
    state.shipClass = '';
    state.pointCost = 0;
    state.stats = { agility: 0, toughness: 0, shields: { fore: 0, aft: 0, port: 0, starboard: 0 } };
    state.tracks = {
      structure:   { boxCount: 0, thresholds: [] },
      engineering: { boxCount: 0, thresholds: [] },
      weapons:     { boxCount: 0, thresholds: [] },
      systems:     { boxCount: 0, thresholds: [] },
    };
    state.power = { basePower: 0, scalingRule: '' };
    state.weapons = [];
    state.subsystems = [];
    $('ship-name-input').value = '';
    $('ship-class-input').value = '';
    $('sheet-title').value = 'Unnamed Class';
    return;
  }

  const d = JSON.parse(JSON.stringify(ship)); // deep copy
  state.shipName  = d.name;
  state.shipClass = d.class;
  state.pointCost = d.pointCost;
  state.stats     = d.stats;
  state.tracks    = d.tracks;
  state.power     = d.power;
  state.weapons   = d.weapons || [];
  state.subsystems = d.subsystems || [];

  $('ship-name-input').value = d.name;
  $('ship-class-input').value = d.class;
  $('sheet-title').value = d.name.toUpperCase();
}

/* ── Save / Load ───────────────────────────────────────────── */
function buildSaveData() {
  return {
    faction:    state.selectedFaction?.id || null,
    ship:       state.selectedShip?.id || null,
    sheetTitle: $('sheet-title').value,
    shipName:   state.shipName,
    shipClass:  state.shipClass,
    pointCost:  state.pointCost,
    stats:      state.stats,
    tracks:     state.tracks,
    power:      state.power,
    weapons:    state.weapons,
    subsystems: state.subsystems,
  };
}

function saveSheet() {
  localStorage.setItem('nsv_ssd_sheet', JSON.stringify(buildSaveData()));
  showToast('SSD sheet saved.', 'success');
}

function loadSheet() {
  const raw = localStorage.getItem('nsv_ssd_sheet');
  if (!raw) { showToast('No saved SSD found.', 'warning'); return; }
  try {
    const d = JSON.parse(raw);
    state.selectedFaction = state.factions.find((f) => f.id === d.faction) || null;
    renderFactionSelect();
    renderShipSelect();
    state.selectedShip = state.ships.find((s) => s.id === d.ship) || null;
    if (state.selectedShip) $('ship-select').value = state.selectedShip.id;

    state.shipName   = d.shipName  || '';
    state.shipClass  = d.shipClass || '';
    state.pointCost  = d.pointCost || 0;
    state.stats      = d.stats     || state.stats;
    state.tracks     = d.tracks    || state.tracks;
    state.power      = d.power     || state.power;
    state.weapons    = d.weapons   || [];
    state.subsystems = d.subsystems || [];

    $('ship-name-input').value = state.shipName;
    $('ship-class-input').value = state.shipClass;
    $('sheet-title').value = d.sheetTitle || 'Unnamed Class';

    renderAll();
    showToast('SSD sheet loaded.', 'success');
  } catch {
    showToast('Unable to load saved sheet.', 'error');
  }
}

/* ── Events ────────────────────────────────────────────────── */
function wireEvents() {
  $('faction-select').addEventListener('change', (e) => {
    state.selectedFaction = state.factions.find((f) => f.id === e.target.value) || null;
    state.selectedShip = null;
    loadShipData(null);
    renderShipSelect();
    renderAll();
  });

  $('ship-select').addEventListener('change', (e) => {
    state.selectedShip = state.ships.find((s) => s.id === e.target.value) || null;
    loadShipData(state.selectedShip);
    renderAll();
  });

  $('ship-name-input').addEventListener('input', (e) => {
    state.shipName = e.target.value;
    $('sheet-title').value = e.target.value ? e.target.value.toUpperCase() : 'Unnamed Class';
  });

  $('ship-class-input').addEventListener('input', (e) => {
    state.shipClass = e.target.value;
    $('sheet-subtitle').textContent = e.target.value || state.selectedShip?.class || 'No Hull Selected';
  });

  $('sheet-title').addEventListener('input', (e) => {
    $('ship-name-input').value = e.target.value;
    state.shipName = e.target.value;
  });

  $('toggle-edit-btn').addEventListener('click', () => {
    state.editThresholds = !state.editThresholds;
    const btn = $('toggle-edit-btn');
    if (state.editThresholds) {
      btn.textContent = '✅ Done';
      btn.classList.add('active-edit');
    } else {
      btn.textContent = '✏️ Edit Tracks';
      btn.classList.remove('active-edit');
    }
    renderAllTracks();
  });

  $('weapon-add-btn').addEventListener('click', () => {
    const sel = $('weapon-add-select');
    const id = sel.value;
    if (!id) return;
    const weapon = state.weaponCatalog.find((w) => w.id === id);
    if (weapon) {
      state.weapons.push(JSON.parse(JSON.stringify(weapon)));
      renderWeapons();
      sel.value = '';
    }
  });

  $('save-sheet-btn').addEventListener('click', saveSheet);
  $('load-sheet-btn').addEventListener('click', loadSheet);
  $('print-sheet-btn').addEventListener('click', () => {
    if (!state.selectedShip) { showToast('Select a hull before printing.', 'warning'); return; }
    window.print();
  });

  // Pre-select faction passed from factions page
  const preset = sessionStorage.getItem('selectedFaction');
  if (preset) {
    sessionStorage.removeItem('selectedFaction');
    state.selectedFaction = state.factions.find((f) => f.id === preset) || null;
    if (state.selectedFaction) {
      $('faction-select').value = state.selectedFaction.id;
      renderShipSelect();
    }
  }
}

/* ── Init ──────────────────────────────────────────────────── */
async function init() {
  initNav();
  initFooter();

  try {
    [state.factions, state.ships, state.weaponCatalog] = await Promise.all([
      loadFactions(),
      loadShips(),
      loadWeapons(),
    ]);
  } catch (err) {
    showToast(`Failed to load data: ${err.message}`, 'error');
    return;
  }

  renderFactionSelect();
  renderShipSelect();
  renderAll();
  wireEvents();
}

init();
