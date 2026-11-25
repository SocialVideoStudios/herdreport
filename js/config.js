/* Paste your Supabase project URL and anon (public) key here to switch from demo mode to real accounts.
   Both values are safe to publish: the database rules in supabase/schema.sql control who can see what. */
window.HR_CONFIG = {
  supabaseUrl: "",
  supabaseAnonKey: ""
};

/* Load the database library only when keys are set; demo mode skips it so pages load faster. */
if (window.HR_CONFIG.supabaseUrl && window.HR_CONFIG.supabaseAnonKey) {
  document.write('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"><\/script>');
}
