/* ============================================================
   builder.js — Ship builder page logic
   ============================================================ */
import { loadFactions, loadShips, loadWeapons, loadModules } from './data-loader.js';
import { initNav, initFooter } from './nav.js';

// ── State ────────────────────────────────────────────────────
const state = {
  factions: [],
  ships: [],
  weapons: [],
  modules: [],
  selectedFaction: null,
  selectedShip: null,
  equippedWeapons: [],
  equippedModules: [],
  equippedUpgrades: [],
  customFeatures: [],
};

// ── Toast ────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-msg">${msg}</span>
    <button class="toast-close" aria-label="Dismiss">✕</button>
  `;
  toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ── DOM helpers ──────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

// ── Calculate total cost ─────────────────────────────────────
function totalCost() {
  const base = state.selectedShip?.baseCost ?? 0;
  const wCost = state.equippedWeapons.reduce((s, w) => s + w.cost, 0);
  const mCost = state.equippedModules.reduce((s, m) => s + m.cost, 0);
  const uCost = state.equippedUpgrades.reduce((s, u) => s + u.cost, 0);
  return base + wCost + mCost + uCost;
}

// ── Render faction dropdown ──────────────────────────────────
function renderFactionDropdown() {
  const sel = $('faction-select');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Select Faction —</option>' +
    state.factions.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
  if (state.selectedFaction) sel.value = state.selectedFaction.id;
}

// ── Render ship dropdown ─────────────────────────────────────
function renderShipDropdown() {
  const sel = $('ship-select');
  if (!sel) return;
  const ships = state.factions.length && state.selectedFaction
    ? state.ships.filter(s => s.faction === state.selectedFaction.id)
    : [];
  sel.innerHTML = '<option value="">— Select Ship Hull —</option>' +
    ships.map(s => `<option value="${s.id}">${s.name} (${s.type}) — ${s.baseCost} pts</option>`).join('');
  if (state.selectedShip) sel.value = state.selectedShip.id;
}

// ── Render ship stats block ──────────────────────────────────
function renderShipStats() {
  const panel = $('ship-stats-panel');
  if (!panel) return;
  if (!state.selectedShip) {
    panel.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🚀</div><h3>No ship selected</h3><p>Choose a faction and hull to begin.</p></div>';
    return;
  }
  const s = state.selectedShip;
  const slots = s.slots;
  panel.innerHTML = `
    <div class="ship-stat-block anim-fade-in">
      <div class="ship-stat-header">
        <div>
          <div class="ship-stat-name">${s.name}</div>
          <div class="ship-stat-type">${s.type}</div>
        </div>
        <span class="cost-badge">${s.baseCost} pts</span>
      </div>
      <div class="ship-stats-grid">
        <div class="stat-cell"><span class="stat-label">Hull</span><span class="stat-value">${s.stats.hull}</span></div>
        <div class="stat-cell"><span class="stat-label">Shields</span><span class="stat-value">${s.stats.shields}</span></div>
        <div class="stat-cell"><span class="stat-label">Speed</span><span class="stat-value">${s.stats.speed}</span></div>
        <div class="stat-cell"><span class="stat-label">Agility</span><span class="stat-value">${s.stats.agility}</span></div>
        <div class="stat-cell"><span class="stat-label">Sensors</span><span class="stat-value">${s.stats.sensors}</span></div>
        <div class="stat-cell"><span class="stat-label">Crew</span><span class="stat-value">${s.stats.crew}</span></div>
      </div>
      <div class="ship-slots">
        <div class="slot-indicator">⚔️ Weapons: <span>${slots.weapons}</span></div>
        <div class="slot-indicator">🔧 Modules: <span>${slots.modules}</span></div>
        <div class="slot-indicator">⬆️ Upgrades: <span>${slots.upgrades}</span></div>
      </div>
    </div>
    <p style="color:var(--color-text-dim);font-size:0.85rem;margin-top:var(--sp-4);padding:0 var(--sp-2)">${s.description}</p>
  `;
}

// ── Filter items by faction and hull size ────────────────────
const HULL_ORDER = ['Interceptor', 'Frigate', 'Raider', 'Battle Frigate', 'Destroyer', 'Gunship', 'Stealth Cruiser', 'Cruiser', 'Carrier', 'Dreadnought'];

function hullRank(type) {
  const idx = HULL_ORDER.indexOf(type);
  return idx === -1 ? 5 : idx;
}

function meetsMinHull(item, shipType) {
  if (!item.minHullSize) return true;
  return hullRank(shipType) >= hullRank(item.minHullSize);
}

function isFactionCompatible(item, factionId) {
  if (!item.factionRestricted || item.factionRestricted.length === 0) return true;
  return item.factionRestricted.includes(factionId);
}

function getAvailableWeapons() {
  if (!state.selectedShip) return [];
  return state.weapons.filter(w =>
    isFactionCompatible(w, state.selectedFaction?.id) &&
    meetsMinHull(w, state.selectedShip.type)
  );
}

function getAvailableModules() {
  if (!state.selectedShip) return [];
  return state.modules.filter(m =>
    isFactionCompatible(m, state.selectedFaction?.id) &&
    meetsMinHull(m, state.selectedShip.type)
  );
}

// ── Render available items tab ───────────────────────────────
function renderItemsList(items, equippedList, slotMax, addCallback, removeCallback, emptyMsg) {
  if (!state.selectedShip) {
    return `<div class="empty-state"><div class="empty-state-icon">🔒</div><h3>Select a ship first</h3></div>`;
  }

  const typeColors = {
    'Energy': 'badge-cyan', 'Kinetic': 'badge-gray', 'Missile': 'badge-orange',
    'Exotic': 'badge-purple', 'Defense': 'badge-blue', 'Engine': 'badge-teal',
    'Support': 'badge-gray', 'Offensive': 'badge-red', 'Special': 'badge-purple',
  };

  const used = equippedList.length;
  const slotInfo = `<div style="margin-bottom:var(--sp-4);font-family:var(--font-mono);font-size:0.8rem;color:var(--color-text-dim)">
    Slots used: <span style="color:${used >= slotMax ? 'var(--color-red)' : 'var(--color-cyan)'}">${used} / ${slotMax}</span>
  </div>`;

  if (items.length === 0) {
    return slotInfo + `<div class="empty-state"><div class="empty-state-icon">🚫</div><h3>${emptyMsg}</h3></div>`;
  }

  const rows = items.map(item => {
    const alreadyEquipped = equippedList.find(e => e.id === item.id);
    const slotsLeft = slotMax - used;
    const canAdd = !alreadyEquipped && slotsLeft > 0;
    const badgeClass = typeColors[item.type || item.category] || 'badge-gray';
    const label = item.type || item.category;
    const detail = item.type
      ? `${item.damage} · ${item.range} range`
      : item.category;

    return `
      <div class="item-row">
        <div class="item-row-info">
          <div class="item-row-name">
            ${item.name}
            <span class="badge ${badgeClass}" style="margin-left:6px;font-size:0.65rem">${label}</span>
            ${item.factionRestricted ? '<span class="badge badge-purple" style="margin-left:4px;font-size:0.65rem">Faction</span>' : ''}
          </div>
          <div class="item-row-detail">${detail}</div>
          <div class="item-row-detail" style="font-family:var(--font-ui);color:var(--color-text-muted);font-size:0.75rem;margin-top:2px">${item.special || item.effect}</div>
        </div>
        <span class="item-row-cost">${item.cost}</span>
        ${alreadyEquipped
          ? `<button class="btn btn-danger btn-sm" data-remove="${item.id}">Remove</button>`
          : `<button class="btn btn-secondary btn-sm" data-add="${item.id}" ${canAdd ? '' : 'disabled'}>Add</button>`
        }
      </div>`;
  }).join('');

  return slotInfo + `<div class="equipped-list">${rows}</div>`;
}

// ── Render the active tab content ────────────────────────────
function renderActiveTab() {
  const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab || 'weapons';
  const panel = $(`tab-${activeTab}`);
  if (!panel) return;

  if (activeTab === 'weapons') {
    const ship = state.selectedShip;
    panel.innerHTML = renderItemsList(
      getAvailableWeapons(),
      state.equippedWeapons,
      ship?.slots.weapons ?? 0,
      null, null,
      'No compatible weapons available'
    );
    panel.querySelectorAll('[data-add]').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = state.weapons.find(w => w.id === btn.dataset.add);
        if (item && state.equippedWeapons.length < state.selectedShip.slots.weapons) {
          state.equippedWeapons.push(item);
          updateSummary();
          renderActiveTab();
        }
      });
    });
    panel.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.equippedWeapons = state.equippedWeapons.filter(w => w.id !== btn.dataset.remove);
        updateSummary();
        renderActiveTab();
      });
    });
  }

  if (activeTab === 'modules') {
    const ship = state.selectedShip;
    panel.innerHTML = renderItemsList(
      getAvailableModules(),
      state.equippedModules,
      ship?.slots.modules ?? 0,
      null, null,
      'No compatible modules available'
    );
    panel.querySelectorAll('[data-add]').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = state.modules.find(m => m.id === btn.dataset.add);
        if (item && state.equippedModules.length < state.selectedShip.slots.modules) {
          state.equippedModules.push(item);
          updateSummary();
          renderActiveTab();
        }
      });
    });
    panel.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.equippedModules = state.equippedModules.filter(m => m.id !== btn.dataset.remove);
        updateSummary();
        renderActiveTab();
      });
    });
  }

  if (activeTab === 'upgrades') {
    panel.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚙️</div><h3>Upgrades Coming Soon</h3><p>Upgrade cards will be available in the next data pack.</p></div>`;
  }
}

