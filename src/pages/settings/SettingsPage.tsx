import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../../components/AppShell';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from "framer-motion";

import { Bell, Loader2, Trash2, AlertTriangle, MessageSquare, Check, Moon, Sun } from 'lucide-react';
import { urlBase64ToUint8Array } from '../../lib/utils';
import { useToast } from '../../components/ui/Toast';
import { usePlatform } from '../../lib/usePlatform';
import { supabase } from '../../lib/superbase';
import { useTheme } from '../../contexts/ThemeContext';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export function SettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { platform, isStandalone } = usePlatform();
  const { theme, toggleTheme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

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

  async function handleDeleteAccount() {
    if (!user) return;
    setDeleting(true);

    try {
      const { data, error } = await supabase.functions.invoke('delete-account');

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await supabase.auth.signOut();
      showToast('Account deleted successfully');
      navigate('/');
    } catch (err: any) {
      console.error('Failed to delete account — full error:', err);
      showToast('Failed to delete account. Please try again.');
      setDeleting(false);
      setDeleteConfirming(false);
    }
  }

  async function handleToggleNotifications() {
    if (!user) return;
    setToggling(true);

    try {
      if (notificationsEnabled) {
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

  async function handleSubmitFeedback() {
    if (!user || !feedbackMessage.trim()) return;
    setFeedbackSubmitting(true);

    const { error } = await supabase
      .from('feedback')
      .insert({ user_id: user.id, message: feedbackMessage.trim() });

    setFeedbackSubmitting(false);

    if (error) {
      console.error('Failed to submit feedback:', error);
      showToast('Something went wrong sending your feedback. Please try again.');
      return;
    }

    setFeedbackSubmitted(true);
    setFeedbackMessage('');
  }

  return (
    <AppShell title="Settings">
      <div className="px-4 py-6 max-w-4xl mx-auto w-full flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink mb-2">Preferences</h1>
          <p className="text-faded-ink text-sm">Manage your app experience and notifications.</p>
        </div>

        <div className="bg-paper border border-ink/5 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col gap-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-4 max-sm:flex-col">
              <div className="w-10 h-10 rounded-full bg-ember/10 flex items-center justify-center text-ember flex-shrink-0 mt-0.5 ">
                {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
              </div>
              <div>
                <h3 className="font-semibold text-ink ">Dark Mode</h3>
                <p className="text-sm text-faded-ink mt-0.5">
                  Toggle between light and dark themes.
                </p>
              </div>
            </div>

            <div className="flex-shrink-0">
              <button
                type="button"
                onClick={toggleTheme}
                className={`
                  relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                  transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ember focus:ring-offset-2
                  ${theme === 'dark' ? 'bg-ember' : 'bg-ink/20'}
                `}
                role="switch"
                aria-checked={theme === 'dark'}
              >
                <span
                  aria-hidden="true"
                  className={`
                    pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
                    transition duration-200 ease-in-out flex items-center justify-center
                    ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0'}
                  `}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-paper border border-ink/5 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col gap-6">
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

        <div className="bg-paper border border-ink/5 rounded-2xl p-4 sm:p-6 shadow-sm">
          {feedbackSubmitted ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex flex-col items-center text-center py-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
                className="relative w-11 h-11 rounded-full bg-green-600 flex items-center justify-center mb-3"
              >
                <motion.div
                  initial={{ scale: 1, opacity: 0.5 }}
                  animate={{ scale: 1.8, opacity: 0 }}
                  transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
                  className="absolute inset-0 rounded-full bg-green-600"
                />
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.25, duration: 0.2 }}
                >
                  <Check size={18} className="text-white" strokeWidth={3} />
                </motion.div>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.25 }}
                className="text-base text-ink font-medium mb-1"
              >
                Thanks for the feedback
              </motion.p>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.38, duration: 0.25 }}
                className="text-sm text-faded-ink"
              >
                Would definitely look into it.
              </motion.p>
            </motion.div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-ember/10 flex items-center justify-center text-ember flex-shrink-0">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-ink">Send feedback</h3>
                  <p className="text-sm text-faded-ink mt-0.5">
                    What do you think can be improved or added, would love to hear from you.
                  </p>
                </div>
              </div>

              <textarea
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                placeholder="What's on your mind?"
                rows={3}
                className="w-full rounded-lg border border-ink/10 p-3 text-sm text-ink placeholder:text-faded-ink focus:outline-none focus:ring-2 focus:ring-ember/30 resize-none"
              />

              <button
                onClick={handleSubmitFeedback}
                disabled={feedbackSubmitting || !feedbackMessage.trim()}
                className="self-end px-4 py-2 rounded-lg bg-ember text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-ember/90 transition-colors"
              >
                {feedbackSubmitting ? 'Sending...' : 'Send'}
              </button>
            </div>
          )}
        </div>

        <div className="w-full mx-auto bg-paper border border-red-100 rounded-2xl shadow-sm overflow-hidden mt-4">
          <div className="px-4 sm:px-6 py-4 border-b border-red-100">
            <h2 className="text-xs font-bold  uppercase text-red-500">Danger zone</h2>
          </div>

          {!deleteConfirming ? (
            <button
              onClick={() => setDeleteConfirming(true)}
              className="w-full flex items-center gap-3 px-4 sm:px-6 py-4 text-left hover:bg-red-50/50 transition-colors"
            >
              <Trash2 size={18} className="text-red-500" />
              <span className="text-sm font-medium text-red-600">Delete account</span>
            </button>
          ) : (
            <div className="px-4 sm:px-6 py-4 flex flex-col gap-3">
              <div className="flex items-start gap-2 text-sm text-ink">
                <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                <span>
                  This permanently deletes your account, streak, and saved words. This can't be undone.
                </span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirming(false)}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-lg border border-ink/10 text-sm font-medium text-ink hover:bg-ink/[0.02] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Yes, delete my account'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}