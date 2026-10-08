/* ==========================================================================
   Staff dashboard and student status pages (preview)
   All data here is sample data kept in this browser. Nothing is sent anywhere.
   ========================================================================== */

const MAIN_STEPS = [
  'Received',
  'In review',
  'Submitted to Immigration',
  'Approved, awaiting payment',
  'Processing',
  'Pass issued'
];

const ALL_STATUSES = [
  'Received',
  'In review',
  'Needs correction',
  'Submitted to Immigration',
  'Approved, awaiting payment',
  'Processing',
  'Pass issued',
  'Revoked'
];

const STEP_FOR = {
  'Received': 0,
  'In review': 1,
  'Needs correction': 1,
  'Submitted to Immigration': 2,
  'Approved, awaiting payment': 3,
  'Processing': 4,
  'Pass issued': 5,
  'Revoked': -1
};

const STATUS_MESSAGES = {
  'Received': 'We have received your documents. They will be reviewed soon.',
  'In review': 'Your documents are being checked.',
  'Needs correction': 'Some of your documents need attention. See the notes below, then contact the office to send replacements.',
  'Submitted to Immigration': 'Your application has been submitted to the Department of Immigration Services. Processing can take a while.',
  'Approved, awaiting payment': 'Your application has been approved. The office will call you to arrange payment, so please keep your phone on.',
  'Processing': 'Your Student Pass is being processed. This step can take a while.',
  'Pass issued': 'Your Student Pass has been issued. Please contact the office for the next steps.',
  'Revoked': 'This application has been revoked. Please contact the office to find out why and what to do next.'
};

const REQUIRED_DOCS = [
  'Application Form 30',
  'Cover letter from Riara',
  'Passport (bio-data page)',
  'Passport photos (2)',
  'Academic certificates',
  'Sponsor commitment letter',
  'Sponsor passport copy',
  'Police clearance certificate'
];

const STORE_KEY = 'riara-preview-submissions';
const SESSION_KEY = 'riara-preview-staff-email';

// Accounts allowed to open the staff dashboard.
// Replace the last two with the confirmed addresses.
const STAFF_ALLOWLIST = [
  'internationalstudents@riarauniversity.ac.ke',
  'frontoffice@riarauniversity.ac.ke',
  'dean@riarauniversity.ac.ke'
];

