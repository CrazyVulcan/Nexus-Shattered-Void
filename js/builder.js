/* ============================================================
   builder.js — SSD Builder for Nexus: Shattered Void
   Schema: id, name, class, faction (text), role, basePower,
   engineeringTrack, ftlTrack, primaryWeapon, secondaryWeapons[],
   genericTracks[], agility, toughness, notes
   ============================================================ */
import { loadShips } from './data-loader.js';
import { initNav, initFooter } from './nav.js';

/* ── Helpers ─────────────────────────────────────────────── */
const $ = (id) => document.getElementById(id);

/** Parse a comma-separated string of integers, ignore non-numeric parts */
function parseIntList(str) {
  if (!str || !str.trim()) return [];
  return str.split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => Number.isFinite(n));
}

/** Parse a comma-separated number list (integers), deduplicated and sorted */
function parseHitNums(str) {
  return [...new Set(parseIntList(str))].sort((a, b) => a - b);
}

/** Render a list of numbers as a comma-separated string */
function listStr(arr) {
  return (arr || []).join(', ');
}

/* ── Default state ───────────────────────────────────────── */
function defaultState() {
  return {
    name:     '',
    class:    '',
    faction:  '',
    role:     '',
    basePower: 3,
    agility:   2,
    toughness: 3,
    engineeringTrack: {
      boxCount:    8,
      thresholds:  [],
      hitNumbers:  [1, 2],
      powerLevels: [3, 2, 1],
    },
    ftlTrack: {
      boxCount:   4,
      thresholds: [],
      hitNumbers: [3],
    },
    primaryWeapon: {
      name:       'Main Battery',
      boxCount:   6,
      thresholds: [],
      hitNumbers: [4, 5],
      range:      '0–12"',
      dice:       2,
      powerCost:  1,
      traits:     [],
    },
    secondaryWeapons: [],
    genericTracks:    [],
    notes: '',
  };
}

/* ── Global state ────────────────────────────────────────── */
let state = defaultState();
let shipCatalog = [];

/* ── Toast ───────────────────────────────────────────────── */
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
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 2800);
}

/* ── Read editor fields → update state ──────────────────── */
function readIdentity() {
  state.name      = $('e-name').value.trim();
  state.class     = $('e-class').value.trim();
  state.faction   = $('e-faction').value.trim();
  state.role      = $('e-role').value.trim();
  state.basePower = Math.max(1, parseInt($('e-base-power').value, 10) || 3);
  state.agility   = parseInt($('e-agility').value, 10)  || 0;
  state.toughness = parseInt($('e-toughness').value, 10) || 0;
  state.notes     = $('e-notes').value;
}

function readEngineering() {
  state.engineeringTrack.boxCount    = Math.max(1, parseInt($('eng-box-count').value, 10) || 8);
  state.engineeringTrack.hitNumbers  = parseHitNums($('eng-hit-nums').value);
  state.engineeringTrack.powerLevels = parseIntList($('eng-power-levels').value);
  state.engineeringTrack.thresholds  = parseIntList($('eng-thresholds').value);
}

function readFtl() {
  state.ftlTrack.boxCount   = Math.max(1, parseInt($('ftl-box-count').value, 10) || 4);
  state.ftlTrack.hitNumbers = parseHitNums($('ftl-hit-nums').value);
  state.ftlTrack.thresholds = parseIntList($('ftl-thresholds').value);
}

function readPrimaryWeapon() {
  const pw = state.primaryWeapon;
  pw.name       = $('pw-name').value.trim();
  pw.boxCount   = Math.max(1, parseInt($('pw-box-count').value, 10) || 6);
  pw.hitNumbers = parseHitNums($('pw-hit-nums').value);
  pw.thresholds = parseIntList($('pw-thresholds').value);
  pw.range      = $('pw-range').value.trim();
  pw.dice       = Math.max(1, parseInt($('pw-dice').value, 10) || 1);
  pw.powerCost  = parseInt($('pw-power-cost').value, 10) || 0;
  pw.traits     = $('pw-traits').value.split(',').map(s => s.trim()).filter(Boolean);
}

