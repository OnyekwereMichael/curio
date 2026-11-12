import { motion } from 'framer-motion';
import { Avatar } from './ui/Avatar';
import { spring } from '../lib/motion';
import { usePrefersReducedMotion } from '../lib/useReducedMotionPref';
import type { LeaderboardMe } from '../services/leaderboard';

function hint(me: LeaderboardMe): string {
  if (me.rank === 1) return "You're in the lead — keep it up!";
  if (me.xp === 0) return 'Earn XP to get on the board';
  if (me.xpToPodium != null && me.xpToNext != null && me.xpToPodium > me.xpToNext) {
    return `${me.xpToNext} XP to reach #${me.rank - 1} · ${me.xpToPodium} to the top 3`;
  }
  if (me.xpToPodium != null) return `${me.xpToPodium} XP to reach the top 3`;
  return `${me.xpToNext} XP to reach #${me.rank - 1}`;
}

/** Pinned "Your rank" bar, shown above the mobile tab bar while the user's own row is off screen. */
export function YourRankBar({ me }: { me: LeaderboardMe }) {
  const reduceMotion = usePrefersReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={reduceMotion ? undefined : { y: 24, opacity: 0 }}
      transition={reduceMotion ? { duration: 0 } : spring.soft}
      className="fixed inset-x-0 z-20 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] lg:bottom-0 lg:left-60 px-4 pb-2 lg:pb-4 pointer-events-none"
    >
      <div className="max-w-xl mx-auto pointer-events-auto flex items-center gap-3 rounded-card bg-ink-900 text-paper px-4 py-3 shadow-raised font-ui">
        <span className="font-display font-bold text-heading tabular-nums">#{me.rank}</span>
        <Avatar name={me.name} src={me.avatarUrl} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">Your rank · {me.xp.toLocaleString()} XP</p>
          <p className="text-xs text-paper/70 truncate">{hint(me)}</p>
        </div>
      </div>
    </motion.div>
  );
}
