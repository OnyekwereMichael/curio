import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { supabase } from '../../lib/superbase';

export function CheckEmailScreen() {
    const location = useLocation();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const email = (location.state as { email?: string } | null)?.email;
    const [resending, setResending] = useState(false);
    const [cooldown, setCooldown] = useState(false);

    // If someone lands here directly without an email in state (e.g. refreshed
    // the page), there's nothing useful to show — send them back to sign up.
    if (!email) {
        return (
            <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6 text-center">
                <p className="text-faded-ink text-sm mb-4">We couldn't find that session.</p>
                <Link to="/signup" className="text-ember font-medium hover:underline text-sm">
                    Back to sign up
                </Link>
            </div>
        );
    }

    async function handleResend() {
        if (!email) return;
        setResending(true);
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email,
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
        setTimeout(() => setCooldown(false), 30000); // simple 30s resend cooldown
    }

    return (
        <div className="min-h-screen bg-paper flex flex-col font-ui text-ink">
            <header className="p-6 max-w-lg mx-auto w-full">
                <button
                    onClick={() => navigate('/signup')}
                    className="flex items-center gap-2 text-faded-ink hover:text-ink transition-colors text-sm"
                >
                    <ArrowLeft size={16} />
                    Back
                </button>
            </header>

            <main className="flex-1 flex flex-col justify-center items-center px-6 pb-20 text-center">
                <div className="w-full max-w-md">
                    <div className="w-14 h-14 rounded-full bg-ember/10 flex items-center justify-center mx-auto mb-6">
                        <Mail size={26} className="text-ember" />
                    </div>

                    <h1 className="font-display text-3xl font-bold text-ink mb-3">Check your email</h1>
                    <p className="text-faded-ink text-sm leading-relaxed mb-1">
                        We sent a confirmation link to
                    </p>
                    <p className="text-ink font-medium text-sm mb-8">{email}</p>
                    <p className="text-faded-ink text-sm leading-relaxed mb-8">
                        Click the link in that email to activate your account. Once confirmed, come back and log in.
                    </p>

                    <Button
                        variant="secondary"
                        className="w-full mb-4"
                        onClick={handleResend}
                        isLoading={resending}
                        disabled={cooldown}
                        type="button"
                    >
                        {cooldown ? 'Email sent — try again shortly' : 'Resend confirmation email'}
                    </Button>

                    <p className="text-sm text-ink">
                        Already confirmed? <Link to="/login" className="text-ember font-medium hover:underline">Log in</Link>
                    </p>
                </div>
            </main>
        </div>
    );
}