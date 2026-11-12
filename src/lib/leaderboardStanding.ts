import { COMPETITION, WEEKLY_PRIZES, formatPrize, prizeFor, prizeForPlace } from './leaderboardConfig';
import type { LeaderboardMe } from '../services/leaderboard';

export interface Standing {
  /** Short, upbeat line. */
  headline: string;
  /** Supporting detail with the numbers. */
  detail: string;
  /** True when the user is currently in a prize position. */
  winning: boolean;
}

const THIRD_PLACE = WEEKLY_PRIZES.length;

/** What the user's weekly position means for prizes — shared by the leaderboard, rank bar and Home card. */
export function describeStanding(me: LeaderboardMe): Standing {
  const { rank, xp } = me;
  const needToQualify = Math.max(0, COMPETITION.minWeeklyXp - xp);

  if (rank <= THIRD_PLACE) {
    const prize = prizeFor(rank, xp);
    if (prize != null) {
      return {
        headline: rank === 1 ? `You're in the lead — on track to win ${formatPrize(prize)}` : `You're on track to win ${formatPrize(prize)}`,
        detail: rank === 1 ? 'Keep earning XP to hold your spot.' : `You're #${rank}. Climb higher for a bigger prize.`,
        winning: true,
      };
    }
    return {
      headline: `Earn ${needToQualify} more XP to qualify`,
      detail: `You're #${rank}. Prizes need at least ${COMPETITION.minWeeklyXp} XP this week.`,
      winning: false,
    };
  }

  const thirdPrize = prizeForPlace(THIRD_PLACE);
  const xpNeeded = Math.max(me.xpToPodium ?? 0, needToQualify);
  return {
    headline: `You're #${rank} this week`,
    detail: `${xpNeeded.toLocaleString()} XP to reach the top 3${thirdPrize != null ? ` and win ${formatPrize(thirdPrize)}` : ''}.`,
    winning: false,
  };
}
