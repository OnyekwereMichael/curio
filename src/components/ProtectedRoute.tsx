import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { peekFreshSignup, consumeFreshSignup } from '../lib/pendingOnboarding';


export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    // Derived fresh every render from current (not-yet-mutated) state, so
    // this agrees across React StrictMode's dev double-render. The actual
    // one-time "don't redirect again" latch is flipped in the effect below,
    // not here — see src/lib/pendingOnboarding.ts for why that split matters.
    //
    // Gated on `!loading && !!user`: peekFreshSignup() must not even be
    // called while auth is still resolving, or the effect below consumes
    // the one-shot flag during that loading render — before this component
    // ever gets to act on it — and the "real" render once auth resolves
    // just sees it already gone.
    const shouldEnterOnboarding =
        !loading && !!user && !location.pathname.startsWith('/onboarding') && peekFreshSignup();

    useEffect(() => {
        if (shouldEnterOnboarding) consumeFreshSignup();
    }, [shouldEnterOnboarding]);

    if (loading) {
        return (
            <div className="min-h-screen bg-paper flex items-center justify-center">
                <p className="text-faded-ink text-sm">Loading...</p>
            </div>
        );
    }

    if (!user) return <Navigate to="/login" replace />;

    // Catches a fresh signup regardless of which protected route Supabase's
    // email-confirmation or OAuth redirect actually lands on.
    if (shouldEnterOnboarding) return <Navigate to="/onboarding/word-style" replace />;

    return <>{children}</>;
}
