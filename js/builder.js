/* ============================================================
   builder.js — SSD Builder v2 for Nexus: Shattered Void
   Schema: className, shipType, faction, idCode, fleetPoints,
   4 left-column sections (with hit labels + boost boxes),
   4 weapons (with 8-arc arrays + 3 stat fields),
   8 bottom-band stats, notes, FTL Drive toggle.
   ============================================================ */
import { initNav, initFooter } from './nav.js';
import { renderSSD } from './ssd-renderer.js';

/* ── Helpers ─────────────────────────────────────────────── */
const $ = (id) => document.getElementById(id);

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── Default (empty template) state ─────────────────────── */
function defaultState() {
  return {
    /* ── Header ── */
    className:   '',
    shipType:    '',
    faction:     '',
    idCode:      '',
    fleetPoints: '',

    /* ── Left-column sections ── */
    structureHitLabel:   '1,3,5',
    structureBoost1:     '⚡+1',
    structureBoost2:     '⚙⚡',

    engineeringHitLabel: '1-2',
    engineeringBoost1:   '⇒⚡+1',
    engineeringBoost2:   '▶⚡',

    weaponsHitLabel:     '3-4',
    weaponsBoost1:       '▽/⚡',

    systemsHitLabel:     '5-6',
    systemsBoost1:       '⚙⚡+1',
    systemsBoost2:       '⊕⚡+1',

    /* ── Weapons ── */
    primaryWeaponName:  'Primary Weapon',
    primaryWeaponTrait: '',
    primaryWeaponArcs:  [],
    primaryWeaponStat1: '1 - 2',
    primaryWeaponStat2: '1 ▼',
    primaryWeaponStat3: 'x1',

    altWeaponAName:  'Alt Weapon A',
    altWeaponATrait: '',
    altWeaponAArcs:  [],
    altWeaponAStat1: '1 - 2',
    altWeaponAStat2: '1 ▼',
    altWeaponAStat3: 'x1',

    altWeaponBName:  'Alt Weapon B',
    altWeaponBTrait: '',
    altWeaponBArcs:  [],
    altWeaponBStat1: '1 - 2',
    altWeaponBStat2: '1 ▼',
    altWeaponBStat3: 'x1',

    altWeaponCName:  'Alt Weapon C',
    altWeaponCTrait: '',
    altWeaponCArcs:  [],
    altWeaponCStat1: '1 - 2',
    altWeaponCStat2: '1 ▼',
    altWeaponCStat3: 'x1',

    /* ── Bottom stats (icon + value, 8 entries) ── */
    stat1Icon: '⇒', stat1Value: '1',
    stat2Icon: '⊙', stat2Value: '1',
    stat3Icon: '✕', stat3Value: '1',
    stat4Icon: '▶', stat4Value: '1',
    stat5Icon: '↩', stat5Value: '1',
    stat6Icon: '⚐', stat6Value: '1',
    stat7Icon: '⚙', stat7Value: '1',
    stat8Icon: '▽', stat8Value: '1',

    /* ── Notes + FTL ── */
    notes:      '',
    ftlEnabled: false,
  };
}

/* ── Global state ────────────────────────────────────────── */
let state = defaultState();

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

/* ── Read arcs from arc-toggle checkboxes ────────────────── */
const ARC_DIRS = ['N','NE','E','SE','S','SW','W','NW'];

function readArcs(prefix) {
  return ARC_DIRS.filter(dir => $(`e-${prefix}-arc-${dir}`)?.checked);
}

