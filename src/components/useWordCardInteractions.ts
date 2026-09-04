import { useState, useEffect, useCallback } from 'react';

export function useWordCardInteractions(wordId: string, audioUrl?: string) {
  const [isSaved, setIsSaved] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const [isKnown, setIsKnown] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Reset states if wordId changes (e.g., simulating "tomorrow's" word loading)
  useEffect(() => {
    setIsSaved(false);
    setSaveFlash(false);
    setIsKnown(false);
    setIsPlaying(false);
  }, [wordId]);

  const toggleSave = useCallback(() => {
    // TODO (WIP): replace with real upsert to user_word_progress.saved = true/false for this user_id/word_id
    setIsSaved((prev) => {
      const next = !prev;
      if (next) {
        setSaveFlash(true);
        setTimeout(() => setSaveFlash(false), 300);
      }
      return next;
    });
  }, [wordId]);

  const markKnown = useCallback(() => {
    // TODO (WIP): replace with real update to user_word_progress.marked_known = true for this user_id/word_id
    setIsKnown(true);
  }, [wordId]);

  const play = useCallback(() => {
    if (!audioUrl || isPlaying) return;
    
    setIsPlaying(true);
    // TODO (WIP): replace mock playback with new Audio(word.pronunciation_audio_url).play() once Supabase Storage is set up
    setTimeout(() => {
      setIsPlaying(false);
    }, 1500);
  }, [audioUrl, isPlaying]);

  return { isSaved, saveFlash, isKnown, isPlaying, toggleSave, markKnown, play };
}
