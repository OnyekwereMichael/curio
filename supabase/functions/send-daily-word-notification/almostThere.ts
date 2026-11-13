// Decides whether a user gets the "almost there" notification instead of the
// normal word notification. Kept as a plain function so it can be tested alone.

// Keep this list the same as MILESTONES in src/lib/streakLogic.ts in the app.
export const MILESTONES = [7, 30, 60, 100];
const SHIELD_EVERY_DAYS = 7;
const MAX_SHIELDS = 2;

export interface NudgeUser {
  current_streak: number | null;
  last_active_date: string | null;
  last_milestone_shown: number | null;
  shield_count: number | null;
}

function dayBefore(date: string): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split("T")[0];
}

// Returns the message to send, or null if this user should get the normal one.
// "today" is a 'YYYY-MM-DD' date in UTC, the same way the app counts days.
export function getAlmostThereMessage(
  user: NudgeUser,
  today: string,
): { title: string; body: string } | null {
  const streak = user.current_streak ?? 0;
  if (streak <= 0) return null;

  // The streak must still be alive: they finished yesterday's quiz and have
  // not finished today's yet.
  if (user.last_active_date !== dayBefore(today)) return null;

  // Finishing today's quiz would take them to this number.
  const next = streak + 1;
  if (!MILESTONES.includes(next)) return null;

  // Already celebrated this one in the current streak.
  if (next <= (user.last_milestone_shown ?? 0)) return null;

  const earnsShield =
    next % SHIELD_EVERY_DAYS === 0 && (user.shield_count ?? 0) < MAX_SHIELDS;

  return {
    title: `One day from a ${next}-day streak`,
    body: earnsShield
      ? `Finish today's quiz to reach ${next} and earn a Streak Shield. Don't lose it now.`
      : `Finish today's quiz to reach ${next}. Don't lose it now.`,
  };
}