/* ── Read all editor fields → state ─────────────────────── */
function readAll() {
  const v  = (id) => $(id)?.value ?? '';
  const vt = (id) => v(id).trim();

  state.className   = vt('e-classname');
  state.shipType    = vt('e-shiptype');
  state.faction     = vt('e-faction');
  state.idCode      = vt('e-idcode');
  state.fleetPoints = vt('e-fleetpoints');

  state.structureHitLabel   = vt('e-str-hit');
  state.structureBoost1     = vt('e-str-boost1');
  state.structureBoost2     = vt('e-str-boost2');

  state.engineeringHitLabel = vt('e-eng-hit');
  state.engineeringBoost1   = vt('e-eng-boost1');
  state.engineeringBoost2   = vt('e-eng-boost2');

  state.weaponsHitLabel     = vt('e-wpn-hit');
  state.weaponsBoost1       = vt('e-wpn-boost1');

  state.systemsHitLabel     = vt('e-sys-hit');
  state.systemsBoost1       = vt('e-sys-boost1');
  state.systemsBoost2       = vt('e-sys-boost2');

  state.primaryWeaponName  = vt('e-pw-name');
  state.primaryWeaponTrait = vt('e-pw-trait');
  state.primaryWeaponArcs  = readArcs('pw');
  state.primaryWeaponStat1 = vt('e-pw-stat1');
  state.primaryWeaponStat2 = vt('e-pw-stat2');
  state.primaryWeaponStat3 = vt('e-pw-stat3');

  state.altWeaponAName  = vt('e-aw-a-name');
  state.altWeaponATrait = vt('e-aw-a-trait');
  state.altWeaponAArcs  = readArcs('aw-a');
  state.altWeaponAStat1 = vt('e-aw-a-stat1');
  state.altWeaponAStat2 = vt('e-aw-a-stat2');
  state.altWeaponAStat3 = vt('e-aw-a-stat3');

  state.altWeaponBName  = vt('e-aw-b-name');
  state.altWeaponBTrait = vt('e-aw-b-trait');
  state.altWeaponBArcs  = readArcs('aw-b');
  state.altWeaponBStat1 = vt('e-aw-b-stat1');
  state.altWeaponBStat2 = vt('e-aw-b-stat2');
  state.altWeaponBStat3 = vt('e-aw-b-stat3');

  state.altWeaponCName  = vt('e-aw-c-name');
  state.altWeaponCTrait = vt('e-aw-c-trait');
  state.altWeaponCArcs  = readArcs('aw-c');
  state.altWeaponCStat1 = vt('e-aw-c-stat1');
  state.altWeaponCStat2 = vt('e-aw-c-stat2');
  state.altWeaponCStat3 = vt('e-aw-c-stat3');

  for (let i = 1; i <= 8; i++) {
    state[`stat${i}Icon`]  = vt(`e-stat${i}-icon`);
    state[`stat${i}Value`] = vt(`e-stat${i}-value`);
  }

  state.notes      = v('e-notes');
  state.ftlEnabled = !!$('e-ftl')?.checked;
}

/* ── Populate editor from state ──────────────────────────── */
function populateAll() {
  const set    = (id, val) => { const el = $(id); if (el) el.value = val ?? ''; };
  const setChk = (id, val) => { const el = $(id); if (el) el.checked = !!val; };
  const setArcs = (prefix, arcs) => {
    ARC_DIRS.forEach(dir => setChk(`e-${prefix}-arc-${dir}`, (arcs || []).includes(dir)));
  };

  set('e-classname',   state.className);
  set('e-shiptype',    state.shipType);
  set('e-faction',     state.faction);
  set('e-idcode',      state.idCode);
  set('e-fleetpoints', state.fleetPoints);

  set('e-str-hit',    state.structureHitLabel);
  set('e-str-boost1', state.structureBoost1);
  set('e-str-boost2', state.structureBoost2);

  set('e-eng-hit',    state.engineeringHitLabel);
  set('e-eng-boost1', state.engineeringBoost1);
  set('e-eng-boost2', state.engineeringBoost2);

  set('e-wpn-hit',    state.weaponsHitLabel);
  set('e-wpn-boost1', state.weaponsBoost1);

  set('e-sys-hit',    state.systemsHitLabel);
  set('e-sys-boost1', state.systemsBoost1);
  set('e-sys-boost2', state.systemsBoost2);

  set('e-pw-name',  state.primaryWeaponName);
  set('e-pw-trait', state.primaryWeaponTrait);
  setArcs('pw',     state.primaryWeaponArcs);
  set('e-pw-stat1', state.primaryWeaponStat1);
  set('e-pw-stat2', state.primaryWeaponStat2);
  set('e-pw-stat3', state.primaryWeaponStat3);

  set('e-aw-a-name',  state.altWeaponAName);
  set('e-aw-a-trait', state.altWeaponATrait);
  setArcs('aw-a',     state.altWeaponAArcs);
  set('e-aw-a-stat1', state.altWeaponAStat1);
  set('e-aw-a-stat2', state.altWeaponAStat2);
  set('e-aw-a-stat3', state.altWeaponAStat3);

  set('e-aw-b-name',  state.altWeaponBName);
  set('e-aw-b-trait', state.altWeaponBTrait);
  setArcs('aw-b',     state.altWeaponBArcs);
  set('e-aw-b-stat1', state.altWeaponBStat1);
  set('e-aw-b-stat2', state.altWeaponBStat2);
  set('e-aw-b-stat3', state.altWeaponBStat3);

  set('e-aw-c-name',  state.altWeaponCName);
  set('e-aw-c-trait', state.altWeaponCTrait);
  setArcs('aw-c',     state.altWeaponCArcs);
  set('e-aw-c-stat1', state.altWeaponCStat1);
  set('e-aw-c-stat2', state.altWeaponCStat2);
  set('e-aw-c-stat3', state.altWeaponCStat3);

  for (let i = 1; i <= 8; i++) {
    set(`e-stat${i}-icon`,  state[`stat${i}Icon`]);
    set(`e-stat${i}-value`, state[`stat${i}Value`]);
  }

  set('e-notes', state.notes);
  setChk('e-ftl', state.ftlEnabled);
}

