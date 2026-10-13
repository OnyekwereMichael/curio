import { Shield } from 'lucide-react';

const MAX_SHIELDS = 2;
const DAYS_PER_SHIELD = 7;

interface Props {
  currentStreak: number;
  shieldCount: number;
}

export function ShieldProgress({ currentStreak, shieldCount }: Props) {
  // Shield storage is full, so there's nothing to work toward.
  if (shieldCount >= MAX_SHIELDS) {
    return (
      <div className="flex items-center gap-2 text-xs text-faded-ink">
        <Shield size={14} className="text-moss" />
        <span>Shields full ({MAX_SHIELDS}/{MAX_SHIELDS}). Your streak is well protected.</span>
      </div>
    );
  }

  const daysIntoCycle = currentStreak % DAYS_PER_SHIELD;
  const daysLeft = DAYS_PER_SHIELD - daysIntoCycle;
  const progress = (daysIntoCycle / DAYS_PER_SHIELD) * 100;

  return (
    <div className="flex flex-col gap-1.5 max-w-xs">
      <div className="flex items-center gap-2">
        <Shield size={14} className="text-moss flex-shrink-0" />
        <div className="flex-1 h-1.5 bg-ink/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-moss rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <span className="text-xs text-faded-ink">
        {daysLeft} day{daysLeft !== 1 ? 's' : ''} to your next Shield
      </span>
    </div>
  );
}