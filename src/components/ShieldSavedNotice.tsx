import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield } from 'lucide-react';
import { getShieldSavedMessage } from '../lib/shieldMessage';
import { Otter } from './Otter';

const MAX_SHIELDS = 2;

interface Props {
  shieldsUsed: number; // how many shields the last streak commit consumed
  shieldsLeft: number; // how many remain after that
}

/** The redesign's "Shield used, streak saved" screen — shown once, the
 * rare moment a missed day gets auto-covered on next open. */
export function ShieldSavedNotice({ shieldsUsed, shieldsLeft }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(shieldsUsed > 0);
  }, [shieldsUsed]);

  const { title, detail } = getShieldSavedMessage(shieldsUsed, shieldsLeft);

  return createPortal(
    <AnimatePresence>
      {visible && (
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
            aria-labelledby="shield-saved-title"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="w-full max-w-sm bg-paper rounded-sheet border border-line shadow-raised p-6 font-ui text-center flex flex-col items-center"
          >
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-700 mb-4">Shield used</p>
            <Otter mood="shielded" size={88} className="mb-4" />

            <h2 id="shield-saved-title" className="font-display text-title font-bold text-ink-900 mb-2">
              {title}
            </h2>
            <p className="text-sm text-ink-500 leading-relaxed mb-5">{detail}</p>

            <div className="flex items-center gap-3 mb-6">
              {Array.from({ length: MAX_SHIELDS }, (_, i) => {
                const used = i < shieldsUsed;
                const held = !used && i < shieldsUsed + shieldsLeft;
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <Shield
                      size={22}
                      className={used ? 'text-ink-500/40' : held ? 'text-gold-500 fill-gold-500' : 'text-ink-500/30'}
                      strokeDasharray={!used && !held ? '3 3' : undefined}
                    />
                    <span className="text-[10px] font-medium text-ink-500 uppercase tracking-wide">
                      {used ? 'Used' : held ? 'Held' : 'Empty'}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              autoFocus
              onClick={() => setVisible(false)}
              className="w-full py-3 rounded-control bg-ember-600 text-on-ember text-sm font-semibold hover:brightness-105 transition-all"
            >
              Start today
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