/* -------------------- Helpers -------------------- */

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function statusSlug(status) {
  return status.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function statusBadge(status) {
  return '<span class="status-badge" data-status="' + statusSlug(status) + '">' + escapeHtml(status) + '</span>';
}

function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fileNameFor(docName) {
  return docName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.pdf';
}

function makeDocs(overrides) {
  return REQUIRED_DOCS.map(function (name, i) {
    const o = overrides[i] || {};
    return {
      name: name,
      file: fileNameFor(name),
      check: o.check || 'pending',
      reason: o.reason || ''
    };
  });
}

function allOk() {
  return REQUIRED_DOCS.map(function () { return { check: 'ok' }; });
}

/* -------------------- Sample data -------------------- */

function seedData() {
  return [
    {
      id: 'RU-00-0001', name: 'Test Student One', country: 'Uganda',
      email: 'student1@example.com', phone: '+254 700 000 001',
      submitted: '2026-10-07', status: 'Received',
      docs: makeDocs([])
    },
    {
      id: 'RU-00-0002', name: 'Test Student Two', country: 'Rwanda',
      email: 'student2@example.com', phone: '+254 700 000 002',
      submitted: '2026-10-05', status: 'In review',
      docs: makeDocs([{ check: 'ok' }, { check: 'ok' }, { check: 'ok' }])
    },
    {
      id: 'RU-00-0003', name: 'Test Student Three', country: 'Ethiopia',
      email: 'student3@example.com', phone: '+254 700 000 003',
      submitted: '2026-10-02', status: 'Needs correction',
      docs: makeDocs([
        { check: 'ok' },
        { check: 'ok' },
        { check: 'ok' },
        { check: 'problem', reason: 'Photo is blurry. Please upload a clearer one.' },
        { check: 'ok' },
        { check: 'ok' },
        { check: 'ok' },
        { check: 'problem', reason: 'The document is cut off at the bottom edge.' }
      ])
    },
    {
      id: 'RU-00-0004', name: 'Test Student Four', country: 'Tanzania',
      email: 'student4@example.com', phone: '+254 700 000 004',
      submitted: '2026-09-28', status: 'Submitted to Immigration',
      docs: makeDocs(allOk())
    },
    {
      id: 'RU-00-0005', name: 'Test Student Five', country: 'Burundi',
      email: 'student5@example.com', phone: '+254 700 000 005',
      submitted: '2026-09-25', status: 'Approved, awaiting payment',
      docs: makeDocs(allOk())
    },
    {
      id: 'RU-00-0006', name: 'Test Student Six', country: 'South Sudan',
      email: 'student6@example.com', phone: '+254 700 000 006',
      submitted: '2026-09-22', status: 'Processing',
      docs: makeDocs(allOk())
    },
    {
      id: 'RU-00-0007', name: 'Test Student Seven', country: 'Malawi',
      email: 'student7@example.com', phone: '+254 700 000 007',
      submitted: '2026-09-20', status: 'Pass issued',
      docs: makeDocs(allOk())
    },
    {
      id: 'RU-00-0008', name: 'Test Student Eight', country: 'Zambia',
      email: 'student8@example.com', phone: '+254 700 000 008',
      submitted: '2026-09-24', status: 'Revoked',
      docs: makeDocs(allOk())
    }
  ];
}

function saveSubmissions(list) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch (err) { /* storage unavailable */ }
}

function loadSubmissions() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) { /* fall through to sample data */ }
  const seeded = seedData();
  saveSubmissions(seeded);
  return seeded;
}

/* ==========================================================================
   Staff dashboard page (staff.html)
   ========================================================================== */

