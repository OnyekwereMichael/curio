import { useState, useEffect } from 'react';
import { AppShell } from '../../components/AppShell';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/superbase';
import { Bell, Loader2 } from 'lucide-react';
import { urlBase64ToUint8Array } from '../../lib/utils';
import { useToast } from '../../components/ui/Toast';
import { usePlatform } from '../../lib/usePlatform';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export function SettingsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { platform, isStandalone } = usePlatform();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      if (!user) return;

      const { data, error } = await supabase
        .from('users')
        .select('notifications_enabled')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        setNotificationsEnabled(!!data.notifications_enabled);
      }
      setLoading(false);
    }

    fetchSettings();
  }, [user]);

  async function handleToggleNotifications() {
    if (!user) return;
    setToggling(true);

    try {
      if (notificationsEnabled) {
        // Turn OFF
        const { error } = await supabase
          .from('users')
          .update({
            notifications_enabled: false,
            notification_token: null
          })
          .eq('id', user.id);

        if (error) throw error;
        setNotificationsEnabled(false);
        showToast('Push notifications disabled');
      } else {
        // Turn ON
        if (!('Notification' in window)) {
          if (platform === 'ios' && !isStandalone) {
            showToast('To enable notifications on iPhone, add this app to your Home Screen first.');
          } else {
            showToast('Your browser does not support push notifications.');
          }
          setToggling(false);
          return;
        }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          showToast('Notification permission denied by browser.');
          setToggling(false);
          return;
        }

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

        if (error) throw error;

        setNotificationsEnabled(true);
        showToast('Push notifications enabled!');
      }
    } catch (err: any) {
      console.error('Failed to toggle notifications:', err);
      showToast('Something went wrong. Please try again.');
    } finally {
      setToggling(false);
    }
  }

  return (
    <AppShell title="Settings">
      <div className="px-4 py-8 max-w-4xl mx-auto w-full flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink mb-2">Preferences</h1>
          <p className="text-faded-ink text-sm">Manage your app experience and notifications.</p>
        </div>

        {/* Settings Card */}
        <div className="bg-paper border border-ink/5 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col gap-6">

          {/* Notifications Setting */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-4 max-sm:flex-col">
              <div className="w-10 h-10 rounded-full bg-ember/10 flex items-center justify-center text-ember flex-shrink-0 mt-0.5 ">
                <Bell size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-ink ">Daily Word Push Notifications</h3>
                <p className="text-sm text-faded-ink mt-0.5">
                  Receive a push notification every day when your new word is ready.
                </p>
              </div>
            </div>

            <div className="flex-shrink-0">
              {loading ? (
                <div className="w-12 h-6 bg-ink/5 rounded-full animate-pulse" />
              ) : (
                <button
                  type="button"
                  onClick={handleToggleNotifications}
                  disabled={toggling}
                  className={`
                    relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                    transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ember focus:ring-offset-2
                    ${notificationsEnabled ? 'bg-ember' : 'bg-ink/20'}
                    ${toggling ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  role="switch"
                  aria-checked={notificationsEnabled}
                >
                  <span
                    aria-hidden="true"
                    className={`
                      pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
                      transition duration-200 ease-in-out flex items-center justify-center
                      ${notificationsEnabled ? 'translate-x-5' : 'translate-x-0'}
                    `}
                  >
                    {toggling && <Loader2 size={12} className="animate-spin text-faded-ink" />}
                  </span>
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </AppShell>
  );
}
