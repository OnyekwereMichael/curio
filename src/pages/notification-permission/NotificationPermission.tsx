import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/superbase';
import { urlBase64ToUint8Array } from '../../lib/utils';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

const BellIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-ember mx-auto mb-6">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

export function NotificationPermission() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isGranted, setIsGranted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Completion handoff
  const completeNotificationStep = () => {
    localStorage.setItem('notification_prompted', 'true');
    navigate('/home', { replace: true });
  };

  // Persists notification preference only (used for the denied/not-now path)
  async function updateNotificationPreference(enabled: boolean) {
    if (!user) return;
    const { error } = await supabase
      .from('users')
      .update({ notifications_enabled: enabled })
      .eq('id', user.id);

    if (error) console.error('Failed to update notifications preference:', error.message);
  }

  // Creates a real push subscription and saves both the preference and the
  // subscription token together, in one write.
  async function createAndSavePushSubscription() {
    if (!user) return;

    try {
      const registration = await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const { error } = await supabase
        .from('users')
        .update({
          notifications_enabled: true,
          notification_token: subscription.toJSON(),
        })
        .eq('id', user.id);

      if (error) console.error('Failed to save push subscription:', error.message);
    } catch (err) {
      // Permission was granted but the subscription itself failed (e.g. no
      // active service worker yet, or a bad VAPID key). Still record that
      // permission was granted so we don't silently lose that signal — the
      // token just stays empty until a future visit successfully subscribes.
      console.error('Failed to create push subscription:', err);
      await updateNotificationPreference(true);
    }
  }

  // Handle "granted"
  const handleNotificationGranted = async () => {
    setIsGranted(true);
    await createAndSavePushSubscription();
    setTimeout(() => {
      completeNotificationStep();
    }, 1200);
  };

  // Handle "denied" or "Not now"
  const handleNotificationDenied = async () => {
    await updateNotificationPreference(false);
    completeNotificationStep();
  };

  // Permission request logic
  const handleEnableClick = async () => {
    if (!('Notification' in window)) {
      await handleNotificationDenied();
      return;
    }

    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        await handleNotificationGranted();
      } else {
        await handleNotificationDenied();
      }
    } catch {
      // Fallback for older browsers that use callbacks
      Notification.requestPermission((permission) => {
        if (permission === 'granted') {
          handleNotificationGranted();
        } else {
          handleNotificationDenied();
        }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col font-ui text-ink">
      <main className="flex-1 flex flex-col justify-center items-center px-6 pb-20 pt-12">
        <div className="w-full max-w-md flex flex-col h-full text-center">

          {/* Main content */}
          <div className="flex-1 flex flex-col justify-center">
            <BellIcon />
            <div className="mb-8">
              <h1 className="font-display text-3xl font-bold text-ink mb-2 leading-tight">
                Never miss your daily word
              </h1>
              <p className="text-faded-ink text-sm">
                We'll send one gentle reminder a day — nothing more.
              </p>
            </div>

            {isGranted && (
              <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl flex items-center justify-center gap-2 border border-emerald-100 animate-in fade-in zoom-in duration-300">
                <Check size={20} />
                <span className="font-medium text-sm">Notifications enabled</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4 mt-auto">
            {!isGranted ? (
              <>
                <Button onClick={handleEnableClick} isLoading={loading} className="w-full">
                  Enable Notifications
                </Button>

                <button
                  onClick={handleNotificationDenied}
                  className="text-faded-ink text-sm font-medium hover:text-ink transition-colors py-3"
                >
                  Not now
                </button>
              </>
            ) : (
              <Button onClick={completeNotificationStep} className="w-full">
                Continue to Home
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}