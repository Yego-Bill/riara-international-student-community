/* Ask for a password reset email */
(function () {
  const api = window.RISC_API;
  const form = document.getElementById('forgotForm');
  const banner = document.getElementById('authBanner');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value.trim();
    if (!email) return;
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      await api.sendPasswordReset(email);
      // Same message whether or not the account exists, so nobody can use
      // this form to find out who has an account.
      banner.textContent = 'If an account exists for ' + email + ', a reset link is on its way. Check your inbox and junk folder.';
      banner.className = 'auth-banner is-visible is-ok';
    } catch (err) {
      banner.textContent = api.friendlyError(err);
      banner.className = 'auth-banner is-visible';
    } finally {
      setTimeout(() => { btn.disabled = false; }, 30000);
    }
  });
})();
