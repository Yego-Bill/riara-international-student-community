/* Landing page for the password reset link: choose a new password */
(function () {
  const api = window.RISC_API;
  const $ = (id) => document.getElementById(id);
  const banner = $('authBanner');

  const hash = new URLSearchParams(window.location.hash.slice(1));
  const query = new URLSearchParams(window.location.search);
  const problem = hash.get('error_description') || query.get('error_description');

  function ready() {
    $('resetChecking').hidden = true;
    $('resetForm').classList.add('is-active');
  }
  function invalid() {
    $('resetChecking').hidden = true;
    $('resetInvalid').hidden = false;
  }

  if (problem) { invalid(); }
  else {
    let shown = false;
    api.onAuthChange((event, session) => {
      if (!shown && session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        shown = true; ready();
      }
    });
    setTimeout(async () => {
      if (shown) return;
      if (await api.getUser()) { shown = true; ready(); } else { invalid(); }
    }, 3000);
  }

  window.RISC_PASSWORD.attach($('reset-password'), $('reset-confirm'), $('mismatchHint'));

  $('resetForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pw = $('reset-password').value;
    if (!window.RISC_PASSWORD.isStrong(pw)) {
      banner.textContent = 'Your password needs at least 8 characters, with a capital letter, a small letter and a number.';
      banner.className = 'auth-banner is-visible';
      return;
    }
    if (pw !== $('reset-confirm').value) {
      banner.textContent = 'The two passwords don\'t match.';
      banner.className = 'auth-banner is-visible';
      return;
    }
    const btn = $('resetForm').querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      await api.updatePassword(pw);
      await api.signOut('sign-in.html?reset=done');
    } catch (err) {
      banner.textContent = api.friendlyError(err);
      banner.className = 'auth-banner is-visible';
      btn.disabled = false;
    }
  });
})();
