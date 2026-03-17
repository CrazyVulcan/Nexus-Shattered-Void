/* ============================================================
   nav.js — Dynamic navigation + footer injection
   ============================================================ */

const NAV_LINKS = [
  { href: '/index.html',           label: 'Home' },
  { href: '/pages/builder.html',   label: 'Ship Builder' },
  { href: '/pages/factions.html',  label: 'Factions' },
  { href: '/pages/rulebook.html',  label: 'Rulebook' },
  { href: '/pages/about.html',     label: 'About' },
];

const FOOTER_COLS = [
  {
    title: 'Game',
    links: [
      { href: '/pages/builder.html',  label: 'Ship Builder' },
      { href: '/pages/factions.html', label: 'Factions Database' },
      { href: '/pages/rulebook.html', label: 'Rulebook' },
      { href: '/pages/battle-simulator.html', label: 'Battle Simulator' },
    ],
  },
  {
    title: 'Explore',
    links: [
      { href: '/pages/lore-archive.html', label: 'Lore Archive' },
      { href: '/pages/news.html',         label: 'News' },
      { href: '/pages/community.html',    label: 'Community' },
    ],
  },
  {
    title: 'Info',
    links: [
      { href: '/pages/about.html', label: 'About' },
      { href: '/pages/about.html#contact', label: 'Contact' },
    ],
  },
];

function resolveHref(href) {
  // Determine if we're in /pages/ subdirectory.
  // If so, strip the leading slash to make paths relative or keep root-relative.
  // We'll always use absolute root-relative paths (starting with /).
  // For file:// protocol fallback, we adjust.
  return href;
}

function getCurrentPath() {
  return window.location.pathname;
}

function isActive(href) {
  const path = getCurrentPath();
  // Exact match, or trailing-slash normalization
  if (path === href) return true;
  if (href === '/index.html' && (path === '/' || path === '')) return true;
  return false;
}

function buildNavHTML() {
  const linksHTML = NAV_LINKS.map(({ href, label }) => {
    const active = isActive(href) ? ' class="active"' : '';
    return `<li><a href="${href}"${active}>${label}</a></li>`;
  }).join('\n    ');

  return `
<nav class="main-nav" id="main-nav">
  <div class="nav-brand"><a href="/index.html">NEXUS<span>:SV</span></a></div>
  <button class="nav-toggle" aria-label="Toggle navigation" aria-expanded="false">☰</button>
  <ul class="nav-links" id="nav-links">
    ${linksHTML}
  </ul>
</nav>`.trim();
}

function buildFooterHTML() {
  const colsHTML = FOOTER_COLS.map(col => `
    <div class="footer-col">
      <h4>${col.title}</h4>
      <ul>
        ${col.links.map(l => `<li><a href="${l.href}">${l.label}</a></li>`).join('\n        ')}
      </ul>
    </div>`).join('');

  return `
<footer class="main-footer" id="main-footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-brand">
        <h3>NEXUS<span>:SV</span></h3>
        <p>A tactical fleet combat tabletop game set in the shattered remnants of a dead galaxy. Build your fleet, choose your faction, and conquer the void.</p>
      </div>
      ${colsHTML}
    </div>
    <div class="footer-bottom">
      <p>© ${new Date().getFullYear()} NEXUS: SHATTERED VOID — All Rights Reserved</p>
      <p><a href="/pages/about.html">About</a> · <a href="/pages/about.html#contact">Contact</a></p>
    </div>
  </div>
</footer>`.trim();
}

export function initNav() {
  // Inject nav at the top of body
  const navEl = document.createElement('div');
  navEl.innerHTML = buildNavHTML();
  const nav = navEl.firstChild;
  document.body.insertBefore(nav, document.body.firstChild);

  // Wrap existing content in .page-content if needed
  if (!document.querySelector('.page-content')) {
    // Already handled by page HTML
  }

  // Hamburger toggle
  const toggle = document.getElementById('main-nav')?.querySelector('.nav-toggle');
  const links  = document.getElementById('nav-links');
  const mainNav = document.getElementById('main-nav');

  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      mainNav.classList.toggle('mobile-open', open);
    });

    // Close on link click (mobile)
    links.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        mainNav.classList.remove('mobile-open');
      });
    });
  }
}

export function initFooter() {
  const footerEl = document.createElement('div');
  footerEl.innerHTML = buildFooterHTML();
  document.body.appendChild(footerEl.firstChild);
}

export default function init() {
  initNav();
  initFooter();
}