function initStaffPage() {
  const staffGate = document.getElementById('staffGate');
  const staffApp = document.getElementById('staffApp');
  if (!staffGate || !staffApp) return;

  const staffForm = document.getElementById('staffSignInForm');
  const staffError = document.getElementById('staffError');
  const staffWho = document.getElementById('staffWho');
  const signOutBtn = document.getElementById('signOutBtn');
  const resetBtn = document.getElementById('resetBtn');
  const searchInput = document.getElementById('searchInput');
  const statusFilter = document.getElementById('statusFilter');
  const dateFilter = document.getElementById('dateFilter');
  const resultsCount = document.getElementById('resultsCount');
  const tableBody = document.getElementById('tableBody');
  const detailPanel = document.getElementById('detailPanel');

  let submissions = loadSubmissions();
  let selectedId = null;

  statusFilter.innerHTML = '<option value="">All statuses</option>' +
    ALL_STATUSES.map(function (st) {
      return '<option value="' + escapeHtml(st) + '">' + escapeHtml(st) + '</option>';
    }).join('');

  /* ----- Sign in ----- */

  function showApp(email) {
    staffGate.hidden = true;
    staffApp.hidden = false;
    staffWho.textContent = email;
    renderTable();
  }

  function showGate() {
    closeDetail();
    staffApp.hidden = true;
    staffGate.hidden = false;
  }

  staffForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const email = document.getElementById('staff-email').value.trim().toLowerCase();

    if (STAFF_ALLOWLIST.indexOf(email) === -1) {
      staffError.textContent = 'This account is not approved for staff access.';
      staffError.classList.add('is-visible');
      return;
    }

    staffError.classList.remove('is-visible');
    try { sessionStorage.setItem(SESSION_KEY, email); } catch (err) { /* ignore */ }
    showApp(email);
  });

  signOutBtn.addEventListener('click', function () {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (err) { /* ignore */ }
    showGate();
  });

  resetBtn.addEventListener('click', function () {
    try { localStorage.removeItem(STORE_KEY); } catch (err) { /* ignore */ }
    submissions = loadSubmissions();
    closeDetail();
  });

  /* ----- Table ----- */

  function renderTable() {
    const q = searchInput.value.trim().toLowerCase();
    const status = statusFilter.value;
    const from = dateFilter.value;

    const rows = submissions
      .filter(function (s) {
        const text = (s.name + ' ' + s.id + ' ' + s.email).toLowerCase();
        return (!q || text.indexOf(q) !== -1) &&
               (!status || s.status === status) &&
               (!from || s.submitted >= from);
      })
      .sort(function (a, b) { return b.submitted.localeCompare(a.submitted); });

    resultsCount.textContent = 'Showing ' + rows.length + ' of ' + submissions.length + ' submissions';

    if (rows.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6" class="empty-row">No submissions match your search.</td></tr>';
      return;
    }

    tableBody.innerHTML = rows.map(function (s) {
      const selected = s.id === selectedId ? ' class="is-selected"' : '';
      return '<tr' + selected + '>' +
        '<td><span class="student-name">' + escapeHtml(s.name) + '</span><br><span class="muted">' + escapeHtml(s.email) + '</span></td>' +
        '<td>' + escapeHtml(s.id) + '</td>' +
        '<td>' + escapeHtml(s.country) + '</td>' +
        '<td>' + statusBadge(s.status) + '</td>' +
        '<td>' + formatDate(s.submitted) + '</td>' +
        '<td><button type="button" class="btn btn-secondary btn-small" data-open="' + escapeHtml(s.id) + '">Open</button></td>' +
        '</tr>';
    }).join('');
  }

  searchInput.addEventListener('input', renderTable);
  statusFilter.addEventListener('change', renderTable);
  dateFilter.addEventListener('change', renderTable);

  tableBody.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-open]');
    if (btn) openDetail(btn.getAttribute('data-open'));
  });

  /* ----- Detail panel ----- */

  function openDetail(id) {
    const s = submissions.find(function (x) { return x.id === id; });
    if (!s) return;
    selectedId = id;
    renderTable();

    const statusOptions = ALL_STATUSES.map(function (st) {
      return '<option value="' + escapeHtml(st) + '">' + escapeHtml(st) + '</option>';
    }).join('');

    const docRows = s.docs.map(function (d, i) {
      return '<div class="doc-row">' +
        '<div><div class="doc-name">' + escapeHtml(d.name) + '</div><div class="doc-file">' + escapeHtml(d.file) + '</div></div>' +
        '<div class="doc-check">' +
          '<button type="button" class="btn btn-secondary btn-small" data-view="' + i + '">View</button>' +
          '<select data-check="' + i + '" aria-label="Check result for ' + escapeHtml(d.name) + '">' +
            '<option value="pending">Not checked</option>' +
            '<option value="ok">OK</option>' +
            '<option value="problem">Problem</option>' +
          '</select>' +
        '</div>' +
        '<input type="text" class="doc-reason" data-reason="' + i + '" placeholder="Reason, e.g. photo is blurry" aria-label="Reason for ' + escapeHtml(d.name) + '">' +
        '</div>';
    }).join('');

    detailPanel.innerHTML =
      '<div class="detail-head">' +
        '<div>' +
          '<h3>' + escapeHtml(s.name) + '</h3>' +
          '<p class="muted">' + escapeHtml(s.id) + ' &middot; ' + escapeHtml(s.country) + ' &middot; Submitted ' + formatDate(s.submitted) + '</p>' +
          '<div class="contact-line">' +
            '<a href="mailto:' + escapeHtml(s.email) + '">' + escapeHtml(s.email) + '</a>' +
            '<a href="tel:' + escapeHtml(s.phone.replace(/\s+/g, '')) + '">' + escapeHtml(s.phone) + '</a>' +
          '</div>' +
        '</div>' +
        '<button type="button" class="btn btn-secondary btn-small" data-close>Close</button>' +
      '</div>' +
      '<div class="detail-grid">' +
        '<div class="detail-section">' +
          '<h4>Application status</h4>' +
          '<select id="statusSelect" aria-label="Application status">' + statusOptions + '</select>' +
          '<p class="hint" id="statusHint"></p>' +
        '</div>' +
        '<div class="detail-section">' +
          '<h4>Documents</h4>' + docRows +
          '<p class="hint" id="viewNote"></p>' +
        '</div>' +
      '</div>' +
      '<div class="save-row">' +
        '<button type="button" class="btn btn-primary" data-save>Save changes</button>' +
        '<span class="save-msg" id="saveMsg" role="status"></span>' +
      '</div>';

    detailPanel.querySelector('#statusSelect').value = s.status;
    s.docs.forEach(function (d, i) {
      detailPanel.querySelector('[data-check="' + i + '"]').value = d.check;
      const reason = detailPanel.querySelector('[data-reason="' + i + '"]');
      reason.value = d.reason;
      reason.classList.toggle('is-visible', d.check === 'problem');
    });

    updateHint();
    detailPanel.classList.add('is-open');
    detailPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function closeDetail() {
    selectedId = null;
    detailPanel.classList.remove('is-open');
    detailPanel.innerHTML = '';
    renderTable();
  }

  function updateHint() {
    const hint = detailPanel.querySelector('#statusHint');
    const statusValue = detailPanel.querySelector('#statusSelect').value;
    const checks = detailPanel.querySelectorAll('[data-check]');
    const hasProblem = Array.prototype.some.call(checks, function (el) { return el.value === 'problem'; });

    let message = '';
    if (hasProblem && statusValue !== 'Needs correction') {
      message = 'A document is marked Problem. Consider setting the status to Needs correction so the student sees what to fix.';
    } else if (!hasProblem && statusValue === 'Needs correction') {
      message = 'Mark at least one document as Problem so the student knows what to fix.';
    }

    hint.textContent = message;
    hint.classList.toggle('is-warning', message !== '');
  }

  function showSaveMessage(text, isError) {
    const msg = detailPanel.querySelector('#saveMsg');
    msg.textContent = text;
    msg.classList.add('is-visible');
    msg.classList.toggle('is-error', !!isError);
  }

  function clearSaveMessage() {
    const msg = detailPanel.querySelector('#saveMsg');
    if (msg) msg.classList.remove('is-visible');
  }

  function saveDetail() {
    const s = submissions.find(function (x) { return x.id === selectedId; });
    if (!s) return;

    const newDocs = s.docs.map(function (d, i) {
      const check = detailPanel.querySelector('[data-check="' + i + '"]').value;
      const reason = detailPanel.querySelector('[data-reason="' + i + '"]').value.trim();
      return {
        name: d.name,
        file: d.file,
        check: check,
        reason: check === 'problem' ? reason : ''
      };
    });

    const missingReason = newDocs.some(function (d) { return d.check === 'problem' && !d.reason; });
    if (missingReason) {
      showSaveMessage('Add a short reason for each document marked Problem.', true);
      return;
    }

    s.docs = newDocs;
    s.status = detailPanel.querySelector('#statusSelect').value;
    saveSubmissions(submissions);
    renderTable();
    showSaveMessage('Saved.', false);
  }

  detailPanel.addEventListener('change', function (e) {
    clearSaveMessage();
    const check = e.target.closest('[data-check]');
    if (check) {
      const i = check.getAttribute('data-check');
      const reason = detailPanel.querySelector('[data-reason="' + i + '"]');
      reason.classList.toggle('is-visible', check.value === 'problem');
    }
    updateHint();
  });

  detailPanel.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) { closeDetail(); return; }
    if (e.target.closest('[data-save]')) { saveDetail(); return; }
    if (e.target.closest('[data-view]')) {
      detailPanel.querySelector('#viewNote').textContent =
        'Preview only: these sample documents have no real file, so nothing opens. In the live version this opens the uploaded file.';
    }
  });

  /* ----- Restore an existing session ----- */

  let savedEmail = null;
  try { savedEmail = sessionStorage.getItem(SESSION_KEY); } catch (err) { /* ignore */ }
  if (savedEmail && STAFF_ALLOWLIST.indexOf(savedEmail) !== -1) {
    showApp(savedEmail);
  }
}

