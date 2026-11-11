import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { X, AlertCircle } from 'lucide-react';
import { Otter } from '../../components/Otter';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/superbase';

/**
 * The redesign's minimal splash/entry screen — sits in front of the real
 * signup and login forms. "Get started" and "Continue with Google" both
 * lead new users into the real signup flow (which continues into the
 * onboarding wizard); "Log in" goes straight to the real login form.
 */
export function SplashScreen() {
  const navigate = useNavigate();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleSignUp() {
    setError(null);
    setGoogleLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/onboarding/word-style` },
    });

    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
    // On success, the browser redirects away — no further action needed here.
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col font-ui">
      <header className="p-6 flex items-center justify-between max-w-md mx-auto w-full">
        <Link to="/" className="font-display font-semibold text-xl text-ink-900 tracking-tight">
          Curi
        </Link>
        <button
          onClick={() => navigate('/')}
          className="p-2 text-ink-500 hover:text-ink-900 transition-colors rounded-full hover:bg-ink-900/5"
          aria-label="Go back"
        >
          <X size={22} />
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-20 text-center">
        <div className="w-full max-w-sm flex flex-col items-center">
          <Otter mood="idle" size={150} breathe className="mb-2" />

          <h1 className="font-display text-6xl font-bold text-ink-900 tracking-tight mb-4">Curi</h1>

          <p className="text-ink-500 text-base leading-relaxed mb-10">
            Two minutes a day. Words and facts that actually stick.
          </p>

          {error && (
            <div className="mb-4 w-full p-3 rounded-control bg-red-50 border border-red-200 text-red-600 text-sm font-medium flex items-center gap-2 text-left">
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <Button onClick={() => navigate('/signup')} className="w-full mb-3">
            Get started
          </Button>

          <Button variant="secondary" onClick={handleGoogleSignUp} isLoading={googleLoading} className="w-full mb-6">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </Button>

          <p className="text-sm text-ink-900">
            I have an account ·{' '}
            <Link to="/login" className="text-ember-600 font-medium hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