// ── Render build summary ─────────────────────────────────────
function updateSummary() {
  const total = totalCost();
  const totalEl = $('total-cost');
  if (totalEl) totalEl.textContent = total;

  const shipEl = $('summary-ship');
  if (shipEl) {
    shipEl.innerHTML = state.selectedShip
      ? `<div class="equipped-item">
           <span class="equipped-item-name">${state.selectedShip.name}</span>
           <span class="equipped-item-cost">${state.selectedShip.baseCost}</span>
         </div>`
      : '<span style="color:var(--color-text-muted);font-size:0.85rem">No hull selected</span>';
  }

  const renderList = (containerId, list) => {
    const el = $(containerId);
    if (!el) return;
    if (list.length === 0) {
      el.innerHTML = '<span style="color:var(--color-text-muted);font-size:0.85rem">None equipped</span>';
      return;
    }
    el.innerHTML = list.map(item => `
      <div class="equipped-item">
        <span class="equipped-item-name">${item.name}</span>
        <span class="equipped-item-cost">${item.cost}</span>
      </div>`).join('');
  };

  renderList('summary-weapons', state.equippedWeapons);
  renderList('summary-modules', state.equippedModules);

  const featureEl = $('summary-features');
  if (featureEl) {
    if (state.customFeatures.length === 0) {
      featureEl.innerHTML = '<span style="color:var(--color-text-muted);font-size:0.85rem">No custom features</span>';
    } else {
      featureEl.innerHTML = state.customFeatures.map((feature, index) => `
        <div class="feature-item">
          <span>${feature}</span>
          <button class="btn btn-danger btn-sm" data-feature-remove="${index}">Remove</button>
        </div>
      `).join('');
      featureEl.querySelectorAll('[data-feature-remove]').forEach(btn => {
        btn.addEventListener('click', () => removeCustomFeature(Number(btn.dataset.featureRemove)));
      });
    }
  }
}

