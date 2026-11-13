import { CalendarClock, Crown, Medal } from 'lucide-react';
import { PrizeChip } from './PrizeChip';
import { Reveal } from './Reveal';
import { SectionHeader } from './SectionHeader';
import { Button } from './ui/Button';
import { useCompetitionPhase } from '../hooks/useCompetitionPhase';
import { useGetStarted } from '../hooks/useGetStarted';
import { COMPETITION, WEEKLY_PRIZES, competitionStatusText, formatPrize } from '../lib/leaderboardConfig';
import { cn } from '../lib/utils';

// Podium order 2nd · 1st · 3rd; step heights echo the in-app leaderboard.
const PODIUM = [
  { place: 2, step: 'h-16', accent: 'text-cream-dim' },
  { place: 1, step: 'h-24', accent: 'text-gold-500' },
  { place: 3, step: 'h-12', accent: 'text-ember-500' },
] as const;

/** Weekly-prize spotlight. Amounts, start date and minimum XP all come from leaderboardConfig. */
export function PrizesSpotlight() {
  const phase = useCompetitionPhase();
  const getStarted = useGetStarted();
  const amountFor = (place: number) => WEEKLY_PRIZES.find((p) => p.place === place)?.amount ?? 0;

  return (
    <section id="prizes" className="scroll-mt-24 py-24 px-6">
      <div className="max-w-5xl mx-auto relative overflow-hidden rounded-sheet bg-night text-cream shadow-raised px-6 py-14 sm:px-12">
        <div aria-hidden="true" className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-gold-500/15 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-ember-500/10 blur-3xl" />

        <div className="relative grid lg:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col gap-6 items-start">
            <SectionHeader
              onDark
              align="left"
              eyebrow="Weekly prizes"
              title="Learn every day. Win every week."
              description="Earn XP, climb the global leaderboard, and finish in the top 3 to win cash prizes."
            />
            <Reveal className="flex flex-col gap-4 items-start">
              <span className="inline-flex items-center gap-2 rounded-full bg-cream/10 px-3 py-1.5 text-xs font-semibold font-ui text-gold-500">
                <CalendarClock size={14} aria-hidden="true" />
                {competitionStatusText(phase)}
              </span>
              <p className="text-sm text-cream-dim font-ui max-w-sm">
                The week resets every Monday at 12:00 AM Lagos time. Earn at least {COMPETITION.minWeeklyXp} XP to qualify.
              </p>
              <Button onClick={getStarted.go}>{getStarted.signedIn ? 'See the leaderboard' : 'Start climbing'}</Button>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <ul aria-label="Weekly prizes" className="flex items-end justify-center gap-3 sm:gap-5 list-none p-0 m-0">
              {PODIUM.map(({ place, step, accent }) => (
                <li key={place} className="flex-1 max-w-[9.5rem] flex flex-col items-center gap-2 font-ui">
                  {place === 1 ? <Crown size={28} className={accent} fill="currentColor" aria-hidden="true" /> : <Medal size={22} className={accent} aria-hidden="true" />}
                  <span className="sr-only">{`Place ${place}: ${formatPrize(amountFor(place))}`}</span>
                  <PrizeChip place={place} amount={amountFor(place)} size="md" />
                  <div
                    aria-hidden="true"
                    className={cn('w-full rounded-t-card bg-cream/10 border border-cream/15 border-b-0 flex items-start justify-center pt-2 font-display font-bold text-title', step, accent)}
                  >
                    {place}
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
