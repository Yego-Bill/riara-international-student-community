/* ==========================================================================
   main.js — small interactions used across the site
   ========================================================================== */

// Mobile nav toggle (the nav itself is drawn by layout.js)
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.getElementById('navLinks');

if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', isOpen);
  });
}

// Tabs (Immigration page, staff dashboard)
document.querySelectorAll('.tabs-nav').forEach((tabsNav) => {
  const buttons = tabsNav.querySelectorAll('.tab-btn');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => {
        b.setAttribute('aria-selected', 'false');
        const p = document.getElementById(b.getAttribute('aria-controls'));
        if (p) { p.classList.remove('is-active'); p.setAttribute('hidden', ''); }
      });
      btn.setAttribute('aria-selected', 'true');
      const panel = document.getElementById(btn.getAttribute('aria-controls'));
      if (panel) { panel.classList.add('is-active'); panel.removeAttribute('hidden'); }
    });
  });
});

// Checklists — progress is saved on this device. If the student is signed
// in, js/site-data.js also saves it to their account.
const checklistBoxes = document.querySelectorAll('.checklist-item input[type="checkbox"]');

checklistBoxes.forEach((box) => {
  const key = 'riara-siso-checklist-' + box.id;
  try {
    if (localStorage.getItem(key) === 'true') {
      box.checked = true;
      box.closest('.checklist-item').classList.add('is-checked');
    }
  } catch (e) { /* storage unavailable — ticks just won't be remembered */ }

  box.addEventListener('change', () => {
    try { localStorage.setItem(key, box.checked); } catch (e) { /* ignore */ }
    box.closest('.checklist-item').classList.toggle('is-checked', box.checked);
  });
});
