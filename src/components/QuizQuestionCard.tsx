import { motion } from 'framer-motion';
import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  question: string;
  options: string[];
  /** Grades the pick on the server; the right answer is only revealed once it comes back. */
  onSelect: (option: string) => Promise<{ correct: boolean; correctAnswer: string }>;
  onAnswered: (wasCorrect: boolean) => void;
}

export function QuizQuestionCard({ question, options, onSelect, onAnswered }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);
  const [error, setError] = useState(false);

  async function handleSelect(option: string) {
    if (selected) return;
    setSelected(option);
    setError(false);
    try {
      const graded = await onSelect(option);
      setCorrectAnswer(graded.correctAnswer);
      // Auto-advance after a beat, whether right or wrong — no extra tap needed.
      setTimeout(() => onAnswered(graded.correct), 1100);
    } catch (e) {
      console.error('answer failed', e);
      setSelected(null);
      setError(true);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="bg-surface rounded-card border border-line p-6 shadow-card font-ui"
    >
      <p className="font-display text-heading font-bold text-ink-900 mb-4">{question}</p>

      <div className="flex flex-col gap-2.5">
        {options.map((option) => {
          const isSelected = selected === option;
          const isCorrect = option === correctAnswer;
          const showResult = correctAnswer !== null;

          return (
            <button
              key={option}
              onClick={() => handleSelect(option)}
              disabled={selected !== null}
              className={cn(
                "text-left px-4 py-3.5 rounded-control border text-sm transition-colors duration-200 flex items-center justify-between gap-2",
                !showResult && !isSelected && "border-line-strong bg-paper hover:bg-ink-900/[0.02] hover:border-ink-900/20",
                !showResult && isSelected && "border-ink-900/30 bg-ink-900/[0.04]",
                showResult && isCorrect && "border-moss-600/40 bg-moss-50 text-moss-600 font-medium",
                showResult && isSelected && !isCorrect && "border-ember-500/30 bg-ember-50 text-ember-600",
                showResult && !isSelected && !isCorrect && "border-line bg-paper text-ink-500 opacity-50"
              )}
            >
              <span>{option}</span>
              {showResult && isCorrect && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}>
                  <Check size={16} className="text-moss-600 flex-shrink-0" />
                </motion.span>
              )}
              {showResult && isSelected && !isCorrect && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}>
                  <X size={16} className="text-ember-600 flex-shrink-0" />
                </motion.span>
              )}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-3 text-xs text-ember-600">Couldn't save that answer — check your connection and tap again.</p>}
    </motion.div>
  );
}
