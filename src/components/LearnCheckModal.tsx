import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { QuizQuestionCard } from './QuizQuestionCard';
import { Button } from './ui/Button';
import { startQuiz, answerQuiz, CooldownError, type QuizQuestion, type QuizResult } from '../services/quiz';
import { syncXpAndNotify } from '../services/xp';
import { COOLDOWN_LABEL, COOLDOWN_SECONDS, formatCountdown } from '../services/wordCooldown';

interface Props {
  wordId: string;
  word: string;
  onClose: () => void;
  onPassed: () => void;
  /** A failed check: seconds until the next try, from the server. */
  onFailed?: (retrySeconds: number) => void;
}

type Phase = 'loading' | 'asking' | 'passed' | 'failed' | 'cooldown' | 'error';

/**
 * "Got it" has to be earned: two short questions on the word, graded by the server.
 * Only a pass marks the word known and awards XP; a miss locks the word for three minutes (server-enforced).
 */
export function LearnCheckModal({ wordId, word, onClose, onPassed, onFailed }: Props) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [message, setMessage] = useState('');
  const sessionId = useRef<string | null>(null);
  const finalResult = useRef<QuizResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    startQuiz('learn', wordId)
      .then((s) => {
        if (cancelled) return;
        sessionId.current = s.session_id;
        setQuestions(s.questions);
        setStep(s.answered);
        setPhase('asking');
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof CooldownError) {
          setMessage(`Review "${word}" again and come back when the timer ends. Try again in ${formatCountdown(e.seconds)}.`);
          onFailed?.(e.seconds);
          setPhase('cooldown');
        } else {
          setMessage(e instanceof Error ? e.message : 'Something went wrong.');
          setPhase('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [wordId, word]);

  async function grade(option: string) {
    const graded = await answerQuiz(sessionId.current!, questions[step].idx, option);
    if (graded.done) finalResult.current = graded.result;
    return { correct: graded.correct, correctAnswer: graded.correct_answer };
  }

  function handleAnswered() {
    if (step + 1 < questions.length) {
      setStep(step + 1);
      return;
    }
    const r = finalResult.current;
    setResult(r);
    if (r?.passed) {
      setPhase('passed');
      onPassed();
      syncXpAndNotify();
    } else {
      onFailed?.(r?.retry_seconds ?? COOLDOWN_SECONDS);
      setPhase('failed');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink-900/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md bg-paper rounded-sheet border border-line shadow-raised p-5 flex flex-col gap-4 font-ui">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-ember-600">
            Check: {word}
            {phase === 'asking' && questions.length > 1 ? ` · ${step + 1} of ${questions.length}` : ''}
          </p>
          <button onClick={onClose} aria-label="Close" className="text-ink-500 hover:text-ink-900">
            <X size={18} />
          </button>
        </div>

        {phase === 'loading' && <p className="py-8 text-center text-sm text-ink-500">Getting your questions…</p>}

        {phase === 'asking' && questions[step] && (
          <QuizQuestionCard
            key={step}
            question={questions[step].question}
            options={questions[step].options}
            onSelect={grade}
            onAnswered={handleAnswered}
          />
        )}

        {phase === 'passed' && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="font-display text-xl font-bold text-moss-600">You know it.</p>
            <p className="text-sm text-ink-500">
              {result && result.xp > 0 ? `+${result.xp} XP earned.` : 'Marked as known.'}
            </p>
            <Button onClick={onClose} className="w-full">Continue</Button>
          </div>
        )}

        {phase === 'failed' && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="font-display text-xl font-bold text-ink-900">Not quite yet.</p>
            <p className="text-sm text-ink-500">
              Review the word again and come back when the timer ends ({COOLDOWN_LABEL}). XP is only for words you can recall.
            </p>
            <Button onClick={onClose} className="w-full">Continue</Button>
          </div>
        )}

        {(phase === 'cooldown' || phase === 'error') && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="text-sm text-ink-500">{message}</p>
            <Button onClick={onClose} className="w-full">Continue</Button>
          </div>
        )}
      </div>
    </div>
  );
}
