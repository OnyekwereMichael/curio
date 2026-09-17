import { useState, useEffect } from 'react';
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

  useEffect(() => {
    async function checkExistingStatus() {
      if (!user) return;
      const { data } = await supabase
        .from('users')
        .select('notifications_enabled')
        .eq('id', user.id)
        .maybeSingle();

      if (data && data.notifications_enabled === true) {
        completeNotificationStep();
      }
    }
    checkExistingStatus();
  }, [user]);

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
      // Do NOT mark notifications_enabled=true without a token —
      // that causes the user to appear opted-in but never receive anything.
      // Just silently skip; the user can retry from Settings.
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
    // Reverted back to safe behavior: don't ask browser, just update DB to false
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
        <div className="w-full max-w-md flex flex-col h-full">

          <div className="flex-1 flex flex-col justify-center">

            {!isGranted ? (
              <>
                {/* Visual Lock Screen Mockup */}
                <div className="mb-8 relative perspective-1000">
                  <div className="absolute inset-0 bg-gradient-to-br from-ember/20 to-gold-stamp/20 blur-3xl -z-10 rounded-full animate-pulse" />
                  
                  <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out hover:scale-[1.02] transition-transform">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl shadow-sm flex items-center justify-center flex-shrink-0 overflow-hidden">
                        <img src={logo} alt="Curi Logo" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1 font-display">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[13px] font-semibold text-ink">Curi</span>
                          <span className="text-[11px] text-faded-ink">now</span>
                        </div>
                        <p className="text-[14px] font-semibold text-ink leading-snug">
                          Your daily word is ready: Sonder
                        </p>
                        <p className="text-[13px] text-faded-ink mt-0.5 leading-snug truncate">
                          the realization that each random passerby has a life as vivid and complex as your own.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center mb-8">
                  <h1 className="font-display text-[26px] font-bold text-ink mb-3 leading-tight tracking-tight">
                    Never miss your daily spark
                  </h1>
                  <p className="font-display text-[16px] text-faded-ink leading-relaxed px-4">
                    Allow notifications so we can remind you when your daily word and facts are ready. 
                  </p>
                </div>

                <div className="flex flex-col gap-4 mb-4 mx-auto w-full bg-white rounded-2xl p-5 border border-ink/5 shadow-sm">
                  <div className="flex items-start gap-3 text-ink font-display">
                    <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <div>
                      <span className="block font-semibold text-[15px]">Keep your streak alive</span>
                      <span className="block text-[13px] text-faded-ink mt-0.5">The easiest way to stay consistent and build a learning habit.</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-ink font-display">
                    <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <AlertCircleIcon size={14} strokeWidth={2.5} />
                    </div>
                    <div>
                      <span className="block font-semibold text-[15px]">Zero spam. Just one reminder.</span>
                      <span className="block text-[13px] text-faded-ink mt-0.5">We only send you one notification a day, right when it's ready.</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center animate-in zoom-in duration-500 mb-6 shadow-sm border border-emerald-100">
                  <Check size={32} strokeWidth={2.5} />
                </div>
                <h2 className="font-display text-[24px] font-bold text-ink mb-2">You're all set!</h2>
                <p className="text-faded-ink text-[16px] px-4 font-display">
                  Your daily reminder is scheduled. Your next word will find you.
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 mt-10">
            {!isGranted ? (
              <>
                <Button onClick={handleEnableClick} isLoading={loading} className="w-full font-display text-[16px] py-4 shadow-md hover:shadow-lg transition-all">
                  Allow Notifications
                </Button>

                <button
                  onClick={handleNotificationDenied}
                  className="text-faded-ink text-[14px] font-display font-medium hover:text-ink transition-colors py-3"
                >
                  Skip for now
                </button>
              </>
            ) : (
              <Button onClick={completeNotificationStep} className="w-full font-display py-4">
                Continue to Home
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}