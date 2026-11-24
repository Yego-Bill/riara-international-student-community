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

## Online application portal (`portal/`)

| Page | Who | What |
|---|---|---|
| `portal/sign-in.html` | everyone | Sign in / create account (Riara student emails only) |
| `portal/check-email.html`, `verified.html` | students | Email verification |
| `portal/forgot-password.html`, `reset-password.html` | everyone | Password reset |
| `portal/my-application.html` | students | Live status bar, office message, documents, history |
| `portal/apply.html` | students | Choose pass, upload documents, submit |
| `portal/staff.html` | staff | Applications, announcements, events |
| `portal/pilot-notice.html` | everyone | What the pilot collects and when it's deleted |

- **Database:** Supabase. `supabase/setup.sql` creates every table, security
  rule and the private file bucket — paste it into Supabase > SQL Editor and Run.
- **All database code** is in `js/api.js`. Pages never call Supabase directly.
- **Connection settings** are in `js/supabase-config.js` (public key only —
  never put the secret / service_role key in the website).
- **Pilot banner:** set `PILOT_MODE: false` in `js/supabase-config.js` when
  real applications start.
- **Staff:** listed in the `staff_emails` table (see the top of `setup.sql`).
- **Live content:** `js/site-data.js` loads announcements and events on the
  public pages, and saves checklist ticks for signed-in students.

## Where to change things

- **Menu, top contact bar, footer:** `js/layout.js` — edit once, every page updates.
- **Announcements and events:** from the staff dashboard, not the code.
- **Upload checklist and status names:** `DOC_CHECKLIST` and `STATUSES` in `js/api.js`.
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
