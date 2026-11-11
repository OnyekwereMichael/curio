import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { peekFreshSignup, clearFreshSignup } from '../lib/pendingOnboarding';


export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const location = useLocation();

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
    if (!location.pathname.startsWith('/onboarding') && peekFreshSignup()) {
        clearFreshSignup();
        return <Navigate to="/onboarding/word-style" replace />;
    }

    return <>{children}</>;
}
