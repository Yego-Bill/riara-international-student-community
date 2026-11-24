/* After sign-up: "check your email" + resend */
(function () {
  const api = window.RISC_API;
  const email = new URLSearchParams(window.location.search).get('email') || '';
  const banner = document.getElementById('authBanner');
  if (email) document.getElementById('sentTo').textContent = email;

  const btn = document.getElementById('resendBtn');
  btn.hidden = !email;
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    try {
      await api.resendVerification(email);
      banner.textContent = 'Sent again. It can take a minute or two to arrive.';
      banner.className = 'auth-banner is-visible is-ok';
    } catch (err) {
      banner.textContent = api.friendlyError(err);
      banner.className = 'auth-banner is-visible';
    } finally {
      // Wait a minute before allowing another resend.
      setTimeout(() => { btn.disabled = false; }, 60000);
    }
  });
})();