function addCustomFeature() {
  const input = $('feature-input');
  if (!input) return;
  const value = input.value.trim();
  if (!value) {
    showToast('Enter a feature name first.', 'warning');
    return;
  }
  if (state.customFeatures.length >= 12) {
    showToast('Maximum 12 custom features per SSD.', 'warning');
    return;
  }
  state.customFeatures.push(value);
  input.value = '';
  updateSummary();
}

function removeCustomFeature(index) {
  state.customFeatures = state.customFeatures.filter((_, i) => i !== index);
  updateSummary();
}

function printSSD() {
  if (!state.selectedShip) {
    showToast('Select a ship hull before printing.', 'warning');
    return;
  }
  window.print();
}

// ── Build JSON object ─────────────────────────────────────────
function buildExportObject() {
  return {
    version: '1.0',
    faction: state.selectedFaction?.id ?? null,
    ship: state.selectedShip?.id ?? null,
    weapons: state.equippedWeapons.map(w => w.id),
    modules: state.equippedModules.map(m => m.id),
    upgrades: state.equippedUpgrades.map(u => u.id),
    customFeatures: state.customFeatures,
    totalCost: totalCost(),
    exportedAt: new Date().toISOString(),
  };
}

// ── Save / Load Fleet ─────────────────────────────────────────
function saveFleet() {
  if (!state.selectedShip) {
    showToast('Select a ship hull before saving.', 'warning');
    return;
  }
  const fleet = buildExportObject();
  fleet.factionName = state.selectedFaction?.name;
  fleet.shipName = state.selectedShip?.name;
  localStorage.setItem('nsv_fleet', JSON.stringify(fleet));
  showToast('Fleet saved to local storage!', 'success');
}