/** Read all secondary weapon fields from DOM into state */
function readSecondaryWeapons() {
  state.secondaryWeapons = state.secondaryWeapons.map((_, i) => ({
    name:       ($(`sw-name-${i}`)?.value || '').trim(),
    boxCount:   Math.max(1, parseInt($(`sw-box-count-${i}`)?.value, 10) || 4),
    hitNumbers: parseHitNums($(`sw-hit-nums-${i}`)?.value || ''),
    thresholds: parseIntList($(`sw-thresholds-${i}`)?.value || ''),
    range:      ($(`sw-range-${i}`)?.value || '').trim(),
    dice:       Math.max(1, parseInt($(`sw-dice-${i}`)?.value, 10) || 1),
    powerCost:  parseInt($(`sw-power-cost-${i}`)?.value, 10) || 0,
    traits:     ($(`sw-traits-${i}`)?.value || '').split(',').map(s => s.trim()).filter(Boolean),
  }));
}

/** Read all generic track fields from DOM into state */
function readGenericTracks() {
  state.genericTracks = state.genericTracks.map((_, i) => ({
    name:       ($(`gt-name-${i}`)?.value || '').trim(),
    boxCount:   Math.max(1, parseInt($(`gt-box-count-${i}`)?.value, 10) || 4),
    hitNumbers: parseHitNums($(`gt-hit-nums-${i}`)?.value || ''),
    thresholds: parseIntList($(`gt-thresholds-${i}`)?.value || ''),
  }));
}

function readAll() {
  readIdentity();
  readEngineering();
  readFtl();
  readPrimaryWeapon();
  readSecondaryWeapons();
  readGenericTracks();
}

/* ── Populate editor from state ──────────────────────────── */
function populateIdentity() {
  $('e-name').value       = state.name;
  $('e-class').value      = state.class;
  $('e-faction').value    = state.faction;
  $('e-role').value       = state.role;
  $('e-base-power').value = String(state.basePower);
  $('e-agility').value    = String(state.agility);
  $('e-toughness').value  = String(state.toughness);
  $('e-notes').value      = state.notes;
}

function populateEngineering() {
  const t = state.engineeringTrack;
  $('eng-box-count').value    = String(t.boxCount);
  $('eng-hit-nums').value     = listStr(t.hitNumbers);
  $('eng-power-levels').value = listStr(t.powerLevels);
  $('eng-thresholds').value   = listStr(t.thresholds);
}

function populateFtl() {
  const t = state.ftlTrack;
  $('ftl-box-count').value  = String(t.boxCount);
  $('ftl-hit-nums').value   = listStr(t.hitNumbers);
  $('ftl-thresholds').value = listStr(t.thresholds);
}

function populatePrimaryWeapon() {
  const pw = state.primaryWeapon;
  $('pw-name').value       = pw.name;
  $('pw-box-count').value  = String(pw.boxCount);
  $('pw-hit-nums').value   = listStr(pw.hitNumbers);
  $('pw-thresholds').value = listStr(pw.thresholds);
  $('pw-range').value      = pw.range;
  $('pw-dice').value       = String(pw.dice);
  $('pw-power-cost').value = String(pw.powerCost);
  $('pw-traits').value     = (pw.traits || []).join(', ');
}

