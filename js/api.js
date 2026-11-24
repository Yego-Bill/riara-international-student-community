/* ==========================================================================
   api.js — every conversation with the database lives in this file.
   --------------------------------------------------------------------------
   Pages never talk to Supabase directly; they call RISC_API.something().
   If the school later moves to its own database, this is the file to change.

   Needs, in this order on the page:
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     <script src=".../js/supabase-config.js"></script>
     <script src=".../js/api.js"></script>
   ========================================================================== */

(function () {
  const CFG = window.RISC_CONFIG;
  const ROOT = (window.RISC && window.RISC.ROOT) || '';

  const sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  /* ---------------------------------------------------------------------
     Reference lists
     --------------------------------------------------------------------- */

  // In order. "step" places each status on the student's progress bar;
  // "Missing documents" sits on the same step as "Under review".
  const STATUSES = [
    { id: 'submitted',            label: 'Submitted',            step: 0,
      student: 'We have your application. It will be reviewed soon.' },
    { id: 'under_review',         label: 'Under review',         step: 1,
      student: 'Your documents are being checked.' },
    { id: 'missing_documents',    label: 'Missing documents',    step: 1,
      student: 'Some documents are missing or need replacing. See the note below, then add them.' },
    { id: 'awaiting_payment',     label: 'Awaiting payment',     step: 2,
      student: 'Your application has been approved. The office will contact you to arrange payment.' },
    { id: 'processing',           label: 'Processing',           step: 3,
      student: 'Your pass is being processed by Immigration. This step can take a while.' },
    { id: 'ready_for_collection', label: 'Ready for collection', step: 4,
      student: 'Your pass is ready. Collect it from Kelvin at the front office.' },
    { id: 'completed',            label: 'Completed',            step: 5,
      student: 'All done. Remember to note your pass expiry date for renewal.' },
  ];
  const PROGRESS_STEPS = ['Submitted', 'Under review', 'Awaiting payment', 'Processing', 'Ready for collection', 'Completed'];

  const PASS_TYPES = {
    student_pass: 'Student Pass',
    internship_research_pass: 'Internship / Research Pass',
  };
  const APPLICATION_TYPES = { new: 'New application', renewal: 'Renewal' };

  // The upload checklist. "required" can be true, false, or a function of
  // (passType, applicationType). Matches the lists on immigration.html.
  const DOC_CHECKLIST = [
    { key: 'form30', label: 'Application Form 30 (filled, signed and stamped by Riara)', required: true },
    { key: 'cover_letter', label: 'Cover letter from Riara to the Director of Immigration Services', required: true },
    { key: 'passport', label: 'Passport bio-data page', required: true },
    { key: 'photos', label: 'Two recent colour passport photos', required: true, multiple: true },
    { key: 'sponsor_letter', label: 'Signed commitment letter from your sponsor', required: true },
    { key: 'sponsor_passport', label: "Copy of your sponsor's passport", required: true },
    { key: 'police_clearance', label: 'Police Clearance Certificate', required: true },
    { key: 'academic_certs', label: 'Certified copies of academic certificates',
      required: (p, a) => a === 'new' || p === 'internship_research_pass',
      showIf: (p, a) => a === 'new' || p === 'internship_research_pass' },
    { key: 'transcripts', label: 'Certified transcripts or progress report',
      required: (p, a) => p === 'student_pass' && a === 'renewal',
      showIf: (p, a) => p === 'student_pass' && a === 'renewal' },
    { key: 'cv', label: 'CV / resume',
      required: (p) => p === 'internship_research_pass',
      showIf: (p) => p === 'internship_research_pass' },
    { key: 'research_permit', label: 'Research permit (if doing research)', condition: 'researchers only',
      required: false, showIf: (p) => p === 'internship_research_pass' },
    { key: 'immigration_status', label: 'Current immigration status', condition: 'if already in Kenya', required: false },
    { key: 'proof_of_funds', label: 'Proof of funds', condition: 'if self-sponsored', required: false,
      showIf: (p) => p === 'student_pass' },
    { key: 'translations', label: 'Certified English translations', condition: 'for documents not in English', required: false, multiple: true },
    { key: 'other', label: 'Anything else the office asked for', condition: 'optional', required: false, multiple: true },
  ];

  function checklistFor(passType, appType) {
    return DOC_CHECKLIST
      .filter((d) => !d.showIf || d.showIf(passType, appType))
      .map((d) => ({ ...d, required: typeof d.required === 'function' ? d.required(passType, appType) : d.required }));
  }

  const statusById = (id) => STATUSES.find((s) => s.id === id) || { id, label: id, step: 0, student: '' };

  /* ---------------------------------------------------------------------
     Small helpers pages can use
     --------------------------------------------------------------------- */

  function escapeHtml(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function formatDate(iso, withTime) {
    if (!iso) return '';
    const d = new Date(iso);
    const opts = { day: 'numeric', month: 'short', year: 'numeric' };
    if (withTime) Object.assign(opts, { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleString('en-GB', opts);
  }

  function portalUrl(page) { return ROOT + 'portal/' + page; }

  // Turn Supabase's error messages into plain English.
  function friendlyError(error) {
    const msg = (error && (error.message || error.error_description)) || String(error || '');
    if (/Invalid login credentials/i.test(msg)) return 'That email and password don\'t match. Check them and try again.';
    if (/Email not confirmed/i.test(msg)) return 'Please verify your email first — click the link we sent you. Check your junk folder too.';
    if (/already registered|already been registered/i.test(msg)) return 'An account with this email already exists. Try signing in, or reset your password.';
    if (/Database error saving new user|Only Riara University/i.test(msg)) return 'Only Riara student emails (@' + CFG.STUDENT_EMAIL_DOMAIN + ') can sign up.';
    if (/Password should|weak password|password.*characters/i.test(msg)) return 'Your password needs at least 8 characters, with a capital letter, a small letter and a number.';
    if (/rate limit|too many/i.test(msg)) return 'Too many attempts. Please wait a few minutes and try again.';
    if (/same password|different from the old/i.test(msg)) return 'Your new password must be different from the old one.';
    if (/Failed to fetch|NetworkError/i.test(msg)) return 'Can\'t reach the server. Check your internet connection and try again.';
    if (/expired|invalid.*(link|token)|otp/i.test(msg)) return 'This link has expired or was already used. Request a new one.';
    return msg || 'Something went wrong. Please try again.';
  }

  function must({ data, error }) {
    if (error) throw error;
    return data;
  }

  /* ---------------------------------------------------------------------
     Accounts
     --------------------------------------------------------------------- */

  async function getUser() {
    const { data } = await sb.auth.getSession();
    return data.session ? data.session.user : null;
  }

  async function getProfile() {
    const user = await getUser();
    if (!user) return null;
    return must(await sb.from('profiles').select('*').eq('id', user.id).single());
  }

  function isStudentEmail(email) {
    return String(email).trim().toLowerCase().endsWith('@' + CFG.STUDENT_EMAIL_DOMAIN);
  }

  async function signUp({ email, password, fullName, studentId, country, phone }) {
    return must(await sb.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: portalUrl('verified.html'),
        data: { full_name: fullName.trim(), student_id: studentId.trim(), country: country.trim(), phone: (phone || '').trim() },
      },
    }));
  }

  async function resendVerification(email) {
    return must(await sb.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: portalUrl('verified.html') },
    }));
  }

  async function signIn(email, password) {
    return must(await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password }));
  }

  async function signOut(nextPage) {
    await sb.auth.signOut();
    window.location.href = portalUrl(nextPage || 'sign-in.html');
  }

  async function sendPasswordReset(email) {
    return must(await sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: portalUrl('reset-password.html'),
    }));
  }

  async function updatePassword(password) {
    return must(await sb.auth.updateUser({ password }));
  }

  function onAuthChange(callback) {
    return sb.auth.onAuthStateChange((event, session) => callback(event, session));
  }

  // Use at the top of a portal page. Sends people who aren't signed in to
  // the sign-in page (and back here afterwards). role: 'student' | 'staff'.
  async function requireSignIn(role) {
    const user = await getUser();
    if (!user) {
      const back = encodeURIComponent(window.location.pathname.split('/').pop() + window.location.search);
      window.location.replace(portalUrl('sign-in.html?next=' + back));
      return new Promise(() => {}); // stop the page while redirecting
    }
    const profile = await getProfile();
    if (role === 'staff' && profile.role !== 'staff') {
      window.location.replace(portalUrl('my-application.html'));
      return new Promise(() => {});
    }
    if (role === 'student' && profile.role === 'staff') {
      window.location.replace(portalUrl('staff.html'));
      return new Promise(() => {});
    }
    return { user, profile };
  }

  /* ---------------------------------------------------------------------
     Student: applications and documents
     --------------------------------------------------------------------- */

  async function myApplications() {
    const user = await getUser();
    return must(await sb.from('applications').select('*')
      .eq('student_id', user.id).order('created_at', { ascending: false }));
  }

  async function getApplication(id) {
    return must(await sb.from('applications').select('*').eq('id', id).single());
  }

  async function createApplication(passType, applicationType) {
    const user = await getUser();
    return must(await sb.from('applications')
      .insert({ student_id: user.id, pass_type: passType, application_type: applicationType })
      .select().single());
  }

  async function submitApplication(id) {
    return must(await sb.rpc('submit_application', { app_id: id }));
  }

  async function listDocuments(applicationId) {
    return must(await sb.from('documents').select('*')
      .eq('application_id', applicationId).order('uploaded_at'));
  }

  // Phone photos are often 3–5 MB. Shrink images to max 1600px as JPEG
  // before upload so they're ~300 KB and storage lasts. PDFs are unchanged.
  async function prepareFile(file) {
    const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!ALLOWED.includes(file.type)) {
      throw new Error('Please upload a PDF, JPG or PNG file.');
    }
    if (file.type === 'application/pdf') {
      if (file.size > 5 * 1024 * 1024) throw new Error('This PDF is larger than 5 MB. Please compress it or scan at a lower quality.');
      return file;
    }
    const bitmap = await createImageBitmap(file).catch(() => null);
    if (!bitmap) throw new Error('This image couldn\'t be read. Try taking the photo again.');
    const MAX = 1600;
    const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
    if (!blob || blob.size > 5 * 1024 * 1024) throw new Error('This image is too large even after shrinking. Try a smaller photo.');
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg' });
  }

  async function uploadDocument(application, docKey, originalFile) {
    const user = await getUser();
    const file = await prepareFile(originalFile);
    const ext = file.type === 'application/pdf' ? 'pdf' : 'jpg';
    const path = `${user.id}/${application.id}/${docKey}-${Date.now()}.${ext}`;

    must(await sb.storage.from('documents').upload(path, file, { contentType: file.type, upsert: false }));

    const { data, error } = await sb.from('documents').insert({
      application_id: application.id,
      owner_id: user.id,
      doc_key: docKey,
      file_path: path,
      file_name: originalFile.name.slice(0, 150),
      mime_type: file.type,
      size_bytes: file.size,
    }).select().single();

    if (error) {
      await sb.storage.from('documents').remove([path]); // don't leave an orphan file
      throw error;
    }
    return data;
  }

  async function deleteDocument(doc) {
    must(await sb.from('documents').delete().eq('id', doc.id));
    await sb.storage.from('documents').remove([doc.file_path]);
  }

  // A link that works for 2 minutes. Files are private, so this is the only
  // way to open one, and only the owner or staff can get it.
  async function fileUrl(path) {
    const data = must(await sb.storage.from('documents').createSignedUrl(path, 120));
    return data.signedUrl;
  }

  async function history(applicationId) {
    return must(await sb.from('status_history').select('*')
      .eq('application_id', applicationId).order('created_at'));
  }

  // Calls back whenever this application changes (e.g. staff change the status).
  function watchApplication(applicationId, callback) {
    const channel = sb.channel('application-' + applicationId)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'applications', filter: 'id=eq.' + applicationId },
        (payload) => callback(payload.new))
      .subscribe();
    return () => sb.removeChannel(channel);
  }

  /* ---------------------------------------------------------------------
     Staff
     --------------------------------------------------------------------- */

  async function staffListApplications() {
    const apps = must(await sb.from('applications').select('*').not('submitted_at', 'is', null)
      .order('submitted_at', { ascending: false }));
    const profiles = must(await sb.from('profiles').select('id, email, full_name, student_id, country, phone, role'));
    const byId = Object.fromEntries(profiles.map((p) => [p.id, p]));
    return {
      applications: apps.map((a) => ({ ...a, student: byId[a.student_id] || null, assignee: byId[a.assigned_to] || null })),
      staff: profiles.filter((p) => p.role === 'staff'),
      profilesById: byId,
    };
  }

  async function staffUpdateApplication(id, fields) {
    const allowed = {};
    ['status', 'student_message', 'assigned_to'].forEach((k) => { if (k in fields) allowed[k] = fields[k]; });
    return must(await sb.from('applications').update(allowed).eq('id', id).select().single());
  }

  async function staffNotes(applicationId) {
    return must(await sb.from('staff_notes').select('*')
      .eq('application_id', applicationId).order('created_at'));
  }

  async function staffAddNote(applicationId, body) {
    return must(await sb.from('staff_notes').insert({ application_id: applicationId, body: body.trim() }).select().single());
  }

  /* ---------------------------------------------------------------------
     Announcements and events (public read; staff manage)
     --------------------------------------------------------------------- */

  async function activeAnnouncements() {
    return must(await sb.from('announcements').select('*').eq('active', true).order('created_at', { ascending: false }));
  }
  async function allAnnouncements() {
    return must(await sb.from('announcements').select('*').order('created_at', { ascending: false }));
  }
  async function addAnnouncement(message) {
    return must(await sb.from('announcements').insert({ message: message.trim() }).select().single());
  }
  async function setAnnouncementActive(id, active) {
    return must(await sb.from('announcements').update({ active }).eq('id', id));
  }
  async function deleteAnnouncement(id) {
    return must(await sb.from('announcements').delete().eq('id', id));
  }

  // Upcoming events first (by date), then "to be announced" ones.
  async function listEvents({ upcomingOnly } = {}) {
    let rows = must(await sb.from('events').select('*').order('event_date', { ascending: true, nullsFirst: false }));
    if (upcomingOnly) {
      const today = new Date().toISOString().slice(0, 10);
      rows = rows.filter((e) => !e.event_date || e.event_date >= today);
    }
    return rows;
  }
  async function saveEvent(event) {
    const row = {
      title: event.title.trim(),
      event_date: event.event_date || null,
      time_location: (event.time_location || '').trim(),
      description: (event.description || '').trim(),
    };
    if (event.id) return must(await sb.from('events').update(row).eq('id', event.id).select().single());
    return must(await sb.from('events').insert(row).select().single());
  }
  async function deleteEvent(id) {
    return must(await sb.from('events').delete().eq('id', id));
  }

  /* ---------------------------------------------------------------------
     Checklist progress (signed-in students)
     --------------------------------------------------------------------- */

  async function loadChecklist() {
    const user = await getUser();
    if (!user) return null;
    const rows = must(await sb.from('checklist_progress').select('item_id, checked'));
    return Object.fromEntries(rows.map((r) => [r.item_id, r.checked]));
  }
  async function saveChecklistItem(itemId, checked) {
    const user = await getUser();
    if (!user) return;
    must(await sb.from('checklist_progress').upsert(
      { user_id: user.id, item_id: itemId, checked, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,item_id' }));
  }

  /* ---------------------------------------------------------------------
     Shared page bits: the account link in the menu, and the pilot banner
     --------------------------------------------------------------------- */

  async function updateAccountLink() {
    const linkEl = document.getElementById('navAccount');
    if (!linkEl) return;
    try {
      const profile = await getProfile();
      if (!profile) return;
      if (profile.role === 'staff') {
        linkEl.textContent = 'Staff dashboard';
        linkEl.href = portalUrl('staff.html');
      } else {
        linkEl.textContent = 'My application';
        linkEl.href = portalUrl('my-application.html');
      }
    } catch (e) { /* leave it as "Sign in" */ }
  }

  function showPilotBanner() {
    if (!CFG.PILOT_MODE) return;
    const slot = document.getElementById('pilotBanner');
    if (!slot) return;
    slot.innerHTML =
      '<div class="pilot-banner" role="note"><div class="container">' +
      '<strong>Pilot test.</strong> This does <strong>not</strong> submit a real application to Immigration. ' +
      'Upload sample documents only (e.g. a photo of a page marked TEST) — not your real passport. ' +
      'Continue your real application with Kelvin at the front office. ' +
      '<a href="' + portalUrl('pilot-notice.html') + '">About this pilot</a></div></div>';
  }

  document.addEventListener('DOMContentLoaded', () => {
    updateAccountLink();
    showPilotBanner();
  });

  window.RISC_API = {
    CONFIG: CFG, STATUSES, PROGRESS_STEPS, PASS_TYPES, APPLICATION_TYPES, DOC_CHECKLIST,
    checklistFor, statusById, escapeHtml, formatDate, friendlyError, portalUrl, isStudentEmail,
    getUser, getProfile, signUp, resendVerification, signIn, signOut, sendPasswordReset, updatePassword,
    onAuthChange, requireSignIn,
    myApplications, getApplication, createApplication, submitApplication,
    listDocuments, uploadDocument, deleteDocument, fileUrl, history, watchApplication,
    staffListApplications, staffUpdateApplication, staffNotes, staffAddNote,
    activeAnnouncements, allAnnouncements, addAnnouncement, setAnnouncementActive, deleteAnnouncement,
    listEvents, saveEvent, deleteEvent,
    loadChecklist, saveChecklistItem,
  };
})();
