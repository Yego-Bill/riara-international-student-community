/* Staff dashboard: applications, announcements, events.
   Everything students typed is shown with escapeHtml/textContent, never as
   raw HTML, so a name like <script> can't run code on staff computers. */
(async function () {
  const api = window.RISC_API;
  const $ = (id) => document.getElementById(id);
  const esc = api.escapeHtml;

  const { user, profile } = await api.requireSignIn('staff');
  $('whoName').textContent = profile.full_name || profile.email;
  $('signOutBtn').addEventListener('click', () => api.signOut());

  function showError(err) {
    $('pageError').textContent = api.friendlyError(err);
    $('pageError').className = 'auth-banner is-visible';
  }
  function clearError() { $('pageError').className = 'auth-banner'; }

  $('loading').hidden = true;
  $('staffTabs').hidden = false;
  $('panel-apps').hidden = false;

  /* =================================================================
     Applications
     ================================================================= */
  let data = { applications: [], staff: [], profilesById: {} };
  let selectedId = null;

  $('statusFilter').innerHTML = '<option value="">All statuses</option>' +
    api.STATUSES.map((s) => '<option value="' + s.id + '">' + esc(s.label) + '</option>').join('');

  const nameOf = (p) => (p ? (p.full_name || p.email) : '');
  const hasNewDocs = (a) => a.docs_updated_at && a.status_changed_at && new Date(a.docs_updated_at) > new Date(a.status_changed_at);

  async function loadApplications() {
    try {
      data = await api.staffListApplications();
      renderTable();
      if (selectedId) openDetail(selectedId);
    } catch (err) { showError(err); }
  }

  function filtered() {
    const q = $('searchInput').value.trim().toLowerCase();
    const st = $('statusFilter').value;
    const pass = $('passFilter').value;
    const who = $('assignFilter').value;
    return data.applications.filter((a) => {
      const s = a.student || {};
      if (q && ![s.full_name, s.student_id, s.email].some((v) => (v || '').toLowerCase().includes(q))) return false;
      if (st && a.status !== st) return false;
      if (pass && a.pass_type !== pass) return false;
      if (who === 'me' && a.assigned_to !== user.id) return false;
      if (who === 'none' && a.assigned_to) return false;
      return true;
    });
  }

  function renderTable() {
    const rows = filtered();
    $('resultsCount').textContent = rows.length + ' of ' + data.applications.length + ' applications';
    $('tableBody').innerHTML = rows.length ? rows.map((a) => {
      const s = a.student || {};
      return '<tr data-id="' + esc(a.id) + '"' + (a.id === selectedId ? ' class="is-selected"' : '') + '>' +
        '<td class="student-name">' + esc(s.full_name || '—') + (hasNewDocs(a) ? ' <span class="new-tag">New documents</span>' : '') +
          '<br><span class="muted">' + esc(s.email || '') + '</span></td>' +
        '<td>' + esc(s.student_id || '') + '</td>' +
        '<td>' + esc(api.PASS_TYPES[a.pass_type]) + '<br><span class="muted">' + esc(api.APPLICATION_TYPES[a.application_type]) + '</span></td>' +
        '<td><span class="status-badge" data-status="' + esc(a.status) + '">' + esc(api.statusById(a.status).label) + '</span></td>' +
        '<td>' + esc(nameOf(a.assignee) || '—') + '</td>' +
        '<td>' + api.formatDate(a.submitted_at) + '</td>' +
        '<td><button type="button" class="btn btn-secondary btn-small">Open</button></td></tr>';
    }).join('') : '<tr><td colspan="7" class="empty-row">No applications match.</td></tr>';
  }

  ['searchInput', 'statusFilter', 'passFilter', 'assignFilter'].forEach((id) =>
    $(id).addEventListener('input', renderTable));
  $('refreshBtn').addEventListener('click', loadApplications);

  $('tableBody').addEventListener('click', (e) => {
    const row = e.target.closest('tr[data-id]');
    if (row) openDetail(row.dataset.id);
  });

  async function openDetail(id) {
    clearError();
    selectedId = id;
    renderTable();
    const a = data.applications.find((x) => x.id === id);
    if (!a) return;
    const s = a.student || {};
    const panel = $('detailPanel');
    panel.classList.add('is-open');
    panel.innerHTML = '<p class="checking-msg">Loading…</p>';

    let docs, notes, hist;
    try {
      [docs, notes, hist] = await Promise.all([api.listDocuments(id), api.staffNotes(id), api.history(id)]);
    } catch (err) { panel.innerHTML = ''; return showError(err); }

    const labels = Object.fromEntries(api.DOC_CHECKLIST.map((d) => [d.key, d.label]));
    const checklist = api.checklistFor(a.pass_type, a.application_type);
    const missingRequired = checklist.filter((c) => c.required && !docs.some((d) => d.doc_key === c.key));

    panel.innerHTML =
      '<div class="detail-head">' +
        '<div><h3>' + esc(s.full_name || '—') + '</h3>' +
        '<p class="contact-line">' + esc(s.email || '') +
          (s.phone ? ' · <a href="tel:' + esc(s.phone.replace(/[^\d+]/g, '')) + '">' + esc(s.phone) + '</a>' : '') + '</p>' +
        '<p class="muted">Student ID ' + esc(s.student_id || '—') + ' · ' + esc(s.country || '—') + ' · ' +
          esc(api.PASS_TYPES[a.pass_type]) + ' (' + esc(api.APPLICATION_TYPES[a.application_type].toLowerCase()) + ')</p></div>' +
        '<button type="button" class="btn btn-secondary btn-small" id="closeDetail">Close</button>' +
      '</div>' +

      '<div class="detail-grid">' +
        '<div class="detail-section">' +
          '<h4>Documents</h4>' +
          (missingRequired.length ? '<p class="warn-text">Missing required: ' + missingRequired.map((m) => esc(m.label)).join('; ') + '</p>' : '') +
          '<ul class="doc-list">' + (docs.length ? docs.map((d) =>
            '<li><span class="doc-name">' + esc(labels[d.doc_key] || d.doc_key) + '</span>' +
            '<span class="muted">' + esc(d.file_name) + ' · ' + api.formatDate(d.uploaded_at, true) +
              (a.status_changed_at && new Date(d.uploaded_at) > new Date(a.status_changed_at) ? ' · <span class="new-tag">New</span>' : '') + '</span>' +
            '<button type="button" class="link-btn" data-path="' + esc(d.file_path) + '">Open</button></li>').join('')
            : '<li class="muted">No documents.</li>') + '</ul>' +
        '</div>' +

        '<div class="detail-section">' +
          '<h4>Update</h4>' +
          '<form id="updateForm">' +
            '<div class="form-group"><label for="dStatus">Status</label><select id="dStatus">' +
              api.STATUSES.map((st) => '<option value="' + st.id + '"' + (st.id === a.status ? ' selected' : '') + '>' + esc(st.label) + '</option>').join('') +
            '</select></div>' +
            '<div class="form-group"><label for="dMessage">Message to the student <span class="muted">(they see this)</span></label>' +
              '<textarea id="dMessage" rows="3" maxlength="1000" placeholder="e.g. Please upload a clearer copy of your police clearance.">' + esc(a.student_message || '') + '</textarea></div>' +
            '<div class="form-group"><label for="dAssign">Handled by</label><select id="dAssign"><option value="">Nobody yet</option>' +
              data.staff.map((p) => '<option value="' + esc(p.id) + '"' + (p.id === a.assigned_to ? ' selected' : '') + '>' + esc(nameOf(p)) + (p.id === user.id ? ' (me)' : '') + '</option>').join('') +
            '</select></div>' +
            '<button type="submit" class="btn btn-primary btn-small">Save</button> <span class="muted" id="saveMsg"></span>' +
          '</form>' +
        '</div>' +

        '<div class="detail-section">' +
          '<h4>Internal notes <span class="muted">(students never see these)</span></h4>' +
          '<ul class="notes-list">' + (notes.length ? notes.map((n) =>
            '<li><p>' + esc(n.body) + '</p><span class="muted">' + esc(nameOf(data.profilesById[n.author_id]) || 'Staff') + ' · ' + api.formatDate(n.created_at, true) + '</span></li>').join('')
            : '<li class="muted">No notes yet.</li>') + '</ul>' +
          '<form id="noteForm" class="inline-form-row"><input type="text" id="noteBody" maxlength="2000" placeholder="Add a note…" required>' +
          '<button type="submit" class="btn btn-secondary btn-small">Add</button></form>' +
        '</div>' +

        '<div class="detail-section">' +
          '<h4>History</h4>' +
          '<ol class="history-list">' + hist.map((h) =>
            '<li><strong>' + esc(api.statusById(h.status).label) + '</strong>' +
            '<span class="muted">' + esc(nameOf(data.profilesById[h.changed_by]) || '') + ' · ' + api.formatDate(h.created_at, true) + '</span></li>').join('') +
          '</ol>' +
        '</div>' +
      '</div>';

    $('closeDetail').addEventListener('click', () => {
      selectedId = null; panel.classList.remove('is-open'); panel.innerHTML = ''; renderTable();
    });

    panel.querySelectorAll('[data-path]').forEach((btn) => btn.addEventListener('click', async () => {
      const win = window.open('', '_blank');
      try { win.location = await api.fileUrl(btn.dataset.path); }
      catch (err) { if (win) win.close(); showError(err); }
    }));

    $('updateForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button');
      btn.disabled = true;
      try {
        await api.staffUpdateApplication(id, {
          status: $('dStatus').value,
          student_message: $('dMessage').value.trim(),
          assigned_to: $('dAssign').value || null,
        });
        await loadApplications();
        $('pageError').textContent = 'Saved. The student sees the new status straight away.';
        $('pageError').className = 'auth-banner is-visible is-ok';
      } catch (err) { showError(err); btn.disabled = false; }
    });

    $('noteForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = $('noteBody').value.trim();
      if (!body) return;
      try { await api.staffAddNote(id, body); await openDetail(id); }
      catch (err) { showError(err); }
    });

    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* =================================================================
     Announcements
     ================================================================= */
  async function loadAnnouncements() {
    try {
      const rows = await api.allAnnouncements();
      $('annList').innerHTML = rows.length ? rows.map((a) =>
        '<li><div><p>' + esc(a.message) + '</p><span class="muted">' + api.formatDate(a.created_at) +
          ' · ' + (a.active ? '<strong>Showing on Home</strong>' : 'Hidden') + '</span></div>' +
        '<div class="manage-actions">' +
          '<button type="button" class="btn btn-secondary btn-small" data-toggle="' + a.id + '" data-active="' + a.active + '">' + (a.active ? 'Hide' : 'Show') + '</button>' +
          '<button type="button" class="btn btn-secondary btn-small danger" data-delete="' + a.id + '">Delete</button>' +
        '</div></li>').join('') : '<li class="muted">No announcements.</li>';
    } catch (err) { showError(err); }
  }

  $('annForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await api.addAnnouncement($('annMessage').value); $('annMessage').value = ''; loadAnnouncements(); }
    catch (err) { showError(err); }
  });

  $('annList').addEventListener('click', async (e) => {
    const t = e.target.closest('[data-toggle]');
    const d = e.target.closest('[data-delete]');
    try {
      if (t) { await api.setAnnouncementActive(+t.dataset.toggle, t.dataset.active !== 'true'); loadAnnouncements(); }
      if (d && window.confirm('Delete this announcement?')) { await api.deleteAnnouncement(+d.dataset.delete); loadAnnouncements(); }
    } catch (err) { showError(err); }
  });

  /* =================================================================
     Events
     ================================================================= */
  let events = [];

  async function loadEvents() {
    try {
      events = await api.listEvents();
      const today = new Date().toISOString().slice(0, 10);
      $('eventList').innerHTML = events.length ? events.map((ev) =>
        '<li><div><p><strong>' + esc(ev.title) + '</strong>' +
          (ev.event_date && ev.event_date < today ? ' <span class="muted">(past)</span>' : '') + '</p>' +
          '<span class="muted">' + (ev.event_date ? api.formatDate(ev.event_date) : 'To be announced') +
          (ev.time_location ? ' · ' + esc(ev.time_location) : '') + '</span></div>' +
        '<div class="manage-actions">' +
          '<button type="button" class="btn btn-secondary btn-small" data-edit="' + ev.id + '">Edit</button>' +
          '<button type="button" class="btn btn-secondary btn-small danger" data-delete="' + ev.id + '">Delete</button>' +
        '</div></li>').join('') : '<li class="muted">No events.</li>';
    } catch (err) { showError(err); }
  }

  function resetEventForm() {
    $('eventForm').reset();
    $('eventId').value = '';
    $('eventSaveBtn').textContent = 'Add event';
    $('eventCancelBtn').hidden = true;
  }

  $('eventForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api.saveEvent({
        id: $('eventId').value ? +$('eventId').value : null,
        title: $('eventTitle').value,
        event_date: $('eventDate').value,
        time_location: $('eventWhere').value,
        description: $('eventDesc').value,
      });
      resetEventForm();
      loadEvents();
    } catch (err) { showError(err); }
  });
  $('eventCancelBtn').addEventListener('click', resetEventForm);

  $('eventList').addEventListener('click', async (e) => {
    const ed = e.target.closest('[data-edit]');
    const del = e.target.closest('[data-delete]');
    if (ed) {
      const ev = events.find((x) => x.id === +ed.dataset.edit);
      $('eventId').value = ev.id;
      $('eventTitle').value = ev.title;
      $('eventDate').value = ev.event_date || '';
      $('eventWhere').value = ev.time_location || '';
      $('eventDesc').value = ev.description || '';
      $('eventSaveBtn').textContent = 'Save changes';
      $('eventCancelBtn').hidden = false;
      $('eventForm').scrollIntoView({ behavior: 'smooth' });
    }
    if (del && window.confirm('Delete this event?')) {
      try { await api.deleteEvent(+del.dataset.delete); loadEvents(); } catch (err) { showError(err); }
    }
  });

  loadApplications();
  loadAnnouncements();
  loadEvents();
})();