/* ── Live preview ────────────────────────────────────────── */
function updatePreview() {
  readAll();
  const sheet = $('ssd-sheet');
  if (sheet) sheet.innerHTML = renderSSD(state);
}

/* ── Save / Load (localStorage) ─────────────────────────── */
const STORAGE_KEY = 'nsv_ssd_v3';

function saveToLocal() {
  readAll();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  showToast('Ship saved to browser storage.', 'success');
}

function loadFromLocal() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) { showToast('No saved ship found.', 'warning'); return; }
  try {
    state = Object.assign(defaultState(), JSON.parse(raw));
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
  const filename = (state.className || 'ship').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '_ssd.json';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(`Exported as ${filename}`, 'success');
}

/* ── Import JSON ─────────────────────────────────────────── */
function importJSON(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const loaded = JSON.parse(e.target.result);
      state = Object.assign(defaultState(), loaded);
      populateAll();
      updatePreview();
      showToast('Ship imported.', 'success');
    } catch {
      showToast('Invalid JSON file.', 'error');
    }
  };
  reader.readAsText(file);
}

/* ── New ship ─────────────────────────────────────────────── */
function newShip() {
  state = defaultState();
  populateAll();
  updatePreview();
  showToast('New blank template created.', 'info');
}

/* ── Wire all editor events ───────────────────────────────── */
function wireEvents() {
  /* Live-update inputs */
  const liveIds = [
    'e-classname','e-shiptype','e-faction','e-idcode','e-fleetpoints',
    'e-str-hit','e-str-boost1','e-str-boost2',
    'e-eng-hit','e-eng-boost1','e-eng-boost2',
    'e-wpn-hit','e-wpn-boost1',
    'e-sys-hit','e-sys-boost1','e-sys-boost2',
    'e-pw-name','e-pw-trait','e-pw-stat1','e-pw-stat2','e-pw-stat3',
    'e-aw-a-name','e-aw-a-trait','e-aw-a-stat1','e-aw-a-stat2','e-aw-a-stat3',
    'e-aw-b-name','e-aw-b-trait','e-aw-b-stat1','e-aw-b-stat2','e-aw-b-stat3',
    'e-aw-c-name','e-aw-c-trait','e-aw-c-stat1','e-aw-c-stat2','e-aw-c-stat3',
    'e-notes',
  ];
  for (let i = 1; i <= 8; i++) {
    liveIds.push(`e-stat${i}-icon`, `e-stat${i}-value`);
  }
  liveIds.forEach(id => $(id)?.addEventListener('input', updatePreview));

  /* Arc checkboxes */
  ['pw','aw-a','aw-b','aw-c'].forEach(prefix => {
    ARC_DIRS.forEach(dir => {
      $(`e-${prefix}-arc-${dir}`)?.addEventListener('change', updatePreview);
    });
  });

  /* FTL toggle */
  $('e-ftl')?.addEventListener('change', updatePreview);

  /* Toolbar */
  $('new-ship-btn')?.addEventListener('click', newShip);
  $('save-btn')?.addEventListener('click', saveToLocal);
  $('load-local-btn')?.addEventListener('click', loadFromLocal);
  $('export-btn')?.addEventListener('click', exportJSON);
  $('print-btn')?.addEventListener('click', () => window.print());

  /* Import via file input */
  const importInput = $('import-file');
  if (importInput) {
    importInput.addEventListener('change', () => {
      const f = importInput.files?.[0];
      if (f) importJSON(f);
      importInput.value = '';
    });
  }
  $('import-btn')?.addEventListener('click', () => $('import-file')?.click());
}

/* ── Init ─────────────────────────────────────────────────── */
async function init() {
  initNav();
  initFooter();
  populateAll();
  updatePreview();
  wireEvents();
}

init();
