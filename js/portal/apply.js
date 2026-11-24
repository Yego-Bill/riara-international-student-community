/* Apply online: choose the pass, upload documents, submit.
   apply.html          → start a new application
   apply.html?id=...   → continue a draft, or add missing documents */
(async function () {
  const api = window.RISC_API;
  const $ = (id) => document.getElementById(id);
  const esc = api.escapeHtml;

  await api.requireSignIn('student');

  function showError(err) {
    $('pageError').textContent = api.friendlyError(err);
    $('pageError').className = 'auth-banner is-visible';
    $('pageError').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function clearError() { $('pageError').className = 'auth-banner'; }

  let app = null;
  let docs = [];

  try {
    const id = new URLSearchParams(window.location.search).get('id');
    if (id) {
      app = await api.getApplication(id);
    } else {
      // Already have an application? Don't start a second one by accident.
      const existing = await api.myApplications();
      if (existing.length) {
        const draft = existing.find((a) => !a.submitted_at);
        window.location.replace(draft ? 'apply.html?id=' + draft.id : 'my-application.html');
        return;
      }
    }
  } catch (err) {
    $('loading').hidden = true;
    return showError(err);
  }
  $('loading').hidden = true;

  if (!app) {
    $('chooseForm').hidden = false;
    $('chooseForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const pass = $('chooseForm').querySelector('input[name=pass]:checked').value;
      const kind = $('chooseForm').querySelector('input[name=kind]:checked').value;
      const btn = $('chooseForm').querySelector('button');
      btn.disabled = true;
      try {
        app = await api.createApplication(pass, kind);
        history.replaceState(null, '', 'apply.html?id=' + app.id);
        $('chooseForm').hidden = true;
        await showUploads();
      } catch (err) { showError(err); btn.disabled = false; }
    });
    return;
  }

  const editable = app.status === 'submitted' || app.status === 'missing_documents';
  if (!editable) { window.location.replace('my-application.html'); return; }
  await showUploads();

  /* ------------------------------------------------------------------ */

  async function showUploads() {
    $('uploadStep').hidden = false;
    $('uploadTitle').textContent = (app.submitted_at ? 'Add or replace documents — ' : '2. Upload your documents — ') +
      api.PASS_TYPES[app.pass_type] + ' (' + api.APPLICATION_TYPES[app.application_type].toLowerCase() + ')';
    $('submitArea').hidden = !!app.submitted_at;
    $('resubmitArea').hidden = !app.submitted_at;
    docs = await api.listDocuments(app.id);
    render();
  }

  function render() {
    const list = api.checklistFor(app.pass_type, app.application_type);
    $('uploadList').innerHTML = list.map((item, i) => {
      const mine = docs.filter((d) => d.doc_key === item.key);
      const files = mine.map((d) =>
        '<li><span>' + esc(d.file_name) + '</span>' +
        '<button type="button" class="link-btn" data-view="' + esc(d.file_path) + '">View</button>' +
        '<button type="button" class="link-btn danger" data-remove="' + esc(d.id) + '">Remove</button></li>').join('');
      const canAddMore = item.multiple || mine.length === 0;
      return '<div class="upload-item' + (mine.length ? ' has-file' : '') + '" data-key="' + esc(item.key) + '">' +
        '<div class="upload-number">' + (mine.length ? '✓' : i + 1) + '</div>' +
        '<div class="upload-info"><h4>' + esc(item.label) +
          (item.condition ? ' <span class="upload-condition">' + esc(item.condition) + '</span>' : '') + '</h4>' +
          (item.required ? '<span class="upload-required-tag">Required</span>' : '') +
          (files ? '<ul class="uploaded-files">' + files + '</ul>' : '') +
        '</div>' +
        '<div class="upload-control">' +
          (canAddMore
            ? '<label class="upload-btn-label">' + (mine.length ? 'Add another' : 'Choose file') +
              '<input type="file" accept="application/pdf,image/jpeg,image/png" data-upload="' + esc(item.key) + '"></label>'
            : '<span class="muted">Remove to replace</span>') +
          '<span class="upload-progress" data-progress="' + esc(item.key) + '"></span>' +
        '</div></div>';
    }).join('');
    updateSubmit(list);
  }

  function updateSubmit(list) {
    if (app.submitted_at) return;
    const missing = list.filter((item) => item.required && !docs.some((d) => d.doc_key === item.key));
    const ready = missing.length === 0 && $('confirmCheck').checked;
    $('submitBtn').disabled = !ready;
    $('submitHint').textContent = missing.length
      ? missing.length + ' required document' + (missing.length > 1 ? 's' : '') + ' still to add.'
      : ($('confirmCheck').checked ? '' : 'Tick the box above to submit.');
  }

  $('confirmCheck').addEventListener('change', () => updateSubmit(api.checklistFor(app.pass_type, app.application_type)));

  // Upload as soon as a file is chosen.
  $('uploadList').addEventListener('change', async (e) => {
    const input = e.target.closest('input[data-upload]');
    if (!input || !input.files.length) return;
    clearError();
    const key = input.dataset.upload;
    const progress = $('uploadList').querySelector('[data-progress="' + key + '"]');
    progress.textContent = 'Uploading…';
    input.disabled = true;
    try {
      const doc = await api.uploadDocument(app, key, input.files[0]);
      docs.push(doc);
      render();
    } catch (err) {
      progress.textContent = '';
      input.disabled = false;
      input.value = '';
      showError(err);
    }
  });

  $('uploadList').addEventListener('click', async (e) => {
    const view = e.target.closest('[data-view]');
    const remove = e.target.closest('[data-remove]');
    if (view) {
      const win = window.open('', '_blank');
      try { win.location = await api.fileUrl(view.dataset.view); }
      catch (err) { if (win) win.close(); showError(err); }
    }
    if (remove) {
      const doc = docs.find((d) => d.id === remove.dataset.remove);
      if (!doc || !window.confirm('Remove "' + doc.file_name + '"?')) return;
      try {
        await api.deleteDocument(doc);
        docs = docs.filter((d) => d.id !== doc.id);
        render();
      } catch (err) { showError(err); }
    }
  });

  $('submitBtn').addEventListener('click', async () => {
    $('submitBtn').disabled = true;
    try {
      await api.submitApplication(app.id);
      window.location.replace('my-application.html?submitted=1');
    } catch (err) {
      showError(err);
      $('submitBtn').disabled = false;
    }
  });
})();
