import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { QuizQuestionCard } from './QuizQuestionCard';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { startItemQuiz, answerQuiz, CooldownError, type QuizQuestion, type QuizResult } from '../services/quiz';
import { latestXpEventAt, syncXpAndNotify, xpLinesSince, xpReasonMessage, type XpLine } from '../services/xp';
import { useSaveItem } from '../hooks/useSaveItem';
import { track } from '../lib/analytics';
import { COOLDOWN_LABEL, COOLDOWN_SECONDS, formatCountdown } from '../services/wordCooldown';
import type { ItemType } from '../services/savedItems';

interface Props {
  itemType: ItemType;
  itemId: string;
  /** What to call it in the cooldown message: the word itself, or "this fact". */
  name: string;
  onClose: () => void;
  onPassed: () => void;
  /** A failed check: seconds until the next try, from the server. */
  onFailed?: (retrySeconds: number) => void;
}

type Phase = 'loading' | 'asking' | 'passed' | 'failed' | 'cooldown' | 'error';

const COPY: Record<ItemType, { dialog: string; passed: string; passedNoXp: string; failed: string }> = {
  word: {
    dialog: 'Word check',
    passed: 'You know it.',
    passedNoXp: 'Marked as known.',
    failed: 'Review the word again and come back when the timer ends',
  },
  fact: {
    dialog: 'Fact check',
    passed: 'You got it.',
    passedNoXp: 'Fact complete.',
    failed: 'Read the fact again and come back when the timer ends',
  },
};

/**
 * "Got it" has to be earned: two short questions on the word or fact, graded by the server.
 * Only a pass counts as learned and can earn XP; a miss locks the item for a few minutes (server-enforced).
 * While this is open the thing being asked about is not on the page behind it (the caller hides it), so it can't be read.
 */
export function QuizModal({ itemType, itemId, name, onClose, onPassed, onFailed }: Props) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [message, setMessage] = useState('');
  const [lines, setLines] = useState<XpLine[]>([]);
  const baseline = useRef<Promise<string | null | undefined> | null>(null);
  const sessionId = useRef<string | null>(null);
  const finalResult = useRef<QuizResult | null>(null);
  const save = useSaveItem(itemType, itemId, { source: 'result' });
  const copy = COPY[itemType];

  // Second chance to get the item into Review; hidden once it's saved.
  const saveToReview = !save.isSaved && (
    <Button variant="secondary" onClick={save.toggle} className="w-full min-h-11 py-2">
      Save to Review
    </Button>
  );

  useEffect(() => {
    let cancelled = false;
    baseline.current = latestXpEventAt().catch(() => undefined); // undefined = unknown, so show no split rather than old XP
    startItemQuiz(itemType, itemId)
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
          setMessage(`Review ${name} again and come back when the timer ends. Try again in ${formatCountdown(e.seconds)}.`);
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
  }, [itemType, itemId, name]);

  async function grade(option: string) {
    const graded = await answerQuiz(sessionId.current!, questions[step].idx, option, questions[step].token);
    if (graded.done) finalResult.current = graded.result;
    return { correct: graded.correct, correctAnswer: graded.correct_answer, explanation: graded.explanation };
  }

  function handleAnswered() {
    if (step + 1 < questions.length) {
      setStep(step + 1);
      return;
    }
    const r = finalResult.current;
    setResult(r);
    if (itemType === 'fact') track('fact_quiz_completed', { fact_id: itemId, passed: !!r?.passed, score: r?.score, total: r?.total });
    if (r?.passed) {
      setPhase('passed');
      onPassed();
      // Quest and badge XP are paid by the sync, so list everything the server paid after the sync finishes.
      syncXpAndNotify()
        .then(async () => {
          const since = await baseline.current;
          if (since !== undefined) setLines(await xpLinesSince(since));
        })
        .catch(() => undefined);
    } else {
      onFailed?.(r?.retry_seconds ?? COOLDOWN_SECONDS);
      setPhase('failed');
    }
  }

  const reasonMessage = xpReasonMessage(result?.reason, itemType);

  return (
    <Modal open onClose={onClose} variant="test" label={copy.dialog}>
      <div className="w-full max-w-md bg-paper rounded-sheet border border-line shadow-raised p-5 flex flex-col gap-4 font-ui">
        <div className="flex items-center justify-between">
          {/* No name here: for a fill-in-the-blank question the word is the answer. */}
          <p className="text-xs font-bold uppercase tracking-wider text-ember-600">
            Quick check
            {phase === 'asking' && questions.length > 1 ? ` · ${step + 1} of ${questions.length}` : ''}
          </p>
          <button onClick={onClose} aria-label="Close" className="min-h-11 min-w-11 flex items-center justify-center text-ink-500 hover:text-ink-900">
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
            continueLabel={step + 1 < questions.length ? 'Next question' : 'See result'}
          />
        )}

        {phase === 'passed' && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="font-display text-xl font-bold text-moss-600">{copy.passed}</p>
            {lines.length > 0 ? (
              <ul className="w-full text-sm text-left divide-y divide-line rounded-control border border-line bg-surface" aria-label="XP earned">
                {lines.map((l) => (
                  <li key={l.label} className="flex items-center justify-between px-3 py-2">
                    <span className="text-ink-900">{l.label}</span>
                    <span className="font-semibold text-gold-700">+{l.amount} XP</span>
                  </li>
                ))}
                {lines.length > 1 && (
                  <li className="flex items-center justify-between px-3 py-2 font-bold">
                    <span>Total</span>
                    <span className="text-gold-700">+{lines.reduce((n, l) => n + l.amount, 0)} XP</span>
                  </li>
                )}
              </ul>
            ) : (
              <p className="text-sm text-ink-500">{result && result.xp > 0 ? `+${result.xp} XP earned.` : copy.passedNoXp}</p>
            )}
            {reasonMessage && (
              <p className="text-xs text-ink-500" role="status">
                {reasonMessage}
              </p>
            )}
            {saveToReview}
            <Button onClick={onClose} className="w-full min-h-11">
              Continue
            </Button>
          </div>
        )}

        {phase === 'failed' && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="font-display text-xl font-bold text-ink-900">Not quite yet.</p>
            <p className="text-sm text-ink-500">
              {copy.failed} ({COOLDOWN_LABEL}). XP is only for {itemType === 'fact' ? 'facts' : 'words'} you can recall.
            </p>
            {saveToReview}
            <Button onClick={onClose} className="w-full min-h-11">
              Continue
            </Button>
          </div>
        )}

        {(phase === 'cooldown' || phase === 'error') && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="text-sm text-ink-500">{message}</p>
            <Button onClick={onClose} className="w-full min-h-11">
              Continue
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
