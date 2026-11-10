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
import { Otter } from '../../components/Otter';

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

      const { data: dbUser } = await supabase
        .from('users')
        .select('notification_token')
        .eq('id', user.id)
        .single();

      const dbTokens = Array.isArray(dbUser?.notification_token) 
          ? dbUser!.notification_token 
          : (dbUser?.notification_token ? [dbUser.notification_token] : []);

      const subJson = subscription.toJSON();
      const endpointExists = dbTokens.some((t: any) => t.endpoint === subJson.endpoint);
      const newTokens = endpointExists ? dbTokens : [...dbTokens, subJson];

      const { error } = await supabase
        .from('users')
        .update({
          notifications_enabled: true,
          notification_token: newTokens,
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
    <div className="min-h-screen bg-paper flex flex-col font-ui text-ink-900">
      <main className="flex-1 flex flex-col justify-center items-center pb-14 pt-14 max-sm:px-6">
        <div className="w-full max-w-md flex flex-col h-full">

          <div className="flex-1 flex flex-col justify-center">

            {!isGranted ? (
              <>
                <Otter mood="idle" size={88} breathe className="mx-auto mb-6" />

                <div className="text-center mb-8">
                  <h1 className="font-display text-display font-bold text-ink-900 mb-3 leading-tight tracking-tight">
                    Can I tap you on the shoulder?
                  </h1>
                  <p className="text-[16px] text-ink-500 leading-relaxed px-4 font-ui">
                    One ping when your daily word is ready, and one gentle nudge in the evening only if you haven't played. That's it.
                  </p>
                </div>

                {/* Notification preview */}
                <div className="mb-8 relative perspective-1000">
                  <div className="absolute inset-0 bg-gradient-to-br from-ember-500/20 to-gold-500/20 blur-3xl -z-10 rounded-full animate-pulse" />

                  <div className="bg-surface/90 backdrop-blur-md rounded-card border border-line shadow-raised p-4 mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out hover:scale-[1.02] transition-transform">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-control shadow-card flex items-center justify-center flex-shrink-0 overflow-hidden">
                        <img src={logo} alt="Curi Logo" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1 font-ui">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[13px] font-semibold text-ink-900">Curi</span>
                          <span className="text-[11px] text-ink-500">8:00 AM</span>
                        </div>
                        <p className="text-[14px] font-semibold text-ink-900 leading-snug">
                          Today's word is a strange one. Come see.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4 mb-4 mx-auto w-full bg-surface rounded-card p-5 border border-line shadow-card">
                  <div className="flex items-start gap-3 text-ink-900 font-ui">
                    <div className="w-6 h-6 rounded-full bg-moss-50 text-moss-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <div>
                      <span className="block font-semibold text-[15px]">Keep your streak alive</span>
                      <span className="block text-[13px] text-ink-500 mt-0.5">The easiest way to stay consistent and build a learning habit.</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-ink-900 font-ui">
                    <div className="w-6 h-6 rounded-full bg-gold-50 text-gold-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <AlertCircleIcon size={14} strokeWidth={2.5} />
                    </div>
                    <div>
                      <span className="block font-semibold text-[15px]">Zero spam. Just one reminder.</span>
                      <span className="block text-[13px] text-ink-500 mt-0.5">We only send you one notification a day, right when it's ready.</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center text-center">
                <Otter mood="proud" size={88} className="mb-4" />
                <h2 className="font-display text-title font-bold text-ink-900 mb-2">You're all set!</h2>
                <p className="text-ink-500 text-[16px] px-4 font-ui">
                  Your daily reminder is scheduled. Your next word will find you.
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 mt-10">
            {!isGranted ? (
              <>
                <Button onClick={handleEnableClick} isLoading={loading} className="w-full text-[16px] py-4">
                  Turn on reminders
                </Button>

                <button
                  onClick={handleNotificationDenied}
                  className="text-ink-500 text-[14px] font-ui font-medium hover:text-ink-900 transition-colors py-3"
                >
                  Not now
                </button>
              </>
            ) : (
              <Button onClick={completeNotificationStep} className="w-full py-4">
                Continue to Home
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}