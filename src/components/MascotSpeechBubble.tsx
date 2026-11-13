import { AnimatePresence, motion } from 'framer-motion';
import { usePrefersReducedMotion } from '../lib/useReducedMotionPref';
import { cn } from '../lib/utils';

interface MascotSpeechBubbleProps {
  message: string | null;
  /** Change it to pop a fresh bubble even when the text is the same. */
  bubbleKey: number;
  className?: string;
}

/**
 * Speech bubble that pops out to the left of the mascot (place it inside the
 * mascot's `relative` wrapper). It never leaves the mascot's row and never wraps
 * wider than 11.5rem, so it stays on screen on small devices. With reduced motion
 * it simply fades.
 */
export function MascotSpeechBubble({ message, bubbleKey, className }: MascotSpeechBubbleProps) {
  const reduceMotion = usePrefersReducedMotion();
  return (
    <div className={cn('absolute right-full top-1/2 -translate-y-1/2 mr-2 z-10 pointer-events-none', className)}>
      <AnimatePresence mode="wait">
        {message && (
          <motion.div
            key={bubbleKey}
            role="status"
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.85 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            style={{ transformOrigin: 'right center' }}
            className="relative w-max max-w-[11.5rem] rounded-card bg-ink-900 px-3 py-2 text-xs font-medium leading-snug text-paper shadow-raised font-ui"
          >
            {message}
            <span aria-hidden="true" className="absolute top-1/2 -right-1 h-2.5 w-2.5 -translate-y-1/2 rotate-45 rounded-[2px] bg-ink-900" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