/* ==========================================================================
   Student status page (status.html)
   ========================================================================== */

function initStatusPage() {
  const view = document.getElementById('statusView');
  const picker = document.getElementById('previewAs');
  if (!view || !picker) return;

  const initial = loadSubmissions();

  picker.innerHTML = initial.map(function (s) {
    return '<option value="' + escapeHtml(s.id) + '">' + escapeHtml(s.name) + ' (' + escapeHtml(s.status) + ')</option>';
  }).join('');

  const needsCorrection = initial.find(function (s) { return s.status === 'Needs correction'; });
  if (needsCorrection) picker.value = needsCorrection.id;

  function render(id) {
    const s = loadSubmissions().find(function (x) { return x.id === id; });
    if (!s) { view.innerHTML = ''; return; }

    const cur = STEP_FOR[s.status];
    const revoked = s.status === 'Revoked';
    const issued = s.status === 'Pass issued';

    const steps = MAIN_STEPS.map(function (label, i) {
      const done = i < cur || (issued && i === cur);
      const current = i === cur && !issued;
      const cls = 'timeline-step' + (done ? ' is-done' : '') + (current ? ' is-current' : '');
      return '<li class="' + cls + '"><span class="dot">' + (done ? '&#10003;' : (i + 1)) + '</span><span class="label">' + escapeHtml(label) + '</span></li>';
    }).join('');

    let banner = '';
    if (s.status === 'Needs correction') {
      banner = '<div class="status-banner is-attention"><strong>Action needed.</strong> Check the documents marked below and contact the office to send corrected copies.</div>';
    } else if (revoked) {
      banner = '<div class="status-banner is-revoked"><strong>This application has been revoked.</strong> Please contact the office for details.</div>';
    }

    const docs = s.docs.map(function (d) {
      let result = '<span class="doc-result">Waiting for review</span>';
      if (d.check === 'ok') result = '<span class="doc-result is-ok">OK</span>';
      if (d.check === 'problem') result = '<span class="doc-result is-problem">Needs correction</span>';
      const note = (d.check === 'problem' && d.reason) ? '<p class="doc-note">' + escapeHtml(d.reason) + '</p>' : '';
      return '<li class="student-doc"><div><span class="doc-name">' + escapeHtml(d.name) + '</span>' + note + '</div>' + result + '</li>';
    }).join('');

    view.innerHTML =
      '<div class="status-card">' +
        '<p class="muted">Application for</p>' +
        '<h2>' + escapeHtml(s.name) + '</h2>' +
        '<p class="muted">' + escapeHtml(s.id) + ' &middot; Submitted ' + formatDate(s.submitted) + '</p>' +
        '<p>' + statusBadge(s.status) + '</p>' +
        '<p class="status-message">' + escapeHtml(STATUS_MESSAGES[s.status]) + '</p>' +
      '</div>' +
      banner +
      '<ol class="timeline' + (revoked ? ' is-revoked' : '') + '">' + steps + '</ol>' +
      '<h3 class="status-subhead">Your documents</h3>' +
      '<ul class="student-docs">' + docs + '</ul>';
  }

  picker.addEventListener('change', function () { render(picker.value); });
  render(picker.value);
}

initStaffPage();
initStatusPage();