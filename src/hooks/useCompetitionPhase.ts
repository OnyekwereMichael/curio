import { useEffect, useState } from 'react';
import { getCompetitionPhase, type CompetitionPhase } from '../lib/leaderboardConfig';

/**
 * 'upcoming' until the configured start, then 'live' — flips on its own while
 * the page is open, so no redeploy or reload is needed at launch.
 */
export function useCompetitionPhase(): CompetitionPhase {
  const [phase, setPhase] = useState<CompetitionPhase>(() => getCompetitionPhase());

  useEffect(() => {
    if (phase === 'live') return;
    const id = setInterval(() => setPhase(getCompetitionPhase()), 1000);
    return () => clearInterval(id);
  }, [phase]);

  return phase;
}
