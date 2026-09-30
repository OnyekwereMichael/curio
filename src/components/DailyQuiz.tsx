import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QuizQuestionCard } from './QuizQuestionCard';
import { useWordQuizQuestion } from '../hooks/useWordQuizQuestion';
import { buildFactQuizQuestions } from '../hooks/useFactQuizQuestions';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/superbase';


interface Props {
    todaysWord: any;
    oldButGoldWord: any;
    todaysFact: any;
    oldButGoldFact: any;
    commitStreak: () => Promise<void>; // from useStreak() — called once, on completion
}

type QuizState = 'loading' | 'already-done' | 'start' | 'starting' | 'playing' | 'completed';
type Mood = 'idle' | 'happy' | 'sad';

// ─────────────────────────────────────────────────────────
// Mascot v4 — professional redesign. No limbs, no orbiting
// particles, no bounce. A clean geometric orb with minimal
// line features. Motion is a slow, subtle breathing pulse —
// nothing bouncy or cartoonish. This is the calm, confident
// version appropriate for a learning product, not a game.
// ─────────────────────────────────────────────────────────

const EMBER = '#D8492F';
const GOLD = '#C7962E';
// const INK = '#1C2B3A';
const FADED = '#7C8A93';

function Mascot({ mood = 'idle', size = 80 }: { mood?: Mood; size?: number }) {
    const primary = mood === 'sad' ? FADED : EMBER;
    const ring = mood === 'happy' ? GOLD : mood === 'sad' ? FADED : EMBER;

    const pulse = {
        scale: mood === 'happy' ? [1, 1.05, 1] : [1, 1.02, 1],
    };
    const pulseTransition = {
        duration: mood === 'happy' ? 1.4 : 3,
        repeat: Infinity,
        ease: 'easeInOut' as const,
    };

    return (
        <div className="relative flex items-center justify-center" style={{ width: size * 1.3, height: size * 1.3 }}>
            {/* Soft ambient glow — subtle, not a spotlight */}
            <motion.div
                className="absolute rounded-full blur-xl"
                style={{ width: size * 1.1, height: size * 1.1, background: ring, opacity: 0.12 }}
                animate={{ opacity: mood === 'happy' ? [0.12, 0.22, 0.12] : [0.08, 0.14, 0.08] }}
                transition={pulseTransition}
            />

            {/* Thin outer ring — the only "decorative" element, kept minimal */}
            <div
                className="absolute rounded-full"
                style={{ width: size, height: size, border: `1.5px solid ${ring}`, opacity: 0.25 }}
            />

            <motion.div animate={pulse} transition={pulseTransition} className="relative z-10">
                <svg width={size * 0.78} height={size * 0.78} viewBox="0 0 100 100">
                    <defs>
                        <radialGradient id={`orb-${mood}`} cx="38%" cy="32%" r="72%">
                            <stop offset="0%" stopColor={mood === 'sad' ? '#F0EDE7' : '#F6E6C8'} />
                            <stop offset="60%" stopColor={primary} />
                            <stop offset="100%" stopColor={primary} stopOpacity="0.92" />
                        </radialGradient>
                    </defs>

                    <circle cx="50" cy="50" r="42" fill={`url(#orb-${mood})`} />

                    {/* Eyes — simple rounded dashes, never dot-pupils. Reads as calm,
              not cutesy. Blink handled via idle animation only. */}
                    {mood === 'happy' ? (
                        <>
                            <path d="M 33 47 Q 38 41 43 47" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
                            <path d="M 57 47 Q 62 41 67 47" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
                        </>
                    ) : mood === 'sad' ? (
                        <>
                            <rect x="33" y="46" width="10" height="3" rx="1.5" fill="#fff" opacity="0.85" />
                            <rect x="57" y="46" width="10" height="3" rx="1.5" fill="#fff" opacity="0.85" />
                        </>
                    ) : (
                        <motion.g
                            animate={{ scaleY: [1, 1, 0.15, 1, 1] }}
                            transition={{ duration: 3.4, repeat: Infinity, times: [0, 0.9, 0.94, 0.98, 1] }}
                            style={{ transformOrigin: '50px 47px' }}
                        >
                            <rect x="33" y="45.5" width="10" height="3.5" rx="1.75" fill="#fff" />
                            <rect x="57" y="45.5" width="10" height="3.5" rx="1.75" fill="#fff" />
                        </motion.g>
                    )}

                    {/* Mouth — one clean line, expression carried entirely by curve direction */}
                    {mood === 'happy' ? (
                        <path d="M 38 62 Q 50 70 62 62" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
                    ) : mood === 'sad' ? (
                        <path d="M 41 65 Q 50 61 59 65" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
                    ) : (
                        <path d="M 40 61 Q 50 66 60 61" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
                    )}
                </svg>
            </motion.div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────
// AnswerFeedbackPopup — same behavior, uses the new mascot
// ─────────────────────────────────────────────────────────
function AnswerFeedbackPopup({ correct }: { correct: boolean }) {
    return (
        <motion.div
            className="absolute inset-0 z-20 flex items-center justify-center bg-white/90 backdrop-blur-[2px] rounded-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
        >
            <motion.div
                className="flex flex-col items-center gap-2"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 20 }}
            >
                <Mascot mood={correct ? 'happy' : 'sad'} size={64} />
                <p className={`font-display text-base font-bold ${correct ? 'text-moss' : 'text-faded-ink'}`}>
                    {correct ? "That's right." : "Not quite."}
                </p>
            </motion.div>
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────
// DailyQuiz
// ─────────────────────────────────────────────────────────
export function DailyQuiz({ todaysWord, oldButGoldWord, todaysFact, oldButGoldFact, commitStreak }: Props) {
    const { user } = useAuth();
    const [state, setState] = useState<QuizState>('loading');
    const [correctCount, setCorrectCount] = useState(0);
    const [answeredCount, setAnsweredCount] = useState(0);
    const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
    const [persistedScore, setPersistedScore] = useState<number | null>(null);

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
                console.error("Error fetching quiz status:", error);
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

        if (newAnsweredCount === allQuestions.length) {
            setState('completed');
            const wasPerfect = newCorrectCount === allQuestions.length;

            if (user) {
                const today = new Date().toISOString().split('T')[0];

                // Persist completion + score — this is what "already-done" checks
                // on the next visit, and what makes the lock survive a refresh.
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

                // Streak now increments HERE — exactly once, only on genuine
                // completion, not just from the page loading.
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

    if (state === 'loading') return null; // avoid a flash of "start" before we know

    if (allQuestions.length === 0 && state !== 'already-done') return null;

    return (
        <section className="flex flex-col gap-4">
            <div>
                <h2 className="font-display text-xl font-bold text-ink mb-1">Daily Quiz</h2>
                <p className="text-faded-ink text-sm">Quick recall check — no pressure, just practice.</p>
            </div>

            <AnimatePresence mode="wait">
                {state === 'already-done' && (
                    <motion.div
                        key="already-done"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="rounded-2xl border border-ink/5 p-10 text-center flex flex-col items-center gap-3"
                    >
                        <Mascot mood="idle" size={76} />
                        <p className="font-display text-lg font-bold text-ink">
                            Come back tomorrow
                        </p>
                        <p className="text-faded-ink text-sm">
                            {persistedScore !== null
                                ? `You've taken today's quiz and scored ${persistedScore} of ${allQuestions.length > 0 ? allQuestions.length : 5}.`
                                : "You've taken today's quiz."}
                        </p>
                    </motion.div>
                )}

                {state === 'start' && (
                    <motion.div
                        key="start"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className=" p-10 text-center flex flex-col items-center gap-5"
                    >
                        <Mascot mood="idle" size={80} />
                        <div>
                            <p className="font-display text-xl font-bold text-ink mb-1.5">Take today's quiz</p>
                            <p className="text-faded-ink text-sm">
                                Just {allQuestions.length} question{allQuestions.length !== 1 ? 's' : ''} — takes less than a minute.
                            </p>
                        </div>
                        <motion.button
                            onClick={handleStart}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            className="px-7 py-3.5 rounded-xl bg-ember text-white text-sm font-semibold hover:bg-ember/90 transition-colors"
                        >
                            Start Quiz
                        </motion.button>
                    </motion.div>
                )}

                {state === 'starting' && (
                    <motion.div
                        key="starting"
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="bg-white rounded-2xl border border-ink/5 p-10 text-center flex flex-col items-center gap-2"
                    >
                        <Mascot mood="idle" size={64} />
                        <p className="font-display text-lg font-bold text-ember mt-1">Quiz started</p>
                    </motion.div>
                )}

                {state === 'playing' && (
                    <motion.div key={`playing-${answeredCount}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative">
                        <div className="flex items-center gap-2 mb-4">
                            {allQuestions.map((_, i) => (
                                <div key={i} className="h-1.5 flex-1 rounded-full bg-ink/10 overflow-hidden">
                                    <motion.div
                                        className={`h-full rounded-full ${i < answeredCount ? 'bg-moss' : i === answeredCount ? 'bg-ember' : ''}`}
                                        initial={{ width: 0 }}
                                        animate={{ width: i <= answeredCount ? '100%' : '0%' }}
                                        transition={{ duration: 0.4, ease: 'easeOut' }}
                                    />
                                </div>
                            ))}
                        </div>

                        <QuizQuestionCard
                            key={answeredCount}
                            question={allQuestions[answeredCount].question}
                            options={allQuestions[answeredCount].options}
                            correctAnswer={allQuestions[answeredCount].correctAnswer}
                            onAnswered={handleQuestionAnswered}
                        />

                        <AnimatePresence>
                            {feedback && <AnswerFeedbackPopup key="feedback" correct={feedback === 'correct'} />}
                        </AnimatePresence>
                    </motion.div>
                )}

                {state === 'completed' && (
                    <motion.div
                        key="completed"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        className="bg-white rounded-2xl border border-ink/5 p-10 text-center flex flex-col items-center gap-3"
                    >
                        <Mascot mood={correctCount === allQuestions.length ? 'happy' : 'idle'} size={84} />

                        <p className="font-display text-xl font-bold text-ink">
                            {correctCount === allQuestions.length ? 'Perfect. You really know your stuff.' : 'Nice work today.'}
                        </p>
                        <p className="text-faded-ink text-sm">
                            You scored {correctCount} of {allQuestions.length}
                            {correctCount === allQuestions.length && ' — marked on your streak calendar.'}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}