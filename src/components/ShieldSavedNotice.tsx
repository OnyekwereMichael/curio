import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, X } from 'lucide-react';
import { getShieldSavedMessage } from '../lib/shieldMessage';

const AUTO_HIDE_MS = 10000;

interface Props {
  shieldsUsed: number; // how many shields the last streak commit consumed
  shieldsLeft: number; // how many remain after that
}

export function ShieldSavedNotice({ shieldsUsed, shieldsLeft }: Props) {
  const [visible, setVisible] = useState(false);

  // Appears when a commit consumed shields, then hides itself.
  useEffect(() => {
    if (shieldsUsed <= 0) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [shieldsUsed]);

  const { title, detail } = getShieldSavedMessage(shieldsUsed, shieldsLeft);

  // Rendered through a portal and pinned to the top of the screen, so it is
  // visible even when the user is scrolled down at the quiz.
  return createPortal(
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-x-0 top-20 z-[90] flex justify-center px-4 pointer-events-none">
          <motion.div
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="pointer-events-auto w-full max-w-sm bg-paper border border-moss/30 rounded-2xl shadow-lg p-4 flex items-start gap-3 font-ui"
          >
            <div className="w-9 h-9 rounded-full bg-moss/10 flex items-center justify-center flex-shrink-0">
              <Shield size={18} className="text-moss" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink">{title}</p>
              <p className="text-sm text-faded-ink mt-0.5">{detail}</p>
            </div>

            <button
              type="button"
              onClick={() => setVisible(false)}
              aria-label="Dismiss"
              className="p-1 text-faded-ink hover:text-ink rounded-full hover:bg-ink/5 transition-colors flex-shrink-0"
            >
              <X size={16} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}