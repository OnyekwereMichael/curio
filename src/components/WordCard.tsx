import { Volume2, Bookmark, Check } from 'lucide-react';
import { DailyStamp } from './DailyStamp';
import { cn } from '../lib/utils';
import { useWordCardInteractions } from './useWordCardInteractions';

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

  const labelColor = variant === 'new' ? 'text-ember' : 'text-faded-ink';

  return (
    <div className={cn(
      "bg-paper rounded-xl p-6 shadow-sm border border-ink/5 relative overflow-hidden flex flex-col gap-4 font-ui",
      className
    )}>
      <div className="absolute top-4 right-4 z-10 flex items-center gap-3">
        <button
          onClick={toggleSave}
          className="text-faded-ink hover:text-ink transition-colors"
          aria-label={isSaved ? "Unsave" : "Save"}
          type="button"
        >
          <Bookmark
            size={20}
            className={cn(
              "transition-all duration-300",
              saveFlash ? "fill-current text-gold-stamp scale-110" :
                isSaved ? "fill-current text-ember scale-100" : "fill-transparent scale-100"
            )}
          />
        </button>
        <DailyStamp variant={variant} />
      </div>

      <div className="pr-16">
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
            <Volume2 size={20} strokeWidth={2.5} />
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

      {/* Quick Recall */}
      <div className="pt-4 border-t border-ink/8">
        {!isKnown ? (
          <button
            onClick={markKnown}
            className="text-sm font-bold text-ember hover:text-ember/80 transition-colors flex items-center gap-2"
            type="button"
          >
            <span>Got it</span>
            <span role="img" aria-label="thumbs up">👍</span>
          </button>
        ) : (
          <div className="text-sm font-bold text-moss flex items-center gap-2">
            <Check size={16} />
            <span>Marked as known</span>
          </div>
        )}
      </div>
    </div>
  );
}