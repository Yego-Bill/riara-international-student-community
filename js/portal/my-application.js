/* My application: status bar (updates live), office message, documents, history */
(async function () {
  const api = window.RISC_API;
  const $ = (id) => document.getElementById(id);
  const esc = api.escapeHtml;

  const { profile } = await api.requireSignIn('student');
  $('whoName').textContent = profile.full_name || 'Student';
  $('whoEmail').textContent = profile.email;
  $('signOutBtn').addEventListener('click', () => api.signOut());

  function showError(err) {
    $('pageError').textContent = api.friendlyError(err);
    $('pageError').className = 'auth-banner is-visible';
  }

  let apps;
  try {
    apps = await api.myApplications();
  } catch (err) {
    $('loading').hidden = true;
    return showError(err);
  }
  $('loading').hidden = true;

  const submitted = apps.find((a) => a.submitted_at);
  const draft = apps.find((a) => !a.submitted_at);

  if (!submitted && !draft) { $('noApplication').hidden = false; return; }
  if (!submitted && draft) {
    $('draftApplication').hidden = false;
    $('continueDraft').href = 'apply.html?id=' + encodeURIComponent(draft.id);
    return;
  }

  let app = submitted;
  $('application').hidden = false;

  if (new URLSearchParams(window.location.search).get('submitted')) {
    $('pageError').textContent = api.CONFIG.PILOT_MODE
      ? 'Test application submitted. Remember: this pilot does not apply to Immigration — continue your real application with Kelvin.'
      : 'Application submitted. You can follow its progress on this page.';
    $('pageError').className = 'auth-banner is-visible is-ok';
  }

  function renderStatus() {
    const status = api.statusById(app.status);
    const pilot = api.CONFIG.PILOT_MODE ? ' (test)' : '';

    $('appTitle').textContent = api.PASS_TYPES[app.pass_type] + ' — ' + api.APPLICATION_TYPES[app.application_type];
    $('appMeta').textContent = 'Submitted ' + api.formatDate(app.submitted_at) + ' · Last update ' + api.formatDate(app.status_changed_at, true);
    $('appBadge').textContent = status.label + pilot;
    $('appBadge').dataset.status = status.id;

    // Progress bar: done / current / to come. Missing documents shows as a
    // warning on the "Under review" step.
    $('statusBar').innerHTML = api.PROGRESS_STEPS.map((label, i) => {
      let state = i < status.step ? 'is-done' : i === status.step ? 'is-current' : '';
      if (i === status.step && status.id === 'missing_documents') state += ' is-warning';
      if (status.id === 'completed') state = 'is-done';
      const text = i === status.step && status.id === 'missing_documents' ? 'Missing documents' : label;
      return '<li class="' + state + '"' + (i === status.step ? ' aria-current="step"' : '') + '>' +
        '<span class="dot"></span><span class="label">' + esc(text) + '</span></li>';
    }).join('');

    $('statusExplainer').textContent = status.student;

    const msg = (app.student_message || '').trim();
    $('officeMessage').hidden = !msg;
    $('officeMessageText').textContent = msg;

    const canEdit = app.status === 'submitted' || app.status === 'missing_documents';
    $('missingDocsAction').hidden = !canEdit;
    $('addDocsLink').href = 'apply.html?id=' + encodeURIComponent(app.id);
    $('addDocsLink').textContent = app.status === 'missing_documents' ? 'Add the missing documents' : 'Add or replace documents';
  }

  async function renderDocuments() {
    const docs = await api.listDocuments(app.id);
    const labels = Object.fromEntries(api.DOC_CHECKLIST.map((d) => [d.key, d.label]));
    $('docList').innerHTML = docs.length
      ? docs.map((d) =>
          '<li><span class="doc-name">' + esc(labels[d.doc_key] || d.doc_key) + '</span>' +
          '<span class="muted">' + esc(d.file_name) + ' · ' + api.formatDate(d.uploaded_at) + '</span>' +
          '<button type="button" class="link-btn" data-path="' + esc(d.file_path) + '">View</button></li>').join('')
      : '<li class="muted">No documents yet.</li>';
  }

  async function renderHistory() {
    const rows = await api.history(app.id);
    $('historyList').innerHTML = rows.map((h) =>
      '<li><strong>' + esc(api.statusById(h.status).label) + '</strong>' +
      '<span class="muted">' + api.formatDate(h.created_at, true) + '</span></li>').join('');
  }

  $('docList').addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-path]');
    if (!btn) return;
    const win = window.open('', '_blank'); // open now so phones don't block it
    try { win.location = await api.fileUrl(btn.dataset.path); }
    catch (err) { if (win) win.close(); showError(err); }
  });

  renderStatus();
  try { await Promise.all([renderDocuments(), renderHistory()]); } catch (err) { showError(err); }

  // Live: when the office changes the status, the page updates by itself.
  api.watchApplication(app.id, async (updated) => {
    app = { ...app, ...updated };
    renderStatus();
    try { await renderHistory(); } catch (e) { /* ignore */ }
  });
})();
