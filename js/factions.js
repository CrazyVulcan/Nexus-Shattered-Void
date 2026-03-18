/* ============================================================
   factions.js — Factions database page logic
   ============================================================ */
import { loadFactions, loadShips } from './data-loader.js';
import { initNav, initFooter } from './nav.js';

let factionsData = [];
let shipsData = [];
let activeId = null;

// ── Toast helper ────────────────────────────────────────────
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
  setTimeout(() => toast.remove(), 4000);
}

// ── Render faction sidebar list ─────────────────────────────
function renderSidebar(factions) {
  const sidebar = document.getElementById('faction-sidebar-list');
  if (!sidebar) return;
  sidebar.innerHTML = factions.map(f => `
    <button class="faction-card ${f.id === activeId ? 'active' : ''}"
            style="--faction-color: ${f.color}"
            data-id="${f.id}"
            type="button">
      <div class="faction-card-name">${f.name}</div>
      <div class="faction-card-tagline">${f.playstyle.join(' · ')}</div>
    </button>
  `).join('');

  sidebar.querySelectorAll('.faction-card').forEach(btn => {
    btn.addEventListener('click', () => {
      activeId = btn.dataset.id;
      renderSidebar(factions);
      renderDetail(factions.find(f => f.id === activeId));
    });
  });
}

// ── Render faction detail panel ─────────────────────────────
function renderDetail(faction) {
  const panel = document.getElementById('faction-detail');
  if (!panel || !faction) return;

  const ships = shipsData.filter(s => s.faction === faction.id);

  const playstyleBadges = faction.playstyle.map(p => `<span class="badge badge-cyan">${p}</span>`).join('');

  const shipRows = ships.length
    ? ships.map(s => `
        <div class="item-row">
          <div class="item-row-info">
            <div class="item-row-name">${s.name}</div>
            <div class="item-row-detail">${s.class} · AGI ${s.stats.agility} · TGH ${s.stats.toughness} · Shields F${s.stats.shields.fore}/A${s.stats.shields.aft}</div>
          </div>
          <span class="cost-badge">${s.pointCost} pts</span>
        </div>`).join('')
    : '<p class="text-dim" style="font-size:0.9rem;padding:1rem 0">No ships listed for this faction.</p>';

  const ruleBoxes = faction.specialRules.map(r => `
    <div class="special-rule">
      <div class="special-rule-name">${r.name}</div>
      <div class="special-rule-text">${r.description}</div>
    </div>`).join('');

  panel.innerHTML = `
    <div class="anim-fade-in">
      <div class="faction-detail-header">
        <div style="flex:1">
          <div class="faction-detail-title" style="color:${faction.color}">${faction.name}</div>
          <div class="faction-playstyle">${playstyleBadges}</div>
        </div>
      </div>

      <p style="color:var(--color-text-dim);line-height:1.75;margin-bottom:var(--sp-8)">${faction.description}</p>

      <h3 style="margin-bottom:var(--sp-4)">Special Rules</h3>
      <div style="margin-bottom:var(--sp-8)">${ruleBoxes}</div>

      <h3 style="margin-bottom:var(--sp-4)">Available Ship Hulls</h3>
      <div class="equipped-list" style="margin-bottom:var(--sp-8)">${shipRows}</div>

      <div style="display:flex;gap:var(--sp-3);flex-wrap:wrap">
        <button class="btn btn-primary" id="use-faction-btn" data-id="${faction.id}">
          Use in Ship Builder
        </button>
        <button class="btn btn-secondary" id="copy-faction-btn">
          Copy Faction ID
        </button>
      </div>
    </div>`;

  document.getElementById('use-faction-btn')?.addEventListener('click', (e) => {
    sessionStorage.setItem('selectedFaction', e.currentTarget.dataset.id);
    window.location.href = '/pages/builder.html';
  });

  document.getElementById('copy-faction-btn')?.addEventListener('click', () => {
    navigator.clipboard?.writeText(faction.id).then(() => {
      showToast(`Copied "${faction.id}" to clipboard`, 'success');
    }).catch(() => {
      showToast(faction.id, 'info');
    });
  });
}

// ── Init ────────────────────────────────────────────────────
async function init() {
  initNav();
  initFooter();

  const panel = document.getElementById('faction-detail');
  if (panel) {
    panel.innerHTML = '<div class="loading-overlay"><div class="spinner spinner-lg"></div><p>Loading factions…</p></div>';
  }

  try {
    [factionsData, shipsData] = await Promise.all([loadFactions(), loadShips()]);
  } catch (err) {
    console.error(err);
    if (panel) {
      panel.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>Failed to load data</h3><p>${err.message}</p></div>`;
    }
    return;
  }

  // Check if a faction was pre-selected
  const preset = new URLSearchParams(window.location.search).get('faction');
  activeId = preset || factionsData[0]?.id;

  renderSidebar(factionsData);
  renderDetail(factionsData.find(f => f.id === activeId));
}

init();
