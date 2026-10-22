import { useNavigate } from 'react-router-dom';
import { useEffect, type ReactNode } from 'react';
import { Smartphone, Bell, Flame } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { usePlatform } from '../../lib/usePlatform';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/superbase';

const SafariShareIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="mx-1 inline -translate-y-px text-ember"
    aria-hidden="true"
  >
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

function Step({ number, children }: { number: number; children: ReactNode }) {
  return (
    <li className="flex items-start gap-4">
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-ember/10 font-display text-sm font-bold text-ember">
        {number}
      </span>
      <p className="pt-1 text-sm leading-relaxed text-ink/80">{children}</p>
    </li>
  );
}

function StepsCard({ children }: { children: ReactNode }) {
  return (
    <ol className="flex flex-col gap-5 rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
      {children}
    </ol>
  );
}

function PromptCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-6 text-center shadow-sm">
      <p className="text-sm leading-relaxed text-ink/80">{children}</p>
    </div>
  );
}

export function InstallNudge() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { platform, installPromptEvent, isStandalone } = usePlatform();

  // Fire welcome email for all signup paths (email+password AND Google OAuth).
  // The edge function's idempotency guard (welcome_email_sent_at) prevents double-sends.
  useEffect(() => {
    if (!user) return;
    supabase.functions.invoke('send-welcome-email', {
      body: {
        userId: user.id,
        email: user.email,
        firstName: user.user_metadata?.full_name ?? user.user_metadata?.name ?? '',
      },
    }).catch(console.error);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isStandalone) {
      if (user) {
        supabase.from('users').update({ installed: true }).eq('id', user.id).then(() => {
          navigate('/notification-permission', { replace: true });
        });
      } else {
        navigate('/notification-permission', { replace: true });
      }
    }
  }, [isStandalone, navigate, user]);

  // Persists the installed flag to Supabase for this user
  async function markInstalled(installed: boolean) {
    if (!user) return;
    const { error } = await supabase
      .from('users')
      .update({ installed })
      .eq('id', user.id);

    if (error) console.error('Failed to update installed status:', error.message);
  }

  // Next step in the onboarding flow -> Notification Permission
  const completeOnboardingStep = async () => {
    await markInstalled(true);
    navigate('/notification-permission');
  };

  // Skip handling -> directly to Notification Permission
  const handleSkipInstall = async () => {
    await markInstalled(false);
    navigate('/notification-permission');
  };

  const handleInstallClick = async () => {
    if (installPromptEvent) {
      installPromptEvent.prompt();
      const choiceResult = await installPromptEvent.userChoice;
      if (choiceResult.outcome === 'accepted') {
        await completeOnboardingStep();
      }
    } else {
      await completeOnboardingStep();
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-paper font-ui text-ink">
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="flex w-full max-w-md flex-col gap-8">
          {/* Header */}
          <header className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-ember/10 text-ember">
              <Smartphone size={30} aria-hidden="true" />
            </div>

            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink max-sm:text-[26px]">
              Install Curi to get your daily word and fact
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-faded-ink">
              So your streak and your reminders actually work.
            </p>

            <ul className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <li className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3 py-1.5 text-xs font-medium text-ink/80">
                <Bell size={13} className="text-ember" aria-hidden="true" />
                Daily reminders
              </li>
              <li className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3 py-1.5 text-xs font-medium text-ink/80">
                <Flame size={13} className="text-ember" aria-hidden="true" />
                Keep your streak
              </li>
            </ul>
          </header>

          {/* Instructions */}
          <section aria-label="How to install">
            {/* Android: automatic prompt available */}
            {platform === 'android' && installPromptEvent && (
              <PromptCard>Tap <strong className="text-ink">Install</strong> below to add Curi to your home screen.</PromptCard>
            )}

            {/* Android: manual steps */}
            {platform === 'android' && !installPromptEvent && (
              <StepsCard>
                <Step number={1}>
                  Tap the menu icon (<strong className="text-ink">⋮</strong>) in your browser.
                </Step>
                <Step number={2}>
                  Tap <strong className="text-ink">"Install app"</strong> or{' '}
                  <strong className="text-ink">"Add to Home screen"</strong>.
                </Step>
              </StepsCard>
            )}

            {/* iOS: Safari steps */}
            {platform === 'ios' && (
              <StepsCard>
                <Step number={1}>
                  Tap the <SafariShareIcon /> <strong className="text-ink">Share</strong> icon in Safari.
                </Step>
                <Step number={2}>
                  Scroll down and tap <strong className="text-ink">"Add to Home Screen"</strong>.
                </Step>
                <Step number={3}>
                  Tap <strong className="text-ink">"Add"</strong> in the top-right corner to finish.
                </Step>
              </StepsCard>
            )}

            {/* Desktop / other: manual steps */}
            {platform === 'other' && !installPromptEvent && (
              <StepsCard>
                <Step number={1}>
                  Click the <strong className="text-ink">Install icon (⊕)</strong> in your browser address bar or menu.
                </Step>
                <Step number={2}>
                  Click <strong className="text-ink">"Install"</strong> to add Curi to your device.
                </Step>
              </StepsCard>
            )}

            {/* Desktop / other: automatic prompt available */}
            {platform === 'other' && installPromptEvent && (
              <PromptCard>
                Click <strong className="text-ink">Install</strong> below to add Curi to your device. Takes less than a minute.
              </PromptCard>
            )}
          </section>

          {/* Actions */}
          <div className="flex flex-col items-center gap-2">
            {installPromptEvent ? (
              <Button onClick={handleInstallClick} className="w-full font-display">
                Install
              </Button>
            ) : platform === 'ios' ? (
              <Button onClick={completeOnboardingStep} className="w-full font-display">
                Got it
              </Button>
            ) : (
              <Button onClick={completeOnboardingStep} className="w-full font-display">
                Continue
              </Button>
            )}

            <button
              type="button"
              onClick={handleSkipInstall}
              className="cursor-pointer rounded-lg px-4 py-3 text-sm font-medium text-faded-ink transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/40"
            >
              Skip for now
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}