function renderSecondaryWeaponsList() {
  const container = $('secondary-weapons-list');
  container.innerHTML = '';
  state.secondaryWeapons.forEach((sw, i) => {
    const item = document.createElement('div');
    item.className = 'list-track-item';
    item.style.marginBottom = 'var(--sp-3)';
    item.innerHTML = `
      <div class="list-track-item-header">
        <span class="list-track-item-title">Secondary #${i + 1}</span>
        <button class="btn-icon danger" data-idx="${i}" data-action="remove-sw" title="Remove">✕</button>
      </div>
      <div class="list-track-item-body">
        <div class="form-group">
          <label class="form-label">Weapon Name</label>
          <input id="sw-name-${i}" class="form-input" type="text" value="${escHtml(sw.name)}" placeholder="Point Defense">
        </div>
        <div class="track-editor-controls">
          <div class="form-group">
            <label class="form-label">Box Count</label>
            <input id="sw-box-count-${i}" class="form-input" type="number" min="1" max="16" value="${sw.boxCount}">
          </div>
          <div class="form-group">
            <label class="form-label">Hit d6 Nums</label>
            <input id="sw-hit-nums-${i}" class="form-input" type="text" value="${listStr(sw.hitNumbers)}" placeholder="6">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Threshold Positions</label>
          <input id="sw-thresholds-${i}" class="form-input" type="text" value="${listStr(sw.thresholds)}" placeholder="2">
        </div>
        <div class="track-editor-controls">
          <div class="form-group">
            <label class="form-label">Range</label>
            <input id="sw-range-${i}" class="form-input" type="text" value="${escHtml(sw.range)}" placeholder='0–6"'>
          </div>
          <div class="form-group">
            <label class="form-label">Dice</label>
            <input id="sw-dice-${i}" class="form-input" type="number" min="1" max="8" value="${sw.dice}">
          </div>
        </div>
        <div class="track-editor-controls">
          <div class="form-group">
            <label class="form-label">Power Cost</label>
            <input id="sw-power-cost-${i}" class="form-input" type="number" min="0" max="6" value="${sw.powerCost}">
          </div>
          <div class="form-group">
            <label class="form-label">Traits</label>
            <input id="sw-traits-${i}" class="form-input" type="text" value="${(sw.traits || []).join(', ')}" placeholder="guided">
          </div>
        </div>
      </div>`;
    container.appendChild(item);
  });
}

function renderGenericTracksList() {
  const container = $('generic-tracks-list');
  container.innerHTML = '';
  state.genericTracks.forEach((gt, i) => {
    const item = document.createElement('div');
    item.className = 'list-track-item';
    item.style.marginBottom = 'var(--sp-3)';
    item.innerHTML = `
      <div class="list-track-item-header">
        <span class="list-track-item-title">Track #${i + 1}</span>
        <button class="btn-icon danger" data-idx="${i}" data-action="remove-gt" title="Remove">✕</button>
      </div>
      <div class="list-track-item-body">
        <div class="form-group">
          <label class="form-label">Track Name</label>
          <input id="gt-name-${i}" class="form-input" type="text" value="${escHtml(gt.name)}" placeholder="Sensors">
        </div>
        <div class="track-editor-controls">
          <div class="form-group">
            <label class="form-label">Box Count</label>
            <input id="gt-box-count-${i}" class="form-input" type="number" min="1" max="12" value="${gt.boxCount}">
          </div>
          <div class="form-group">
            <label class="form-label">Hit d6 Nums</label>
            <input id="gt-hit-nums-${i}" class="form-input" type="text" value="${listStr(gt.hitNumbers)}" placeholder="">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Threshold Positions</label>
          <input id="gt-thresholds-${i}" class="form-input" type="text" value="${listStr(gt.thresholds)}" placeholder="">
        </div>
      </div>`;
    container.appendChild(item);
  });
}

function populateAll() {
  populateIdentity();
  populateEngineering();
  populateFtl();
  populatePrimaryWeapon();
  renderSecondaryWeaponsList();
  renderGenericTracksList();
}

/* ── SSD Renderer ────────────────────────────────────────── */

/** Sanitize text for safe HTML embedding */
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Render a row of track boxes + threshold markers.
 * Returns an HTML string.
 */
function renderTrackBoxes(boxCount, thresholds) {
  const ts = new Set(thresholds || []);
  let html = '<div class="ssd-track-grid">';
  for (let i = 0; i < boxCount; i++) {
    if (ts.has(i)) {
      html += '<div class="ssd-threshold"></div>';
    } else {
      html += '<input type="checkbox" class="ssd-box" aria-label="box">';
    }
  }
  html += '</div>';
  return html;
}

/**
 * Build the full d6 hit allocation table from all tracks.
 * Returns an array of {die, label} for dice values 1–6.
 */
function buildHitTable(s) {
  const table = {};
  function mark(nums, label) {
    (nums || []).forEach(n => {
      if (n >= 1 && n <= 6) {
        table[n] = table[n] ? `${table[n]} / ${label}` : label;
      }
    });
  }
  mark(s.engineeringTrack.hitNumbers, 'Engineering');
  mark(s.ftlTrack.hitNumbers, 'FTL');
  mark(s.primaryWeapon.hitNumbers, s.primaryWeapon.name || 'Primary Weapon');
  (s.secondaryWeapons || []).forEach(sw => mark(sw.hitNumbers, sw.name || 'Secondary'));
  (s.genericTracks || []).forEach(gt => mark(gt.hitNumbers, gt.name || 'Generic'));

  return [1, 2, 3, 4, 5, 6].map(d => ({
    die: d,
    label: table[d] || '—',
  }));
}

