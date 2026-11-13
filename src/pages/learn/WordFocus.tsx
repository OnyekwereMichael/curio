import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ChevronLeft, Volume2, Bookmark, Share2, Check } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { Button } from '../../components/ui/Button';
import { useTodaysWords, type Word } from '../home/hooks';
import { useWordCardInteractions } from '../../components/useWordCardInteractions';
import { ShareCardModal } from '../../components/ShareCardModal';
import { cn } from '../../lib/utils';
import { syncXpAndNotify } from '../../services/xp';

/**
 * Focused, full-screen reading view for today's words. The daily plan holds
 * words_per_day words (just one for users who haven't been through
 * onboarding); each gets its own card, advanced with "Got it".
 */
export function WordFocusScreen() {
  const navigate = useNavigate();
  const todaysWords = useTodaysWords();
  const [index, setIndex] = useState(0);
  const total = todaysWords.data.length;
  const word = todaysWords.data[index] ?? null;

  function handleDone() {
    if (index < total - 1) setIndex(index + 1);
    else navigate('/home');
  }

  return (
    <AppShell title="Today's word">
      <div className="px-4 py-5 max-w-lg mx-auto w-full flex flex-col gap-5">
        <button
          onClick={() => navigate('/home')}
          className="flex items-center gap-1 text-ink-500 hover:text-ink-900 transition-colors text-sm font-ui self-start"
        >
          <ChevronLeft size={18} />
          Today
        </button>

        {todaysWords.loading ? (
          <div className="bg-surface rounded-card shadow-card border border-line p-6 animate-pulse h-80" />
        ) : !word ? (
          <div className="bg-surface rounded-card shadow-card border border-line p-6 text-center text-ink-500 py-12 font-ui">
            Today's word is on its way — check back soon.
          </div>
        ) : (
          // key resets the card's save/known/audio state for each new word
          <WordFocusCard key={word.id} word={word} index={index} total={total} onDone={handleDone} />
        )}
      </div>
    </AppShell>
  );
}

function WordFocusCard({ word, index, total, onDone }: { word: Word; index: number; total: number; onDone: () => void }) {
  const { isSaved, isKnown, isPlaying, toggleSave, markKnown, play } = useWordCardInteractions(
    word.id,
    word.pronunciation_audio_url,
    undefined,
    word.word
  );
  const [shareOpen, setShareOpen] = useState(false);
  const isLast = index >= total - 1;

  async function handleGotIt() {
    if (!isKnown) await markKnown();
    syncXpAndNotify(); // quest progress + badges; never blocks the flow
    onDone();
  }

  return (
    <>
      <div className="bg-surface rounded-sheet shadow-raised border border-line p-6 flex flex-col gap-6 min-h-[420px]">
        <div>
          <div className="text-xs font-bold tracking-wider uppercase mb-2 text-ember-600 font-ui">
            {total > 1 ? `Word ${index + 1} of ${total}` : "Today's word"}
          </div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-word-hero font-semibold text-ink-900 leading-tight">{word.word}</h1>
            <button
              onClick={play}
              className={cn(
                'p-2 rounded-full transition-colors flex-shrink-0',
                isPlaying ? 'text-ember-600/70 bg-ember-50 animate-pulse' : 'text-ember-600 hover:bg-ember-50'
              )}
              aria-label="Play pronunciation"
            >
              <Volume2 size={22} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <p className="text-lg text-ink-900 leading-relaxed">{word.definition}</p>

        <div className="h-px bg-line" />

        <div>
          <div className="text-ink-500 text-xs font-bold uppercase mb-2 font-ui">In a sentence</div>
          <p className="text-ink-900/80 text-base leading-relaxed italic">"{word.example_sentence}"</p>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-3 pt-4 border-t border-line font-ui">
          <button
            onClick={toggleSave}
            className={cn(
              'w-11 h-11 rounded-control border flex items-center justify-center transition-colors',
              isSaved ? 'border-ember-500/30 bg-ember-50 text-ember-600' : 'border-line-strong text-ink-900 hover:bg-ink-900/5'
            )}
            aria-pressed={isSaved}
            aria-label={isSaved ? 'Remove from collection' : 'Save to collection'}
          >
            <Bookmark size={18} fill={isSaved ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={() => setShareOpen(true)}
            className="w-11 h-11 rounded-control border border-line-strong text-ink-900 hover:bg-ink-900/5 flex items-center justify-center transition-colors"
            aria-label="Share this word"
          >
            <Share2 size={18} />
          </button>
          <Button onClick={handleGotIt} className="flex-1">
            {isLast ? (isKnown ? <><Check size={16} /> Got it</> : 'Got it') : 'Got it — next word'}
          </Button>
        </div>
      </div>

      <ShareCardModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        data={{
          type: 'word',
          word: word.word,
          definition: word.definition,
          exampleSentence: word.example_sentence,
        }}
      />
    </>
  );
}
