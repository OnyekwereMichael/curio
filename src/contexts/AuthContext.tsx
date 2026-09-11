import { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import * as Sentry from '@sentry/react';
import posthog from 'posthog-js';
import { supabase } from '../lib/superbase';


type AuthContextType = {
    user: User | null;
    session: Session | null;
    loading: boolean;
};

const AuthContext = createContext<AuthContextType>({ user: null, session: null, loading: true });

async function updateLastSeen(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    const lastSeenDate = localStorage.getItem('last_seen_date');

    if (lastSeenDate !== today) {
        const { error } = await supabase
            .from('users')
            .update({ last_seen_at: new Date().toISOString() })
            .eq('id', userId);

        if (!error) {
            localStorage.setItem('last_seen_date', today);
        }
    }
}

function handleUserIdentity(session: Session | null) {
    if (session?.user) {
        Sentry.setUser({ id: session.user.id, email: session.user.email });
        posthog.identify(session.user.id, { email: session.user.email });
        updateLastSeen(session.user.id);
    } else {
        Sentry.setUser(null);
        posthog.reset();
    }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            handleUserIdentity(session);
            setLoading(false);
        });

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            handleUserIdentity(session);
        });

        return () => listener.subscription.unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user: session?.user ?? null, session, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
