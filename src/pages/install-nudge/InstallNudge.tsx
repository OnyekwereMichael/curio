import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { usePlatform } from '../../lib/usePlatform';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/superbase';

const SafariShareIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ember inline mx-1 translate-y-[-2px]">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

export function InstallNudge() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { platform, installPromptEvent } = usePlatform();

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

  // Skip handling -> directly to Home
  const handleSkipInstall = async () => {
    await markInstalled(false);
    navigate('/home');
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
    <div className="min-h-screen bg-paper flex flex-col font-ui text-ink">
      <main className="flex-1 flex flex-col justify-center items-center px-6 pb-20 pt-12">
        <div className="w-full max-w-md flex flex-col h-full">
          {/* Step 1: Static screen shell */}
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-bold text-ink mb-2 leading-tight">
              Install Curio to get your daily word and fact
            </h1>
            <p className="text-faded-ink text-sm">
              So your streak — and your reminders — actually work.
            </p>
          </div>

          {/* Content Area */}
          <div className="mb-10 min-h-[120px] flex flex-col justify-center">
            {platform === 'android' && installPromptEvent && (
              <div className="text-center bg-white rounded-2xl p-6 shadow-sm border border-ink/5">
                <p className="text-ink font-medium">Tap Install below to add Curio to your home screen.</p>
              </div>
            )}

            {platform === 'android' && !installPromptEvent && (
              <div className="flex flex-col gap-4 bg-white rounded-2xl p-6 shadow-sm border border-ink/5">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-ink/5 flex items-center justify-center flex-shrink-0 text-ink font-semibold text-sm">
                    1
                  </div>
                  <p className="text-ink text-sm leading-snug pt-1">
                    Tap the menu icon (<strong>⋮</strong>) in your browser.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-ink/5 flex items-center justify-center flex-shrink-0 text-ink font-semibold text-sm">
                    2
                  </div>
                  <p className="text-ink text-sm leading-snug pt-1">
                    Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                  </p>
                </div>
              </div>
            )}

            {platform === 'ios' && (
              <div className="flex flex-col gap-5 bg-white rounded-2xl p-6 shadow-sm border border-ink/5">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-ink/5 flex items-center justify-center flex-shrink-0 text-ink font-semibold">
                    1
                  </div>
                  <p className="text-black text-sm leading-tight pt-1.5 flex items-center flex-wrap gap-1">
                    Tap the <SafariShareIcon /> Share icon in Safari.
                  </p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-ink/5 flex items-center justify-center flex-shrink-0 text-ink font-semibold">
                    2
                  </div>
                  <p className="text-black text-sm leading-tight pt-1.5">
                    Scroll down and tap <strong>"Add to Home Screen."</strong>
                  </p>
                </div>
              </div>
            )}

            {platform === 'other' && !installPromptEvent && (
              <div className="flex flex-col gap-4 bg-white rounded-2xl p-6 shadow-sm border border-ink/5">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-ink/5 flex items-center justify-center flex-shrink-0 text-ink font-semibold text-sm">
                    1
                  </div>
                  <p className="text-ink text-sm leading-snug pt-1">
                    Click the <strong>Install icon (⊕)</strong> in your browser address bar or menu.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-ink/5 flex items-center justify-center flex-shrink-0 text-ink font-semibold text-sm">
                    2
                  </div>
                  <p className="text-ink text-sm leading-snug pt-1">
                    Click <strong>"Install"</strong> to add Curio to your device.
                  </p>
                </div>
              </div>
            )}

            {platform === 'other' && installPromptEvent && (
              <div className="text-center bg-white rounded-2xl p-6 shadow-sm border border-ink/5">
                <p className="text-ink font-medium">Click Install below to add Curio to your device.</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4 mt-auto">
            {installPromptEvent ? (
              <Button onClick={handleInstallClick} className="w-full">
                Install
              </Button>
            ) : platform === 'ios' ? (
              <Button onClick={completeOnboardingStep} className="w-full">
                Got it
              </Button>
            ) : (
              <Button onClick={completeOnboardingStep} className="w-full">
                Continue
              </Button>
            )}

            <button
              onClick={handleSkipInstall}
              className="text-faded-ink text-sm font-medium hover:text-ink transition-colors py-3"
            >
              Skip for now
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}