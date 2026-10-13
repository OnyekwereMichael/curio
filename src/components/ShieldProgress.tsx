import { useState } from 'react';
import { Shield, Info } from 'lucide-react';
import { ShieldExplainerModal } from './ShieldExplainerModal';

const MAX_SHIELDS = 2;
const DAYS_PER_SHIELD = 7;

interface Props {
  currentStreak: number;
  shieldCount: number;
}

export function ShieldProgress({ currentStreak, shieldCount }: Props) {
  const [open, setOpen] = useState(false);

  let content: React.ReactNode;

  if (shieldCount >= MAX_SHIELDS) {
    content = (
      <div className="flex items-center gap-2 text-xs    text-faded-ink cursor-pointer">
        <Shield size={14} className="text-moss cursor-pointer" />
        <span>Shields full ({MAX_SHIELDS}/{MAX_SHIELDS}). Your streak is well protected.</span>
        <Info size={12} className="opacity-60   cursor-pointer text-[#d8492f]" />
      </div>
    );
  } else {
    const daysIntoCycle = currentStreak % DAYS_PER_SHIELD;
    const daysLeft = DAYS_PER_SHIELD - daysIntoCycle;
    const progress = (daysIntoCycle / DAYS_PER_SHIELD) * 100;

    content = (
      <div className="flex flex-col gap-1.5 max-w-xs cursor-pointer">
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-moss flex-shrink-0 cursor-pointer" />
          <div className="flex-1 h-1.5 bg-ink/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-moss rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <span className="text-xs text-ink flex items-center gap-1.5">
          {daysLeft} day{daysLeft !== 1 ? 's' : ''} to your next Shield
          <Info size={12} className="opacity-60 cursor-pointer text-[#d8492f]" />
        </span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="How Shields work"
        className="text-left rounded-md hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-moss/40"
      >
        {content}
      </button>

      <ShieldExplainerModal
        open={open}
        onClose={() => setOpen(false)}
        currentStreak={currentStreak}
        shieldCount={shieldCount}
      />
    </>
  );
}