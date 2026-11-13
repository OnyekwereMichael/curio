import { useEffect, useState } from 'react';
import { motion, useAnimationControls, type TargetAndTransition } from 'framer-motion';
import { Otter, type OtterMood } from './Otter';
import { usePrefersReducedMotion } from '../lib/useReducedMotionPref';
import { cn } from '../lib/utils';
import type { MascotEffect, MascotMood } from '../lib/mascotConfig';

const OTTER_MOOD: Record<MascotMood, OtterMood> = {
  happy: 'idle',
  excited: 'excited',
  waving: 'waving',
  curious: 'curious',
  grumpy: 'grumpy',
  sleepy: 'sleepy',
};

// Body language for tap / event reactions — transforms only.
const EFFECTS: Record<MascotEffect, TargetAndTransition> = {
  jump: { y: [0, -18, 0], scaleY: [1, 0.88, 1.1, 1], transition: { duration: 0.6, ease: 'easeOut' } },
  spin: { rotate: [0, 360], scale: [1, 1.18, 1], transition: { duration: 0.75, ease: 'easeInOut' } },
  cheer: { rotate: [0, -9, 9, -9, 0], scale: [1, 1.15, 1], transition: { duration: 0.7 } },
  wave: { rotate: [0, -5, 5, 0], transition: { duration: 0.8 } },
  giggle: { x: [0, -4, 4, -4, 4, 0], rotate: [0, -4, 4, 0], transition: { duration: 0.55 } },
};
const SPARKLE_EFFECTS: MascotEffect[] = ['jump', 'spin', 'cheer'];
const SPARKLES = Array.from({ length: 8 }, (_, i) => {
  const angle = (i / 8) * Math.PI * 2;
  return { x: Math.cos(angle) * 38, y: Math.sin(angle) * 38 };
});

interface AnimatedMascotProps {
  size?: number;
  mood?: MascotMood;
  /** Body reaction to play; pair with `effectKey` so the same effect can replay. */
  effect?: MascotEffect | null;
  effectKey?: number;
  /** Idle float + blink. Turn off while off screen or backgrounded. */
  animated?: boolean;
  onTap?: () => void;
  className?: string;
}

/**
 * The Curi otter as a character: face and body change with `mood`, it floats and
 * blinks while `animated`, and plays a body `effect` (jump, spin, cheer…) with a
 * sparkle burst on the big ones. Purely visual — pair it with useMascotBehavior.
 * Reduced motion keeps the expressions but drops floating, blinking, effects and sparkles.
 */
export function AnimatedMascot({ size = 56, mood = 'happy', effect = null, effectKey = 0, animated = true, onTap, className }: AnimatedMascotProps) {
  const reduceMotion = usePrefersReducedMotion();
  const body = useAnimationControls();
  const [burst, setBurst] = useState<number | null>(null);
  const motionOn = animated && !reduceMotion;

  useEffect(() => {
    if (!effect || reduceMotion) return;
    body.start(EFFECTS[effect]);
    if (SPARKLE_EFFECTS.includes(effect)) setBurst(effectKey);
  }, [effect, effectKey, reduceMotion, body]);

  const floats = motionOn && mood !== 'sleepy' && mood !== 'grumpy';

  return (
    <motion.div
      animate={floats ? { y: [0, -6, 0] } : { y: 0 }}
      transition={floats ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
      className={cn('relative flex-shrink-0', className)}
      style={{ width: size, height: size }}
    >
      <motion.button
        type="button"
        onClick={onTap}
        animate={body}
        whileTap={reduceMotion ? undefined : { scale: 0.92 }}
        aria-label="Tap Curi the otter"
        className="block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500"
      >
        <Otter mood={OTTER_MOOD[mood]} size={size} blink={motionOn} />
      </motion.button>

      {burst != null && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {SPARKLES.map((s, i) => (
            <motion.span
              key={`${burst}-${i}`}
              initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }}
              animate={{ x: s.x, y: s.y, opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              onAnimationComplete={i === 0 ? () => setBurst(null) : undefined}
              className={cn('absolute w-2 h-2 rounded-full', i % 2 ? 'bg-gold-500' : 'bg-ember-500')}
            />
          ))}
        </span>
      )}
    </motion.div>
  );
}
