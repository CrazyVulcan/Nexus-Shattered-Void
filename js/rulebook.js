/* ============================================================
   rulebook.js — Rulebook navigation and TOC
   ============================================================ */
import { initNav, initFooter } from './nav.js';

export function initRulebook() {
  initNav();
  initFooter();

  const tocLinks = document.querySelectorAll('.toc-link[href^="#"]');
  const sections = document.querySelectorAll('.rulebook-section[id]');
  const tocToggle = document.getElementById('toc-toggle');
  const tocPanel  = document.getElementById('toc-panel');

  // Smooth scroll on TOC link click
  tocLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height'), 10) || 64;
        const top = target.getBoundingClientRect().top + window.scrollY - offset - 16;
        window.scrollTo({ top, behavior: 'smooth' });
      }
      // Collapse TOC on mobile after click
      if (window.innerWidth < 768 && tocPanel) {
        tocPanel.classList.add('toc-collapsed');
        tocToggle?.setAttribute('aria-expanded', 'false');
      }
    });
  });

  // Intersection Observer for active section highlight
  if (sections.length && tocLinks.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          tocLinks.forEach(link => {
            const active = link.getAttribute('href') === `#${id}`;
            link.classList.toggle('active', active);
          });
        }
      });
    }, {
      rootMargin: '-64px 0px -60% 0px',
      threshold: 0,
    });

    sections.forEach(s => observer.observe(s));
  }

  // Mobile TOC toggle
  if (tocToggle && tocPanel) {
    tocToggle.addEventListener('click', () => {
      const collapsed = tocPanel.classList.toggle('toc-collapsed');
      tocToggle.setAttribute('aria-expanded', String(!collapsed));
    });
  }
}

initRulebook();
