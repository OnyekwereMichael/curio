import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { DailyStamp } from './DailyStamp';
import { cn } from '../lib/utils';
import { useFactCardInteractions } from './useFactInteractions';
import { ShareCardModal } from './ShareCardModal';


interface FactCardProps {
  id: string;
  imageUrl: string;
  hookLine: string;
  contextLine: string;
  bullets: [string, string, string, string];
  className?: string;
  variant?: 'new' | 'old';
  onSavedChange?: (saved: boolean) => void;
}

export function FactCard({ id, imageUrl, hookLine, contextLine, bullets, className, variant = 'new', onSavedChange }: FactCardProps) {
  const { isSaved, saveFlash, toggleSave } = useFactCardInteractions(id, onSavedChange);
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <>
      <div className={cn(
        "bg-surface rounded-card shadow-card border border-line relative overflow-hidden flex flex-col font-ui",
        className
      )}>
        <div className="absolute top-4 right-4 z-10">
          <DailyStamp variant={variant} />
        </div>

        <div className="h-44 bg-moss-50 w-full relative overflow-hidden">
          {imageUrl ? (
            <img src={imageUrl} alt="Fact illustration" className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-ink-500">
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
              </svg>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-surface/60 to-transparent" />
        </div>

        <div className="p-6 flex flex-col gap-4">
          <div>
            <div className="text-ink-500 text-xs font-bold tracking-wider uppercase mb-2 font-ui">
              Fact of the day
            </div>

            <h3 className="font-display text-title font-bold text-ink-900 leading-[1.7] mb-2">
              {hookLine}
            </h3>

            <p className="text-ink-500 text-sm leading-[1.8] font-ui">{contextLine}</p>
          </div>

          <div className="h-px bg-line" />

          <ul className="flex flex-col gap-2.5">
            {bullets.map((bullet, idx) => (
              <li key={idx} className="flex gap-3 text-sm text-ink-900/90 leading-relaxed">
                <span className="text-ink-500 mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-ink-500" aria-hidden="true" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>

          {/* Share + Save, tucked below the reading content */}
       {/* Drop this in place of your existing fact card action row. Needs: Share2 from lucide-react, and cn. */}
<div className="pt-4 border-t border-line flex items-center gap-2 sm:justify-end font-ui">
  <button
    onClick={() => setShareOpen(true)}
    className="flex-1 sm:flex-none h-10 px-5 rounded-control border border-line-strong text-ink-900 text-sm font-semibold whitespace-nowrap inline-flex items-center justify-center gap-2 hover:bg-ink-900/5 active:bg-ink-900/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-900/30 cursor-pointer!"
    aria-label="Share this fact"
    type="button"
  >
    <Share2 size={15} aria-hidden="true" />
    Share
  </button>

  <button
    onClick={toggleSave}
    className={cn(
      'flex-1 sm:flex-none h-10 px-5 rounded-control border text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-paper cursor-pointer!',
      saveFlash
        ? 'border-gold-500 bg-gold-50 text-gold-700 focus-visible:ring-gold-500/50'
        : isSaved
          ? 'border-ember-500/30 bg-ember-50 text-ember-600 hover:bg-ember-50 focus-visible:ring-ember-500/40'
          : 'border-ember-600 bg-ember-600 text-on-ember hover:brightness-105 active:brightness-95 focus-visible:ring-ember-500/50'
    )}
    aria-pressed={isSaved}
    aria-label={isSaved ? 'Remove from collection' : 'Save to collection'}
    type="button"
  >
    {isSaved ? 'Saved' : 'Save'}
  </button>
</div>
        </div>
      </div>

      <ShareCardModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        data={{
          type: 'fact',
          hookLine,
          contextLine,
          bullets: [...bullets],
        }}
      />
    </>
  );
}