import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { usePrefersReducedMotion } from '../lib/useReducedMotionPref';

interface RevealProps {
  children: ReactNode;
  /** Seconds to wait before the reveal — use to stagger siblings. */
  delay?: number;
  className?: string;
}

/** Fades and lifts its children in once as they scroll into view. Static for reduced motion. */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const reduceMotion = usePrefersReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.45, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
