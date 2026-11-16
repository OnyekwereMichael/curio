import { useRef, useState } from 'react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { Otter } from '../../components/Otter';
import { Button } from '../../components/ui/Button';
import { QuizQuestionCard } from '../../components/QuizQuestionCard';
import { startQuiz, answerQuiz, type QuizQuestion, type QuizResult } from '../../services/quiz';
import { syncXpAndNotify } from '../../services/xp';

type Stage = 'loading' | 'nothing' | 'intro' | 'asking' | 'done';

/** Spaced-repetition session: the server picks the due words, grades each answer and schedules the next review. */
export function ReviewSessionPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('loading');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [result, setResult] = useState<QuizResult | null>(null);
  const sessionId = useRef<string | null>(null);
  const finalResult = useRef<QuizResult | null>(null);

  useEffect(() => {
    startQuiz('review')
      .then((s) => {
        sessionId.current = s.session_id;
        setQuestions(s.questions);
        setIndex(s.answered);
        setStage(s.answered > 0 ? 'asking' : 'intro');
      })
      .catch((e) => {
        console.error('startQuiz(review) failed', e);
        setStage('nothing');
      });
  }, []);

  async function grade(option: string) {
    const graded = await answerQuiz(sessionId.current!, questions[index].idx, option);
    if (graded.done) finalResult.current = graded.result;
    return { correct: graded.correct, correctAnswer: graded.correct_answer };
  }

  function handleAnswered(wasCorrect: boolean) {
    if (wasCorrect) setCorrect((c) => c + 1);
    if (index + 1 >= questions.length) {
      setResult(finalResult.current);
      setStage('done');
      syncXpAndNotify();
    } else {
      setIndex((i) => i + 1);
    }
  }

  return (
    <AppShell title="Review">
      <div className="py-5 max-w-md mx-auto w-full flex flex-col gap-5 min-h-[70vh]">
        {stage === 'asking' && (
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/collection')} aria-label="Close" className="text-ink-500 hover:text-ink-900">
              <X size={20} />
            </button>
            <div className="flex-1 h-1.5 rounded-full bg-ink-900/10 overflow-hidden">
              <div
                className="h-full bg-gold-500 rounded-full transition-all duration-300"
                style={{ width: `${(index / questions.length) * 100}%` }}
              />
            </div>
            <span className="text-xs text-ink-500 font-ui flex-shrink-0">
              {index + 1}/{questions.length}
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

        {stage === 'intro' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
            <Otter mood="thinking" size={88} />
            <h1 className="font-display text-title font-bold text-ink-900">Today's review</h1>
            <p className="text-sm text-ink-500 max-w-xs">
              {questions.length} saved word{questions.length !== 1 ? 's' : ''} ready to practise. Answer each question; the ones you
              get right come back later.
            </p>
            <Button onClick={() => setStage('asking')} className="w-full">
              Start today's review
            </Button>
            <button onClick={() => navigate('/collection')} className="text-sm text-ink-500 hover:text-ink-900 font-ui">
              Not now
            </button>
          </div>
        )}

        {stage === 'asking' && questions[index] && (
          <div className="flex-1 flex flex-col justify-center">
            <QuizQuestionCard
              key={index}
              question={questions[index].question}
              options={questions[index].options}
              onSelect={grade}
              onAnswered={handleAnswered}
            />
          </div>
        )}

        {stage === 'done' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
            <Otter mood="proud" size={100} />
            <h1 className="font-display text-title font-bold text-ink-900">
              {correct} of {questions.length} recalled.
            </h1>
            <p className="text-sm text-ink-500 max-w-xs">
              Words you got right come back later; the ones you missed return tomorrow.
              {result && result.xp > 0 ? ` +${result.xp} XP.` : ''}
            </p>
            <Button onClick={() => navigate('/collection')} className="w-full">
              Back to my pouch
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
