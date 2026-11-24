# Riara International Student Centre (RISC) website

A welcome hub for Riara University's international students. Plain HTML, CSS
and JavaScript — no framework, no build step. Hosted on Netlify from GitHub.

## Pages

| Section | File | What's on it |
|---|---|---|
| Home | `index.html` | Journey cards, announcement banner, next events, WhatsApp community |
| Before you arrive | `before-you-arrive.html` | Pre-arrival checklist, Student Pass timing, travel, accommodation |
| Immigration | `immigration.html` | Pass tabs (requirements, renewals, forms), how we can help, current students, FAQs |
| Living in Kenya | `living-in-kenya.html` | Arriving, first-week checklist, settling-in topics, guides |
| Contact | `contact.html` | Contacts, emergency numbers, general FAQs |
| Events (not in menu) | `events.html` | Full events list, linked from Home |
| Community (not in menu) | `community.html` | WhatsApp community details, linked from Home and footer |

`account.html`, `upload.html`, `status.html` and `staff.html` are the online
application preview. They are being rebuilt with a real database (Supabase).

## Where to change things

- **Menu, top contact bar, footer:** `js/layout.js` — edit once, every page updates.
- **Colours, fonts, spacing:** the top of `css/Full_style.css`.
- **Downloadable PDFs:** put them in `assets/Documents/`, then replace the
  "Coming soon" button on the page with a Download link (each one has a TODO).
- **Old addresses** (`get-started.html`, `resources.html`, `downloads.html`)
  redirect to the new pages — see `_redirects`.

## Every new page

```html
<body data-page="immigration">          <!-- highlights the menu item -->
<div id="site-header"></div>
<script src="js/layout.js"></script>
  ... content ...
<div id="site-footer"></div>
<script src="js/main.js"></script>
</body>
```

## Finding unfinished content

Search the project for `TODO` (missing info) and `DRAFT` (written but needs
checking against real practice).

## Running locally

Open the folder in VS Code and use **Live Server**. If styling looks stuck,
restart Live Server rather than just refreshing.
