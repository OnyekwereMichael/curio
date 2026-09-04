import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';


export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-paper flex items-center justify-center">
                <p className="text-faded-ink text-sm">Loading...</p>
            </div>
        );
    }

    if (!user) return <Navigate to="/login" replace />;

    return <>{children}</>;
}