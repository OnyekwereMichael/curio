import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { Otter } from '../../components/Otter';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { getReviewQueue, rateReview, nextIntervalLabel, MASTERY_LABEL, type ReviewQueueItem, type RecallRating } from '../../services/review';
import { syncXpAndNotify } from '../../services/xp';
import { cn } from '../../lib/utils';

type Stage = 'loading' | 'nothing' | 'recall' | 'revealed' | 'done';

/** Spaced-repetition session over the user's due saved words; ratings are saved via rate_review. */
export function ReviewSessionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stage, setStage] = useState<Stage>('loading');
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<RecallRating[]>([]);

  useEffect(() => {
    if (!user) return;
    getReviewQueue(user.id)
      .then((items) => {
        setQueue(items);
        setStage(items.length === 0 ? 'nothing' : 'recall');
      })
      .catch((e) => {
        console.error('getReviewQueue failed', e);
        setStage('nothing');
      });
  }, [user]);

  function handleRate(rating: RecallRating) {
    setResults((prev) => [...prev, rating]);
    // Saved in the background so the session never stalls on the network.
    rateReview(queue[index].word.id, rating)
      .then(() => (index + 1 >= queue.length ? syncXpAndNotify() : undefined))
      .catch((e) => console.error('rateReview failed', e));
    if (index + 1 >= queue.length) {
      setStage('done');
    } else {
      setIndex((i) => i + 1);
      setStage('recall');
    }
  }

  const current = queue[index];
  const knewIt = results.filter((r) => r === 'knew-it').length;

  return (
    <AppShell title="Review">
      <div className="px-4 py-5 max-w-md mx-auto w-full flex flex-col gap-5 min-h-[70vh]">
        {stage !== 'loading' && stage !== 'nothing' && stage !== 'done' && (
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/collection')} aria-label="Close" className="text-ink-500 hover:text-ink-900">
              <X size={20} />
            </button>
            <div className="flex-1 h-1.5 rounded-full bg-ink-900/10 overflow-hidden">
              <div
                className="h-full bg-gold-500 rounded-full transition-all duration-300"
                style={{ width: `${(index / queue.length) * 100}%` }}
              />
            </div>
            <span className="text-xs text-ink-500 font-ui flex-shrink-0">
              {index + 1}/{queue.length}
            </span>
          </div>
        )}

        {stage === 'loading' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
            <Otter mood="thinking" size={72} breathe />
            <p className="text-sm text-ink-500">Turning the pebble over…</p>
          </div>
        )}

        {stage === 'nothing' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
            <Otter mood="sleepy" size={88} />
            <h1 className="font-display text-title font-bold text-ink-900">All caught up</h1>
            <p className="text-sm text-ink-500 max-w-xs">Nothing is due today. Save a few more words to build your review queue.</p>
            <Button onClick={() => navigate('/collection')} className="mt-2">
              Back to my pouch
            </Button>
          </div>
        )}

        {stage === 'recall' && current && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
            <p className="text-xs font-bold uppercase tracking-wider text-gold-700">{current.mastery === 'new' ? 'First review' : `${MASTERY_LABEL[current.mastery]} · seen before`}</p>
            <h2 className="font-display text-5xl font-bold text-ink-900">{current.word.word}</h2>
            <p className="text-sm text-ink-500">Say what it means in your head, then tap</p>
            <button
              onClick={() => setStage('revealed')}
              className="mt-4 px-6 py-3 rounded-control bg-ink-900 text-paper text-sm font-semibold hover:brightness-110 transition-all"
            >
              Reveal
            </button>
          </div>
        )}

        {stage === 'revealed' && current && (
          <div className="flex-1 flex flex-col gap-6">
            <div className="flex-1 flex flex-col justify-center gap-4 text-center">
              <h2 className="font-display text-4xl font-bold text-ink-900">{current.word.word}</h2>
              <p className="text-ink-900 text-lg">{current.word.definition}</p>
              <p className="text-ink-900/70 text-sm italic">"{current.word.example_sentence}"</p>
            </div>
            <p className="text-xs text-ink-500 text-center">How well did you know it?</p>
            <div className="flex gap-2">
              {(['not-yet', 'sort-of', 'knew-it'] as RecallRating[]).map((rating) => (
                <button
                  key={rating}
                  onClick={() => handleRate(rating)}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-0.5 rounded-control border-2 py-3 text-sm font-semibold transition-colors',
                    rating === 'knew-it'
                      ? 'border-moss-600 bg-moss-600 text-paper hover:brightness-110'
                      : 'border-line-strong text-ink-900 hover:bg-ink-900/5'
                  )}
                >
                  <span>{rating === 'not-yet' ? 'Not yet' : rating === 'sort-of' ? 'Sort of' : 'Knew it'}</span>
                  <span className={cn('text-[10px] font-normal', rating === 'knew-it' ? 'text-paper/70' : 'text-ink-500')}>
                    {nextIntervalLabel(current.intervalStep, rating)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {stage === 'done' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
            <Otter mood="proud" size={100} />
            <h1 className="font-display text-title font-bold text-ink-900">
              {queue.length} reviewed. {knewIt} mastered.
            </h1>
            <div className="bg-surface rounded-card border border-line shadow-card divide-y divide-line w-full font-ui">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-ink-500">Knew it</span>
                <span className="text-sm font-semibold text-ink-900">{results.filter((r) => r === 'knew-it').length}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-ink-500">Sort of</span>
                <span className="text-sm font-semibold text-ink-900">{results.filter((r) => r === 'sort-of').length}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-ink-500">Not yet</span>
                <span className="text-sm font-semibold text-ink-900">{results.filter((r) => r === 'not-yet').length}</span>
              </div>
            </div>
            <Button onClick={() => navigate('/collection')} className="w-full">
              Back to my pouch
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
