import { Flame, Shield } from 'lucide-react';
import { cn } from '../lib/utils';

interface StreakCounterProps {
  count: number;
  shieldCount?: number;
  justIncremented?: boolean;
}

export function StreakCounter({ count, shieldCount = 0, justIncremented }: StreakCounterProps) {
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
        <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-moss/10">
          <Shield size={14} className="text-moss" />
          <span className="font-mono text-sm font-semibold text-ink">{shieldCount}</span>
        </div>
      )}
    </div>
  );
}