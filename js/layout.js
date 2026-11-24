/* ==========================================================================
   Shared layout: utility bar, main nav and footer
   --------------------------------------------------------------------------
   Every page loads this file. To change the menu, the contact details in the
   top bar, or the footer, edit them HERE once and every page updates.

   How a page uses it:
     <body data-page="home">
       <div id="site-header"></div>
       <script src="js/layout.js"></script>
       ... page content ...
       <div id="site-footer"></div>

   data-page marks which menu item is highlighted. Pages inside a sub-folder
   (e.g. portal/) work too: links are worked out from where this file lives.
   ========================================================================== */

(function () {
  // Folder the site lives in, worked out from this script's own address
  // (".../js/layout.js" -> "..."), so links work from any sub-folder.
  const script = document.currentScript;
  const ROOT = script ? script.src.replace(/js\/layout\.js(\?.*)?$/, '') : '';
  const link = (path) => ROOT + path;

  // ---- Edit these to change contact details everywhere ----
  const CONTACT = {
    email: 'internationalstudents@riarauniversity.ac.ke', // TODO: confirm
    phoneDisplay: '+254 758 004 928',                      // TODO: confirm
    phoneLink: '+254758004928',
    location: 'Riara University, Nairobi',
  };

  const WHATSAPP_COMMUNITY = 'https://chat.whatsapp.com/BRgVvFkWHRCBCZi2ztkoza';

  // ---- The main menu, in order. "id" matches <body data-page="..."> ----
  const NAV = [
    { id: 'home', label: 'Home', href: 'index.html' },
    { id: 'before-you-arrive', label: 'Before you arrive', href: 'before-you-arrive.html' },
    { id: 'immigration', label: 'Immigration', href: 'immigration.html' },
    { id: 'living-in-kenya', label: 'Living in Kenya', href: 'living-in-kenya.html' },
    { id: 'contact', label: 'Contact', href: 'contact.html', cta: true },
  ];

  const current = document.body.dataset.page || '';

  const navItems = NAV.map((item) => {
    const attrs = [
      `href="${link(item.href)}"`,
      item.cta ? 'class="nav-cta"' : '',
      item.id === current ? 'aria-current="page"' : '',
    ].join(' ');
    return `<li><a ${attrs}>${item.label}</a></li>`;
  }).join('');

  const header = `
    <div class="utility-bar">
      <div class="container">
        <a href="tel:${CONTACT.phoneLink}">📞 ${CONTACT.phoneDisplay}</a>
        <a href="mailto:${CONTACT.email}">✉️ ${CONTACT.email}</a>
        <span>📍 ${CONTACT.location}</span>
      </div>
    </div>
    <nav class="main-nav" aria-label="Main">
      <div class="container">
        <a href="${link('index.html')}" class="brand">
          <span class="brand-name">RIS<span>C</span></span>
        </a>
        <button class="nav-toggle" aria-label="Toggle menu" aria-expanded="false" aria-controls="navLinks">☰</button>
        <ul class="nav-links" id="navLinks">${navItems}</ul>
      </div>
    </nav>`;

  const footer = `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div>
            <h4>Riara International Student Centre</h4>
            <p>A welcome hub for Riara University's international students, built to make your transition easier.</p>
          </div>
          <div>
            <h4>Quick Links</h4>
            <ul>
              <li><a href="${link('before-you-arrive.html')}">Before you arrive</a></li>
              <li><a href="${link('immigration.html')}">Immigration</a></li>
              <li><a href="${link('living-in-kenya.html')}">Living in Kenya</a></li>
              <li><a href="${link('events.html')}">Events</a></li>
              <li><a href="${link('community.html')}">Community</a></li>
            </ul>
          </div>
          <div>
            <h4>Contact</h4>
            <ul>
              <li><a href="mailto:${CONTACT.email}">${CONTACT.email}</a></li>
              <li><a href="tel:${CONTACT.phoneLink}">${CONTACT.phoneDisplay}</a></li>
              <li><a href="${WHATSAPP_COMMUNITY}" target="_blank" rel="noopener">WhatsApp community</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          &copy; ${new Date().getFullYear()} Riara University — International Student Support. Built by the Office of the International Student Leader.
        </div>
      </div>
    </footer>`;

  // The header slot sits above this script, so it already exists.
  const headerSlot = document.getElementById('site-header');
  if (headerSlot) headerSlot.outerHTML = header;

  // The footer slot is further down the page, so wait for it.
  function renderFooter() {
    const footerSlot = document.getElementById('site-footer');
    if (footerSlot) footerSlot.outerHTML = footer;
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderFooter);
  } else {
    renderFooter();
  }

  // Shared values other scripts can use (e.g. the WhatsApp link on Home)
  window.RISC = { ROOT, CONTACT, WHATSAPP_COMMUNITY };
})();
