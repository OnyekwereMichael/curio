import { useState } from 'react';
import { Volume2, Check, Share2 } from 'lucide-react';
import { DailyStamp } from './DailyStamp';
import { cn } from '../lib/utils';
import { useWordCardInteractions } from './useWordCardInteractions';
import { ShareCardModal } from './ShareCardModal';

interface WordCardProps {
  id: string;
  word: string;
  definition: string;
  exampleSentence: string;
  audioUrl?: string;
  className?: string;
  variant?: 'new' | 'old';
  label?: string;
  onSavedChange?: (saved: boolean) => void;
}

export function WordCard({ id, word, definition, exampleSentence, audioUrl, className, variant = 'new', label, onSavedChange }: WordCardProps) {
  const { isSaved, saveFlash, isKnown, isPlaying, toggleSave, markKnown, play } = useWordCardInteractions(id, audioUrl, onSavedChange, word);
  const [shareOpen, setShareOpen] = useState(false);

  const labelColor = variant === 'new' ? 'text-ember-600' : 'text-ink-500';

  return (
    <>
      <div className={cn(
        "bg-surface rounded-card p-6 shadow-card border border-line relative overflow-hidden flex flex-col gap-4 font-ui",
        className
      )}>
        <div className="absolute top-4 right-4 z-10">
          <DailyStamp variant={variant} />
        </div>

        <div className="pr-14">
          {label && (
            <div className={cn("text-xs font-bold tracking-wider uppercase mb-2 font-ui", labelColor)}>
              {label}
            </div>
          )}

          <div className="flex items-center gap-2">
            <h3 className="font-display text-word-hero font-semibold text-ink-900 leading-tight">{word}</h3>
            <button
              onClick={play}
              className={cn(
                "p-2 rounded-full transition-colors flex-shrink-0",
                isPlaying ? "text-ember-600/70 bg-ember-50 animate-pulse" :
                  "text-ember-600 hover:bg-ember-50 hover:text-ember-700"
              )}
              aria-label="Play pronunciation"
              type="button"
            >
              <Volume2 size={20} strokeWidth={2.5} className="cursor-pointer" />
            </button>
          </div>
        </div>

        <div>
          <p className="text-ink-900 leading-relaxed mb-4">{definition}</p>

          <div className="text-ink-500 text-xs font-bold uppercase mb-2 font-ui">
            How to use in a sentence
          </div>
          <div className="pl-4 border-l-2 border-ember-500/25">
            <p className="text-ink-900/80 text-sm leading-relaxed italic">"{exampleSentence}"</p>
          </div>
        </div>

        {/* Quick Recall + Share + Save */}
      {/* Drop this in place of your existing action row. Needs: Check, Share2 from lucide-react, and cn. */}
<div className="pt-4 border-t border-line flex flex-wrap items-center gap-3 sm:flex-nowrap font-ui">
  {/* Primary action: full width on mobile, left-aligned on larger screens */}
  {!isKnown ? (
    <button
      onClick={markKnown}
      className="w-full sm:w-auto sm:mr-auto h-10 px-5 rounded-control bg-ember-600 text-on-ember text-sm font-semibold whitespace-nowrap hover:brightness-105 active:brightness-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
      type="button"
    >
      Got it
    </button>
  ) : (
    <div
      className="w-full sm:w-auto sm:mr-auto h-10 px-4 rounded-control bg-moss-50 text-moss-600 text-sm font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer!"
      role="status"
    >
      <Check size={16} aria-hidden="true" />
      Marked as known
    </div>
  )}

  {/* Secondary actions: share the second row equally on mobile */}
  <button
    onClick={() => setShareOpen(true)}
    className="flex-1 sm:flex-none h-10 px-4 rounded-control border border-line-strong text-ink-900 text-sm font-semibold whitespace-nowrap inline-flex items-center justify-center gap-2 hover:bg-ink-900/5 active:bg-ink-900/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-900/30 cursor-pointer!"
    aria-label="Share this word"
    type="button"
  >
    <Share2 size={15} aria-hidden="true" />
    Share
  </button>

  <button
    onClick={toggleSave}
    className={cn(
      'flex-1 sm:flex-none h-10 px-4 rounded-control border text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-900/30 cursor-pointer!',
      saveFlash
        ? 'border-gold-500 bg-gold-50 text-gold-700'
        : isSaved
          ? 'border-ember-500/30 bg-ember-50 text-ember-600 hover:bg-ember-50'
          : 'border-line-strong text-ink-900 hover:bg-ink-900/5 active:bg-ink-900/10'
    )}
    aria-pressed={isSaved}
    aria-label={isSaved ? 'Remove from collection' : 'Save to collection'}
    type="button"
  >
    {isSaved ? 'Saved' : 'Save'}
  </button>
</div>
      </div>

      <ShareCardModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        data={{
          type: 'word',
          word,
          definition,
          exampleSentence,
        }}
      />
    </>
  );
}