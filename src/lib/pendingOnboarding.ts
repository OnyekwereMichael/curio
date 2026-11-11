// Supabase's email-confirmation-link and OAuth redirects both go through a
// server-side allow-list (Authentication > URL Configuration) and, for this
// project, land directly on /home regardless of the emailRedirectTo/
// redirectTo value passed in code — confirmed by testing, not just a guess.
// Rather than depend on that dashboard config matching whatever path we
// pick, signup/Splash drop a breadcrumb here right before the real
// signUp/signInWithOAuth call. <ProtectedRoute> — which every real page in
// the app sits behind, including wherever Supabase's redirect actually
// lands — checks it on every render and forwards fresh signups into
// onboarding before rendering the originally-requested page.
const KEY = 'curi_fresh_signup';

export function markFreshSignup() {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    // ignore
  }
}

// `latched` makes the redirect fire AT MOST ONCE per real page load, no
// matter how many times <ProtectedRoute> re-renders or is reused across
// client-side route changes (it's the same component instance for every
// route — React doesn't remount it just because its children prop
// changes). Without this, once the flag was true for the first redirect
// into onboarding, it stayed true forever and every later attempt to
// navigate OUT of onboarding (e.g. "Start today's plan" -> /install-nudge)
// got bounced straight back — an infinite loop.
//
// peekFreshSignup is pure (no mutation) so it's safe to call directly
// during render, including React StrictMode's dev double-render.
// consumeFreshSignup does the actual mutation and must only be called
// from a useEffect, never from render, or StrictMode's double-invoke can
// silently discard the redirect (the exact bug this replaced).
let latched = false;

export function peekFreshSignup(): boolean {
  if (latched) return false;
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function consumeFreshSignup() {
  latched = true;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
