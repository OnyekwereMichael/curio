import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { usePlatform } from '../../lib/usePlatform';

// We need to capture the beforeinstallprompt event for Android
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const SafariShareIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ember inline mx-1 translate-y-[-2px]">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
    <polyline points="16 6 12 2 8 6"/>
    <line x1="12" y1="2" x2="12" y2="15"/>
  </svg>
);

export function InstallNudge() {
  const navigate = useNavigate();
  const { platform, isStandalone, isSafari } = usePlatform();
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  // Step 7: Guard against repeat display
  useEffect(() => {
    if (isStandalone) {
      navigate('/notification-permission', { replace: true });
    }
  }, [isStandalone, navigate]);

  // Step 3: Listen globally for beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPromptEvent(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // Step 6: Completion handoff
  const completeOnboardingStep = () => {
    // TODO: persist installed: true to users table in Supabase
    navigate('/notification-permission');
  };

  // Step 5: Skip handling
  const handleSkipInstall = () => {
    // TODO: persist installed=false to users table in Supabase — used later for email-digest fallback logic for users who never install
    navigate('/notification-permission');
  };

  const handleInstallClick = async () => {
    if (platform === 'android' && installPromptEvent) {
      installPromptEvent.prompt();
      const choiceResult = await installPromptEvent.userChoice;
      if (choiceResult.outcome === 'accepted') {
        completeOnboardingStep();
      }
    } else if (platform === 'ios') {
      completeOnboardingStep();
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
              <p className="text-ink font-medium">Tap Install to add Curio to your home screen.</p>
            </div>
          )}

          {platform === 'android' && !installPromptEvent && (
            <div className="text-center bg-white rounded-2xl p-6 shadow-sm border border-ink/5">
              <p className="text-faded-ink text-sm">Installation is handled by your browser.</p>
            </div>
          )}

          {platform === 'ios' && isSafari && (
            <div className="flex flex-col gap-5 bg-white rounded-2xl p-6 shadow-sm border border-ink/5">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-ink/5 flex items-center justify-center flex-shrink-0 text-ink font-semibold">
                  1
                </div>
                <p className="text-ink text-sm leading-tight pt-1.5 flex items-center flex-wrap gap-1">
                  Tap the <SafariShareIcon /> Share icon in Safari.
                </p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-ink/5 flex items-center justify-center flex-shrink-0 text-ink font-semibold">
                  2
                </div>
                <p className="text-ink text-sm leading-tight pt-1.5">
                  Scroll down and tap <strong>"Add to Home Screen."</strong>
                </p>
              </div>
            </div>
          )}

          {platform === 'ios' && !isSafari && (
            <div className="text-center bg-white rounded-2xl p-6 shadow-sm border border-ink/5">
              <p className="text-ink font-medium">Open this page in Safari to install.</p>
            </div>
          )}
          
          {platform === 'other' && (
            <div className="text-center bg-white rounded-2xl p-6 shadow-sm border border-ink/5">
              <p className="text-faded-ink text-sm">Install via your browser's menu to add to home screen.</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-4 mt-auto">
          {((platform === 'android' && installPromptEvent) || (platform === 'ios' && isSafari)) && (
            <Button onClick={handleInstallClick} className="w-full">
              {platform === 'ios' ? 'Got it' : 'Install'}
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
