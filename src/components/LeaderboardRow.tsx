import type { Ref } from 'react';
import { Flame } from 'lucide-react';
import { Avatar } from './ui/Avatar';
import { cn } from '../lib/utils';
import type { LeaderboardEntry } from '../services/leaderboard';

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/**
 * One ranked person: rank, avatar, name, XP. Same row styling as the friends
 * board (px-4 py-3, ember tint for "you"); meant to sit inside a
 * `divide-y divide-line` card.
 */
export function LeaderboardRow({ entry, className, ref }: LeaderboardRowProps) {
  return (
    <div ref={ref} className={cn('flex items-center justify-between gap-2 px-4 py-3 font-ui', entry.isMe && 'bg-ember-50/60', className)}>
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xs font-semibold text-ink-500 w-7 text-right tabular-nums">{entry.rank}</span>
        <Avatar name={entry.name} src={entry.avatarUrl} size="sm" />
        <span className="text-sm font-semibold text-ink-900 truncate">
          {entry.name}
          {entry.isMe && <span className="ml-1.5 text-xs font-medium text-ember-600">You</span>}
        </span>
      </div>
      <span className="text-sm font-semibold text-ink-900 flex items-center gap-1 flex-shrink-0 tabular-nums">
        <Flame size={13} className="text-gold-500" />
        {entry.xp.toLocaleString()} XP
      </span>
    </div>
  );
}
