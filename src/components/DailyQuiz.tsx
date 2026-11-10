import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { QuizQuestionCard } from './QuizQuestionCard';
import { Otter, type OtterMood } from './Otter';
import { useWordQuizQuestion } from '../hooks/useWordQuizQuestion';
import { buildFactQuizQuestions } from '../hooks/useFactQuizQuestions';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/superbase';
import { createMilestoneImage, shareMilestone } from '../lib/milestoneShare';
import { estimateQuizXp } from '../services/xp';
import { PREVIEW_FEATURES } from '../lib/featureFlags';

interface Props {
    todaysWord: any;
    oldButGoldWord: any;
    todaysFact: any;
    oldButGoldFact: any;
    currentStreak: number;
    commitStreak: () => Promise<void>; // from useStreak() — called once, on completion
}

type QuizState = 'loading' | 'already-done' | 'start' | 'starting' | 'playing' | 'completed';
type Mood = 'idle' | 'happy' | 'sad';

const EMBER = '#C73B20';
const GOLD = '#C7962E';
const MOOD_TO_OTTER: Record<Mood, OtterMood> = { idle: 'idle', happy: 'cheering', sad: 'supportive' };

// ─────────────────────────────────────────────────────────
// Mascot — Curi the otter, swapped in for the three quiz moods.
// ─────────────────────────────────────────────────────────
function Mascot({ mood = 'idle', size = 80 }: { mood?: Mood; size?: number }) {
    return <Otter mood={MOOD_TO_OTTER[mood]} size={size} breathe={mood === 'idle'} />;
}

// ─────────────────────────────────────────────────────────
// Shared pieces
// ─────────────────────────────────────────────────────────

// Soft stage behind the mascot so it doesn't float on empty cream.
function Stage({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative flex items-center justify-center">
            <div
                className="absolute h-44 w-44 rounded-full"
                style={{ background: 'radial-gradient(circle, var(--ember-500) 0%, transparent 70%)', opacity: 0.1 }}
            />
            <div className="relative">{children}</div>
        </div>
    );
}

function Chip({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-900/[0.04] px-3 py-1.5 text-xs font-medium text-ink-900/70 font-ui">
            <span className="h-1.5 w-1.5 rounded-full bg-ember-600" />
            {children}
        </span>
    );
}

// Tactile 3D button — feels pressable, reads as the one primary action.
function PrimaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className="rounded-control bg-ember-600 px-10 py-4 text-base font-semibold text-on-ember font-ui transition-all duration-100 hover:brightness-105 active:translate-y-[4px] focus:outline-none focus-visible:ring-4 focus-visible:ring-ember-500/30"
            style={{ boxShadow: `0 5px 0 0 var(--ember-700)` }}
            onMouseDown={(e) => (e.currentTarget.style.boxShadow = `0 1px 0 0 var(--ember-700)`)}
            onMouseUp={(e) => (e.currentTarget.style.boxShadow = `0 5px 0 0 var(--ember-700)`)}
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = `0 5px 0 0 var(--ember-700)`)}
        >
            {children}
        </button>
    );
}

// Score ring — fills once on arrival; the result is the reward.
function ScoreRing({ score, total, perfect }: { score: number; total: number; perfect: boolean }) {
    const r = 52;
    const c = 2 * Math.PI * r;
    const pct = total > 0 ? score / total : 0;
    const color = perfect ? GOLD : EMBER;
    return (
        <div className="relative h-36 w-36">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
                <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(28,43,58,0.07)" strokeWidth="10" />
                <motion.circle
                    cx="60"
                    cy="60"
                    r={r}
                    fill="none"
                    stroke={color}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={c}
                    initial={{ strokeDashoffset: c }}
                    animate={{ strokeDashoffset: c * (1 - pct) }}
                    transition={{ duration: 1, delay: 0.25, ease: 'easeOut' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-4xl font-bold leading-none text-ink-900 tabular-nums">{score}</span>
                <span className="mt-1 text-xs font-medium text-ink-500 font-ui">out of {total}</span>
            </div>
        </div>
    );
}

// One-time confetti burst for a perfect score.
function Confetti() {
    const reduce = useReducedMotion();
    const pieces = useMemo(
        () =>
            Array.from({ length: 18 }, (_, i) => ({
                id: i,
                x: (Math.random() - 0.5) * 320,
                y: 120 + Math.random() * 140,
                rot: (Math.random() - 0.5) * 540,
                delay: Math.random() * 0.2,
                color: [EMBER, GOLD, '#3E6259', '#FBE7DF'][i % 4],
                round: i % 3 === 0,
            })),
        []
    );
    if (reduce) return null;
    return (
        <div className="pointer-events-none absolute left-1/2 top-24 z-10" aria-hidden="true">
            {pieces.map((p) => (
                <motion.span
                    key={p.id}
                    className={`absolute block h-2.5 w-2.5 ${p.round ? 'rounded-full' : 'rounded-[2px]'}`}
                    style={{ background: p.color }}
                    initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
                    animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rot, scale: 0.6 }}
                    transition={{ duration: 1.4, delay: p.delay, ease: 'easeOut' }}
                />
            ))}
        </div>
    );
}

