import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield } from 'lucide-react';
import { getStreakLossCopy } from '../lib/streakLogic';
import { Otter } from './Otter';

interface Props {
  lostStreak: number;
  missedDays: number;
  shieldCount: number;
  onRestore: () => Promise<boolean>;
  onStartFresh: () => Promise<void>;
}

export function StreakLossModal({ lostStreak, missedDays, shieldCount, onRestore, onStartFresh }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = lostStreak > 0 && missedDays > 0;
  const copy = getStreakLossCopy(lostStreak, missedDays, shieldCount);

  async function handleRestore() {
    setBusy(true);
    setError(null);
    const ok = await onRestore();
    setBusy(false);
    if (!ok) setError('Something went wrong. Please try again.');
  }

  async function handleStartFresh() {
    setBusy(true);
    setError(null);
    await onStartFresh();
    setBusy(false);
  }

  // No close button and no tap-outside: they pick one of the two choices, and
  // if they just leave the app, this is waiting for them next time.
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink-900/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="streak-loss-title"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="w-full max-w-sm bg-paper rounded-sheet border border-line shadow-raised p-6 font-ui text-center flex flex-col items-center"
          >
            <Otter mood="supportive" size={80} className="mb-4" />

            <h2 id="streak-loss-title" className="font-display text-title font-bold text-ink-900 mb-2">
              {copy.title}
            </h2>
            <p className="text-sm text-ink-900/80 leading-relaxed mb-4">{copy.body}</p>

            <div
              className={`flex items-start gap-2.5 rounded-control px-4 py-3 text-sm mb-5 w-full text-left ${
                copy.canRestore ? 'bg-moss-50 text-moss-600' : 'bg-ink-900/5 text-ink-500'
              }`}
            >
              <Shield size={16} className="flex-shrink-0 mt-0.5" />
              <span>{copy.restoreNote}</span>
            </div>

            {error && <p className="text-sm text-ember-600 mb-3">{error}</p>}

            {copy.canRestore ? (
              <>
                <button
                  type="button"
                  autoFocus
                  disabled={busy}
                  onClick={handleRestore}
                  className="w-full py-3 rounded-control bg-ember-600 text-on-ember text-sm font-semibold hover:brightness-105 disabled:opacity-50 transition-all"
                >
                  {copy.restoreLabel}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleStartFresh}
                  className="w-full mt-2 py-3 rounded-control text-sm font-medium text-ink-500 hover:text-ink-900 hover:bg-ink-900/5 disabled:opacity-50 transition-colors"
                >
                  Start fresh
                </button>
                <p className="text-xs text-ink-500 text-center mt-1">Starting fresh can't be undone.</p>
              </>
            ) : (
              <button
                type="button"
                autoFocus
                disabled={busy}
                onClick={handleStartFresh}
                className="w-full py-3 rounded-control bg-ember-600 text-on-ember text-sm font-semibold hover:brightness-105 disabled:opacity-50 transition-all"
              >
                Start fresh
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}