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
  const { isSaved, saveFlash, isKnown, isPlaying, toggleSave, markKnown, play } = useWordCardInteractions(id, audioUrl, onSavedChange);
  const [shareOpen, setShareOpen] = useState(false);

  const labelColor = variant === 'new' ? 'text-ember' : 'text-faded-ink';

  return (
    <>
      <div className={cn(
        "bg-paper rounded-xl p-6 shadow-sm border border-ink/5 relative overflow-hidden flex flex-col gap-4 font-ui",
        className
      )}>
        <div className="absolute top-4 right-4 z-10">
          <DailyStamp variant={variant} />
        </div>

        <div className="pr-14">
          {label && (
            <div className={cn("text-xs font-bold tracking-wider uppercase mb-2", labelColor)}>
              {label}
            </div>
          )}

          <div className="flex items-center gap-2">
            <h3 className="font-display text-2xl font-bold text-ink leading-tight">{word}</h3>
            <button
              onClick={play}
              disabled={!audioUrl}
              className={cn(
                "p-2 rounded-full transition-colors flex-shrink-0",
                !audioUrl ? "text-faded-ink/40 cursor-not-allowed" :
                  isPlaying ? "text-ember/70 bg-ember/10 animate-pulse" :
                    "text-ember hover:bg-ember/5 hover:text-ember/80"
              )}
              aria-label="Play pronunciation"
              type="button"
            >
              <Volume2 size={20} strokeWidth={2.5} className="cursor-pointer" />
            </button>
          </div>
        </div>

        <div>
          <p className="text-ink leading-relaxed mb-4">{definition}</p>

          <div className="text-faded-ink text-xs font-bold  uppercase mb-2">
            How to use in a sentence
          </div>
          <div className="pl-4 border-l-2 border-ember/25">
            <p className="text-ink/80  text-sm leading-relaxed">"{exampleSentence}"</p>
          </div>
        </div>

        {/* Quick Recall + Share + Save */}
      {/* Drop this in place of your existing action row. Needs: Check, Share2 from lucide-react, and cn. */}
<div className="pt-4 border-t border-ink/10 flex flex-wrap items-center gap-3 sm:flex-nowrap">
  {/* Primary action: full width on mobile, left-aligned on larger screens */}
  {!isKnown ? (
    <button
      onClick={markKnown}
      className="w-full sm:w-auto sm:mr-auto h-10 px-5 rounded-xl bg-ember text-paper text-sm font-semibold whitespace-nowrap hover:bg-ember/90 active:bg-ember/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
      type="button"
    >
      Got it
    </button>
  ) : (
    <div
      className="w-full sm:w-auto sm:mr-auto h-10 px-4 rounded-xl bg-moss/10 text-moss text-sm font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer!"
      role="status"
    >
      <Check size={16} aria-hidden="true" />
      Marked as known
    </div>
  )}

  {/* Secondary actions: share the second row equally on mobile */}
  <button
    onClick={() => setShareOpen(true)}
    className="flex-1 sm:flex-none h-10 px-4 rounded-xl border border-ink/15 text-ink text-sm font-semibold whitespace-nowrap inline-flex items-center justify-center gap-2 hover:bg-ink/5 active:bg-ink/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 cursor-pointer!"
    aria-label="Share this word"
    type="button"
  >
    <Share2 size={15} aria-hidden="true" />
    Share
  </button>

  <button
    onClick={toggleSave}
    className={cn(
      'flex-1 sm:flex-none h-10 px-4 rounded-xl border text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 cursor-pointer!',
      saveFlash
        ? 'border-gold-stamp bg-gold-stamp/10 text-gold-stamp'
        : isSaved
          ? 'border-ember/30 bg-ember/5 text-ember hover:bg-ember/10'
          : 'border-ink/15 text-ink hover:bg-ink/5 active:bg-ink/10'
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