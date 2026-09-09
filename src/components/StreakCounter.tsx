import { Flame } from 'lucide-react';
import { cn } from '../lib/utils';

interface StreakCounterProps {
    count: number;
    justIncremented?: boolean;
}

export function StreakCounter({ count, justIncremented }: StreakCounterProps) {
    return (
        <div
            className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gold-stamp/10 transition-transform duration-300",
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
    );
}