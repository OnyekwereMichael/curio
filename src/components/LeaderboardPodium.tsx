import type { Ref } from 'react';
import { motion } from 'framer-motion';
import { Crown, Medal } from 'lucide-react';
import { Avatar } from './ui/Avatar';
import { PrizeChip } from './PrizeChip';
import { cn } from '../lib/utils';
import { spring } from '../lib/motion';
import { usePrefersReducedMotion } from '../lib/useReducedMotionPref';
import type { LeaderboardEntry } from '../services/leaderboard';

// Visual order is 2nd · 1st · 3rd; 1st is raised and has the biggest avatar.
const SLOTS = {
  1: { avatar: 'xl', ring: 'ring-gold-500', glow: 'shadow-[0_0_28px_var(--gold-500)]', accent: 'text-gold-500', pad: 'pt-0', step: 'h-16 text-title', delay: 0.15 },
  2: { avatar: 'lg', ring: 'ring-ink-500', glow: '', accent: 'text-ink-500', pad: 'pt-8', step: 'h-10 text-heading', delay: 0.05 },
  3: { avatar: 'lg', ring: 'ring-ember-600', glow: '', accent: 'text-ember-600', pad: 'pt-8', step: 'h-8 text-heading', delay: 0.1 },
} as const;

function PodiumSpot({ entry, prize, meRef, reduceMotion }: { entry: LeaderboardEntry; prize: number | null; meRef?: Ref<HTMLDivElement>; reduceMotion: boolean }) {
  const place = entry.rank as 1 | 2 | 3;
  const slot = SLOTS[place];
  const Icon = place === 1 ? Crown : Medal;

  return (
    <motion.div
      ref={entry.isMe ? meRef : undefined}
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : { ...spring.soft, delay: slot.delay }}
      className={cn('flex flex-col items-center gap-1.5 flex-1 min-w-0', slot.pad)}
    >
      <Icon size={place === 1 ? 26 : 20} className={slot.accent} fill={place === 1 ? 'currentColor' : 'none'} aria-label={`Place ${place}`} />
      <Avatar
        name={entry.name}
        src={entry.avatarUrl}
        size={slot.avatar}
        className={cn('ring-[3px] ring-offset-2 ring-offset-paper', slot.ring, slot.glow)}
      />
      <p className="text-sm font-semibold text-ink-900 truncate max-w-full">{entry.isMe ? 'You' : entry.name}</p>
      <p className={cn('font-display font-bold tabular-nums text-ink-900', place === 1 ? 'text-title' : 'text-heading')}>
        {entry.xp.toLocaleString()}
        <span className="text-xs font-ui font-semibold text-ink-500 ml-1">XP</span>
      </p>
      {prize != null && <PrizeChip place={place} amount={prize} size={place === 1 ? 'md' : 'sm'} />}
      <div className={cn('w-full rounded-t-card bg-surface border border-line border-b-0 flex items-start justify-center font-display font-bold', slot.accent, slot.step)}>
        <span className="mt-1">{place}</span>
      </div>
    </motion.div>
  );
}

interface LeaderboardPodiumProps {
  /** The top three entries in rank order (fewer is fine). */
  entries: LeaderboardEntry[];
  /** Attached to the current user's spot so the page can tell if they're on screen. */
  meRef?: Ref<HTMLDivElement>;
  /** Prize shown under each winner; return null for none (e.g. not yet eligible). */
  prizeFor?: (entry: LeaderboardEntry) => number | null;
}

/** Top-3 podium: 1st in the centre, large avatars, crown/medal accents, a gold glow on the winner and an optional prize chip. */
export function LeaderboardPodium({ entries, meRef, prizeFor }: LeaderboardPodiumProps) {
  const reduceMotion = usePrefersReducedMotion();
  const byRank = (r: number) => entries.find((e) => e.rank === r);
  const order = [byRank(2), byRank(1), byRank(3)];

  return (
    <div className="flex items-end gap-2 sm:gap-4 px-2 pt-2">
      {order.map((entry, i) =>
        entry ? <PodiumSpot key={entry.id} entry={entry} prize={prizeFor?.(entry) ?? null} meRef={meRef} reduceMotion={reduceMotion} /> : <div key={i} className="flex-1" />
      )}
    </div>
  );
}
