/* ==========================================================================
   site-data.js — live content on the public pages
   --------------------------------------------------------------------------
   * Home: the announcement banner and the next 3 events
   * Events page: the full events list
   * Checklists: if the student is signed in, ticks are saved to their
     account so they follow them to any phone or laptop.
   If the database can't be reached, the page keeps the text already in the
   HTML, so nothing breaks.
   ========================================================================== */
(function () {
  const api = window.RISC_API;
  if (!api) return;
  const esc = api.escapeHtml;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function eventCard(ev) {
    let badge;
    if (ev.event_date) {
      const [, m, d] = ev.event_date.split('-');
      badge = '<div class="event-date-badge"><span class="month">' + MONTHS[+m - 1] + '</span><span class="day">' + d + '</span></div>';
    } else {
      badge = '<div class="event-date-badge is-tba"><span class="day">TBA</span></div>';
    }
    return '<div class="event-card">' + badge + '<div class="event-info">' +
      '<h3>' + esc(ev.title) + '</h3>' +
      '<p class="event-meta">' + esc(ev.time_location || (ev.event_date ? '' : 'Date not yet announced')) + '</p>' +
      (ev.description ? '<p>' + esc(ev.description) + '</p>' : '') +
      '</div></div>';
  }

  async function announcements() {
    const bar = document.querySelector('.announcement-bar');
    if (!bar) return;
    try {
      const rows = await api.activeAnnouncements();
      if (!rows.length) { bar.hidden = true; return; }
      bar.querySelector('span').textContent = rows.map((r) => r.message).join('  •  ');
      bar.hidden = false;
    } catch (e) { /* keep whatever the HTML says */ }
  }

  async function events() {
    const list = document.querySelector('[data-events]');
    if (!list) return;
    const limit = +list.dataset.events || 0;
    try {
      let rows = await api.listEvents({ upcomingOnly: true });
      if (limit) rows = rows.slice(0, limit);
      list.innerHTML = rows.length
        ? rows.map(eventCard).join('')
        : '<p class="events-empty-note">No upcoming events right now. Check back soon, or follow the WhatsApp community for updates.</p>';
    } catch (e) { /* keep the HTML version */ }
  }

  async function checklists() {
    const boxes = document.querySelectorAll('.checklist-item input[type="checkbox"]');
    if (!boxes.length) return;
    let saved;
    try { saved = await api.loadChecklist(); } catch (e) { return; }
    if (!saved) return; // not signed in — the device-only saving in main.js still works

    boxes.forEach((box) => {
      if (box.id in saved) {
        box.checked = saved[box.id];
        box.closest('.checklist-item').classList.toggle('is-checked', box.checked);
      } else if (box.checked) {
        api.saveChecklistItem(box.id, true).catch(() => {}); // ticked on this device before signing in
      }
      box.addEventListener('change', () => api.saveChecklistItem(box.id, box.checked).catch(() => {}));
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    announcements();
    events();
    checklists();
  });
})();
