import { Timer } from 'lucide-react';
import { useCountdown } from '../hooks/useCountdown';

const pad = (n: number) => String(n).padStart(2, '0');

/** Live "week ends in" timer. Renders nothing until the end date is known. */
export function WeekCountdown({ endsAt }: { endsAt: Date | null }) {
  const { days, hours, minutes, seconds, done } = useCountdown(endsAt);
  if (!endsAt) return null;

  return (
    <div className="inline-flex self-start items-center gap-1.5 rounded-full bg-ink-900/5 px-3 py-1.5 text-xs font-ui text-ink-500" role="timer" aria-live="off">
      <Timer size={13} />
      <span>{done ? 'New week starting…' : 'Resets in'}</span>
      {!done && (
        <span className="font-semibold text-ink-900 tabular-nums">
          {days > 0 && `${days}d `}
          {pad(hours)}:{pad(minutes)}:{pad(seconds)}
        </span>
      )}
    </div>
  );
}
