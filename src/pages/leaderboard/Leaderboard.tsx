import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { CalendarClock, Trophy } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { ErrorState } from '../../components/ErrorState';
import { LeaderboardPodium } from '../../components/LeaderboardPodium';
import { LeaderboardRow } from '../../components/LeaderboardRow';
import { PrizeBanner } from '../../components/PrizeBanner';
import { StandingCallout } from '../../components/StandingCallout';
import { YourRankBar } from '../../components/YourRankBar';
import { EmptyState } from '../../components/ui/EmptyState';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { Skeleton } from '../../components/ui/Skeleton';
import { useCompetitionPhase } from '../../hooks/useCompetitionPhase';
import { useInView } from '../../hooks/useInView';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import { COMPETITION, LEADERBOARD_COPY, WEEKLY_PRIZES, prizeFor } from '../../lib/leaderboardConfig';
import type { LeaderboardPeriod } from '../../services/leaderboard';

const PERIOD_OPTIONS: { value: LeaderboardPeriod; label: string }[] = [
  { value: 'week', label: 'This week' },
  { value: 'all', label: 'All time' },
];

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="w-5 h-4" />
      <Skeleton className="w-8 h-8 rounded-full" />
      <Skeleton className="h-4 flex-1 max-w-[9rem]" />
      <Skeleton className="h-4 w-14 ml-auto" />
    </div>
  );
}

function SkeletonBoard() {
  return (
    <div aria-busy="true" className="flex flex-col gap-5">
      <div className="flex items-end gap-4 px-2 pt-2">
        <div className="flex-1 flex flex-col items-center gap-2 pt-8">
          <Skeleton className="w-14 h-14 rounded-full" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full rounded-b-none" />
        </div>
        <div className="flex-1 flex flex-col items-center gap-2">
          <Skeleton className="w-20 h-20 rounded-full" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-16 w-full rounded-b-none" />
        </div>
        <div className="flex-1 flex flex-col items-center gap-2 pt-8">
          <Skeleton className="w-14 h-14 rounded-full" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-full rounded-b-none" />
        </div>
      </div>
      <div className="bg-surface rounded-card border border-line shadow-card divide-y divide-line">
        {Array.from({ length: 6 }, (_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}

/** Global leaderboard: weekly (drives the prizes) and all-time, ranked by XP. */
export function LeaderboardPage() {
  const [period, setPeriod] = useState<LeaderboardPeriod>('week');
  const phase = useCompetitionPhase();
  const upcoming = phase === 'upcoming';
  const { rows, me, periodEnd, loading, loadingMore, error, hasMore, reload, loadMore } = useLeaderboard(period);

  // Pin "Your rank" whenever the user's own row (podium or list) isn't visible.
  // The bottom margin counts a row hidden behind the pinned bar / tab bar as off screen.
  const { ref: meRef, inView: meInView } = useInView<HTMLDivElement>('0px 0px -120px 0px');

  // Infinite scroll: load the next page when the sentinel nears the viewport.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(([e]) => e.isIntersecting && loadMore(), { rootMargin: '300px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore, rows.length]);

  const hasScores = rows.length > 0 && rows[0].xp > 0;
  const showBoard = !loading && !error && hasScores;
  const weeklyBoard = period === 'week';
  // The weekly board always shows the prizes; before launch it is a preview of this week's XP.
  const podiumPrize = weeklyBoard ? (e: { rank: number; xp: number }) => prizeFor(e.rank, e.xp) : undefined;

  return (
    <AppShell title="Leaderboard">
      <div className="px-4 py-5 w-full max-w-xl mx-auto flex flex-col gap-5">
        <header className="flex flex-col gap-1">
          <h1 className="font-display text-display font-bold text-ink-900 flex items-center gap-2">
            <Trophy size={26} className="text-gold-500" />
            {LEADERBOARD_COPY.title}
          </h1>
          <p className="text-sm text-ink-500 font-ui">{LEADERBOARD_COPY.subtitle}</p>
        </header>

        <SegmentedControl aria-label="Leaderboard period" options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />

        <PrizeBanner prizes={WEEKLY_PRIZES} phase={phase} countdownTo={upcoming ? COMPETITION.startsAt : periodEnd} />

        {weeklyBoard && upcoming && (
          <p className="flex items-start gap-2 rounded-control bg-gold-50 px-3 py-2 text-xs text-gold-700 font-ui">
            <CalendarClock size={14} className="flex-shrink-0 mt-0.5" />
            <span>
              <span className="font-semibold">Prizes start Monday.</span> This is a preview of this week’s ranking — the board resets when the competition begins at 12:00 AM Lagos time.
            </span>
          </p>
        )}

        {showBoard && weeklyBoard && !upcoming && me && <StandingCallout me={me} />}

        {loading && <SkeletonBoard />}

        {!loading && error && <ErrorState compact message="Couldn't load the leaderboard." onRetry={reload} />}

        {!loading && !error && !hasScores && (
          <EmptyState
            title={period === 'week' ? 'A fresh week, an empty board' : 'No one has earned XP yet'}
            message="Finish today's quiz to earn XP and take the first spot."
          />
        )}

        {showBoard && (
          <>
            <LeaderboardPodium entries={rows.slice(0, 3)} meRef={meRef} prizeFor={podiumPrize} />

            {rows.length > 3 && (
              <div className="bg-surface rounded-card border border-line shadow-card divide-y divide-line">
                {rows.slice(3).map((entry) => (
                  <LeaderboardRow key={entry.id} entry={entry} ref={entry.isMe ? meRef : undefined} />
                ))}
                {loadingMore && [0, 1, 2].map((i) => <SkeletonRow key={i} />)}
              </div>
            )}
            <div ref={sentinel} aria-hidden="true" />
          </>
        )}
      </div>

      <AnimatePresence>{showBoard && me && !meInView && <YourRankBar key="rank-bar" me={me} />}</AnimatePresence>
    </AppShell>
  );
}
