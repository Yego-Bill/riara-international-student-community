/* ==========================================================================
   Supabase connection settings
   --------------------------------------------------------------------------
   The URL and publishable key are MEANT to be public — every visitor's
   browser needs them. Security comes from the rules in supabase/setup.sql.

   NEVER put the "secret" / "service_role" key in this file or anywhere in
   the website. It bypasses every rule.
   ========================================================================== */

window.RISC_CONFIG = {
  SUPABASE_URL: 'https://vfrogxxwnlwsikgboiqx.supabase.co',
  SUPABASE_KEY: 'sb_publishable_q4XusKc9aUQMhHKv_q5q1Q_TB44lDqJ',

  // Only these emails can sign up as students (also enforced by the database).
  STUDENT_EMAIL_DOMAIN: 'stu.riarauniversity.ac.ke',

  // While true, every portal page shows the pilot-test banner.
  // Set to false when real applications start.
  PILOT_MODE: true,
};