/** Render the full SSD sheet HTML */
function renderSSD(s) {
  const hitTable = buildHitTable(s);
  const eng = s.engineeringTrack;
  const ftl = s.ftlTrack;
  const pw  = s.primaryWeapon;

  /* Header */
  const headerHtml = `
    <header class="sheet-header">
      <div>
        <div class="sheet-main-title">${escHtml(s.name || 'Unnamed')}</div>
        <div class="sheet-class">${escHtml(s.class || '—')}</div>
        <div class="sheet-faction-role">${escHtml(s.faction || '—')} · ${escHtml(s.role || '—')}</div>
      </div>
      <div class="sheet-stat-box">
        <div class="sheet-stat-label">Power</div>
        <div class="sheet-stat-value">${escHtml(String(s.basePower))}</div>
      </div>
      <div class="sheet-stat-box">
        <div class="sheet-stat-label">Agility</div>
        <div class="sheet-stat-value">${escHtml(String(s.agility))}</div>
      </div>
      <div class="sheet-stat-box">
        <div class="sheet-stat-label">Tough</div>
        <div class="sheet-stat-value">${escHtml(String(s.toughness))}</div>
      </div>
    </header>`;

  /* Power level badges beside engineering */
  const powerBadges = (eng.powerLevels || []).map(p =>
    `<div class="ssd-power-badge">⚡${p}</div>`
  ).join('');

  /* Engineering track with power sidebar */
  const engHtml = `
    <div class="ssd-track-section">
      <div class="ssd-track-header">
        <span class="ssd-track-label">Engineering</span>
        ${eng.hitNumbers.length ? `<span class="ssd-track-hit">d6: ${eng.hitNumbers.join(',')}</span>` : ''}
      </div>
      <div class="ssd-engineering-row">
        <div style="flex:1">${renderTrackBoxes(eng.boxCount, eng.thresholds)}</div>
        ${powerBadges ? `<div class="ssd-power-levels">${powerBadges}</div>` : ''}
      </div>
    </div>`;

  /* FTL track */
  const ftlHtml = `
    <div class="ssd-track-section">
      <div class="ssd-track-header">
        <span class="ssd-track-label">FTL Drive</span>
        ${ftl.hitNumbers.length ? `<span class="ssd-track-hit">d6: ${ftl.hitNumbers.join(',')}</span>` : ''}
      </div>
      ${renderTrackBoxes(ftl.boxCount, ftl.thresholds)}
    </div>`;

  /* Left column */
  const leftColHtml = `<div class="ssd-left-col">${engHtml}${ftlHtml}</div>`;

  /* Hit allocation table */
  const hitRowsHtml = hitTable.map(row => `
    <div class="ssd-hit-row">
      <div class="ssd-hit-die">${row.die}</div>
      <div class="ssd-hit-target">${escHtml(row.label)}</div>
    </div>`).join('');

  /* Generic tracks for center column */
  const genericHtml = (s.genericTracks || []).map(gt => `
    <div class="ssd-track-section">
      <div class="ssd-track-header">
        <span class="ssd-track-label">${escHtml(gt.name || 'Track')}</span>
        ${gt.hitNumbers.length ? `<span class="ssd-track-hit">d6: ${gt.hitNumbers.join(',')}</span>` : ''}
      </div>
      ${renderTrackBoxes(gt.boxCount, gt.thresholds)}
    </div>`).join('');

  /* Notes */
  const notesHtml = s.notes ? `
    <div class="ssd-notes">
      <div class="ssd-notes-label">Notes</div>
      ${escHtml(s.notes)}
    </div>` : '';

  /* Center column */
  const centerColHtml = `
    <div class="ssd-center">
      <div class="ssd-hit-table">
        <div class="ssd-hit-table-title">d6 Hit Allocation</div>
        ${hitRowsHtml}
      </div>
      <div class="ssd-generic-tracks">${genericHtml}</div>
      ${notesHtml}
    </div>`;

  /* Weapon sections for right column */
  function weaponSection(label, track, isSecondary) {
    const traitsText = (track.traits || []).join(', ');
    return `
      <div class="ssd-weapon-section">
        <div class="ssd-weapon-header">
          <span class="ssd-weapon-name">${escHtml(label)}</span>
          ${track.hitNumbers && track.hitNumbers.length
            ? `<span class="ssd-weapon-hit">d6: ${track.hitNumbers.join(',')}</span>`
            : ''}
        </div>
        <div class="ssd-weapon-body">
          <div class="ssd-track-grid" style="margin-bottom:4px">
            ${renderTrackBoxes(track.boxCount, track.thresholds)}
          </div>
          <div class="ssd-weapon-stats">
            ${track.range     ? `<span class="ssd-weapon-stat-tag">RNG ${escHtml(track.range)}</span>` : ''}
            ${track.dice      ? `<span class="ssd-weapon-stat-tag">${track.dice}d6</span>` : ''}
            ${track.powerCost !== undefined ? `<span class="ssd-weapon-stat-tag">PWR ${track.powerCost}</span>` : ''}
          </div>
          ${traitsText ? `<div class="ssd-weapon-traits">${escHtml(traitsText)}</div>` : ''}
        </div>
      </div>`;
  }

  const weaponsHtml = [
    weaponSection(pw.name || 'Primary Weapon', pw, false),
    ...(s.secondaryWeapons || []).map(sw =>
      weaponSection(sw.name || 'Secondary Weapon', sw, true)
    ),
  ].join('');

  const rightColHtml = `<div class="ssd-weapons-col">${weaponsHtml}</div>`;

  /* Footer */
  const footerHtml = `
    <footer class="ssd-footer">
      <span>Nexus: Shattered Void™ · SSD v1.0</span>
      <span>${new Date().toLocaleDateString()}</span>
      <span>© 2026 Vulcans' Forge Studio</span>
    </footer>`;

  return `
    ${headerHtml}
    <div class="sheet-body">
      ${leftColHtml}
      ${centerColHtml}
      ${rightColHtml}
    </div>
    ${footerHtml}`;
}

