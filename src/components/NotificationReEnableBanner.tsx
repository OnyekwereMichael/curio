import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/superbase';

export function NotificationReEnableBanner() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [show, setShow] = useState(false);

    useEffect(() => {
        const wasPrompted = localStorage.getItem('notification_prompted') === 'true';
        if (!user || !wasPrompted) return;

        async function checkStatus() {
            const { data } = await supabase
                .from('users')
                .select('notifications_enabled')
                .eq('id', user.id)
                .maybeSingle();

            if (data && data.notifications_enabled === false) {
                setShow(true);
            }
        }

        checkStatus();
    }, [user]);

    if (!show) return null;

    return (
        <div className="bg-white border-b border-ink/10 px-4 py-3 flex items-center gap-3 shadow-sm font-ui">
            <div className="w-9 h-9 rounded-full bg-gold-stamp/10 flex items-center justify-center flex-shrink-0">
                <BellOff size={16} className="text-gold-stamp" />
            </div>

            <div className="flex flex-col flex-1 min-w-0">
                <h3 className="font-semibold text-ink text-sm leading-tight font-display">Push Notification is off</h3>
                <p className="text-xs text-faded-ink mt-0.5 truncate font-display">Turn it back on so you never miss your daily word</p>
            </div>

            <button
                onClick={() => navigate('/settings')}
                className="text-xs font-medium text-ember hover:text-ember/80 transition-colors whitespace-nowrap flex-shrink-0 px-3 py-2"
            >
                Enable
            </button>
        </div>
    );
}