function loadFleet() {
  const raw = localStorage.getItem('nsv_fleet');
  if (!raw) { showToast('No saved fleet found.', 'warning'); return; }
  try {
    const fleet = JSON.parse(raw);
    const faction = state.factions.find(f => f.id === fleet.faction);
    if (faction) {
      state.selectedFaction = faction;
      $('faction-select').value = faction.id;
      renderShipDropdown();
    }
    const ship = state.ships.find(s => s.id === fleet.ship);
    if (ship) {
      state.selectedShip = ship;
      $('ship-select').value = ship.id;
      renderShipStats();
    }
    state.equippedWeapons = fleet.weapons.map(id => state.weapons.find(w => w.id === id)).filter(Boolean);
    state.equippedModules = fleet.modules.map(id => state.modules.find(m => m.id === id)).filter(Boolean);
    state.customFeatures = Array.isArray(fleet.customFeatures) ? fleet.customFeatures : [];
    updateSummary();
    renderActiveTab();
    showToast(`Fleet loaded: ${fleet.shipName || ship?.name}`, 'success');
  } catch (e) {
    showToast('Failed to load fleet data.', 'error');
  }
}

// ── Export Modal ──────────────────────────────────────────────
function openExportModal() {
  if (!state.selectedShip) { showToast('No ship to export.', 'warning'); return; }
  const data = buildExportObject();
  const json = JSON.stringify(data, null, 2);

  let modal = $('export-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'export-modal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="modal-panel">
      <div class="modal-header">
        <h2 class="modal-title">Export Build — ${state.selectedShip.name}</h2>
        <button class="modal-close" id="close-export-modal">✕</button>
      </div>
      <div class="modal-body">
        <p style="color:var(--color-text-dim);margin-bottom:var(--sp-4);font-size:0.9rem">
          Total Cost: <strong style="color:var(--color-cyan)">${totalCost()} pts</strong> ·
          Faction: <strong>${state.selectedFaction?.name}</strong>
        </p>
        <pre style="background:rgba(0,0,0,0.4);border:1px solid var(--color-border);border-radius:4px;padding:1rem;overflow:auto;font-size:0.78rem;color:var(--color-cyan);max-height:360px">${json}</pre>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost btn-sm" id="close-export-modal-2">Close</button>
        <button class="btn btn-secondary btn-sm" id="copy-export-json">Copy JSON</button>
        <button class="btn btn-primary btn-sm" onclick="window.print()">Print</button>
      </div>
    </div>`;
  modal.classList.remove('hidden');
  modal.querySelector('#close-export-modal').addEventListener('click', () => modal.classList.add('hidden'));
  modal.querySelector('#close-export-modal-2').addEventListener('click', () => modal.classList.add('hidden'));
  modal.querySelector('#copy-export-json').addEventListener('click', () => {
    navigator.clipboard?.writeText(json).then(() => showToast('Copied to clipboard!', 'success'));
  });
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });
}

// ── Share Build ───────────────────────────────────────────────
function shareBuild() {
  if (!state.selectedShip) { showToast('No build to share.', 'warning'); return; }
  const data = buildExportObject();
  const encoded = btoa(JSON.stringify(data));
  const url = `${window.location.origin}${window.location.pathname}?build=${encoded}`;
  navigator.clipboard?.writeText(url).then(() => {
    showToast('Share URL copied to clipboard!', 'success');
  }).catch(() => {
    showToast('Share URL: ' + url.substring(0, 60) + '…', 'info');
  });
}

// ── Load build from URL ────────────────────────────────────────
function loadFromURL() {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('build');
  if (!encoded) return false;
  try {
    const fleet = JSON.parse(atob(encoded));
    const faction = state.factions.find(f => f.id === fleet.faction);
    if (faction) { state.selectedFaction = faction; $('faction-select').value = faction.id; renderShipDropdown(); }
    const ship = state.ships.find(s => s.id === fleet.ship);
    if (ship) { state.selectedShip = ship; $('ship-select').value = ship.id; renderShipStats(); }
    state.equippedWeapons = (fleet.weapons || []).map(id => state.weapons.find(w => w.id === id)).filter(Boolean);
    state.equippedModules = (fleet.modules || []).map(id => state.modules.find(m => m.id === id)).filter(Boolean);
    state.customFeatures = Array.isArray(fleet.customFeatures) ? fleet.customFeatures : [];
    updateSummary();
    renderActiveTab();
    showToast('Build loaded from shared link!', 'success');
    return true;
  } catch { return false; }
}

// ── Tab switching ─────────────────────────────────────────────
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = $(`tab-${btn.dataset.tab}`);
      if (panel) panel.classList.add('active');
      renderActiveTab();
    });
  });
}

// ── Wire up controls ─────────────────────────────────────────
function wireControls() {
  $('faction-select')?.addEventListener('change', (e) => {
    state.selectedFaction = state.factions.find(f => f.id === e.target.value) || null;
    state.selectedShip = null;
    state.equippedWeapons = [];
    state.equippedModules = [];
    state.equippedUpgrades = [];
    state.customFeatures = [];
    renderShipDropdown();
    renderShipStats();
    updateSummary();
    renderActiveTab();
  });

  $('ship-select')?.addEventListener('change', (e) => {
    state.selectedShip = state.ships.find(s => s.id === e.target.value) || null;
    state.equippedWeapons = [];
    state.equippedModules = [];
    state.equippedUpgrades = [];
    state.customFeatures = [];
    renderShipStats();
    updateSummary();
    renderActiveTab();
  });

  $('save-fleet-btn')?.addEventListener('click', saveFleet);
  $('load-fleet-btn')?.addEventListener('click', loadFleet);
  $('export-btn')?.addEventListener('click', openExportModal);
  $('share-btn')?.addEventListener('click', shareBuild);
  $('print-ssd-btn')?.addEventListener('click', printSSD);
  $('add-feature-btn')?.addEventListener('click', addCustomFeature);
  $('feature-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomFeature();
    }
  });
}

// ── Init ──────────────────────────────────────────────────────
async function init() {
  initNav();
  initFooter();

  try {
    [state.factions, state.ships, state.weapons, state.modules] = await Promise.all([
      loadFactions(), loadShips(), loadWeapons(), loadModules()
    ]);
  } catch (err) {
    showToast('Failed to load game data: ' + err.message, 'error');
    return;
  }

  renderFactionDropdown();
  renderShipDropdown();
  renderShipStats();
  updateSummary();
  initTabs();
  wireControls();

  // Pre-select faction from sessionStorage (set by factions page)
  const preselect = sessionStorage.getItem('selectedFaction');
  if (preselect) {
    sessionStorage.removeItem('selectedFaction');
    const faction = state.factions.find(f => f.id === preselect);
    if (faction) {
      state.selectedFaction = faction;
      $('faction-select').value = faction.id;
      renderShipDropdown();
      showToast(`Faction pre-selected: ${faction.name}`, 'info');
    }
  }

  // Load from URL share link
  loadFromURL();
}

init();
