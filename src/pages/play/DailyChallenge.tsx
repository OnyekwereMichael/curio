import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Share2, Flame } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { Otter } from '../../components/Otter';
import { Button } from '../../components/ui/Button';
import { ShareCardModal } from '../../components/ShareCardModal';
import { getDailyChallenge, submitChallengeAnswer, type DailyChallengeState } from '../../services/dailyChallenge';
import { syncXpAndNotify } from '../../services/xp';
import { cn } from '../../lib/utils';

const FEEDBACK_MS = 1100;

/** Today's five-question word challenge: same questions for everyone, one attempt, shareable result. */
export function DailyChallengePage() {
  const navigate = useNavigate();
  const [state, setState] = useState<DailyChallengeState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [picked, setPicked] = useState<{ option: string; correct: boolean; correctAnswer: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const xpSynced = useRef(false);

  useEffect(() => {
    getDailyChallenge()
      .then((s) => {
        setState(s);
        if (s.answered > 0) setStarted(true); // resume where they left off
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load today\'s challenge.'));
  }, []);

  useEffect(() => {
    if (state?.completed && !xpSynced.current) {
      xpSynced.current = true;
      syncXpAndNotify();
    }
  }, [state?.completed]);

  async function handleAnswer(option: string) {
    if (!state || picked || submitting) return;
    const index = state.answered;
    setSubmitting(true);
    try {
      const result = await submitChallengeAnswer(index, option);
      setPicked({ option, correct: result.correct, correctAnswer: result.correctAnswer });
      setTimeout(() => {
        setPicked(null);
        setState((s) =>
          s
            ? {
                ...s,
                answered: s.answered + 1,
                score: result.score,
                completed: result.completed,
                streak: result.streak ?? s.streak,
              }
            : s
        );
      }, FEEDBACK_MS);
    } catch (e) {
      console.warn('submitChallengeAnswer failed', e);
      // Re-sync with the server (e.g. the answer was already recorded).
      getDailyChallenge().then(setState).catch(() => undefined);
    } finally {
      setSubmitting(false);
    }
  }

  const shell = (children: React.ReactNode) => (
    <AppShell title="Daily challenge">
      <div className="px-4 py-5 max-w-md mx-auto w-full flex flex-col gap-5 min-h-[70vh]">{children}</div>
    </AppShell>
  );

  if (error) {
    return shell(
      <div className="flex flex-col items-center text-center gap-4 py-10">
        <Otter mood="sleepy" size={80} />
        <p className="text-sm text-ink-900 font-ui">{error}</p>
        <Button onClick={() => navigate('/play')}>Back to Play</Button>
      </div>
    );
  }
  if (!state) {
    return shell(
      <div className="flex flex-col items-center justify-center text-center gap-3 py-24">
        <Otter mood="thinking" size={72} breathe />
        <p className="text-sm text-ink-500">Fetching today's challenge…</p>
      </div>
    );
  }

  const { number, total, score, streak } = state;
  const header = (
    <div className="flex items-center justify-between">
      <h1 className="font-display text-title font-bold text-ink-900">Daily challenge #{number}</h1>
      <button onClick={() => navigate('/play')} aria-label="Close" className="text-ink-500 hover:text-ink-900">
        <X size={20} />
      </button>
    </div>
  );

  // --- Finished ---
  if (state.completed) {
    const perfect = score === total;
    const xp = score * 10 + (perfect ? 10 : 0);
    return shell(
      <>
        {header}
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
          <Otter mood={perfect ? 'cheering' : score >= Math.ceil(total / 2) ? 'proud' : 'supportive'} size={96} />
          <h2 className="font-display text-display font-bold text-ink-900">
            {score}/{total}
          </h2>
          <div className="flex gap-2">
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className={cn('w-8 h-8 rounded-tag', i < score ? 'bg-moss-600' : 'border-2 border-line-strong')} />
            ))}
          </div>
          <p className="text-sm text-ink-500 max-w-xs">
            {perfect ? 'A perfect run.' : 'Nicely done.'} A new challenge unlocks tomorrow.
          </p>
          <div className="flex items-center gap-2 font-ui">
            <span className="text-xs font-semibold text-gold-700 bg-gold-50 px-3 py-1.5 rounded-tag">+{xp} XP</span>
            {streak > 0 && (
              <span className="text-xs font-semibold text-ember-600 bg-ember-50 px-3 py-1.5 rounded-tag flex items-center gap-1">
                <Flame size={12} /> {streak}-day challenge streak
              </span>
            )}
          </div>
          <div className="flex gap-3 w-full mt-2">
            <button
              onClick={() => navigate('/play')}
              className="flex-1 py-3 rounded-control border border-line-strong text-sm font-semibold text-ink-900 hover:bg-ink-900/5 transition-colors"
            >
              Back to Play
            </button>
            <Button onClick={() => setShareOpen(true)} className="flex-1">
              <Share2 size={15} /> Share result
            </Button>
          </div>
        </div>
        <ShareCardModal
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
          data={{ type: 'dailyChallenge', challengeNumber: number, score, total, streak }}
        />
      </>
    );
  }

  // --- Intro ---
  if (!started) {
    return shell(
      <>
        {header}
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
          <Otter mood="idle" size={96} />
          <h2 className="font-display text-heading font-bold text-ink-900">{total} words. One try.</h2>
          <p className="text-sm text-ink-500 max-w-xs">
            Everyone gets the same questions today. Pick the word that matches each definition, then share your score.
          </p>
          {streak > 0 && (
            <span className="text-xs font-semibold text-ember-600 bg-ember-50 px-3 py-1.5 rounded-tag flex items-center gap-1 font-ui">
              <Flame size={12} /> {streak}-day challenge streak
            </span>
          )}
          <Button onClick={() => setStarted(true)} className="w-full mt-2">
            Start
          </Button>
        </div>
      </>
    );
  }

  // --- Playing ---
  const question = state.questions[state.answered];
  if (!question) return null;

  return shell(
    <>
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/play')} aria-label="Close" className="text-ink-500 hover:text-ink-900">
          <X size={20} />
        </button>
        <div className="flex-1 h-1.5 rounded-full bg-ink-900/10 overflow-hidden">
          <div className="h-full bg-gold-500 rounded-full transition-all duration-300" style={{ width: `${(state.answered / total) * 100}%` }} />
        </div>
        <span className="text-xs text-ink-500 font-ui flex-shrink-0">
          {state.answered + 1}/{total}
        </span>
      </div>

      <div className="bg-ink-900 text-paper rounded-card p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-gold-500 mb-2">Which word means</p>
        <p className="font-display text-lg font-bold leading-snug">{question.question}</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {question.options.map((opt) => {
          const isCorrect = picked ? opt === picked.correctAnswer : false;
          const isPicked = picked?.option === opt;
          return (
            <button
              key={opt}
              onClick={() => handleAnswer(opt)}
              disabled={!!picked || submitting}
              className={cn(
                'rounded-card border-2 py-4 px-3 text-sm font-semibold transition-colors',
                !picked && 'border-line bg-surface text-ink-900 hover:border-line-strong',
                picked && isCorrect && 'border-moss-600 bg-moss-50 text-moss-600',
                picked && isPicked && !isCorrect && 'border-ember-500 bg-ember-50 text-ember-600',
                picked && !isPicked && !isCorrect && 'border-line bg-surface text-ink-500 opacity-50'
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </>
  );
}
