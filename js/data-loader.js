/* ============================================================
   data-loader.js — Cached data fetching utility
   ============================================================ */

// Detect base path: if running from /pages/ subdirectory use '../data/'
function getDataBase() {
  const path = window.location.pathname;
  if (path.includes('/pages/')) return '../data/';
  return 'data/';
}

const cache = {};

async function loadJSON(filename) {
  if (cache[filename]) return cache[filename];
  const base = getDataBase();
  const url = `${base}${filename}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status} ${res.statusText}`);
  const data = await res.json();
  cache[filename] = data;
  return data;
}

export async function loadFactions() {
  return loadJSON('factions.json');
}

export async function loadShips() {
  return loadJSON('ships.json');
}

export async function loadWeapons() {
  return loadJSON('weapons.json');
}

export async function loadModules() {
  return loadJSON('modules.json');
}

export function clearCache() {
  Object.keys(cache).forEach(k => delete cache[k]);
}
