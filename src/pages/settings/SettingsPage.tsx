import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../../components/AppShell';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from "framer-motion";

import { Bell, Trash2, AlertTriangle, MessageSquare, Check, Moon, Sun, Monitor, LogOut, Sparkles, Volume2, ChevronRight, CalendarClock, Users } from 'lucide-react';
import { urlBase64ToUint8Array } from '../../lib/utils';
import { useToast } from '../../components/ui/Toast';
import { usePlatform } from '../../lib/usePlatform';
import { supabase } from '../../lib/superbase';
import { useTheme, type ThemeChoice } from '../../contexts/ThemeContext';
import {
  getReduceMotionPref,
  setReduceMotionPref,
  getSoundsHapticsPref,
  setSoundsHapticsPref,
} from '../../services/localPrefs';
import { getLearningPlan, updateLearningPlan, type LearningPlanFixture } from '../../services/learningPlan';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function SettingsToggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`
        relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
        transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ember-500 focus:ring-offset-2
        ${checked ? 'bg-ember-600' : 'bg-ink-900/20'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      role="switch"
      aria-checked={checked}
    >
      <span
        aria-hidden="true"
        className={`
          pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface shadow ring-0
          transition duration-200 ease-in-out
          ${checked ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
  );
}

export function SettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { platform, isStandalone } = usePlatform();
  const { theme, setTheme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [reduceMotion, setReduceMotion] = useState(getReduceMotionPref);
  const [soundsHaptics, setSoundsHaptics] = useState(getSoundsHapticsPref);

  const [plan, setPlan] = useState<LearningPlanFixture | null>(null);

  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  useEffect(() => {
    getLearningPlan().then(setPlan);
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    navigate('/login');
  }

  function handleToggleReduceMotion() {
    const next = !reduceMotion;
    setReduceMotion(next);
    setReduceMotionPref(next);
  }

  function handleToggleSoundsHaptics() {
    const next = !soundsHaptics;
    setSoundsHaptics(next);
    setSoundsHapticsPref(next);
  }

  async function handleTogglePlanPref(key: 'eveningNudge' | 'weeklyRecapEmail') {
    if (!plan) return;
    const next = { ...plan, [key]: !plan[key] };
    setPlan(next);
    await updateLearningPlan({ [key]: next[key] });
  }

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
        window.dispatchEvent(new Event('notification_pref_changed'));
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

        if (error) throw error;

        setNotificationsEnabled(true);
        showToast('Push notifications enabled!');
        window.dispatchEvent(new Event('notification_pref_changed'));
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
      <div className="px-4 py-4 mx-auto w-full flex flex-col gap-6">
        <div>
          <h1 className="font-display text-title font-bold text-ink-900 mb-2">Preferences</h1>
          <p className="text-ink-500 text-sm font-ui">Manage your app experience and notifications.</p>
        </div>

        {plan && (
          <div className="bg-ink-900 text-paper rounded-card p-4 sm:p-6 shadow-card flex flex-col gap-1 font-ui">
            <button onClick={() => navigate('/settings/plan')} className="flex items-center justify-between text-left">
              <div>
                <h3 className="font-semibold">My learning plan</h3>
                <p className="text-sm opacity-70 mt-0.5">
                  {plan.wordsPerDay} words · {plan.factTopics.length > 0 ? '1 fact' : 'no facts'} · {plan.weeklyGoalDays} days a week
                </p>
              </div>
              <ChevronRight size={18} className="opacity-60 flex-shrink-0" />
            </button>
          </div>
        )}

        <div className="bg-surface border border-line rounded-card p-4 sm:p-6 shadow-card flex flex-col gap-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-4 max-sm:flex-col">
              <div className="w-10 h-10 rounded-full bg-ember-50 flex items-center justify-center text-ember-600 flex-shrink-0 mt-0.5 ">
                {theme === 'dark' ? <Moon size={20} /> : theme === 'light' ? <Sun size={20} /> : <Monitor size={20} />}
              </div>
              <div>
                <h3 className="font-semibold text-ink-900 font-ui">Theme</h3>
                <p className="text-sm text-ink-500 mt-0.5 font-ui">
                  System, light, or dark.
                </p>
              </div>
            </div>

            <div className="flex-shrink-0 flex rounded-control border border-line-strong p-0.5 font-ui">
              {(['system', 'light', 'dark'] as ThemeChoice[]).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setTheme(opt)}
                  className={`px-3 py-1.5 rounded-tag text-xs font-semibold capitalize transition-colors ${
                    theme === opt ? 'bg-ink-900 text-paper' : 'text-ink-500 hover:text-ink-900'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-line" />

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-4 max-sm:flex-col">
              <div className="w-10 h-10 rounded-full bg-ember-50 flex items-center justify-center text-ember-600 flex-shrink-0 mt-0.5 ">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-ink-900 font-ui">Reduce motion</h3>
                <p className="text-sm text-ink-500 mt-0.5 font-ui">
                  Fewer animations across the app.
                </p>
              </div>
            </div>
            <SettingsToggle checked={reduceMotion} onChange={handleToggleReduceMotion} />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-4 max-sm:flex-col">
              <div className="w-10 h-10 rounded-full bg-ember-50 flex items-center justify-center text-ember-600 flex-shrink-0 mt-0.5 ">
                <Volume2 size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-ink-900 font-ui">Sounds &amp; haptics</h3>
                <p className="text-sm text-ink-500 mt-0.5 font-ui">
                  Light feedback on taps and correct answers.
                </p>
              </div>
            </div>
            <SettingsToggle checked={soundsHaptics} onChange={handleToggleSoundsHaptics} />
          </div>
        </div>

        <div className="bg-surface border border-line rounded-card p-4 sm:p-6 shadow-card flex flex-col gap-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-4 max-sm:flex-col">
              <div className="w-10 h-10 rounded-full bg-ember-50 flex items-center justify-center text-ember-600 flex-shrink-0 mt-0.5 ">
                <Bell size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-ink-900 font-ui">Daily Word Push Notifications</h3>
                <p className="text-sm text-ink-500 mt-0.5 font-ui">
                  Receive a push notification every day when your new word is ready.
                </p>
              </div>
            </div>

            <div className="flex-shrink-0">
              {loading ? (
                <div className="w-12 h-6 bg-ink-900/5 rounded-full animate-pulse" />
              ) : (
                <SettingsToggle checked={notificationsEnabled} onChange={handleToggleNotifications} disabled={toggling} />
              )}
            </div>
          </div>

          {plan && (
            <>
              <div className="h-px bg-line" />
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-4 max-sm:flex-col">
                  <div className="w-10 h-10 rounded-full bg-ember-50 flex items-center justify-center text-ember-600 flex-shrink-0 mt-0.5 ">
                    <CalendarClock size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink-900 font-ui">Evening nudge</h3>
                    <p className="text-sm text-ink-500 mt-0.5 font-ui">
                      One quiet ping at 8 PM if you haven't played.
                    </p>
                  </div>
                </div>
                <SettingsToggle checked={plan.eveningNudge} onChange={() => handleTogglePlanPref('eveningNudge')} />
              </div>

              <div className="h-px bg-line" />
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-4 max-sm:flex-col">
                  <div className="w-10 h-10 rounded-full bg-ember-50 flex items-center justify-center text-ember-600 flex-shrink-0 mt-0.5 ">
                    <Users size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink-900 font-ui">Weekly recap email</h3>
                    <p className="text-sm text-ink-500 mt-0.5 font-ui">
                      A summary of your week, every Monday.
                    </p>
                  </div>
                </div>
                <SettingsToggle checked={plan.weeklyRecapEmail} onChange={() => handleTogglePlanPref('weeklyRecapEmail')} />
              </div>
            </>
          )}
        </div>

        <div className="bg-surface border border-line rounded-card p-4 sm:p-6 shadow-card">
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
                className="text-base text-ink-900 font-ui mb-1"
              >
                Thanks for the feedback
              </motion.p>

              {/* <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.38, duration: 0.25 }}
                className="text-sm text-faded-ink"
              >
                Would definitely look into it.
              </motion.p> */}
            </motion.div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 max-sm:flex-col  max-sm:items-start">
                <div className="w-10 h-10 rounded-full bg-ember-50 flex items-center justify-center text-ember-600 flex-shrink-0">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-ink-900 font-ui">Help us make Curi better.</h3>
                  <p className="text-sm text-ink-500 font-ui mt-0.5">
                    Found a bug, have an idea, or just want to say hello? Tell us what is working and what is not. We read every message.
                  </p>
                </div>
              </div>

              <textarea
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                placeholder="What's on your mind?"
                rows={3}
                className="w-full rounded-control border border-line-strong p-3 text-sm text-ink-900 placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-ember-500/30 resize-none font-ui bg-paper"
              />

              <button
                onClick={handleSubmitFeedback}
                disabled={feedbackSubmitting || !feedbackMessage.trim()}
                className="self-end px-4 py-2 rounded-control bg-ember-600 text-on-ember text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-105 transition-all font-ui"
              >
                {feedbackSubmitting ? 'Sending...' : 'Send'}
              </button>
            </div>
          )}
        </div>

        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-control border border-line-strong text-sm font-semibold text-ink-900 hover:bg-ink-900/5 transition-colors disabled:opacity-50 font-ui"
        >
          <LogOut size={16} />
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>

        <div className="w-full mx-auto bg-surface border border-red-100 rounded-card shadow-card overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-red-100">
            <h2 className="text-xs font-bold font-ui uppercase text-red-500">Danger zone</h2>
          </div>

          {!deleteConfirming ? (
            <button
              onClick={() => setDeleteConfirming(true)}
              className="w-full flex items-center gap-3 px-4 sm:px-6 py-4 text-left hover:bg-red-50/50 transition-colors"
            >
              <Trash2 size={18} className="text-red-500" />
              <span className="text-sm font-medium text-red-600 font-ui">Delete account</span>
            </button>
          ) : (
            <div className="px-4 sm:px-6 py-4 flex flex-col gap-3">
              <div className="flex items-start gap-2 text-sm text-ink-900 font-ui">
                <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                <span>
                  This permanently deletes your account, streak, and saved words. This can't be undone.
                </span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirming(false)}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-control border border-line-strong text-sm font-medium text-ink-900 hover:bg-ink-900/[0.02] transition-colors disabled:opacity-50 font-ui"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-control bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50 font-ui"
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