import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ChevronLeft, Volume2, Share2, Check } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { Button } from '../../components/ui/Button';
import { useTodaysWords, type Word } from '../home/hooks';
import { useWordCardInteractions } from '../../components/useWordCardInteractions';
import { ShareCardModal } from '../../components/ShareCardModal';
import { cn } from '../../lib/utils';
import { QuizModal } from '../../components/QuizModal';
import { useWordCooldown } from '../../hooks/useWordCooldown';
import { useSaveItem } from '../../hooks/useSaveItem';
import { SaveItemButton, saveHelperText } from '../../components/SaveItemButton';
import { SaveToReviewPrompt } from '../../components/SaveToReviewPrompt';
import { Skeleton } from '../../components/ui/Skeleton';

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
      <div className="py-5 max-w-lg mx-auto w-full flex flex-col gap-5">
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
  const { isKnown, isPlaying, markKnownLocal, play } = useWordCardInteractions(
    word.id,
    word.pronunciation_audio_url,
    word.word
  );
  const save = useSaveItem('word', word.id, { source: 'word_focus' });
  const [shareOpen, setShareOpen] = useState(false);
  const [checkOpen, setCheckOpen] = useState(false);
  const cooldown = useWordCooldown(word.id);
  const isLast = index >= total - 1;

  // "Got it" has to be earned: an unknown word opens a short server-graded check first.
  function handleGotIt() {
    if (isKnown) onDone();
    else save.requestTest(() => setCheckOpen(true));
  }

  return (
    <>
      <div className="bg-surface rounded-sheet shadow-raised border border-line p-6 flex flex-col gap-6 min-h-[420px]">
        <div>
          <div className="text-xs font-bold tracking-wider uppercase mb-2 text-ember-600 font-ui">
            {total > 1 ? `Word ${index + 1} of ${total}` : "Today's word"}
          </div>
          {/* While the test is open the word, meaning and sentence are not rendered at all (not just blurred),
              so they can't be selected, read aloud or seen through any gap. Placeholders keep the layout steady. */}
          {checkOpen ? (
            <Skeleton className="h-11 w-48" />
          ) : (
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
          )}
        </div>

        {checkOpen ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-11/12" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        ) : (
          <p className="text-lg text-ink-900 leading-relaxed">{word.definition}</p>
        )}

        <div className="h-px bg-line" />

        <div>
          <div className="text-ink-500 text-xs font-bold uppercase mb-2 font-ui">In a sentence</div>
          {checkOpen ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : (
            <p className="text-ink-900/80 text-base leading-relaxed italic">"{word.example_sentence}"</p>
          )}
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-3 pt-4 border-t border-line font-ui">
          <SaveItemButton itemType="word" saved={save.isSaved} loading={save.loading} flash={save.saveFlash} onToggle={save.toggle} />
          <p className="text-xs text-ink-500 leading-snug" role="status">
            {saveHelperText('word', save.isSaved)}
          </p>
        </div>

        {save.promptOpen && <SaveToReviewPrompt itemType="word" onSaveAndTest={save.saveAndTest} onJustTest={save.justTest} />}

        <div className="flex items-center gap-3 font-ui">
          <button
            onClick={() => setShareOpen(true)}
            className="w-11 h-11 rounded-control border border-line-strong text-ink-900 hover:bg-ink-900/5 flex items-center justify-center transition-colors"
            aria-label="Share this word"
          >
            <Share2 size={18} />
          </button>
          <Button onClick={handleGotIt} disabled={!isKnown && cooldown.locked} className="flex-1 tabular-nums">
            {isKnown ? (
              <><Check size={16} /> {isLast ? 'Done' : 'Next word'}</>
            ) : cooldown.locked ? (
              `Try again in ${cooldown.label}`
            ) : (
              'Test me'
            )}
          </Button>
        </div>
        {!isKnown && cooldown.locked && (
          <p className="text-sm text-ink-500 text-center font-ui" role="status">
            Review the word again and come back when the timer ends.
          </p>
        )}
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

      {checkOpen && (
        <QuizModal itemType="word" itemId={word.id} name={word.word}
          onPassed={markKnownLocal}
          onFailed={cooldown.startLocal}
          onClose={() => {
            setCheckOpen(false);
            // Only move on once the word is learned; after a miss, stay so the word can be reviewed during the cooldown.
            if (isKnown) onDone();
          }}
        />
      )}
    </>
  );
}
