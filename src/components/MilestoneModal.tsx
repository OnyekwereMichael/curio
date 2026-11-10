import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Shield, Check, X } from 'lucide-react';
import { getMilestoneCopy } from '../lib/streakLogic';
import { createMilestoneImage, shareMilestone } from '../lib/milestoneShare';
import { cn } from '../lib/utils';
import { Otter } from './Otter';
import { PREVIEW_FEATURES } from '../lib/featureFlags';

const SHOW_DELAY_MS = 1200; // lets them see their quiz result first
const MILESTONES = [7, 30, 60, 100];

interface Props {
  milestone: number | null; // 7, 30, 60 or 100 when one was just reached
  shieldEarned: boolean;
  onClose: () => void;
}

type ShareState = 'idle' | 'working' | 'copied' | 'failed';

export function MilestoneModal({ milestone, shieldEarned, onClose }: Props) {
  const [visible, setVisible] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [shareState, setShareState] = useState<ShareState>('idle');

  useEffect(() => {
    if (milestone === null) {
      setVisible(false);
      setImage(null);
      setShareState('idle');
      return;
    }

    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);

    // The image is made ahead of time, so tapping Share can open the share
    // sheet instantly. Phones only allow that straight after a tap.
    let cancelled = false;
    createMilestoneImage(milestone).then((file) => {
      if (!cancelled) setImage(file);
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [milestone]);

  useEffect(() => {
    if (!visible) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, onClose]);

  async function handleShare() {
    if (milestone === null) return;
    setShareState('working');
    const result = await shareMilestone(milestone, image);
    if (result === 'copied') setShareState('copied');
    else if (result === 'failed') setShareState('failed');
    else setShareState('idle');
  }

  const copy = milestone !== null ? getMilestoneCopy(milestone, shieldEarned) : null;

  const shareLabel =
    shareState === 'working'
      ? 'Sharing...'
      : shareState === 'copied'
      ? 'Copied to clipboard'
      : 'Share this milestone';

  return createPortal(
    <AnimatePresence>
      {visible && copy && milestone !== null && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-night/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="milestone-title"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="relative w-full max-w-sm overflow-hidden rounded-sheet bg-night font-ui shadow-raised text-cream"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 z-20 cursor-pointer rounded-full p-2 text-cream-dim transition-colors hover:bg-cream/10 hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500/40"
            >
              <X size={18} aria-hidden="true" />
            </button>

            <p className="pt-7 text-center text-[11px] font-bold uppercase tracking-[0.25em] text-gold-500">
              Milestone
            </p>

            {/* Hero */}
            <div className="relative flex flex-col items-center overflow-hidden px-7 pb-2 pt-3">
              <motion.div
                initial={{ scale: 0, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.05, type: 'spring', stiffness: 240, damping: 16 }}
                className="relative flex items-center justify-center"
              >
                <Otter mood="proud" size={110} />
                <span className="absolute -right-2 -top-1 flex h-12 w-12 items-center justify-center rounded-full bg-ember-600 font-display text-xl font-bold text-on-ember shadow-raised">
                  {milestone}
                </span>
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mt-4 font-display text-3xl font-bold leading-none tracking-tight"
              >
                {milestone} days in a row.
              </motion.p>
            </div>

            {/* Content */}
            <div className="px-7 pb-7 text-center">
              <h2 id="milestone-title" className="sr-only">
                {copy.title}
              </h2>
              <p className="mb-5 text-sm leading-relaxed text-cream-dim">{copy.body}</p>

              <div className="mb-5 flex items-center justify-center gap-2">
                {copy.shieldLine && (
                  <div className="inline-flex items-center gap-2 rounded-tag bg-cream/10 px-3 py-2 text-xs font-medium text-cream">
                    <Shield size={14} className="text-moss-600" aria-hidden="true" />
                    <span>{copy.shieldLine}</span>
                  </div>
                )}
                {PREVIEW_FEATURES && (
                  <>
                    <div className="inline-flex items-center gap-1.5 rounded-tag bg-cream/10 px-3 py-2 text-xs font-medium text-gold-500">
                      +100 XP
                    </div>
                    <div className="inline-flex items-center gap-1.5 rounded-tag bg-cream/10 px-3 py-2 text-xs font-medium text-cream">
                      New pebble
                    </div>
                  </>
                )}
              </div>

              {/* Milestone progress */}
              <ol
                className="mb-6 flex items-center justify-between gap-1"
                aria-label="Streak milestones"
              >
                {MILESTONES.map((m, i) => {
                  const reached = m <= milestone;
                  const current = m === milestone;
                  return (
                    <li key={m} className="flex flex-1 items-center last:flex-none">
                      <div className="flex flex-col items-center gap-1.5">
                        <span
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition-colors',
                            current
                              ? 'border-gold-500 bg-gold-500 text-night shadow-card'
                              : reached
                              ? 'border-gold-500/40 bg-gold-500/10 text-gold-500'
                              : 'border-cream/15 bg-transparent text-cream-dim'
                          )}
                          aria-current={current ? 'step' : undefined}
                        >
                          {reached && !current ? <Check size={14} aria-hidden="true" /> : m}
                        </span>
                        <span
                          className={cn(
                            'text-[10px] font-semibold uppercase tracking-wider',
                            reached ? 'text-cream' : 'text-cream-dim'
                          )}
                        >
                          {reached && !current ? `${m}d` : current ? 'Now' : `${m}d`}
                        </span>
                      </div>
                      {i < MILESTONES.length - 1 && (
                        <span
                          className={cn(
                            'mx-1 mb-5 h-0.5 flex-1 rounded-full',
                            MILESTONES[i + 1] <= milestone ? 'bg-gold-500/40' : 'bg-cream/10'
                          )}
                          aria-hidden="true"
                        />
                      )}
                    </li>
                  );
                })}
              </ol>

              {/* Actions */}
              <button
                type="button"
                onClick={handleShare}
                disabled={shareState === 'working'}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-control border border-cream/25 py-3.5 text-sm font-semibold text-cream transition-colors hover:bg-cream/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {shareState === 'copied' ? (
                  <Check size={16} aria-hidden="true" />
                ) : (
                  <Share2 size={16} aria-hidden="true" />
                )}
                {shareLabel}
              </button>

              {shareState === 'failed' && (
                <p role="alert" className="mt-2 text-xs text-ember-500">
                  Couldn't share from this device. Try again in a moment.
                </p>
              )}

              <button
                type="button"
                onClick={onClose}
                className="mt-2 w-full cursor-pointer rounded-control bg-ember-600 py-3 text-sm font-semibold text-on-ember transition-colors hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream/30"
              >
                Keep going
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}