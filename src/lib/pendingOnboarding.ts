// Supabase's email-confirmation-link and OAuth redirects both go through a
// server-side allow-list — pointing emailRedirectTo/redirectTo at a brand
// new path (like /onboarding/word-style) silently falls back to the
// project's Site URL if that exact path isn't allow-listed there, which
// looks like "onboarding never shows, it just goes to home."
//
// To avoid depending on that Supabase dashboard config at all, signup
// keeps using the already-allow-listed /install-nudge as the redirect
// target, and leaves a breadcrumb here beforehand. install-nudge checks
// it on mount and forwards fresh signups into onboarding itself.
const KEY = 'curi_fresh_signup';

export function markFreshSignup() {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    // ignore
  }
}

// Pure read — safe to call from a useState lazy initializer, which React
// (StrictMode, in dev) may invoke more than once.
export function peekFreshSignup(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function clearFreshSignup() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
