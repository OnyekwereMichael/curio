import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { AlertCircleIcon, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

import { urlBase64ToUint8Array } from '../../lib/utils';
import { usePlatform } from '../../lib/usePlatform';
import { useToast } from '../../components/ui/Toast';
import { supabase } from '../../lib/superbase';
import logo from '../../../public/icon-192.png'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export function NotificationPermission() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { platform, isStandalone } = usePlatform();
  const [isGranted, setIsGranted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const isIosNonStandalone = platform === 'ios' && !isStandalone;

  const completeNotificationStep = () => {
    localStorage.setItem('notification_prompted', 'true');
    navigate('/home', { replace: true });
  };

  async function updateNotificationPreference(enabled: boolean) {
    if (!user) return;
    const { error } = await supabase
      .from('users')
      .update({ notifications_enabled: enabled })
      .eq('id', user.id);

    if (error) console.error('Failed to update notifications preference:', error.message);
  }

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
      console.error('Failed to create push subscription:', err);
      await updateNotificationPreference(true);
    }
  }

  const handleNotificationGranted = async () => {
    setIsGranted(true);
    await createAndSavePushSubscription();
    setTimeout(() => {
      completeNotificationStep();
    }, 1200);
  };

  const handleNotificationDenied = async () => {
    await updateNotificationPreference(false);
    completeNotificationStep();
  };

  const handleEnableClick = async () => {
    if (isIosNonStandalone) {
      showToast('To enable notifications on iPhone, add this app to your Home Screen first.');
      return;
    }

    if (!('Notification' in window)) {
      showToast('Your browser does not support push notifications.');
      return;
    }

    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        showToast('Push notifications enabled!');
        await handleNotificationGranted();
      } else {
        showToast('Notification permission denied by browser.');
      }
    } catch {
      Notification.requestPermission((permission) => {
        if (permission === 'granted') {
          showToast('Push notifications enabled!');
          handleNotificationGranted();
        } else {
          showToast('Notification permission denied by browser.');
        }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col font-ui text-ink">
      <main className="flex-1 flex flex-col justify-center items-center pb-14 pt-14 max-sm:px-6">
        <div className="w-full max-w-xl flex flex-col h-full">

          <div className="flex-1 flex flex-col justify-center">

            {!isGranted ? (
              <>
                <div className="mb-10">
                  <div className="bg-white rounded-2xl border border-ink/10 shadow-sm p-4 mx-auto  animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-ember flex items-center justify-center flex-shrink-0 text-white font-display font-bold text-sm">
                        <img src={logo} alt="Curi Logo" className="w-9 h-9 rounded-lg" />
                      </div>
                      <div className="min-w-0 flex-1 font-display">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-xs font-semibold text-black ">Curi</span>
                          <span className="text-[11px] text-black/50 flex-shrink-0">now</span>
                        </div>
                        <p className="text-sm font-medium text-black mt-0.5 leading-snug">
                          Today's word is ready: sonder
                        </p>
                        <p className="text-xs text-black mt-0.5 leading-snug">
                          Tap to read it, takes about a minute.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center mb-5 font-display">
                  <h1 className="font-display text-[20px] font-bold text-ink mb-3 leading-8 max-sm:text-[17px]">
                    This is what you'll see, once a day, right when your word and facts are ready.
                  </h1>
                  <p className="font-display text-[20px] leading-tight font-bold text-ink mb-3 flex items-center justify-center gap-2 text-center max-sm:text-[17px]">
                    <AlertCircleIcon className="w-5 h-5 text-red-500 shrink-0" />
                    <span>Just one reminder a day, not more.</span><AlertCircleIcon className="w-5 h-5 text-red-500 shrink-0" />
                  </p>
                </div>

                <div className="flex flex-col gap-3 mb-2 mx-auto w-full">
                  <div className="flex items-start gap-3 text-base text-ink font-display">
                    <span className="w-1.5 h-1.5 rounded-full bg-ink flex-shrink-0 mt-1.5" />
                    <span>It's the easiest way to actually keep your streak and also stay consistent</span>
                  </div>
                  <div className="flex items-start gap-3 text-base text-ink font-display">
                    <span className="w-1.5 h-1.5 rounded-full bg-ink flex-shrink-0 mt-1.5" />
                    <span>You can turn it off anytime in Settings, no hard feelings</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center text-center">
                <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl flex items-center justify-center gap-2 border border-emerald-100 animate-in fade-in zoom-in duration-300 mb-4">
                  <Check size={20} />
                  <span className="font-medium text-sm">Notifications enabled</span>
                </div>
                <p className="text-ink text-sm px-4">
                  You're set — your next word will find you.
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4 mt-10">
            {!isGranted ? (
              <>
                <Button onClick={handleEnableClick} isLoading={loading} className="w-full font-display text-ink">
                  Turn on my daily reminder
                </Button>

                <button
                  onClick={handleNotificationDenied}
                  className="text-faded-ink text-sm font-display font-medium hover:text-ink transition-colors py-3"
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