/** Trigger a live re-render of the SSD sheet */
function updatePreview() {
  readAll();
  const sheet = $('ssd-sheet');
  if (sheet) sheet.innerHTML = renderSSD(state);
}

/* ── Load catalog ships ──────────────────────────────────── */
function populateCatalogSelect() {
  const sel = $('load-ship-select');
  sel.innerHTML = '<option value="">— Load from Template —</option>' +
    shipCatalog.map(s => `<option value="${escHtml(s.id)}">${escHtml(s.class || s.name)}</option>`).join('');
}

function loadShipFromCatalog(id) {
  const ship = shipCatalog.find(s => s.id === id);
  if (!ship) return;
  state = JSON.parse(JSON.stringify(ship)); // deep copy
  // Ensure all required fields exist
  state.secondaryWeapons = state.secondaryWeapons || [];
  state.genericTracks    = state.genericTracks    || [];
  state.notes            = state.notes            || '';
  populateAll();
  updatePreview();
}

/* ── Save / Load ─────────────────────────────────────────── */
function saveToLocal() {
  readAll();
  localStorage.setItem('nsv_ssd_v2', JSON.stringify(state));
  showToast('Ship saved to browser storage.', 'success');
}

function loadFromLocal() {
  const raw = localStorage.getItem('nsv_ssd_v2');
  if (!raw) { showToast('No saved ship found.', 'warning'); return; }
  try {
    state = JSON.parse(raw);
    state.secondaryWeapons = state.secondaryWeapons || [];
    state.genericTracks    = state.genericTracks    || [];
    populateAll();
    updatePreview();
    showToast('Ship loaded.', 'success');
  } catch {
    showToast('Failed to load saved ship.', 'error');
  }
}

/* ── Export JSON ─────────────────────────────────────────── */
function exportJSON() {
  readAll();
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const filename = (state.name || 'ship').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '_ssd.json';
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(`Exported as ${filename}`, 'success');
}

