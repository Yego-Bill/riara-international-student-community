/* Landing page for the email verification link */
(function () {
  const api = window.RISC_API;
  const card = document.getElementById('verifyCard');

  // Supabase puts any problem with the link in the address after "#" or "?".
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const query = new URLSearchParams(window.location.search);
  const problem = hash.get('error_description') || query.get('error_description');

  function show(html) { card.innerHTML = html; }

  if (problem) {
    show('<h2>This link didn\'t work</h2>' +
      '<p>' + api.escapeHtml(api.friendlyError({ message: problem })) + '</p>' +
      '<p>Try signing in — if your email still needs verifying, you\'ll be offered a new link.</p>' +
      '<p><a class="btn btn-primary" href="sign-in.html">Go to sign in</a></p>');
    return;
  }

  // Give Supabase a moment to read the link and sign the student in.
  let done = false;
  async function finish() {
    if (done) return;
    const profile = await api.getProfile().catch(() => null);
    if (!profile) return;
    done = true;
    const next = profile.role === 'staff' ? 'staff.html' : 'my-application.html';
    show('<div class="success-icon">✓</div><h2>Your email is verified</h2>' +
      '<p>Welcome, ' + api.escapeHtml(profile.full_name || 'there') + '. Your account is ready.</p>' +
      '<p><a class="btn btn-primary" href="' + next + '">Continue</a></p>');
  }
  api.onAuthChange(() => finish());
  finish();
  setTimeout(() => {
    if (!done) {
      show('<div class="success-icon">✓</div><h2>Email verified</h2>' +
        '<p>Your account is ready. Sign in to continue.</p>' +
        '<p><a class="btn btn-primary" href="sign-in.html">Sign in</a></p>');
    }
  }, 4000);
})();
