// Mobile nav toggle
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.getElementById('navLinks');

if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', isOpen);
  });
}

// Immigration page — tab switching
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    tabButtons.forEach((b) => b.setAttribute('aria-selected', 'false'));
    tabPanels.forEach((p) => {
      p.classList.remove('is-active');
      p.setAttribute('hidden', '');
    });

    btn.setAttribute('aria-selected', 'true');
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    panel.classList.add('is-active');
    panel.removeAttribute('hidden');
  });
});

// Get Started page — persist checklist progress per device
const checklistBoxes = document.querySelectorAll('.checklist-item input[type="checkbox"]');

if (checklistBoxes.length) {
  checklistBoxes.forEach((box) => {
    const key = 'riara-siso-checklist-' + box.id;

    // Restore saved state
    if (localStorage.getItem(key) === 'true') {
      box.checked = true;
      box.closest('.checklist-item').classList.add('is-checked');
    }

    box.addEventListener('change', () => {
      localStorage.setItem(key, box.checked);
      box.closest('.checklist-item').classList.toggle('is-checked', box.checked);
    });
  });
}

// Account page (preview/mockup) — toggle + simulated auth behavior
const toggleSignIn = document.getElementById('toggleSignIn');
const toggleSignUp = document.getElementById('toggleSignUp');
const signInForm = document.getElementById('signInForm');
const signUpForm = document.getElementById('signUpForm');
const authBanner = document.getElementById('authBanner');
const goToSignUp = document.getElementById('goToSignUp');
const goToSignIn = document.getElementById('goToSignIn');

function showSignIn() {
  toggleSignIn.classList.add('is-active');
  toggleSignUp.classList.remove('is-active');
  signInForm.classList.add('is-active');
  signUpForm.classList.remove('is-active');
}

function showSignUp() {
  toggleSignUp.classList.add('is-active');
  toggleSignIn.classList.remove('is-active');
  signUpForm.classList.add('is-active');
  signInForm.classList.remove('is-active');
}

function showBanner(message) {
  if (!authBanner) return;
  authBanner.textContent = message;
  authBanner.classList.add('is-visible');
}
function hideBanner() {
  if (!authBanner) return;
  authBanner.classList.remove('is-visible');
}

if (toggleSignIn && toggleSignUp) {
  toggleSignIn.addEventListener('click', () => { showSignIn(); hideBanner(); });
  toggleSignUp.addEventListener('click', () => { showSignUp(); hideBanner(); });
}

if (goToSignUp) {
  goToSignUp.addEventListener('click', (e) => {
    e.preventDefault();
    showSignUp();
    hideBanner();
  });
}

if (goToSignIn) {
  goToSignIn.addEventListener('click', (e) => {
    e.preventDefault();
    showSignIn();
    hideBanner();
  });
}

// Simulated account flow (preview only — nothing is really stored/sent):
// Sign Up -> switches to Sign In with a message -> successful Sign In -> Upload page.

if (signUpForm) {
  signUpForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;

    // Remember this email in the browser only, just so Sign In can recognize it in this demo
    localStorage.setItem('riara-preview-account-email', email);

    showBanner("Account created! Please sign in to continue.");
    setTimeout(() => {
      showSignIn();
      document.getElementById('signin-email').value = email;
      hideBanner();
    }, 1200);
  });
}

if (signInForm) {
  signInForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('signin-email').value;
    const knownEmail = localStorage.getItem('riara-preview-account-email');

    if (knownEmail && email === knownEmail) {
      showBanner("Signed in! Redirecting to your document upload page...");
      setTimeout(() => {
        window.location.href = 'upload.html';
      }, 1000);
    } else {
      showBanner("We couldn't find an account for " + email + " — taking you to sign up instead.");
      setTimeout(() => {
        showSignUp();
        document.getElementById('signup-email').value = email;
        showBanner("This is a preview of account creation — full functionality is coming soon!");
      }, 1400);
    }
  });
}

// Upload page — file selection feedback + submit preview message
const uploadItems = document.querySelectorAll('.upload-item');
if (uploadItems.length) {
  uploadItems.forEach((item) => {
    const fileInput = item.querySelector('input[type="file"]');
    const filenameSpan = item.querySelector('.upload-filename');
    if (!fileInput) return;

    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) {
        filenameSpan.textContent = fileInput.files[0].name;
        item.classList.add('has-file');
      } else {
        filenameSpan.textContent = '';
        item.classList.remove('has-file');
      }
    });
  });

  const storedEmail = localStorage.getItem('riara-preview-account-email');
  const loggedInEmailSpan = document.getElementById('loggedInEmail');
  if (loggedInEmailSpan && storedEmail) {
    loggedInEmailSpan.textContent = storedEmail;
  }

  const submitDocsBtn = document.getElementById('submitDocsBtn');
  const agreeTerms = document.getElementById('agreeTerms');
  const requiredItems = document.querySelectorAll('.upload-item[data-required="true"]');

  function updateSubmitState() {
    if (!submitDocsBtn) return;
    const allRequiredUploaded = Array.from(requiredItems).every((item) =>
      item.classList.contains('has-file')
    );
    const termsChecked = agreeTerms ? agreeTerms.checked : true;
    submitDocsBtn.disabled = !(allRequiredUploaded && termsChecked);
  }

  requiredItems.forEach((item) => {
    const fileInput = item.querySelector('input[type="file"]');
    if (fileInput) fileInput.addEventListener('change', updateSubmitState);
  });

  if (agreeTerms) {
    agreeTerms.addEventListener('change', updateSubmitState);
  }

  if (submitDocsBtn) {
    submitDocsBtn.addEventListener('click', () => {
      const uploadList = document.getElementById('uploadList');
      const uploadSubmitArea = document.getElementById('uploadSubmitArea');
      const uploadSuccess = document.getElementById('uploadSuccess');
      const noteBox = document.querySelector('.upload-note-box');

      if (uploadList) uploadList.style.display = 'none';
      if (uploadSubmitArea) uploadSubmitArea.style.display = 'none';
      if (noteBox) noteBox.style.display = 'none';
      if (uploadSuccess) {
        uploadSuccess.classList.add('is-visible');
        uploadSuccess.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }
}

// Sign Up form — live password match check
const signupPassword = document.getElementById('signup-password');
const signupConfirmPassword = document.getElementById('signup-confirm-password');
const createAccountBtn = document.getElementById('createAccountBtn');
const passwordMismatchHint = document.getElementById('passwordMismatchHint');

function checkPasswordsMatch() {
  if (!signupPassword || !signupConfirmPassword || !createAccountBtn) return;

  const pass = signupPassword.value;
  const confirm = signupConfirmPassword.value;
  const bothFilled = pass.length > 0 && confirm.length > 0;
  const matches = pass === confirm;

  if (bothFilled && !matches) {
    passwordMismatchHint.classList.add('is-visible');
  } else {
    passwordMismatchHint.classList.remove('is-visible');
  }

  createAccountBtn.disabled = !(bothFilled && matches);
}

if (signupPassword && signupConfirmPassword) {
  signupPassword.addEventListener('input', checkPasswordsMatch);
  signupConfirmPassword.addEventListener('input', checkPasswordsMatch);
}