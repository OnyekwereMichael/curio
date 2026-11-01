import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Share2, Shield, Check, X } from 'lucide-react';
import { getMilestoneCopy } from '../lib/streakLogic';
import { createMilestoneImage, shareMilestone } from '../lib/milestoneShare';
import { cn } from '../lib/utils';

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
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm"
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
            className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-ink/10 bg-paper font-ui shadow-2xl"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 z-20 cursor-pointer rounded-full p-2 text-faded-ink transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/40"
            >
              <X size={18} aria-hidden="true" />
            </button>

            {/* Hero */}
            <div className="relative flex flex-col items-center overflow-hidden bg-gradient-to-b from-gold-stamp/15 to-transparent px-7 pb-6 pt-9">
              {/* Decorative rings */}
              <div
                className="pointer-events-none absolute left-1/2 top-[52px] h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold-stamp/20"
                aria-hidden="true"
              />
              <div
                className="pointer-events-none absolute left-1/2 top-[52px] h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold-stamp/10"
                aria-hidden="true"
              />

              {/* Flame badge */}
              <motion.div
                initial={{ scale: 0, rotate: -25 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.05, type: 'spring', stiffness: 240, damping: 16 }}
                className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl border border-gold-stamp/30 bg-paper shadow-md"
              >
                <Flame size={30} className="text-gold-stamp" aria-hidden="true" />
              </motion.div>

              {/* Big number */}
              <motion.p
                initial={{ opacity: 0, scale: 0.8, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 18 }}
                className="relative z-10 mt-5 font-display text-8xl font-bold leading-none tracking-tight text-ink"
              >
                {milestone}
              </motion.p>
              <p className="relative z-10 mt-3 text-[11px] font-bold uppercase tracking-[0.25em] text-gold-stamp">
                Day streak
              </p>
            </div>

            {/* Content */}
            <div className="px-7 pb-7 text-center">
              <h2
                id="milestone-title"
                className="mb-2 font-display text-xl font-bold leading-snug text-ink"
              >
                {copy.title}
              </h2>
              <p className="mb-5 text-sm leading-relaxed text-faded-ink">{copy.body}</p>

              {copy.shieldLine && (
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-moss/20 bg-moss/10 px-4 py-2 text-sm font-medium text-moss">
                  <Shield size={15} aria-hidden="true" />
                  <span>{copy.shieldLine}</span>
                </div>
              )}

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
                              ? 'border-gold-stamp bg-gold-stamp text-white shadow-sm'
                              : reached
                              ? 'border-gold-stamp/40 bg-gold-stamp/10 text-gold-stamp'
                              : 'border-ink/15 bg-paper text-faded-ink/60'
                          )}
                          aria-current={current ? 'step' : undefined}
                        >
                          {reached && !current ? <Check size={14} aria-hidden="true" /> : m}
                        </span>
                        <span
                          className={cn(
                            'text-[10px] font-semibold uppercase tracking-wider',
                            reached ? 'text-ink' : 'text-faded-ink/60'
                          )}
                        >
                          {reached && !current ? `${m}d` : current ? 'Now' : `${m}d`}
                        </span>
                      </div>
                      {i < MILESTONES.length - 1 && (
                        <span
                          className={cn(
                            'mx-1 mb-5 h-0.5 flex-1 rounded-full',
                            MILESTONES[i + 1] <= milestone ? 'bg-gold-stamp/40' : 'bg-ink/10'
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
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-ember py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-ember/90 active:bg-ember/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:cursor-not-allowed disabled:opacity-60"
              >
                {shareState === 'copied' ? (
                  <Check size={16} aria-hidden="true" />
                ) : (
                  <Share2 size={16} aria-hidden="true" />
                )}
                {shareLabel}
              </button>

              {shareState === 'failed' && (
                <p role="alert" className="mt-2 text-xs text-ember">
                  Couldn't share from this device. Try again in a moment.
                </p>
              )}

              <button
                type="button"
                onClick={onClose}
                className="mt-2 w-full cursor-pointer rounded-xl py-3 text-sm font-medium text-faded-ink transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
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