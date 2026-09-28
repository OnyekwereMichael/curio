import { useState, useMemo } from 'react';
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
}

type QuizState = 'start' | 'starting' | 'playing' | 'completed';
type Mood = 'idle' | 'happy' | 'sad';

// ─────────────────────────────────────────────────────────
// Mascot v3 — warm and friendly, not confident/sassy or
// angry. Idle = smiling and welcoming. Happy = celebrating.
// Sad = gently disappointed, never harsh or lifeless.
// ─────────────────────────────────────────────────────────

const EMBER = '#E4572E';
const GOLD = '#E8B84B';
// muted but still warm — NOT gray, so "disappointed" doesn't read as dead/scary
const MUTED = '#E3A98A';
const MUTED_LIGHT = '#F0C9A8';

function Mascot({ mood = 'idle', size = 88 }: { mood?: Mood; size?: number }) {
    const bodyBounce =
        mood === 'happy'
            ? { y: [0, -16, 0], rotate: [-5, 5, -5] }
            : mood === 'sad'
                ? { y: [0, 3, 0] }
                : { y: [0, -7, 0], rotate: [-2, 2, -2] };

    const bodyTransition =
        mood === 'happy'
            ? { duration: 0.5, repeat: Infinity, ease: 'easeInOut' as const }
            : mood === 'sad'
                ? { duration: 2.8, repeat: Infinity, ease: 'easeInOut' as const }
                : { duration: 2, repeat: Infinity, ease: 'easeInOut' as const };

    const shadowAnim =
        mood === 'happy'
            ? { scaleX: [1, 0.7, 1], opacity: [0.35, 0.15, 0.35] }
            : mood === 'sad'
                ? { scaleX: [1, 0.97, 1], opacity: [0.22, 0.18, 0.22] }
                : { scaleX: [1, 0.88, 1], opacity: [0.28, 0.18, 0.28] };

    const primary = mood === 'sad' ? MUTED : EMBER;
    const secondary = mood === 'sad' ? MUTED_LIGHT : GOLD;

    return (
        <div className="relative flex flex-col items-center justify-center" style={{ width: size * 1.5, height: size * 1.55 }}>
            {mood !== 'sad' && (
                <motion.div
                    className={`absolute rounded-full blur-2xl ${mood === 'happy' ? 'bg-gradient-to-br from-gold-stamp/50 to-moss/30' : 'bg-gradient-to-br from-gold-stamp/35 to-ember/20'
                        }`}
                    style={{ width: size * 1.3, height: size * 1.3, top: -size * 0.1 }}
                    animate={{ scale: [1, 1.15, 1], opacity: [0.45, 0.75, 0.45] }}
                    transition={{ duration: mood === 'happy' ? 1.6 : 2.3, repeat: Infinity, ease: 'easeInOut' }}
                />
            )}

            {mood !== 'sad' &&
                [0, 1, 2].map((i) => (
                    <motion.div
                        key={i}
                        className="absolute rounded-full"
                        style={{
                            width: 5, height: 5,
                            top: size * 0.5, left: size * 0.75,
                            background: GOLD,
                            boxShadow: `0 0 6px ${GOLD}`,
                        }}
                        animate={{
                            x: [0, Math.cos((i * 120 * Math.PI) / 180) * (size * 0.62), 0],
                            y: [0, Math.sin((i * 120 * Math.PI) / 180) * (size * 0.62), 0],
                            opacity: [0, 1, 0],
                            scale: [0.3, 1, 0.3],
                        }}
                        transition={{ duration: mood === 'happy' ? 1.3 : 3, repeat: Infinity, delay: i * 0.4, ease: 'easeInOut' }}
                    />
                ))}

            <motion.div animate={bodyBounce} transition={bodyTransition} className="relative z-10">
                <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: 'visible' }}>
                    <defs>
                        <radialGradient id={`body-grad-${mood}`} cx="35%" cy="30%" r="75%">
                            <stop offset="0%" stopColor={secondary} />
                            <stop offset="55%" stopColor={primary} />
                            <stop offset="100%" stopColor={primary} stopOpacity="0.9" />
                        </radialGradient>
                        <linearGradient id={`shade-${mood}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#000" stopOpacity="0" />
                            <stop offset="100%" stopColor="#000" stopOpacity="0.12" />
                        </linearGradient>
                        <filter id="mascot-shadow" x="-40%" y="-40%" width="180%" height="180%">
                            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.15" />
                        </filter>
                    </defs>

                    {/* arms */}
                    {mood === 'idle' && (
                        <>
                            {/* one arm relaxed at side */}
                            <path d="M 20 55 Q 10 60 12 72" fill="none" stroke={primary} strokeWidth="10" strokeLinecap="round" />
                            {/* other arm raised in a friendly wave */}
                            <motion.path
                                d="M 80 54 Q 92 46 90 30"
                                fill="none"
                                stroke={primary}
                                strokeWidth="10"
                                strokeLinecap="round"
                                animate={{ rotate: [-10, 10, -10] }}
                                transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                                style={{ transformOrigin: '80px 54px' }}
                            />
                        </>
                    )}
                    {mood === 'happy' && (
                        <>
                            <motion.path
                                d="M 22 52 Q 4 40 2 22"
                                fill="none"
                                stroke={primary}
                                strokeWidth="11"
                                strokeLinecap="round"
                                animate={{ rotate: [-8, 8, -8] }}
                                transition={{ duration: 0.5, repeat: Infinity, ease: 'easeInOut' }}
                                style={{ transformOrigin: '22px 52px' }}
                            />
                            <motion.path
                                d="M 78 52 Q 96 40 98 22"
                                fill="none"
                                stroke={primary}
                                strokeWidth="11"
                                strokeLinecap="round"
                                animate={{ rotate: [8, -8, 8] }}
                                transition={{ duration: 0.5, repeat: Infinity, ease: 'easeInOut' }}
                                style={{ transformOrigin: '78px 52px' }}
                            />
                        </>
                    )}
                    {mood === 'sad' && (
                        <>
                            {/* soft, close to body — not dramatically drooping */}
                            <path d="M 22 54 Q 15 60 18 68" fill="none" stroke={primary} strokeWidth="10" strokeLinecap="round" />
                            <path d="M 78 54 Q 85 60 82 68" fill="none" stroke={primary} strokeWidth="10" strokeLinecap="round" />
                        </>
                    )}

                    {/* main body */}
                    <path
                        d="M 50 8
               C 72 8 88 24 88 48
               C 88 72 70 92 50 92
               C 30 92 12 72 12 48
               C 12 24 28 8 50 8 Z"
                        fill={`url(#body-grad-${mood})`}
                        filter="url(#mascot-shadow)"
                    />
                    <path
                        d="M 50 8 C 72 8 88 24 88 48 C 88 72 70 92 50 92 C 44 92 44 8 50 8 Z"
                        fill={`url(#shade-${mood})`}
                    />

                    {/* ear bumps */}
                    <circle cx="24" cy="14" r="7" fill={secondary} opacity="0.85" />
                    <circle cx="76" cy="14" r="7" fill={secondary} opacity="0.85" />

                    {/* cheeks — warmth, kept even when sad so it never looks cold */}
                    <ellipse cx="27" cy="58" rx="6" ry="4" fill="#fff" opacity={mood === 'sad' ? 0.12 : 0.18} />
                    <ellipse cx="73" cy="58" rx="6" ry="4" fill="#fff" opacity={mood === 'sad' ? 0.12 : 0.18} />

                    {/* eyebrows — soft everywhere, never a sharp angry V */}
                    {mood === 'idle' && (
                        <>
                            <path d="M 30 37 Q 37 33 44 36" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
                            <path d="M 56 36 Q 63 33 70 37" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
                        </>
                    )}
                    {mood === 'happy' && (
                        <>
                            <path d="M 29 35 Q 37 29 46 33" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
                            <path d="M 54 33 Q 63 29 71 35" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
                        </>
                    )}
                    {mood === 'sad' && (
                        <>
                            {/* gently raised inner corners = soft sadness, not anger */}
                            <path d="M 31 41 Q 37 38 43 41" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
                            <path d="M 57 41 Q 63 38 69 41" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
                        </>
                    )}

                    {/* eyes */}
                    {mood === 'happy' ? (
                        <>
                            <path d="M 31 47 Q 37 40 43 47" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
                            <path d="M 57 47 Q 63 40 69 47" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
                        </>
                    ) : mood === 'sad' ? (
                        // soft downward-looking crescents instead of solid dot-pupils —
                        // reads as gentle/wistful rather than blank or startled
                        <>
                            <path d="M 32 48 Q 37 52 42 48" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
                            <path d="M 58 48 Q 63 52 68 48" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
                        </>
                    ) : (
                        <motion.g
                            animate={{ scaleY: [1, 1, 0.12, 1, 1] }}
                            transition={{ duration: 3.2, repeat: Infinity, times: [0, 0.88, 0.93, 0.98, 1] }}
                            style={{ transformOrigin: '50px 47px' }}
                        >
                            <ellipse cx="37" cy="47" rx="5" ry="6" fill="#fff" />
                            <ellipse cx="63" cy="47" rx="5" ry="6" fill="#fff" />
                            <circle cx="38.5" cy="49" r="2.4" fill={primary} />
                            <circle cx="64.5" cy="49" r="2.4" fill={primary} />
                            <circle cx="36" cy="45" r="1.3" fill="#fff" opacity="0.9" />
                            <circle cx="62" cy="45" r="1.3" fill="#fff" opacity="0.9" />
                        </motion.g>
                    )}

                    {/* mouth */}
                    {mood === 'happy' ? (
                        <path d="M 40 62 Q 50 72 60 62" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
                    ) : mood === 'sad' ? (
                        // small, soft, barely-there frown — disappointed, not devastated
                        <path d="M 43 64 Q 50 61 57 64" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
                    ) : (
                        // warm open smile — this is the "happy and excited" idle look
                        <path d="M 38 60 Q 50 70 62 60" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
                    )}
                </svg>
            </motion.div>

            <motion.div
                className="rounded-full bg-black/20 blur-[3px] mt-1"
                style={{ width: size * 0.55, height: size * 0.09 }}
                animate={shadowAnim}
                transition={bodyTransition}
            />
        </div>
    );
}

