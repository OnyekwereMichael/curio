import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellOff, X, Check, AlertCircleIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/superbase';
import { urlBase64ToUint8Array } from '../lib/utils';
import logo from '../../public/icon-192.png';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export function NotificationReEnableBanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const wasPrompted = localStorage.getItem('notification_prompted') === 'true';
    if (!user || !wasPrompted) return;

    async function checkAndRepairSubscription() {
      // Fetch what the DB thinks the user's notification state is
      const { data } = await supabase
        .from('users')
        .select('notifications_enabled, notification_token')
        .eq('id', user?.id)
        .maybeSingle();

      if (!data) return;

      // Case 1: DB says disabled → show the re-enable banner
      if (data.notifications_enabled === false) {
        setShow(true);
        return;
      }

      // Case 2: DB says enabled — check if THIS browser actually has an
      // active push subscription. If not (or if the endpoint differs),
      // the token in DB is stale (from a different device/browser) and
      // push will silently fail for this user. Repair it automatically.
      if (
        data.notifications_enabled === true &&
        'serviceWorker' in navigator &&
        'PushManager' in window
      ) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const existingSubscription = await registration.pushManager.getSubscription();

          if (!existingSubscription) {
            // This browser has NO subscription — silently re-subscribe
            // so this device starts receiving notifications again.
            console.log('[NotifBanner] No local subscription found, silently re-subscribing...');
            const newSubscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });
            await supabase
              .from('users')
              .update({ notification_token: newSubscription.toJSON() })
              .eq('id', user?.id);
            console.log('[NotifBanner] Re-subscribed and token updated silently.');
            return;
          }

          // Check if the stored endpoint matches this browser's subscription
          const storedEndpoint = data.notification_token?.endpoint;
          const currentEndpoint = existingSubscription.toJSON().endpoint;

          if (storedEndpoint && storedEndpoint !== currentEndpoint) {
            // Endpoint changed — update DB with this browser's current token
            console.log('[NotifBanner] Token mismatch, updating DB silently...');
            await supabase
              .from('users')
              .update({ notification_token: existingSubscription.toJSON() })
              .eq('id', user?.id);
          }
        } catch (err) {
          // Non-critical — never break the app
          console.warn('[NotifBanner] Could not check push subscription:', err);
        }
      }
    }

    checkAndRepairSubscription();

    const handleUpdate = () => checkAndRepairSubscription();
    window.addEventListener('notification_pref_changed', handleUpdate);

    return () => window.removeEventListener('notification_pref_changed', handleUpdate);
  }, [user]);

  if (!show) return null;

  return (
    <>
      {/* Main Banner */}
      <div className="bg-white border-b border-ink/10 px-3 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-2.5 sm:gap-3 shadow-sm font-ui w-full">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gold-stamp/10 flex items-center justify-center flex-shrink-0">
          <BellOff className="w-4 h-4 text-gold-stamp" />
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <h3 className="font-semibold text-ink text-xs sm:text-sm leading-tight font-display whitespace-nowrap">
              Push Notification is off
            </h3>
            <button
              onClick={() => setShowModal(true)}
              className="text-[11px] text-ember hover:underline font-medium focus:outline-none"
            >
              Why enable this?
            </button>
          </div>
          <p className="text-[11px] sm:text-xs text-faded-ink mt-0.5 truncate font-display">
            Turn it back on so you never miss your daily word
          </p>
        </div>

        <button
          onClick={() => navigate('/settings')}
          className="text-xs font-medium text-ember hover:text-ember/80 transition-colors whitespace-nowrap flex-shrink-0 px-2.5 py-1.5 sm:px-3 sm:py-2 focus:outline-none"
        >
          Enable
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-sm my-auto overflow-hidden shadow-xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-ink/5 shrink-0">
              <h2 className="font-display font-bold text-base sm:text-lg text-ink">Why enable notifications?</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-faded-ink hover:text-ink rounded-full hover:bg-ink/5 transition-colors focus:outline-none"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body Container with Scrolling Support for Short Screen Viewports */}
            <div className="p-4 sm:p-5 font-ui overflow-y-auto space-y-5 sm:space-y-6">
              {/* Visual Preview */}
              <div className="relative perspective-1000">
                <div className="absolute inset-0 bg-gradient-to-br from-ember/20 to-gold-stamp/20 blur-2xl -z-10 rounded-full animate-pulse" />

                <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/80 shadow-[0_4px_20px_rgb(0,0,0,0.06)] p-3 mx-auto">
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl shadow-sm flex items-center justify-center flex-shrink-0 overflow-hidden">
                      <img src={logo} alt="Curi Logo" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1 font-display">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[11px] sm:text-[12px] font-semibold text-ink">Curi</span>
                        <span className="text-[9px] sm:text-[10px] text-faded-ink">now</span>
                      </div>
                      <p className="text-[12px] sm:text-[13px] font-semibold text-ink leading-snug">
                        Your daily word is ready: Sonder
                      </p>
                      <p className="text-[11px] sm:text-[12px] text-faded-ink mt-0.5 leading-snug truncate">
                        the realization that each random passerby has a life as vivid and complex as your own.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bullet Points */}
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-2.5 sm:gap-3 text-ink font-display">
                  <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <div>
                    <span className="block font-semibold text-xs sm:text-[14px]">Keep your streak alive</span>
                    <span className="block text-[11px] sm:text-[12px] text-faded-ink mt-0.5 leading-snug">
                      The easiest way to stay consistent and build a learning habit.
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 sm:gap-3 text-ink font-display">
                  <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <AlertCircleIcon size={12} strokeWidth={2.5} />
                  </div>
                  <div>
                    <span className="block font-semibold text-xs sm:text-[14px]">Zero spam. Just one reminder.</span>
                    <span className="block text-[11px] sm:text-[12px] text-faded-ink mt-0.5 leading-snug">
                      We only send you one notification a day, right when it's ready.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3.5 sm:p-4 bg-ink/[0.02] border-t border-ink/5 shrink-0">
              <button
                onClick={() => {
                  setShowModal(false);
                  navigate('/settings');
                }}
                className="w-full bg-ink text-white font-display font-medium rounded-xl py-2.5 sm:py-3 text-xs sm:text-sm hover:bg-ink/90 transition-colors focus:outline-none active:scale-[0.99]"
              >
                Go to Settings to Enable
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}