/* ── New ship ─────────────────────────────────────────────── */
function newShip() {
  state = defaultState();
  populateAll();
  updatePreview();
  showToast('New ship created.', 'info');
}

/* ── Wire all events ─────────────────────────────────────── */
function wireEvents() {
  // Identity & core inputs — live update on any change
  const liveInputIds = [
    'e-name','e-class','e-faction','e-role','e-base-power','e-agility','e-toughness',
    'e-notes',
    'eng-box-count','eng-hit-nums','eng-power-levels','eng-thresholds',
    'ftl-box-count','ftl-hit-nums','ftl-thresholds',
    'pw-name','pw-box-count','pw-hit-nums','pw-thresholds',
    'pw-range','pw-dice','pw-power-cost','pw-traits',
  ];
  liveInputIds.forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('input', updatePreview);
  });

  // Load from catalog
  $('load-ship-btn').addEventListener('click', () => {
    const id = $('load-ship-select').value;
    if (id) loadShipFromCatalog(id);
    else showToast('Select a template first.', 'warning');
  });

  // Toolbar buttons
  $('new-ship-btn').addEventListener('click', newShip);
  $('save-btn').addEventListener('click', saveToLocal);
  $('load-local-btn').addEventListener('click', loadFromLocal);
  $('export-btn').addEventListener('click', exportJSON);
  $('print-btn').addEventListener('click', () => window.print());

  // Add secondary weapon
  $('add-secondary-btn').addEventListener('click', () => {
    readSecondaryWeapons();
    state.secondaryWeapons.push({
      name: '', boxCount: 4, thresholds: [], hitNumbers: [],
      range: '', dice: 1, powerCost: 0, traits: [],
    });
    renderSecondaryWeaponsList();
    wireListItemEvents();
    updatePreview();
  });

  // Add generic track
  $('add-generic-btn').addEventListener('click', () => {
    readGenericTracks();
    state.genericTracks.push({
      name: '', boxCount: 4, thresholds: [], hitNumbers: [],
    });
    renderGenericTracksList();
    wireListItemEvents();
    updatePreview();
  });

  wireListItemEvents();
}

/**
 * Wire remove buttons and live input handlers for dynamically-generated
 * secondary weapons and generic tracks.
 */
function wireListItemEvents() {
  // Remove secondary weapon
  document.querySelectorAll('[data-action="remove-sw"]').forEach(btn => {
    btn.addEventListener('click', () => {
      readSecondaryWeapons();
      const idx = Number(btn.dataset.idx);
      state.secondaryWeapons.splice(idx, 1);
      renderSecondaryWeaponsList();
      wireListItemEvents();
      updatePreview();
    });
  });

  // Remove generic track
  document.querySelectorAll('[data-action="remove-gt"]').forEach(btn => {
    btn.addEventListener('click', () => {
      readGenericTracks();
      const idx = Number(btn.dataset.idx);
      state.genericTracks.splice(idx, 1);
      renderGenericTracksList();
      wireListItemEvents();
      updatePreview();
    });
  });

  // Live preview for secondary weapon inputs
  state.secondaryWeapons.forEach((_, i) => {
    [`sw-name-${i}`,`sw-box-count-${i}`,`sw-hit-nums-${i}`,`sw-thresholds-${i}`,
     `sw-range-${i}`,`sw-dice-${i}`,`sw-power-cost-${i}`,`sw-traits-${i}`].forEach(id => {
      const el = $(id);
      if (el) el.addEventListener('input', updatePreview);
    });
  });

  // Live preview for generic track inputs
  state.genericTracks.forEach((_, i) => {
    [`gt-name-${i}`,`gt-box-count-${i}`,`gt-hit-nums-${i}`,`gt-thresholds-${i}`].forEach(id => {
      const el = $(id);
      if (el) el.addEventListener('input', updatePreview);
    });
  });
}

/* ── Init ─────────────────────────────────────────────────── */
async function init() {
  initNav();
  initFooter();

  try {
    shipCatalog = await loadShips();
  } catch (err) {
    showToast(`Failed to load ship templates: ${err.message}`, 'error');
  }

  populateCatalogSelect();
  populateAll();
  updatePreview();
  wireEvents();
}

init();