// ─────────────────────────────────────────────────────────
// AnswerFeedbackPopup — pops over the question card right
// after each answer, then disappears before the next one.
// ─────────────────────────────────────────────────────────
function AnswerFeedbackPopup({ correct }: { correct: boolean }) {
    return (
        <motion.div
            className="absolute inset-0 z-20 flex items-center justify-center bg-white/85 backdrop-blur-[2px] rounded-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
        >
            <motion.div
                className="flex flex-col items-center gap-2"
                initial={{ scale: 0.5, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.6, opacity: 0, y: -10 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            >
                <Mascot mood={correct ? 'happy' : 'sad'} size={70} />
                <p className={`font-display text-base font-bold ${correct ? 'text-moss' : 'text-ink/60'}`}>
                    {correct ? "Nice! That's right." : 'Not quite — nice try!'}
                </p>
            </motion.div>
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────
// DailyQuiz — same logic as before, new visuals
// ─────────────────────────────────────────────────────────
export function DailyQuiz({ todaysWord, oldButGoldWord, todaysFact, oldButGoldFact }: Props) {
    const { user } = useAuth();
    const [state, setState] = useState<QuizState>('start');
    const [correctCount, setCorrectCount] = useState(0);
    const [answeredCount, setAnsweredCount] = useState(0);
    const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);

    const { quiz: todaysWordQuiz } = useWordQuizQuestion(todaysWord);
    const { quiz: oldWordQuiz } = useWordQuizQuestion(oldButGoldWord);

    const todaysFactQuiz = useMemo(() => buildFactQuizQuestions(todaysFact, 1), [todaysFact]);
    const oldFactQuiz = useMemo(() => buildFactQuizQuestions(oldButGoldFact, 2), [oldButGoldFact]);

    const allQuestions = [todaysWordQuiz, oldWordQuiz, ...todaysFactQuiz, ...oldFactQuiz].filter(Boolean) as any[];

    function handleStart() {
        setState('starting');
        setTimeout(() => setState('playing'), 700);
    }

    // Unchanged — this is your original logic, untouched.
    async function handleAnswered(wasCorrect: boolean) {
        const newAnsweredCount = answeredCount + 1;
        const newCorrectCount = correctCount + (wasCorrect ? 1 : 0);
        setAnsweredCount(newAnsweredCount);
        setCorrectCount(newCorrectCount);

        if (newAnsweredCount === allQuestions.length) {
            setState('completed');
            const wasPerfect = newCorrectCount === allQuestions.length;

            if (wasPerfect && user) {
                const today = new Date().toISOString().split('T')[0];
                await supabase
                    .from('user_activity_log')
                    .upsert(
                        { user_id: user.id, activity_date: today, quiz_perfect: true },
                        { onConflict: 'user_id,activity_date' }
                    );
            }
        }
    }

    // New wrapper: shows the mascot popup first, THEN runs your
    // original handleAnswered (which advances state / hits Supabase).
    function handleQuestionAnswered(wasCorrect: boolean) {
        setFeedback(wasCorrect ? 'correct' : 'incorrect');
        setTimeout(() => {
            setFeedback(null);
            handleAnswered(wasCorrect);
        }, 1100);
    }

    if (allQuestions.length === 0) return null;

    return (
        <section className="flex flex-col gap-4">
            <div>
                <h2 className="font-display text-xl font-bold text-ink mb-1">Daily Quiz</h2>
                <p className="text-faded-ink text-sm">Quick recall check — no pressure, just practice.</p>
            </div>

            <AnimatePresence mode="wait">
                {state === 'start' && (
                    <motion.div
                        key="start"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="rounded-2xl p-10 text-center flex flex-col items-center gap-5"
                    >
                        <Mascot mood="idle" size={88} />
                        <div>
                            <p className="font-display text-xl font-bold text-ink mb-1.5">Take today's quiz</p>
                            <p className="text-faded-ink text-sm">
                                Just {allQuestions.length} question{allQuestions.length !== 1 ? 's' : ''} — takes less than a minute.
                            </p>
                        </div>
                        <motion.button
                            onClick={handleStart}
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.97 }}
                            className="px-7 py-3.5 rounded-xl bg-ember text-white text-sm font-semibold shadow-[0_6px_16px_-4px_rgba(0,0,0,0.25)] hover:bg-ember/90 transition-colors"
                        >
                            Start Quiz
                        </motion.button>
                    </motion.div>
                )}

                {state === 'starting' && (
                    <motion.div
                        key="starting"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="bg-white rounded-2xl border border-ink/5 p-10 text-center flex flex-col items-center gap-2"
                    >
                        <Mascot mood="idle" size={72} />
                        <p className="font-display text-lg font-bold text-ember mt-1">Quiz started!</p>
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
                                        animate={{ width: i <= answeredCount ? "100%" : "0%" }}
                                        transition={{ duration: 0.4, ease: "easeOut" }}
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

                        {/* Popup shows over the card, then disappears before the next question mounts */}
                        <AnimatePresence>
                            {feedback && <AnswerFeedbackPopup key="feedback" correct={feedback === 'correct'} />}
                        </AnimatePresence>
                    </motion.div>
                )}

                {state === 'completed' && (
                    <motion.div
                        key="completed"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        className="bg-white rounded-2xl border border-ink/5 p-10 text-center flex flex-col items-center gap-3 relative overflow-hidden"
                    >
                        {correctCount === allQuestions.length &&
                            [...Array(8)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="absolute w-1.5 h-1.5 rounded-full bg-gold-stamp"
                                    style={{ top: "50%", left: "50%" }}
                                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                                    animate={{
                                        x: Math.cos((i * 45 * Math.PI) / 180) * 90,
                                        y: Math.sin((i * 45 * Math.PI) / 180) * 90,
                                        opacity: 0,
                                        scale: 0.3,
                                    }}
                                    transition={{ duration: 0.9, delay: 0.2, ease: "easeOut" }}
                                />
                            ))}

                        <motion.div
                            initial={{ scale: 0, rotate: -20 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 12, delay: 0.15 }}
                        >
                            <Mascot mood={correctCount === allQuestions.length ? 'happy' : 'idle'} size={92} />
                        </motion.div>

                        <p className="font-display text-xl font-bold text-ink">
                            {correctCount === allQuestions.length
                                ? "Perfect. You really know your stuff."
                                : "Nice work today."}
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