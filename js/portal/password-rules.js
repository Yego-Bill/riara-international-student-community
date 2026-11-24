/* Shared by sign-in and reset-password: live password rule ticks. */
window.RISC_PASSWORD = {
  rules: {
    length: (p) => p.length >= 8,
    upper: (p) => /[A-Z]/.test(p),
    lower: (p) => /[a-z]/.test(p),
    digit: (p) => /[0-9]/.test(p),
  },
  isStrong(p) { return Object.values(this.rules).every((test) => test(p)); },
  // Ticks each rule in <ul id="passwordRules"> as the password is typed.
  attach(passwordInput, confirmInput, mismatchHint) {
    const list = document.getElementById('passwordRules');
    const update = () => {
      const p = passwordInput.value;
      list.querySelectorAll('li').forEach((li) => {
        li.classList.toggle('is-met', this.rules[li.dataset.rule](p));
      });
      if (confirmInput && mismatchHint) {
        const show = confirmInput.value.length > 0 && confirmInput.value !== p;
        mismatchHint.classList.toggle('is-visible', show);
      }
    };
    passwordInput.addEventListener('input', update);
    if (confirmInput) confirmInput.addEventListener('input', update);
  },
};
