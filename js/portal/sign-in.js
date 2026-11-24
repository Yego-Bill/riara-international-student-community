/* Sign in / create account */
(function () {
  const api = window.RISC_API;
  const $ = (id) => document.getElementById(id);
  const banner = $('authBanner');
  const params = new URLSearchParams(window.location.search);

  function showBanner(message, kind) {
    banner.textContent = message;
    banner.className = 'auth-banner is-visible' + (kind === 'ok' ? ' is-ok' : '');
  }
  function hideBanner() { banner.className = 'auth-banner'; }

  function showTab(which) {
    const signIn = which === 'in';
    $('toggleSignIn').classList.toggle('is-active', signIn);
    $('toggleSignUp').classList.toggle('is-active', !signIn);
    $('toggleSignIn').setAttribute('aria-selected', signIn);
    $('toggleSignUp').setAttribute('aria-selected', !signIn);
    $('signInForm').classList.toggle('is-active', signIn);
    $('signUpForm').classList.toggle('is-active', !signIn);
    hideBanner();
  }
  $('toggleSignIn').addEventListener('click', () => showTab('in'));
  $('toggleSignUp').addEventListener('click', () => showTab('up'));
  if (params.get('mode') === 'signup') showTab('up');

  // Where to go after signing in. Only pages inside the portal are allowed,
  // so a link can't send someone off to another site.
  function nextPage(profile) {
    const next = params.get('next') || '';
    if (/^[a-z-]+\.html(\?[\w=&-]*)?$/.test(next)) return next;
    return profile.role === 'staff' ? 'staff.html' : 'my-application.html';
  }

  // Already signed in? Skip this page.
  api.getProfile().then((profile) => {
    if (profile) window.location.replace(nextPage(profile));
  }).catch(() => {});

  if (params.get('reset') === 'done') showBanner('Your password has been changed. Sign in with your new password.', 'ok');

  /* ---- Sign in ---- */
  let lastEmail = '';
  $('signInForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('signin-email').value;
    const password = $('signin-password').value;
    if (!email || !password) return showBanner('Enter your email and password.');
    const btn = e.submitter || $('signInForm').querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      await api.signIn(email, password);
      const profile = await api.getProfile();
      window.location.replace(nextPage(profile));
    } catch (err) {
      lastEmail = email;
      showBanner(api.friendlyError(err));
      $('resendWrap').hidden = !/Email not confirmed/i.test(err.message || '');
    } finally {
      btn.disabled = false;
    }
  });

  $('resendLink').addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await api.resendVerification(lastEmail);
      showBanner('We sent a new verification link. Check your inbox and junk folder.', 'ok');
    } catch (err) { showBanner(api.friendlyError(err)); }
  });

  /* ---- Create account ---- */
  const pw = $('signup-password');
  const confirm = $('signup-confirm');
  window.RISC_PASSWORD.attach(pw, confirm, $('mismatchHint'));

  $('signUpForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      fullName: $('signup-name').value.trim(),
      email: $('signup-email').value.trim(),
      studentId: $('signup-studentid').value.trim(),
      country: $('signup-country').value.trim(),
      phone: $('signup-phone').value.trim(),
      password: pw.value,
    };
    if (!data.fullName || !data.email || !data.studentId || !data.country) {
      return showBanner('Please fill in your name, student email, student ID and country.');
    }
    if (!api.isStudentEmail(data.email)) {
      return showBanner('Use your Riara student email — it ends in @' + api.CONFIG.STUDENT_EMAIL_DOMAIN + '.');
    }
    if (!window.RISC_PASSWORD.isStrong(data.password)) {
      return showBanner('Your password needs at least 8 characters, with a capital letter, a small letter and a number.');
    }
    if (data.password !== confirm.value) return showBanner('The two passwords don\'t match.');
    if (!$('signup-agree').checked) return showBanner('Please confirm you\'ve read the pilot notice.');

    const btn = $('createAccountBtn');
    btn.disabled = true;
    try {
      const result = await api.signUp(data);
      // Supabase returns a user with no identities when the email is already
      // registered (so it doesn't reveal who has an account).
      if (result.user && Array.isArray(result.user.identities) && result.user.identities.length === 0) {
        showTab('in');
        $('signin-email').value = data.email;
        return showBanner('An account with this email already exists. Sign in, or use "Forgot your password?".');
      }
      window.location.href = 'check-email.html?email=' + encodeURIComponent(data.email.toLowerCase());
    } catch (err) {
      showBanner(api.friendlyError(err));
    } finally {
      btn.disabled = false;
    }
  });
})();
