import { useState } from 'react';
import { Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

import { useToast } from './ui/Toast';
import { supabase } from '../lib/superbase';

export function EmailVerificationBanner() {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [resending, setResending] = useState(false);
    const [cooldown, setCooldown] = useState(false);

    // Nothing to show once confirmed, or if we don't have a user yet.
    if (!user || user.email_confirmed_at) return null;

    async function handleResend() {
        if (!user?.email) return;
        setResending(true);
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email: user.email,
            options: {
                emailRedirectTo: `${window.location.origin}/install-nudge`,
            },
        });
        setResending(false);

        if (error) {
            showToast(error.message, { type: 'error' });
            return;
        }

        showToast('Confirmation email sent.', { type: 'success' });
        setCooldown(true);
        setTimeout(() => setCooldown(false), 30000);
    }

    return (
        <div className="bg-gold-stamp/10 border-b border-gold-stamp/20 px-6 py-3 flex items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2 text-ink">
                <Mail size={16} className="text-gold-stamp flex-shrink-0" />
                <span>Please verify your email to keep your account secure.</span>
            </div>
            <button
                onClick={handleResend}
                disabled={resending || cooldown}
                className="text-ember font-medium hover:underline flex-shrink-0 disabled:opacity-50 disabled:no-underline"
            >
                {cooldown ? 'Sent' : resending ? 'Sending...' : 'Resend'}
            </button>
        </div>
    );
}