/* ==========================================================================
   Staff access (preview)
   One place that lists which accounts count as staff. Used by the shared
   sign-in page and by the staff dashboard.
   ========================================================================== */

const STAFF_SESSION_KEY = 'riara-preview-staff-email';

// Accounts that open the staff dashboard after signing in.
// Replace the Front Office address with Kelvin's own once it is confirmed.
const STAFF_ALLOWLIST = [
  'internationalstudents@riarauniversity.ac.ke',
  'frontoffice@riarauniversity.ac.ke',
  'dos@riarauniversity.ac.ke'
];

function isStaffEmail(email) {
  return STAFF_ALLOWLIST.indexOf(String(email).trim().toLowerCase()) !== -1;
}