// Feedback sits at the bottom so the question stays visible.
function AnswerFeedbackBanner({ correct }: { correct: boolean }) {
    return (
        <motion.div
            role="status"
            className={`absolute inset-x-3 bottom-3 z-20 flex items-center gap-3 rounded-card border px-4 py-2 shadow-raised backdrop-blur-sm font-ui ${
                correct ? 'border-moss-600/25 bg-surface/95' : 'border-line bg-surface/95'
            }`}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
        >
            <Mascot mood={correct ? 'happy' : 'sad'} size={36} />
            <div className="leading-tight">
                <p className={`font-display text-base font-bold ${correct ? 'text-moss-600' : 'text-ink-900'}`}>
                    {correct ? "That's right." : 'Not quite.'}
                </p>
                <p className="text-xs text-ink-500">
                    {correct ? 'Nice recall — on to the next one.' : "It sticks with repetition. Next one."}
                </p>
            </div>
        </motion.div>
    );
}

const cardBase = 'rounded-sheet bg-surface border border-line';

// ─────────────────────────────────────────────────────────
// DailyQuiz
// ─────────────────────────────────────────────────────────
export function DailyQuiz({ todaysWord, oldButGoldWord, todaysFact, oldButGoldFact, currentStreak, commitStreak }: Props) {
    const { user } = useAuth();
    const [state, setState] = useState<QuizState>('loading');
    const [correctCount, setCorrectCount] = useState(0);
    const [answeredCount, setAnsweredCount] = useState(0);
    const [results, setResults] = useState<boolean[]>([]);
    const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
    const [persistedScore, setPersistedScore] = useState<number | null>(null);
    const [dayFinished, setDayFinished] = useState(false);
    const [shareState, setShareState] = useState<'idle' | 'working' | 'shared' | 'copied' | 'failed'>('idle');

    async function handleShareDay() {
        setShareState('working');
        const image = await createMilestoneImage(currentStreak);
        const result = await shareMilestone(currentStreak, image);
        setShareState(result === 'shared' || result === 'copied' ? result : 'idle');
    }

    const { quiz: todaysWordQuiz } = useWordQuizQuestion(todaysWord);
    const { quiz: oldWordQuiz } = useWordQuizQuestion(oldButGoldWord);

    const todaysFactQuiz = useMemo(() => buildFactQuizQuestions(todaysFact, 1), [todaysFact]);
    const oldFactQuiz = useMemo(() => buildFactQuizQuestions(oldButGoldFact, 2), [oldButGoldFact]);

    const allQuestions = [todaysWordQuiz, oldWordQuiz, ...todaysFactQuiz, ...oldFactQuiz].filter(Boolean) as any[];

    useEffect(() => {
        if (!user) return;

        async function checkTodayStatus() {
            const today = new Date().toISOString().split('T')[0];
            const { data, error } = await supabase
                .from('user_activity_log')
                .select('quiz_completed, quiz_score')
                .eq('user_id', user!.id)
                .eq('activity_date', today)
                .limit(1);

            if (error) {
                console.error('Error fetching quiz status:', error);
            }

            if (data && data.length > 0 && data[0].quiz_completed) {
                setPersistedScore(data[0].quiz_score ?? null);
                setState('already-done');
            } else {
                setState('start');
            }
        }

        checkTodayStatus();
    }, [user]);

    function handleStart() {
        setState('starting');
        setTimeout(() => setState('playing'), 700);
    }

    async function handleAnswered(wasCorrect: boolean) {
        const newAnsweredCount = answeredCount + 1;
        const newCorrectCount = correctCount + (wasCorrect ? 1 : 0);
        setAnsweredCount(newAnsweredCount);
        setCorrectCount(newCorrectCount);
        setResults((prev) => [...prev, wasCorrect]);

        if (newAnsweredCount === allQuestions.length) {
            setState('completed');
            const wasPerfect = newCorrectCount === allQuestions.length;

            if (user) {
                const today = new Date().toISOString().split('T')[0];

                const { error: updateError, data: updateData } = await supabase
                    .from('user_activity_log')
                    .update({
                        quiz_completed: true,
                        quiz_score: newCorrectCount,
                        quiz_perfect: wasPerfect,
                    })
                    .eq('user_id', user.id)
                    .eq('activity_date', today)
                    .select();

                if (updateError || !updateData || updateData.length === 0) {
                    await supabase
                        .from('user_activity_log')
                        .upsert(
                            {
                                user_id: user.id,
                                activity_date: today,
                                quiz_completed: true,
                                quiz_score: newCorrectCount,
                                quiz_perfect: wasPerfect,
                            },
                            { onConflict: 'user_id,activity_date' }
                        );
                }

                await commitStreak();
            }
        }
    }

    function handleQuestionAnswered(wasCorrect: boolean) {
        setFeedback(wasCorrect ? 'correct' : 'incorrect');
        setTimeout(() => {
            setFeedback(null);
            handleAnswered(wasCorrect);
        }, 1100);
    }

    if (state === 'loading') return null;
    if (allQuestions.length === 0 && state !== 'already-done') return null;

    const total = allQuestions.length;
    const isPerfect = total > 0 && correctCount === total;
    const doneTotal = total > 0 ? total : 5;

    return (
        <section className="flex flex-col gap-5">
            <div>
                <h2 className="font-display text-2xl font-bold text-ink-900">Daily Quiz</h2>
                <p className="mt-1 text-sm text-ink-500 font-ui">
                    A quick recall check on what you've learned. No pressure — just practice to keep your streak alive.
                </p>
            </div>

            <AnimatePresence mode="wait">
                {/* ───────── Already done ───────── */}
                {state === 'already-done' && (
                    <motion.div
                        key="already-done"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`${cardBase} flex flex-col items-center gap-4 px-6 py-10 text-center`}
                    >
                        {persistedScore !== null ? (
                            <ScoreRing score={persistedScore} total={doneTotal} perfect={persistedScore === doneTotal} />
                        ) : (
                            <Stage>
                                <Mascot mood="idle" size={76} />
                            </Stage>
                        )}
                        <div>
                            <p className="font-display text-xl font-bold text-ink-900">Done for today</p>
                            <p className="mt-1 text-sm text-ink-500 font-ui">
                                {persistedScore !== null
                                    ? `You scored ${persistedScore} of ${doneTotal}. A new quiz unlocks tomorrow.`
                                    : 'A new quiz unlocks tomorrow.'}
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* ───────── Start ───────── */}
                {state === 'start' && (
                    <motion.div
                        key="start"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`${cardBase} flex flex-col items-center gap-6 px-6 py-10 text-center`}
                    >
                        <Stage>
                            <Mascot mood="idle" size={88} />
                        </Stage>
                        <div>
                            <p className="font-display text-2xl font-bold text-ink-900">Ready for today's quiz?</p>
                            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-500 font-ui">
                                A few questions on the word and fact you've met, plus an older one worth remembering.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                            <Chip>
                                {total} question{total !== 1 ? 's' : ''}
                            </Chip>
                            <Chip>Under a minute</Chip>
                            <Chip>Keeps your streak</Chip>
                        </div>
                        <PrimaryButton onClick={handleStart}>Start quiz</PrimaryButton>
                    </motion.div>
                )}

                {/* ───────── Starting ───────── */}
                {state === 'starting' && (
                    <motion.div
                        key="starting"
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className={`${cardBase} flex flex-col items-center gap-2 px-6 py-12 text-center`}
                    >
                        <Stage>
                            <Mascot mood="happy" size={72} />
                        </Stage>
                        <p className="mt-1 font-display text-xl font-bold text-ember-600">Let's go</p>
                    </motion.div>
                )}

                {/* ───────── Playing ───────── */}
                {state === 'playing' && (
                    <motion.div
                        key={`playing-${answeredCount}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="relative"
                    >
                        <div className="mb-3 flex items-baseline justify-between">
                            <p className="font-display text-sm font-bold text-ink-900">
                                Question {answeredCount + 1} <span className="font-medium text-ink-500 font-ui">of {total}</span>
                            </p>
                            <p className="text-xs font-medium text-moss-600 tabular-nums font-ui">{correctCount} correct</p>
                        </div>

                        <div className="mb-5 flex items-center gap-1.5" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={answeredCount}>
                            {allQuestions.map((_, i) => {
                                const answered = i < answeredCount;
                                const current = i === answeredCount;
                                const bg = answered ? (results[i] ? 'var(--moss-600)' : GOLD) : current ? EMBER : 'transparent';
                                return (
                                    <div key={i} className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink-900/10">
                                        <motion.div
                                            className="h-full rounded-full"
                                            style={{ background: bg }}
                                            initial={{ width: answered ? '100%' : 0 }}
                                            animate={{ width: i <= answeredCount ? '100%' : '0%' }}
                                            transition={{ duration: 0.4, ease: 'easeOut' }}
                                        />
                                    </div>
                                );
                            })}
                        </div>

                        <QuizQuestionCard
                            key={answeredCount}
                            question={allQuestions[answeredCount].question}
                            options={allQuestions[answeredCount].options}
                            correctAnswer={allQuestions[answeredCount].correctAnswer}
                            onAnswered={handleQuestionAnswered}
                        />

                        <AnimatePresence>
                            {feedback && <AnswerFeedbackBanner key="feedback" correct={feedback === 'correct'} />}
                        </AnimatePresence>
                    </motion.div>
                )}

                {/* ───────── Completed ───────── */}
                {state === 'completed' && !dayFinished && (
                    <motion.div
                        key="completed"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                        className={`${cardBase} relative flex flex-col items-center gap-4 overflow-hidden px-6 py-10 text-center`}
                    >
                        {isPerfect && <Confetti />}
                        <Mascot mood={isPerfect ? 'happy' : 'idle'} size={64} />
                        <ScoreRing score={correctCount} total={total} perfect={isPerfect} />
                        <div>
                            <p className="font-display text-2xl font-bold text-ink-900">
                                {isPerfect
                                    ? 'Perfect. You really know your stuff.'
                                    : correctCount >= Math.ceil(total / 2)
                                    ? 'Nice work today.'
                                    : 'Good effort — it sticks with repetition.'}
                            </p>
                            <p className="mt-1.5 text-sm text-ink-500 font-ui">
                                {isPerfect
                                    ? 'Marked on your streak calendar. See you tomorrow.'
                                    : 'Your streak is safe. A new quiz unlocks tomorrow.'}
                            </p>
                        </div>
                        {PREVIEW_FEATURES && (
                            <span className="text-xs font-semibold text-gold-700 bg-gold-50 px-3 py-1.5 rounded-tag font-ui">
                                +{estimateQuizXp(correctCount, total)} XP
                            </span>
                        )}
                        <PrimaryButton onClick={() => setDayFinished(true)}>Finish the day</PrimaryButton>
                    </motion.div>
                )}

                {/* ───────── Day complete ───────── */}
                {state === 'completed' && dayFinished && (
                    <motion.div
                        key="day-complete"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                        className="relative flex flex-col items-center gap-4 overflow-hidden rounded-sheet bg-ink-900 px-6 py-10 text-center text-paper"
                    >
                        <div className="flex items-center gap-2 text-ember-500">
                            <span className="font-display text-4xl font-bold">🔥{currentStreak}</span>
                        </div>
                        <p className="text-xs uppercase tracking-wider text-paper/60 font-ui">day streak</p>
                        <Mascot mood="happy" size={72} />
                        <p className="font-display text-2xl font-bold">All done. That's a full pouch.</p>
                        <div className="flex w-full flex-col gap-3 pt-2">
                            <button
                                onClick={handleShareDay}
                                className="w-full rounded-control border border-paper/25 py-3 text-sm font-semibold text-paper hover:bg-paper/10 transition-colors font-ui"
                            >
                                {shareState === 'working' ? 'Preparing…' : shareState === 'shared' ? 'Shared!' : shareState === 'copied' ? 'Link copied' : "Share today's result"}
                            </button>
                            <PrimaryButton onClick={() => setDayFinished(false)}>Done</PrimaryButton>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}