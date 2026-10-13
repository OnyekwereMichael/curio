import { useState } from 'react';
import { Flame, Shield } from 'lucide-react';
import { cn } from '../lib/utils';
import { ShieldExplainerModal } from './ShieldExplainerModal';

interface StreakCounterProps {
  count: number;
  shieldCount?: number;
  justIncremented?: boolean;
}

export function StreakCounter({ count, shieldCount = 0, justIncremented }: StreakCounterProps) {
  const [shieldModalOpen, setShieldModalOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gold-stamp/10 transition-transform duration-300",
          justIncremented && "scale-110"
        )}
      >
        <Flame size={16} className="text-gold-stamp" />
        <span className="font-mono text-sm font-semibold text-ink">{count}</span>
      </div>

      {shieldCount > 0 && (
        <button
          type="button"
          onClick={() => setShieldModalOpen(true)}
          aria-label="How Shields work"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-moss/10 hover:bg-moss/15 transition-colors"
        >
          <Shield size={14} className="text-moss cursor-pointer" />
          <span className="font-mono text-sm font-semibold text-ink">{shieldCount}</span>
        </button>
      )}

      <ShieldExplainerModal
        open={shieldModalOpen}
        onClose={() => setShieldModalOpen(false)}
        currentStreak={count}
        shieldCount={shieldCount}
      />
    </div>
  );
}