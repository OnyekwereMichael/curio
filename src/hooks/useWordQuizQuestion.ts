// src/hooks/useWordQuizQuestion.ts
import { useState, useEffect } from 'react';
import { supabase } from '../lib/superbase';

interface QuizQuestion {
  question: string;
  options: string[]; // 4 shuffled options
  correctAnswer: any;
}

export function useWordQuizQuestion(word: { id: string; word: string; definition: string } | null) {
  const [quiz, setQuiz] = useState<QuizQuestion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!word) {
      setLoading(false);
      return;
    }

    async function buildQuestion() {
      // Pull 3 random other words' definitions as wrong-answer decoys.
      const { data: decoys, error } = await supabase
        .from('words')
        .select('definition')
        .neq('id', word?.id)
        .limit(20); // pull extra, then randomly pick 3, for better shuffling

      if (error || !decoys || decoys.length < 3) {
        setLoading(false);
        return;
      }

      const shuffledDecoys = decoys
        .map((d) => d.definition)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      const options = [word?.definition, ...shuffledDecoys].sort(() => Math.random() - 0.5);

      setQuiz({
        question: `What does "${word?.word}" mean?`,
        options,
        correctAnswer: word?.definition,
      });
      setLoading(false);
    }

    buildQuestion();
  }, [word]);

  return { quiz, loading };
}