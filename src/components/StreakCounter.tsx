import { Flame } from 'lucide-react';
import { cn } from '../lib/utils';

interface StreakCounterProps {
    count: number;
    justIncremented?: boolean;
}

export function StreakCounter({ count, justIncremented }: StreakCounterProps) {
    return (
        <div className="relative group flex items-center">
            <div
                className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gold-stamp/10 transition-transform duration-300 cursor-help",
                    justIncremented && "scale-110"
                )}
            >
                <span className="relative inline-flex items-center justify-center">
                    {/* soft glow pulsing behind the flame */}
                    <span className="absolute inset-0 rounded-full bg-gold-stamp/40 blur-sm animate-flame-glow" />
                    <Flame
                        size={16}
                        className="relative text-gold-stamp animate-flame-flicker origin-bottom"
                    />
                </span>
                <span className="font-mono text-sm font-semibold text-ink">{count}</span>
            </div>

            {/* Tooltip */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-3 bg-paper border border-ink/10 text-ink text-xs rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-lg pointer-events-none">
                <p className="font-semibold mb-1 text-sm">Learning Streak</p>
                <p className="text-faded-ink">Your streak increases for each consecutive day you visit Curio. Keep it up!</p>
            </div>
        </div>
    );
}