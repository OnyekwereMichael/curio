import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { peekFreshSignup, clearFreshSignup } from '../lib/pendingOnboarding';


export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    // Captured once per mount via a pure read (safe even if StrictMode's dev
    // double-render invokes this twice) — the actual localStorage clear
    // happens in the effect below, not here during render, so it can't be
    // silently undone by that double-invoke the way an in-render side
    // effect was.
    const [pendingOnboarding] = useState(peekFreshSignup);

    useEffect(() => {
        if (pendingOnboarding) clearFreshSignup();
    }, [pendingOnboarding]);

    if (loading) {
        return (
            <div className="min-h-screen bg-paper flex items-center justify-center">
                <p className="text-faded-ink text-sm">Loading...</p>
            </div>
        );
    }

    if (!user) return <Navigate to="/login" replace />;

    // Catches a fresh signup regardless of which protected route Supabase's
    // email-confirmation or OAuth redirect actually lands on — the exact
    // landing page isn't under our control (it depends on that project's
    // Authentication > URL Configuration), so this check has to live
    // somewhere every protected route passes through, not on one specific
    // page. See src/lib/pendingOnboarding.ts for why.
    if (pendingOnboarding && !location.pathname.startsWith('/onboarding')) {
        return <Navigate to="/onboarding/word-style" replace />;
    }

    return <>{children}</>;
}
