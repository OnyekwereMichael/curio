import { useEffect, useRef, useState } from 'react';
import { XP_GAINED_EVENT, xpReasonMessage, type XpGainedDetail } from '../services/xp';

/** A short "+N XP" note after XP is earned, or the reason when an action paid less or nothing. */
export function XpToast() {
  const [note, setNote] = useState<{ text: string; good: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const onGain = (e: Event) => {
      const { gained, reason } = (e as CustomEvent<XpGainedDetail>).detail;
      const why = xpReasonMessage(reason);
      const text = gained > 0 ? `+${gained} XP${reason === 'halved' ? ' (half rate)' : ''}` : why;
      if (!text) return;
      setNote({ text, good: gained > 0 });
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setNote(null), gained > 0 ? 2200 : 4500);
    };
    window.addEventListener(XP_GAINED_EVENT, onGain);
    return () => {
      window.removeEventListener(XP_GAINED_EVENT, onGain);
      clearTimeout(timer.current);
    };
  }, []);

  if (!note) return null;
  return (
    <div className="fixed inset-x-0 bottom-24 lg:bottom-8 z-40 flex justify-center px-4 pointer-events-none" role="status" aria-live="polite">
      <div
        className={
          note.good
            ? 'rounded-full bg-gold-50 text-gold-700 border border-gold-500/30 px-4 py-2 text-sm font-bold font-ui shadow-card'
            : 'rounded-card bg-surface text-ink-900 border border-line px-4 py-2.5 text-sm font-ui shadow-card max-w-sm text-center'
        }
      >
        {note.text}
      </div>
    </div>
  );
}
