import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, X } from 'lucide-react';

const MAX_SHIELDS = 2;
const DAYS_PER_SHIELD = 7;

interface Props {
  open: boolean;
  onClose: () => void;
  currentStreak: number;
  shieldCount: number;
}

export function ShieldExplainerModal({ open, onClose, currentStreak, shieldCount }: Props) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const isFull = shieldCount >= MAX_SHIELDS;
  const daysLeft = DAYS_PER_SHIELD - (currentStreak % DAYS_PER_SHIELD);

  const statusText = isFull
    ? `You're holding the maximum of ${MAX_SHIELDS} shields.`
    : `You have ${shieldCount} of ${MAX_SHIELDS}. ${daysLeft} more day${daysLeft !== 1 ? 's' : ''} of streak earns your next one.`;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="shield-modal-title"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="relative w-full max-w-sm bg-paper rounded-2xl border border-ink/10 shadow-xl p-6 font-ui"
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 right-4 p-1 text-faded-ink hover:text-ink rounded-full hover:bg-ink/5 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="w-11 h-11 rounded-full bg-moss/10 flex items-center justify-center mb-4">
              <Shield size={20} className="text-moss" />
            </div>

            <h2 id="shield-modal-title" className="font-display text-xl font-bold text-ink mb-2">
              Streak Shields
            </h2>

            <p className="text-sm text-ink leading-relaxed mb-4">
              Shields protect your streak through one missed day. Earn one every 7 days, up to 2 at a time.
            </p>

            <div className="rounded-lg bg-moss/10 px-4 py-3 text-sm text-moss font-medium mb-5">
              {statusText}
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-ember text-white text-sm font-semibold hover:bg-ember/90 transition-colors"
            >
              Got it
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}