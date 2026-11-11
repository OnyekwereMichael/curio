// Supabase's email-confirmation-link and OAuth redirects both go through a
// server-side allow-list (Authentication > URL Configuration) and, for this
// project, land directly on /home regardless of the emailRedirectTo/
// redirectTo value passed in code — confirmed by testing, not just a guess.
// Rather than depend on that dashboard config matching whatever path we
// pick, signup/Splash drop a breadcrumb here right before the real
// signUp/signInWithOAuth call. <ProtectedRoute> — which every real page in
// the app sits behind, including wherever Supabase's redirect actually
// lands — checks it on every mount and forwards fresh signups into
// onboarding before rendering the originally-requested page.
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
